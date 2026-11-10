import {Check} from 'lucide-react'
import {useFormContext, useWatch} from 'react-hook-form'
import type {Payee} from '@/api/types'
import type {TransferFormValues} from '@/features/transfer/types'
import {fieldDescription} from '@/features/transfer/components/FormField'

interface PayeeOptionProps {
  payee: Payee
}

export default function PayeeOption({payee}: PayeeOptionProps) {
  const {
    register,
    control,
    formState: {errors},
  } = useFormContext<TransferFormValues>()
  const selected = useWatch({control, name: 'recipientChoice'}) === payee.id
  return (
    <label
      className={`relative flex min-h-16 cursor-pointer items-center gap-3 rounded-md border p-3 has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-[:focus-visible]:outline-focus-ring ${selected ? 'border-brand bg-brand-soft' : 'border-border bg-surface'}`}
    >
      <span
        aria-hidden="true"
        className="flex size-10 shrink-0 items-center justify-center rounded-full bg-surface-muted font-semibold text-text-muted"
      >
        {payee.initials}
      </span>
      <span className="min-w-0 flex-1 wrap-break-word">
        <strong className="block text-base font-semibold">{payee.name}</strong>
        <span className="text-sm text-text-muted">
          {payee.bank} · {payee.accountNumberMasked}
        </span>
      </span>
      <input
        type="radio"
        value={payee.id}
        className="absolute size-px opacity-0"
        {...register('recipientChoice')}
        aria-invalid={Boolean(errors.recipientChoice)}
        aria-describedby={fieldDescription('recipientChoice', Boolean(errors.recipientChoice))}
      />
      <span
        aria-hidden="true"
        className={`flex size-5 shrink-0 items-center justify-center rounded-full border ${selected ? 'border-brand bg-brand text-on-brand' : 'border-text-subtle'}`}
      >
        {selected && <Check size={16} />}
      </span>
    </label>
  )
}
