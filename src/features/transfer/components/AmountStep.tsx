import {Controller, useFormContext, useWatch} from 'react-hook-form'
import type {Account} from '@/api/types'
import Select from '@/components/Select'
import type {TransferFormValues} from '@/features/transfer/types'
import {formatMoney} from '@/lib/format'
import FormField, {fieldDescription} from '@/features/transfer/components/FormField'

interface AmountStepProps {
  accounts: Account[]
  remaining: number
}

export default function AmountStep({accounts, remaining}: AmountStepProps) {
  const {
    register,
    control,
    setValue,
    trigger,
    getValues,
    formState: {errors},
  } = useFormContext<TransferFormValues>()
  const values = useWatch({control})
  const account = accounts.find((item) => item.id === values.fromAccountId)
  return (
    <div className="space-y-4">
      <FormField name="fromAccountId" label="From account">
        <Select
          id="transfer-fromAccountId"
          hasValue={Boolean(values.fromAccountId)}
          {...register('fromAccountId', {
            onChange: () => {
              if (getValues('amount')) void trigger('amount')
            },
          })}
          aria-invalid={Boolean(errors.fromAccountId)}
          aria-describedby={fieldDescription(
            'fromAccountId',
            Boolean(errors.fromAccountId),
            'transfer-account-help',
          )}
        >
          <option value="">Choose an account</option>
          {accounts.map((item) => (
            <option key={item.id} value={item.id} className="text-text">
              {item.name} · {item.maskedNumber}
            </option>
          ))}
        </Select>
        <p id="transfer-account-help" className="text-xs text-text-muted">
          Deposit accounts only
        </p>
      </FormField>
      <FormField name="amount" label="Amount">
        <div className="relative">
          <span
            aria-hidden="true"
            className="absolute left-3 top-3 text-xl leading-normal font-semibold"
          >
            SGD
          </span>
          <Controller
            name="amount"
            control={control}
            render={({field}) => (
              <input
                {...field}
                value={field.value || '0.00'}
                id="transfer-amount"
                className="min-h-12 min-w-0 w-full rounded-sm border border-text-subtle bg-surface py-3 pr-3 pl-14 text-xl leading-normal font-semibold text-text tabular-nums focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring"
                inputMode="numeric"
                autoComplete="off"
                onKeyDown={(event) => {
                  if (
                    !event.ctrlKey &&
                    !event.metaKey &&
                    !event.altKey &&
                    event.key.length === 1 &&
                    !/^[0-9]$/.test(event.key)
                  ) {
                    event.preventDefault()
                  }
                }}
                onPaste={(event) => {
                  if (!/^[0-9]+$/.test(event.clipboardData.getData('text'))) event.preventDefault()
                }}
                onChange={(event) => {
                  const raw = event.target.value
                  if (!/^[0-9]*\.?[0-9]*$/.test(raw)) return
                  const cents = raw.replace('.', '').replace(/^0+/, '').padStart(3, '0')
                  field.onChange(`${cents.slice(0, -2)}.${cents.slice(-2)}`)
                }}
                aria-invalid={Boolean(errors.amount)}
                aria-describedby={fieldDescription(
                  'amount',
                  Boolean(errors.amount),
                  'transfer-balance transfer-limit',
                )}
              />
            )}
          />
        </div>
      </FormField>
      <div role="group" aria-label="Quick amounts" className="grid grid-cols-4 gap-2">
        {[50, 100, 250, 500].map((amount) => (
          <button
            key={amount}
            type="button"
            className="min-h-tap-target cursor-pointer rounded-sm border border-border-strong bg-surface px-2 py-3 text-sm font-semibold text-text hover:bg-surface-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring"
            onClick={() =>
              setValue('amount', amount.toFixed(2), {
                shouldDirty: true,
                shouldTouch: true,
                shouldValidate: true,
              })
            }
          >
            {amount}
          </button>
        ))}
      </div>
      <div className="space-y-1 text-sm text-text-muted tabular-nums">
        <p id="transfer-balance">Available {formatMoney(account?.balance ?? 0)}</p>
        <p id="transfer-limit">Remaining daily limit {formatMoney(remaining)}</p>
      </div>
      <FormField
        name="note"
        label="Note (optional)"
        trailing={
          <span id="transfer-note-count" className="text-xs text-text-muted">
            {values.note?.length ?? 0}/50
          </span>
        }
      >
        <input
          id="transfer-note"
          className="min-h-12 min-w-0 w-full rounded-sm border border-text-subtle bg-surface px-3 py-3 text-text focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring"
          {...register('note')}
          aria-invalid={Boolean(errors.note)}
          aria-describedby={fieldDescription('note', Boolean(errors.note), 'transfer-note-count')}
        />
      </FormField>
    </div>
  )
}
