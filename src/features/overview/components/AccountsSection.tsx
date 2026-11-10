import type {Account} from '@/api/types'
import Skeleton from '@/components/Skeleton'
import AccountCard from '@/features/overview/components/AccountCard'

interface AccountsSectionProps {
  accounts: Account[] | undefined
}

export default function AccountsSection({accounts}: AccountsSectionProps) {
  return (
    <section aria-labelledby="accounts-title" className="min-w-0">
      <h2 id="accounts-title" className="mb-4 text-lg font-semibold">
        Accounts
      </h2>
      <ul
        aria-label="Accounts"
        tabIndex={0}
        className="flex snap-x snap-proximity gap-4 overflow-x-auto rounded-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring lg:grid lg:grid-cols-3 lg:overflow-visible"
      >
        {accounts
          ? accounts.map((account) => <AccountCard key={account.id} account={account} />)
          : [0, 1, 2].map((index) => (
              <li
                key={index}
                aria-hidden="true"
                className="flex min-h-38.25 w-70 shrink-0 snap-start flex-col gap-2 rounded-lg border border-border bg-surface p-4 lg:w-auto lg:min-w-0"
              >
                <Skeleton className="h-5 w-21.5" />
                <Skeleton className="h-6 w-41" />
                <Skeleton className="h-4.5 w-24" />
                <div className="flex flex-wrap items-center gap-2">
                  <Skeleton className={`h-8.25 ${index === 2 ? 'w-32' : 'w-45.25'}`} />
                  {index === 2 && <Skeleton className="h-6.5 w-21.5 rounded-full" />}
                </div>
              </li>
            ))}
      </ul>
      {accounts?.length === 0 && (
        <p className="py-8 text-center text-text-muted">No accounts available.</p>
      )}
    </section>
  )
}
