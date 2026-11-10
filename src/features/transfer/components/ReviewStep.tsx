import {Info} from 'lucide-react'
import type {Account, TransferRecipient} from '@/api/types'
import type {TransferFailure} from '@/features/transfer/types'
import {formatMoney} from '@/lib/format'

interface ReviewStepProps {
  account: Account | undefined
  recipient: TransferRecipient | undefined
  amount: number
  note: string
  failure: TransferFailure | null
}

export default function ReviewStep({account, recipient, amount, note, failure}: ReviewStepProps) {
  return (
    <div className="space-y-4">
      {failure && (
        <div
          role="alert"
          className="grid gap-2 wrap-break-word rounded-sm bg-negative-soft p-4 text-sm text-negative"
        >
          <p>Something went wrong. Your money hasn't left your account. Try again.</p>
          {failure.message !==
            "Something went wrong. Your money hasn't left your account. Try again." && (
            <p>{failure.message}</p>
          )}
          {Object.entries(failure.fields).map(([field, message]) => (
            <p key={field}>{message}</p>
          ))}
        </div>
      )}
      <dl className="grid gap-5 rounded-md bg-surface-muted p-4">
        <div className="grid grid-cols-[4rem_minmax(0,1fr)] gap-4">
          <dt className="text-text-muted">From</dt>
          <dd className="wrap-break-word text-right">
            {account?.name}
            <span className="block text-sm">{account?.maskedNumber}</span>
          </dd>
        </div>
        <div className="grid grid-cols-[4rem_minmax(0,1fr)] gap-4">
          <dt className="text-text-muted">To</dt>
          <dd className="wrap-break-word text-right">
            {recipient?.name}
            <span className="block text-sm">
              {recipient?.bank} · {recipient?.accountNumberMasked}
            </span>
          </dd>
        </div>
        {[
          ['Amount', formatMoney(amount)],
          ['Fee', formatMoney(0)],
          ['Note', note || '—'],
        ].map(([label, value]) => (
          <div key={label} className="grid grid-cols-[4rem_minmax(0,1fr)] gap-4">
            <dt className="text-text-muted">{label}</dt>
            <dd className="wrap-break-word text-right tabular-nums">{value}</dd>
          </div>
        ))}
        <div className="grid grid-cols-[4rem_minmax(0,1fr)] items-center gap-4 border-t border-border pt-5">
          <dt className="text-text-muted">Total</dt>
          <dd className="text-right text-xl leading-normal font-semibold tabular-nums">
            {formatMoney(amount)}
          </dd>
        </div>
      </dl>
      <p className="flex items-center gap-2 text-text-muted">
        <Info size={20} className="shrink-0" aria-hidden="true" />
        Usually arrives in minutes.
      </p>
    </div>
  )
}
