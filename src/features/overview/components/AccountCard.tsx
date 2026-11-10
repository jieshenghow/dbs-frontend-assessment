import {CreditCard, Wallet} from 'lucide-react'
import type {Account} from '@/api/types'
import {formatMoney} from '@/lib/format'

interface AccountCardProps {
  account: Account
}

const labels = {checking: 'Checking', savings: 'Savings', credit: 'Credit card'}

export default function AccountCard({account}: AccountCardProps) {
  return (
    <li className="flex min-h-38.25 w-70 shrink-0 snap-start flex-col gap-2 rounded-lg border border-border bg-surface p-4 lg:w-auto lg:min-w-0">
      <div className="flex min-h-5 items-center gap-3 text-xs text-text-muted">
        {account.type === 'credit' ? (
          <CreditCard size={20} aria-hidden="true" className="shrink-0 text-brand" />
        ) : (
          <Wallet size={20} aria-hidden="true" className="shrink-0 text-brand" />
        )}
        {labels[account.type]}
      </div>
      <h3 className="text-base font-semibold">{account.name}</h3>
      <p className="text-xs text-text-muted tabular-nums">{account.maskedNumber}</p>
      <div className="flex flex-wrap items-center gap-2">
        <strong className="text-xl leading-normal font-semibold whitespace-nowrap tabular-nums">
          {formatMoney(account.balance)}
        </strong>
        {account.type === 'credit' && (
          <span className="rounded-full bg-surface-muted px-2 py-1 text-xs font-semibold whitespace-nowrap text-text-muted">
            Amount due
          </span>
        )}
      </div>
    </li>
  )
}
