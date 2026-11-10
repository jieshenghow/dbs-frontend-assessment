import type {Customer} from '@/api/types'
import Skeleton from '@/components/Skeleton'
import {remainingDailyLimit} from '@/lib/balances'
import {formatMoney} from '@/lib/format'

interface DailyLimitCardProps {
  customer: Customer | undefined
}

export default function DailyLimitCard({customer}: DailyLimitCardProps) {
  return (
    <aside
      aria-labelledby="daily-limit-title"
      className="flex h-fit min-w-0 flex-col gap-3 rounded-lg border border-border bg-surface p-4 text-sm text-text-muted sm:p-6"
    >
      <h2 id="daily-limit-title" className="text-sm font-semibold text-text">
        Daily limit
      </h2>
      <p className="flex min-h-8.25 items-center text-2xl leading-tight font-semibold text-text tabular-nums">
        {customer ? (
          formatMoney(remainingDailyLimit(customer))
        ) : (
          <Skeleton className="h-8.25 w-45.25" />
        )}
      </p>
      <p>remaining today</p>
      <p className="text-xs">Resets daily. Applies to all transfers.</p>
    </aside>
  )
}
