import {useEffect, useRef, type KeyboardEvent} from 'react'
import {FormProvider} from 'react-hook-form'
import {CircleCheck, X} from 'lucide-react'
import {useTransferForm} from '@/features/transfer/hooks/useTransferForm'
import RecipientStep from '@/features/transfer/components/RecipientStep'
import AmountStep from '@/features/transfer/components/AmountStep'
import ReviewStep from '@/features/transfer/components/ReviewStep'
import SuccessPanel from '@/features/transfer/components/SuccessPanel'
import Stepper from '@/features/transfer/components/Stepper'

interface TransferDialogProps {
  onClose: () => void
}

const titles = {
  recipient: 'Who are you sending to?',
  amount: 'How much?',
  review: 'Check the details',
  success: 'Transfer sent',
}

export default function TransferDialog({onClose}: TransferDialogProps) {
  const transfer = useTransferForm()
  const {state, form, focusRequest} = transfer
  const dialog = useRef<HTMLDialogElement>(null)
  const heading = useRef<HTMLHeadingElement>(null)
  const opener = useRef<HTMLElement | null>(null)
  const {setFocus} = form

  useEffect(() => {
    const element = dialog.current
    opener.current = document.activeElement instanceof HTMLElement ? document.activeElement : null
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    element?.showModal()
    heading.current?.focus()
    return () => {
      document.body.style.overflow = previousOverflow
      if (element?.open) element.close()
      if (opener.current?.isConnected) opener.current.focus()
    }
  }, [])

  useEffect(() => {
    if (!focusRequest) {
      heading.current?.focus()
    } else if (focusRequest.field === 'recipientChoice') {
      const choice = dialog.current?.querySelector<HTMLInputElement>(
        'input[name="recipientChoice"]',
      )
      if (choice) choice.focus()
      else dialog.current?.querySelector<HTMLButtonElement>('[data-new-recipient]')?.focus()
    } else {
      setFocus(focusRequest.field)
    }
  }, [state.step, focusRequest, setFocus])

  function close() {
    dialog.current?.close()
    onClose()
    if (opener.current?.isConnected) opener.current.focus()
  }

  function containFocus(event: KeyboardEvent<HTMLDialogElement>) {
    if (event.key !== 'Tab') return
    const controls = Array.from(
      event.currentTarget.querySelectorAll<HTMLElement>(
        'button:not(:disabled), input:not(:disabled), select:not(:disabled)',
      ),
    ).filter((element) => element.getAttribute('type') !== 'hidden')
    const first = controls[0]
    const last = controls.at(-1)
    const current = document.activeElement
    if (event.shiftKey && (current === first || !controls.includes(current as HTMLElement))) {
      event.preventDefault()
      last?.focus()
    } else if (
      !event.shiftKey &&
      (current === last || !controls.includes(current as HTMLElement))
    ) {
      event.preventDefault()
      first?.focus()
    }
  }

  const success = state.step === 'success'
  return (
    <dialog
      ref={dialog}
      aria-labelledby="transfer-title"
      onKeyDown={containFocus}
      onCancel={(event) => {
        event.preventDefault()
        close()
      }}
      className="fixed inset-0 m-0 h-dvh max-h-dvh w-full max-w-none overflow-hidden overscroll-contain border-0 bg-surface p-0 text-sm text-text backdrop:bg-overlay lg:m-auto lg:h-[800px] lg:max-h-[calc(100dvh_-_var(--space-12))] lg:w-[520px] lg:rounded-xl lg:shadow-lg"
    >
      <FormProvider {...form}>
        <form
          noValidate
          className="flex h-full min-h-0 flex-col"
          onSubmit={(event) => {
            event.preventDefault()
            if (state.step === 'review') void transfer.send()
            else if (!success) void transfer.advance()
          }}
        >
          <header
            className={`grid shrink-0 gap-4 px-6 pt-6 pb-8 sm:pb-6 lg:pb-8 ${success ? 'min-h-34' : ''}`}
          >
            <div className="flex items-center justify-between gap-4">
              <h2 id="transfer-title" className="text-xl leading-normal font-semibold">
                New transfer
              </h2>
              <button
                type="button"
                aria-label="Close transfer"
                onClick={close}
                className="flex size-tap-target cursor-pointer items-center justify-center rounded-sm text-text-muted hover:bg-surface-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring"
              >
                <X size={20} aria-hidden="true" />
              </button>
            </div>
            {state.step !== 'success' && <Stepper step={state.step} />}
          </header>
          <div
            className={`flex min-h-0 flex-1 flex-col overflow-x-hidden overflow-y-auto px-6 ${success ? 'gap-6 pt-14 pb-12 text-center' : 'gap-4 pt-2 pb-6'}`}
          >
            {success && (
              <span className="mx-auto flex size-16 shrink-0 items-center justify-center rounded-full bg-positive-soft text-positive">
                <CircleCheck size={32} aria-hidden="true" />
              </span>
            )}
            <h3
              ref={heading}
              tabIndex={-1}
              aria-live={success ? 'polite' : undefined}
              className={`font-semibold focus:outline-none ${success ? 'text-2xl leading-tight' : 'text-xl leading-normal'}`}
            >
              {titles[state.step]}
            </h3>
            {!success && transfer.loading && (
              <p role="status" className="text-text-muted">
                Loading transfer details…
              </p>
            )}
            {!success && transfer.failed && (
              <div
                role="alert"
                className="grid gap-2 rounded-sm bg-negative-soft p-4 text-negative"
              >
                <p>We couldn't load your transfer details.</p>
                <button
                  type="button"
                  onClick={transfer.retryDetails}
                  className="min-h-tap-target cursor-pointer rounded-sm border border-border-strong bg-surface px-4 py-3 font-semibold text-text hover:bg-surface-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring"
                >
                  Retry
                </button>
              </div>
            )}
            {state.step === 'recipient' && (
              <RecipientStep
                payees={transfer.payees}
                loading={transfer.payeesLoading}
                failed={transfer.payeesFailed}
                retry={transfer.retryPayees}
                search={transfer.search}
                onSearch={transfer.setSearch}
              />
            )}
            {state.step === 'amount' && (
              <AmountStep accounts={transfer.accounts} remaining={transfer.remaining} />
            )}
            {state.step === 'review' && (
              <ReviewStep {...transfer.summary} failure={transfer.failure} />
            )}
            {state.step === 'success' && <SuccessPanel transfer={state.response.transfer} />}
          </div>
          <footer className="flex shrink-0 items-center justify-between gap-4 border-t border-border bg-surface p-6 pb-[calc(var(--space-6)+env(safe-area-inset-bottom,0px))]">
            {success ? (
              <button
                type="button"
                onClick={close}
                className="min-h-tap-target w-full cursor-pointer rounded-sm border border-brand bg-brand px-4 py-3 font-semibold text-on-brand hover:border-brand-hover hover:bg-brand-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring"
              >
                Back to dashboard
              </button>
            ) : (
              <>
                <button
                  type="button"
                  disabled={transfer.sending}
                  onClick={() => {
                    if (state.step === 'recipient') close()
                    else transfer.back()
                  }}
                  className="min-h-tap-target min-w-24 cursor-pointer rounded-sm border border-border-strong bg-surface px-4 py-3 font-semibold text-text hover:bg-surface-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring disabled:cursor-wait disabled:opacity-65 lg:min-w-30"
                >
                  {state.step === 'recipient' ? 'Cancel' : 'Back'}
                </button>
                <button
                  type="submit"
                  disabled={transfer.sending || transfer.loading || transfer.failed}
                  className={`min-h-tap-target cursor-pointer rounded-sm border border-brand bg-brand px-4 py-3 font-semibold text-on-brand hover:enabled:border-brand-hover hover:enabled:bg-brand-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring disabled:cursor-wait disabled:opacity-65 ${state.step === 'review' ? 'w-55 min-w-0' : 'min-w-40'}`}
                >
                  {state.step === 'review'
                    ? transfer.sending
                      ? 'Sending…'
                      : 'Confirm transfer'
                    : 'Continue'}
                </button>
              </>
            )}
          </footer>
        </form>
      </FormProvider>
    </dialog>
  )
}
