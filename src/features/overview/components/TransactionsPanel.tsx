import {useRef, useState} from 'react'
import {Search} from 'lucide-react'
import type {Transaction} from '@/api/types'
import Skeleton from '@/components/Skeleton'
import TransactionRow from '@/features/overview/components/TransactionRow'

interface TransactionsPanelProps {
  transactions: Transaction[] | undefined
}

export default function TransactionsPanel({transactions}: TransactionsPanelProps) {
  const [search, setSearch] = useState('')
  const input = useRef<HTMLInputElement>(null)
  const recent = [...(transactions ?? [])]
    .sort((first, second) => Date.parse(second.date) - Date.parse(first.date))
    .slice(0, 8)
  const term = search.trim().toLowerCase()
  const matches = recent.filter(
    (transaction) =>
      transaction.description.toLowerCase().includes(term) ||
      transaction.category.toLowerCase().includes(term),
  )

  function clearSearch() {
    setSearch('')
    input.current?.focus()
  }

  return (
    <section
      aria-labelledby="transactions-title"
      className="min-w-0 rounded-lg border border-border bg-surface p-4 sm:p-6"
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h2 id="transactions-title" className="text-lg font-semibold">
          Recent transactions
        </h2>
        <div className="flex flex-col gap-2 sm:w-65 sm:shrink-0">
          <label htmlFor="transaction-search" className="text-sm font-semibold">
            Search transactions
          </label>
          <div className="relative">
            <Search
              aria-hidden="true"
              size={20}
              className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-text-muted"
            />
            <input
              ref={input}
              id="transaction-search"
              type="search"
              placeholder="Search transactions"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              disabled={!transactions}
              aria-describedby="transaction-count"
              className="block min-h-tap-target w-full rounded-sm border border-text-subtle bg-surface py-3 pr-3 pl-10 text-sm text-text placeholder:text-text-muted placeholder:opacity-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring"
            />
          </div>
        </div>
      </div>
      <div className="flex min-h-tap-target items-center justify-between gap-2 text-xs text-text-muted">
        <p id="transaction-count" role="status">
          {transactions
            ? term
              ? `${matches.length} ${matches.length === 1 ? 'result' : 'results'} found`
              : `${recent.length} recent transactions`
            : ' '}
        </p>
        {search && (
          <button
            type="button"
            onClick={clearSearch}
            className="min-h-tap-target cursor-pointer rounded-sm px-2 text-sm text-brand underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring"
          >
            Clear search
          </button>
        )}
      </div>
      <ul aria-label="Recent transactions" className="border-t border-border">
        {transactions
          ? matches.map((transaction) => (
              <TransactionRow key={transaction.id} transaction={transaction} />
            ))
          : Array.from({length: 8}, (_, index) => (
              <li
                key={index}
                aria-hidden="true"
                className="flex min-h-16 items-center gap-2 border-b border-border py-2 sm:gap-4"
              >
                <div className="min-w-0 flex-1">
                  <Skeleton className="h-5.25 w-41" />
                  <Skeleton className="h-4.5 w-24" />
                </div>
                <Skeleton className="h-5.25 w-28 shrink-0" />
              </li>
            ))}
      </ul>
      {transactions && matches.length === 0 && (
        <p className="py-8 text-center text-text-muted">
          {term ? 'No transactions match your search.' : 'No recent transactions.'}
        </p>
      )}
    </section>
  )
}
