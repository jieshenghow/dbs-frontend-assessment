import type {Transaction} from '@/api/types'
import {formatMoney, formatShortDate} from '@/lib/format'

interface TransactionRowProps {
  transaction: Transaction
}

export default function TransactionRow({transaction}: TransactionRowProps) {
  return (
    <li className="flex min-h-16 min-w-0 items-center gap-2 border-b border-border py-2 sm:gap-4">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold [overflow-wrap:anywhere]">{transaction.description}</p>
        <div className="flex flex-wrap items-center gap-2 text-xs text-text-muted">
          <span>
            <span className="capitalize">{transaction.category}</span> ·{' '}
            <time dateTime={transaction.date}>{formatShortDate(transaction.date)}</time>
          </span>
          {transaction.status === 'pending' && (
            <span className="rounded-full bg-warning-soft px-2 py-1 font-semibold whitespace-nowrap text-warning">
              Pending
            </span>
          )}
        </div>
      </div>
      <strong
        className={`shrink-0 text-right text-sm font-semibold whitespace-nowrap tabular-nums ${transaction.direction === 'in' ? 'text-positive' : 'text-text'}`}
      >
        {transaction.direction === 'in' ? '+' : '-'}
        {formatMoney(transaction.amount)}
      </strong>
    </li>
  )
}
