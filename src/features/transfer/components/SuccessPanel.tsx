import type {Transfer} from '@/api/types'
import {formatMoney} from '@/lib/format'

interface SuccessPanelProps {
  transfer: Transfer
}

export default function SuccessPanel({transfer}: SuccessPanelProps) {
  return (
    <div
      className="flex flex-col items-center gap-6 text-center"
      aria-live="polite"
      aria-atomic="true"
    >
      <p className="text-3xl font-semibold leading-tight tabular-nums">
        {formatMoney(transfer.amount)}
      </p>
      <p className="wrap-break-word text-text-muted">
        to {transfer.recipient.name} · {transfer.recipient.bank} ·{' '}
        {transfer.recipient.accountNumberMasked}
      </p>
      <dl className="flex w-full flex-col items-center gap-2 rounded-sm bg-surface-muted p-4">
        <dt className="text-xs text-text-muted">Reference</dt>
        <dd className="wrap-break-word text-lg font-semibold">{transfer.reference}</dd>
      </dl>
      <p className="text-text-muted">The money should arrive within minutes.</p>
    </div>
  )
}
