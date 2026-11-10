import {useIsMutating} from '@tanstack/react-query'
import {useAccounts, useCustomer, useTransactions} from '@/api/banking'
import Header from '@/components/layout/header'
import SegmentSwitch from '@/components/SegmentSwitch'
import AccountsSection from '@/features/overview/components/AccountsSection'
import DailyLimitCard from '@/features/overview/components/DailyLimitCard'
import Greeting from '@/features/overview/components/Greeting'
import TotalAvailableCard from '@/features/overview/components/TotalAvailableCard'
import TransactionsPanel from '@/features/overview/components/TransactionsPanel'
import {useTheme} from '@/features/theme/useTheme'

interface OverviewScreenProps {
  onNewTransfer: () => void
}

export default function OverviewScreen({onNewTransfer}: OverviewScreenProps) {
  const customer = useCustomer()
  const accounts = useAccounts()
  const transactions = useTransactions()
  const preferences = useTheme(customer.data?.customer.segment)
  const sending = useIsMutating({mutationKey: ['transfer']}) > 0
  const failed = customer.isError || accounts.isError || transactions.isError
  const loading = !failed && (customer.isPending || accounts.isPending || transactions.isPending)
  const available = !failed && !!customer.data && !!accounts.data && !!transactions.data
  const deposits = accounts.data?.accounts.filter((account) => account.type !== 'credit') ?? []
  const total = deposits.reduce((sum, account) => sum + Math.round(account.balance * 100), 0) / 100

  function retry() {
    void Promise.all([customer.refetch(), accounts.refetch(), transactions.refetch()])
  }

  return (
    <div className="min-h-screen bg-bg pt-header text-text transition-colors duration-base motion-reduce:transition-none">
      <Header {...preferences} />
      <main className="mx-auto flex max-w-[calc(var(--container)+2*var(--gutter))] flex-col gap-6 px-gutter-mobile pt-6 pb-[calc(112px+env(safe-area-inset-bottom))] sm:px-gutter sm:pt-10 sm:pb-6">
        <div className="flex flex-col items-start gap-2">
          <Greeting username={customer.data?.customer.firstName ?? 'Ava'} />
          <div className="sm:hidden">
            <SegmentSwitch
              segment={preferences.segment}
              changeSegment={preferences.changeSegment}
            />
          </div>
        </div>
        {failed && (
          <div
            role="alert"
            className="flex flex-wrap items-center justify-between gap-4 rounded-md border border-negative bg-negative-soft p-4 text-negative"
          >
            <p>We couldn't load your dashboard.</p>
            <button
              type="button"
              onClick={retry}
              className="min-h-tap-target cursor-pointer rounded-sm border border-border-strong bg-surface px-4 py-2 text-sm font-semibold text-text hover:bg-surface-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring"
            >
              Retry
            </button>
          </div>
        )}
        {loading && (
          <p role="status" className="sr-only">
            Loading your dashboard…
          </p>
        )}
        <div
          aria-busy={loading}
          className="grid min-w-0 items-start gap-6 lg:grid-cols-[minmax(0,1fr)_300px]"
        >
          <div className="flex min-w-0 flex-col gap-6">
            <TotalAvailableCard
              totalAvailable={total}
              depositAccountCount={deposits.length}
              onNewTransfer={onNewTransfer}
              unavailable={!available}
              disabled={!available || deposits.length === 0 || sending}
            />
            <AccountsSection accounts={available ? accounts.data?.accounts : undefined} />
            <TransactionsPanel
              transactions={available ? transactions.data?.transactions : undefined}
            />
          </div>
          <DailyLimitCard customer={available ? customer.data?.customer : undefined} />
        </div>
      </main>
    </div>
  )
}
