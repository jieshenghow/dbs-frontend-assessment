import Skeleton from '@/components/Skeleton'
import {formatMoney} from '@/lib/format'

interface TotalAvailableCardProps {
  totalAvailable: number
  depositAccountCount: number
  onNewTransfer: () => void
  unavailable: boolean
  disabled: boolean
}

export default function TotalAvailableCard({
  totalAvailable,
  depositAccountCount,
  onNewTransfer,
  unavailable,
  disabled,
}: TotalAvailableCardProps) {
  return (
    <section
      aria-labelledby="balance-title"
      className="flex min-h-36.75 min-w-0 flex-col gap-2 rounded-lg bg-[linear-gradient(157.68deg,var(--hero-from),var(--hero-to)_70.721%)] p-6 text-on-hero sm:min-h-45 sm:bg-[linear-gradient(168.39deg,var(--hero-from),var(--hero-to)_70.721%)]"
    >
      <h2 id="balance-title" className="text-sm font-semibold">
        Total available
      </h2>
      <p className="flex min-h-lh items-center text-3xl leading-tight font-semibold tracking-tight tabular-nums sm:min-h-12.75 sm:text-display">
        {unavailable ? <Skeleton className="h-9 w-71.5 sm:h-11" /> : formatMoney(totalAvailable)}
      </p>
      <div className="flex min-h-5.25 items-center justify-between gap-2 text-sm sm:min-h-tap-target">
        <p className="flex min-h-5.25 items-center">
          {unavailable ? (
            <Skeleton className="h-5.25 w-43.75" />
          ) : (
            <>
              Across {depositAccountCount} deposit{' '}
              {depositAccountCount === 1 ? 'account' : 'accounts'}
            </>
          )}
        </p>
        <div className="fixed inset-x-0 bottom-0 z-header border-t border-border bg-surface px-gutter-mobile pt-4 pb-[calc(var(--space-6)+env(safe-area-inset-bottom))] sm:static sm:border-0 sm:bg-transparent sm:p-0">
          <button
            type="button"
            onClick={() => {
              if (!disabled) onNewTransfer()
            }}
            aria-disabled={disabled}
            aria-haspopup="dialog"
            className="flex min-h-tap-target w-full shrink-0 cursor-pointer items-center justify-center gap-2 rounded-sm bg-brand px-4 py-2 text-sm font-semibold text-on-brand hover:bg-brand-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring sm:w-43 sm:bg-on-hero sm:text-hero-from sm:hover:bg-on-hero sm:hover:shadow-md sm:active:bg-on-hero sm:focus-visible:outline-on-hero"
          >
            <span aria-hidden="true">+</span>
            New transfer
          </button>
        </div>
      </div>
    </section>
  )
}
