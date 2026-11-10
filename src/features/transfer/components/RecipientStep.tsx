import {useRef} from 'react'
import {Search, Plus} from 'lucide-react'
import {useFormContext, useWatch} from 'react-hook-form'
import type {Payee} from '@/api/types'
import Select from '@/components/Select'
import {supportedBanks} from '@/features/transfer/schema'
import type {TransferFormValues} from '@/features/transfer/types'
import PayeeOption from '@/features/transfer/components/PayeeOption'
import FormField, {fieldDescription} from '@/features/transfer/components/FormField'

interface RecipientStepProps {
  payees: Payee[]
  loading: boolean
  failed: boolean
  retry: () => void
  search: string
  onSearch: (value: string) => void
}

export default function RecipientStep({
  payees,
  loading,
  failed,
  retry,
  search,
  onSearch,
}: RecipientStepProps) {
  const {
    register,
    control,
    setValue,
    formState: {errors},
  } = useFormContext<TransferFormValues>()
  const searchInput = useRef<HTMLInputElement>(null)
  const choice = useWatch({control, name: 'recipientChoice'})
  const bank = useWatch({control, name: 'bank'})
  const visible = payees.filter((payee) =>
    `${payee.name} ${payee.bank}`.toLowerCase().includes(search.trim().toLowerCase()),
  )
  const choiceProps = {
    'aria-invalid': Boolean(errors.recipientChoice),
    'aria-describedby': fieldDescription('recipientChoice', Boolean(errors.recipientChoice)),
  }
  return (
    <div className="space-y-4">
      <div className="flex flex-col space-y-2">
        <label htmlFor="transfer-search" className="text-sm font-medium">
          Search payees
        </label>
        <div className="relative">
          <Search
            aria-hidden="true"
            size={20}
            className="pointer-events-none absolute left-3 top-3 text-text-muted"
          />
          <input
            ref={searchInput}
            id="transfer-search"
            type="search"
            className="min-h-12 min-w-0 w-full rounded-sm border border-text-subtle bg-surface py-3 pr-3 pl-10 text-text placeholder:text-text-muted placeholder:opacity-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring"
            placeholder="Search payees"
            value={search}
            onChange={(event) => onSearch(event.target.value)}
          />
        </div>
      </div>
      <fieldset className="space-y-2">
        <legend className="mb-4 text-xs font-semibold text-text-muted">Saved recipients</legend>
        {loading && (
          <p role="status" className="text-text-muted">
            Loading recipients…
          </p>
        )}
        {failed && (
          <div role="alert" className="space-y-2 rounded-md bg-negative-soft p-4 text-negative">
            <p>We couldn't load your recipients.</p>
            <button
              type="button"
              className="min-h-tap-target cursor-pointer rounded-sm border border-border-strong bg-surface px-4 py-3 text-sm font-semibold text-text hover:bg-surface-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring disabled:opacity-65"
              onClick={retry}
            >
              Retry
            </button>
          </div>
        )}
        {!loading && !failed && payees.length === 0 && (
          <p className="text-text-muted">
            No saved recipients. Send to someone new to get started.
          </p>
        )}
        {!loading && !failed && payees.length > 0 && visible.length === 0 && (
          <div className="space-y-2">
            <p>No recipients match your search.</p>
            <button
              type="button"
              className="min-h-tap-target cursor-pointer rounded-sm border border-border-strong bg-surface px-4 py-3 text-sm font-semibold text-text hover:bg-surface-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring disabled:opacity-65"
              onClick={() => {
                onSearch('')
                searchInput.current?.focus()
              }}
            >
              Clear search
            </button>
          </div>
        )}
        {!failed && visible.map((payee) => <PayeeOption key={payee.id} payee={payee} />)}
        <button
          type="button"
          data-new-recipient
          aria-expanded={choice === 'new'}
          aria-controls="transfer-new-fields"
          aria-describedby={choiceProps['aria-describedby']}
          onClick={() =>
            setValue('recipientChoice', 'new', {
              shouldDirty: true,
              shouldTouch: true,
              shouldValidate: true,
            })
          }
          className={`mt-2 flex min-h-tap-target w-full cursor-pointer items-center justify-center gap-2 rounded-sm border p-3 text-center focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring ${choice === 'new' ? 'border-brand bg-brand-soft' : 'border-border bg-surface'}`}
        >
          <Plus size={20} aria-hidden="true" />
          <span className="font-semibold">Send to someone new</span>
        </button>
        {errors.recipientChoice && (
          <p id="transfer-recipientChoice-error" className="text-sm text-negative">
            {errors.recipientChoice.message}
          </p>
        )}
      </fieldset>
      {choice === 'new' && (
        <div id="transfer-new-fields" className="space-y-4">
          <FormField name="recipientName" label="Recipient name">
            <input
              id="transfer-recipientName"
              autoComplete="off"
              className="min-h-12 min-w-0 w-full rounded-sm border border-text-subtle bg-surface px-3 py-3 text-text focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring"
              {...register('recipientName')}
              aria-invalid={Boolean(errors.recipientName)}
              aria-describedby={fieldDescription('recipientName', Boolean(errors.recipientName))}
            />
          </FormField>
          <FormField name="accountNumber" label="Account number (8 digits)">
            <input
              id="transfer-accountNumber"
              inputMode="numeric"
              autoComplete="off"
              className="min-h-12 min-w-0 w-full rounded-sm border border-text-subtle bg-surface px-3 py-3 text-text focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring"
              {...register('accountNumber')}
              aria-invalid={Boolean(errors.accountNumber)}
              aria-describedby={fieldDescription('accountNumber', Boolean(errors.accountNumber))}
            />
          </FormField>
          <FormField name="bank" label="Bank" errorClassName="text-xs">
            <Select
              id="transfer-bank"
              hasValue={Boolean(bank)}
              {...register('bank')}
              aria-invalid={Boolean(errors.bank)}
              aria-describedby={fieldDescription('bank', Boolean(errors.bank))}
            >
              <option value="">Select a bank</option>
              {supportedBanks.map((bank) => (
                <option key={bank} className="text-text">
                  {bank}
                </option>
              ))}
            </Select>
          </FormField>
        </div>
      )}
    </div>
  )
}
