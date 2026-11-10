import {QueryClient, QueryClientProvider} from '@tanstack/react-query'
import {fireEvent, render, screen, waitFor, within} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import {http, HttpResponse} from 'msw'
import {describe, expect, it, vi} from 'vitest'
import App from '@/App'
import {formatMoney} from '@/lib/format'
import {server} from '@/test/setup'

function moneyText(amount: number) {
  return formatMoney(amount).replace(/\s/g, ' ')
}

function renderApp() {
  const queryClient = new QueryClient({
    defaultOptions: {queries: {retry: false}, mutations: {retry: false}},
  })
  return render(
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>,
  )
}

async function openTransfer() {
  const user = userEvent.setup()
  renderApp()
  const opener = await screen.findByRole('button', {name: 'New transfer'})
  await waitFor(() => expect(opener).toHaveAttribute('aria-disabled', 'false'))
  await user.click(opener)
  const dialog = screen.getByRole('dialog')
  await within(dialog).findByText('Jamie Tan')
  return {user, dialog, view: within(dialog), opener}
}

async function enterAmount(value = '120') {
  const flow = await openTransfer()
  await flow.user.click(flow.view.getByText('Jamie Tan'))
  await flow.user.click(flow.view.getByRole('button', {name: 'Continue'}))
  await flow.user.type(
    flow.view.getByLabelText('Amount', {exact: true}),
    String(Math.round(Number(value) * 100)),
  )
  return flow
}

async function enterNewRecipient(name = 'Alex Lim', accountNumber = '12345678', bank = 'OCBC') {
  const flow = await openTransfer()
  await flow.user.click(flow.view.getByRole('button', {name: /Send to someone new/}))
  await flow.user.type(flow.view.getByLabelText(/Recipient name/), name)
  await flow.user.type(flow.view.getByLabelText(/Account number/), accountNumber)
  if (bank) await flow.user.selectOptions(flow.view.getByLabelText('Bank', {exact: true}), bank)
  return flow
}

describe('banking dashboard', () => {
  // Best scenarios
  it('shows deposit totals, credit debt and the eight searchable recent transactions', async () => {
    const user = userEvent.setup()
    renderApp()
    await screen.findByText(moneyText(17120.55), {}, {timeout: 3000})
    expect(screen.getByText(moneyText(-420.3))).toBeInTheDocument()
    expect(screen.getByText('Across 2 deposit accounts')).toBeInTheDocument()
    expect(screen.getByText('Pending')).toBeInTheDocument()
    const search = screen.getByRole('searchbox', {
      name: 'Search transactions',
    })
    await user.type(search, 'GROCERIES')
    expect(screen.getByText('FairPrice Finest')).toBeInTheDocument()
    expect(screen.queryByText('Kopitiam Corner')).not.toBeInTheDocument()
    await user.clear(search)
    await user.type(search, 'no-such-transaction')
    expect(screen.getByText('No transactions match your search.')).toBeInTheDocument()
    await user.click(screen.getByRole('button', {name: 'Clear search'}))
    expect(search).toHaveValue('')
    expect(screen.getByText('Uniqlo')).toBeInTheDocument()
  })

  it('starts all three dashboard requests together and asks for eight transactions', async () => {
    const started = new Set<string>()
    let release = () => {}
    const ready = new Promise<void>((resolve) => {
      release = resolve
    })
    let limit: string | null = null
    server.use(
      http.get(/\/api\/(customer|accounts|transactions)/, async ({request}) => {
        const url = new URL(request.url)
        started.add(url.pathname)
        if (url.pathname.endsWith('transactions')) limit = url.searchParams.get('limit')
        if (started.size === 3) release()
        await ready
        return undefined
      }),
    )
    renderApp()
    await screen.findByText(moneyText(17120.55), {}, {timeout: 3000})
    expect(started.size).toBe(3)
    expect(limit).toBe('8')
  })

  // Worst scenarios
  it('shows a recoverable dashboard error for an invalid API response', async () => {
    server.use(http.get('*/api/accounts', () => new HttpResponse('<html>Unavailable</html>')))
    renderApp()
    await screen.findByText("We couldn't load your dashboard.", {}, {timeout: 3000})
    expect(screen.getByRole('button', {name: 'New transfer'})).toHaveAttribute(
      'aria-disabled',
      'true',
    )
  })

  it('shows an error and Retry loads a failed dashboard request', async () => {
    const user = userEvent.setup()
    server.use(
      http.get('*/api/accounts', () =>
        HttpResponse.json({error: {code: 'INTERNAL_ERROR', message: 'Down'}}, {status: 500}),
      ),
    )
    renderApp()
    await screen.findByText("We couldn't load your dashboard.", {}, {timeout: 3000})
    server.resetHandlers()
    await waitFor(() => expect(screen.getByRole('button', {name: 'Retry'})).toBeEnabled())
    await user.click(screen.getByRole('button', {name: 'Retry'}))
    await screen.findByText(moneyText(17120.55), {}, {timeout: 3000})
    expect(screen.queryByText("We couldn't load your dashboard.")).not.toBeInTheDocument()
  })

  // Boundary tests
  it('shows the newest eight in date order before searching the loaded list', async () => {
    const transactions = [2, 9, 0, 6, 1, 8, 3, 7, 4, 5].map((index) => ({
      id: `test-${index}`,
      accountId: 'acc_checking',
      date: new Date(Date.UTC(2026, 9, index + 1)).toISOString(),
      description: `Transaction ${index}`,
      category: 'test',
      direction: 'out',
      amount: index + 1,
      status: 'posted',
    }))
    server.use(http.get('*/api/transactions', () => HttpResponse.json({transactions, total: 10})))
    renderApp()
    const list = await screen.findByRole('list', {name: 'Recent transactions'})
    await waitFor(() => expect(within(list).getAllByText(/^Transaction /)).toHaveLength(8))
    expect(
      within(list)
        .getAllByText(/^Transaction /)
        .map((item) => item.textContent),
    ).toEqual([9, 8, 7, 6, 5, 4, 3, 2].map((index) => `Transaction ${index}`))
    expect(screen.queryByText('Transaction 0')).not.toBeInTheDocument()
    expect(screen.queryByText('Transaction 1')).not.toBeInTheDocument()
  })

  it('handles an empty transaction list without showing a search mismatch', async () => {
    server.use(
      http.get('*/api/transactions', () => HttpResponse.json({transactions: [], total: 0})),
    )
    renderApp()
    await screen.findByText(moneyText(17120.55), {}, {timeout: 3000})
    expect(screen.queryByText('FairPrice Finest')).not.toBeInTheDocument()
    expect(screen.getByText(/No recent transactions/i)).toBeInTheDocument()
  })

})

describe('transfer', () => {
  // Best scenarios
  it('selects a saved payee and continues using the keyboard', async () => {
    const {user, view} = await openTransfer()
    const search = view.getByRole('searchbox', {name: 'Search payees'})
    await user.click(search)
    await user.tab()
    const payee = view.getByRole('radio', {name: /Jamie Tan/})
    expect(payee).toHaveFocus()
    await user.keyboard(' ')
    expect(payee).toBeChecked()
    view.getByRole('button', {name: 'Continue'}).focus()
    await user.keyboard('{Enter}')
    expect(view.getByRole('heading', {name: 'How much?'})).toBeInTheDocument()
  })

  it('closes with the close button and returns focus to its opener', async () => {
    const {user, view, opener} = await openTransfer()
    await user.click(view.getByRole('button', {name: 'Close transfer'}))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(opener).toHaveFocus()
  })

  it('sends a saved-payee transfer and refreshes balance, transaction and limit', async () => {
    const {user, view} = await enterAmount()
    await user.type(view.getByLabelText(/Note/), 'Dinner')
    await user.click(view.getByRole('button', {name: 'Continue'}))
    expect(view.getByRole('heading', {name: 'Check the details'})).toBeInTheDocument()
    await user.click(view.getByRole('button', {name: 'Confirm transfer'}))
    expect(view.getByRole('button', {name: 'Sending…'})).toBeDisabled()
    await view.findByText('Transfer sent', {}, {timeout: 4000})
    expect(view.getByText(/^TRF-/)).toBeInTheDocument()
    await user.click(view.getByRole('button', {name: 'Back to dashboard'}))
    expect(screen.getByText(moneyText(17000.55))).toBeInTheDocument()
    expect(screen.getByText(moneyText(4160.55))).toBeInTheDocument()
    expect(screen.getByText(moneyText(4880))).toBeInTheDocument()
    expect(screen.getByText('Transfer to Jamie Tan')).toBeInTheDocument()
  }, 10000)

  it('validates new recipient fields on blur and Continue and keeps details on Back', async () => {
    const {user, view} = await openTransfer()
    await user.click(view.getByRole('button', {name: /Send to someone new/}))
    await user.type(view.getByLabelText(/Recipient name/), 'A')
    await user.tab()
    await user.type(view.getByLabelText(/Account number/), '123')
    await user.click(view.getByRole('button', {name: 'Continue'}))
    expect(view.getByText('Enter a valid 8-digit account number.')).toBeInTheDocument()
    expect(view.getByLabelText(/Recipient name/)).toHaveFocus()
    await user.clear(view.getByLabelText(/Recipient name/))
    await user.type(view.getByLabelText(/Recipient name/), 'Alex Lim')
    await user.clear(view.getByLabelText(/Account number/))
    await user.type(view.getByLabelText(/Account number/), '12345678')
    await user.selectOptions(view.getByLabelText('Bank', {exact: true}), 'OCBC')
    await user.click(view.getByRole('button', {name: 'Continue'}))
    await user.type(view.getByLabelText('Amount', {exact: true}), '10000')
    await user.click(view.getByRole('button', {name: 'Continue'}))
    expect(view.getByText(/Alex Lim/)).toBeInTheDocument()
    expect(view.getByText(/5678/)).toBeInTheDocument()
    await user.click(view.getByRole('button', {name: 'Back'}))
    expect(view.getByLabelText('Amount', {exact: true})).toHaveValue('100.00')
    await user.click(view.getByRole('button', {name: 'Back'}))
    expect(view.getByLabelText(/Recipient name/)).toHaveValue('Alex Lim')
    await user.click(view.getByRole('button', {name: 'Continue'}))
    await user.click(view.getByRole('button', {name: 'Continue'}))
    await user.click(view.getByRole('button', {name: 'Confirm transfer'}))
    await view.findByText('Transfer sent', {}, {timeout: 4000})
    expect(view.getByText(/to Alex Lim/)).toBeInTheDocument()
  }, 10000)

  it('keeps quick amounts and digit input correct on review and submission', async () => {
    let submittedAmount: number | undefined
    server.use(http.post('*/api/transfers', async ({request}) => {
      submittedAmount = (await request.clone().json() as {amount: number}).amount
      return undefined
    }))
    const {user, view} = await enterAmount('1.23')
    const amount = view.getByLabelText('Amount', {exact: true})
    await user.click(view.getByRole('button', {name: '250'}))
    expect(amount).toHaveValue('250.00')
    await user.clear(amount)
    await user.type(amount, '123')
    await user.click(view.getByRole('button', {name: 'Continue'}))
    expect(view.getAllByText(moneyText(1.23))).toHaveLength(2)
    await user.click(view.getByRole('button', {name: 'Confirm transfer'}))
    await view.findByText('Transfer sent', {}, {timeout: 4000})
    expect(submittedAmount).toBe(1.23)
  }, 10000)

  it('closes with Escape and returns focus to its opener', async () => {
    const {dialog, opener} = await openTransfer()
    expect(dialog.contains(document.activeElement)).toBe(true)
    fireEvent(dialog, new Event('cancel', {cancelable: true}))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(opener).toHaveFocus()
  })

  // Worst scenarios
  it('requires a bank before continuing with a new recipient', async () => {
    const {user, view} = await enterNewRecipient('Alex Lim', '12345678', '')
    await user.click(view.getByRole('button', {name: 'Continue'}))
    expect(view.getByText('Choose a bank.')).toBeInTheDocument()
    const bank = view.getByLabelText('Bank', {exact: true})
    expect(bank).toHaveAttribute('aria-invalid', 'true')
    expect(bank).toHaveFocus()
    expect(view.queryByRole('heading', {name: 'How much?'})).not.toBeInTheDocument()
    await user.selectOptions(bank, 'OCBC')
    await user.click(view.getByRole('button', {name: 'Continue'}))
    expect(view.getByRole('heading', {name: 'How much?'})).toBeInTheDocument()
  })

  it('focuses an untouched empty Amount when Continue is pressed', async () => {
    const {user, view} = await openTransfer()
    await user.click(view.getByText('Jamie Tan'))
    await user.click(view.getByRole('button', {name: 'Continue'}))
    await user.click(view.getByRole('button', {name: 'Continue'}))
    await waitFor(() => expect(view.getByLabelText('Amount', {exact: true})).toHaveFocus())
    expect(view.getByLabelText('Amount', {exact: true})).toHaveAttribute('aria-invalid', 'true')
  })

  it('keeps transfers unavailable when there are no deposit accounts', async () => {
    server.use(http.get('*/api/accounts', () => HttpResponse.json({accounts: []})))
    const user = userEvent.setup()
    renderApp()
    await screen.findByText('No accounts available.', {}, {timeout: 3000})
    const opener = screen.getByRole('button', {name: 'New transfer'})
    expect(opener).toHaveAttribute('aria-disabled', 'true')
    await user.click(opener)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('keeps failed transfer data on review and allows correction and retry', async () => {
    const {user, view} = await enterAmount('50')
    await user.type(view.getByLabelText(/Note/), '#fail')
    await user.click(view.getByRole('button', {name: 'Continue'}))
    await user.click(view.getByRole('button', {name: 'Confirm transfer'}))
    await waitFor(
      () =>
        expect(view.getByRole('alert')).toHaveTextContent(
          /^Something went wrong\. Your money hasn't left your account\. Try again\.$/,
        ),
      {timeout: 3000},
    )
    expect(view.getByRole('heading', {name: 'Check the details'})).toBeInTheDocument()
    expect(view.queryByText('Transfer sent')).not.toBeInTheDocument()
    await user.click(view.getByRole('button', {name: 'Back'}))
    expect(view.getByLabelText('Amount', {exact: true})).toHaveValue('50.00')
    expect(view.getByLabelText(/Note/)).toHaveValue('#fail')
    await user.clear(view.getByLabelText(/Note/))
    await user.type(view.getByLabelText(/Note/), 'Lunch')
    await user.click(view.getByRole('button', {name: 'Continue'}))
    expect(view.queryByRole('alert')).not.toBeInTheDocument()
    await user.click(view.getByRole('button', {name: 'Confirm transfer'}))
    await view.findByText('Transfer sent', {}, {timeout: 4000})
  }, 10000)

  it('shows payee errors with retry and lets empty payees use a new recipient', async () => {
    server.use(
      http.get('*/api/payees', () =>
        HttpResponse.json({error: {code: 'INTERNAL_ERROR', message: 'Down'}}, {status: 500}),
      ),
    )
    const user = userEvent.setup()
    renderApp()
    await waitFor(() =>
      expect(screen.getByRole('button', {name: 'New transfer'})).toHaveAttribute(
        'aria-disabled',
        'false',
      ),
    )
    await user.click(screen.getByRole('button', {name: 'New transfer'}))
    const view = within(screen.getByRole('dialog'))
    await view.findByText("We couldn't load your recipients.")
    server.use(http.get('*/api/payees', () => HttpResponse.json({payees: []})))
    await user.click(view.getByRole('button', {name: 'Retry'}))
    await view.findByText('No saved recipients. Send to someone new to get started.')
    await user.click(view.getByRole('button', {name: /Send to someone new/}))
    expect(view.getByLabelText(/Recipient name/)).toBeInTheDocument()
  })

  it('links API field errors to inputs and keeps the failure on review', async () => {
    server.use(
      http.post('*/api/transfers', () =>
        HttpResponse.json(
          {
            error: {
              code: 'INSUFFICIENT_FUNDS',
              message: 'Balance changed. Review your amount.',
              fields: {amount: 'Only SGD 10.00 is available now.'},
            },
          },
          {status: 422},
        ),
      ),
    )
    const {user, view} = await enterAmount('50')
    await user.click(view.getByRole('button', {name: 'Continue'}))
    await user.click(view.getByRole('button', {name: 'Confirm transfer'}))
    await waitFor(() =>
      expect(view.getByRole('alert')).toHaveTextContent('Balance changed. Review your amount.'),
    )
    expect(view.getByRole('heading', {name: 'Check the details'})).toBeInTheDocument()
    await user.click(view.getByRole('button', {name: 'Back'}))
    const amount = view.getByLabelText('Amount', {exact: true})
    expect(amount).toHaveAttribute('aria-invalid', 'true')
    expect(amount).toHaveAttribute(
      'aria-describedby',
      expect.stringContaining('transfer-amount-error'),
    )
    expect(view.getByText('Only SGD 10.00 is available now.')).toBeInTheDocument()
  })

  it('prevents double confirmation and never retries a completed payment when refresh fails', async () => {
    let posted = 0
    server.use(
      http.post('*/api/transfers', () => {
        posted += 1
        return undefined
      }),
      http.get('*/api/accounts', () =>
        posted
          ? HttpResponse.json(
              {
                error: {
                  code: 'INTERNAL_ERROR',
                  message: 'Refresh unavailable',
                },
              },
              {status: 500},
            )
          : undefined,
      ),
    )
    const {user, view, opener} = await enterAmount('50')
    await user.click(view.getByRole('button', {name: 'Continue'}))
    await user.dblClick(view.getByRole('button', {name: 'Confirm transfer'}))
    await view.findByText('Transfer sent', {}, {timeout: 4000})
    expect(posted).toBe(1)
    expect(view.queryByRole('button', {name: 'Confirm transfer'})).not.toBeInTheDocument()
    await user.click(view.getByRole('button', {name: 'Back to dashboard'}))
    expect(screen.getByText("We couldn't load your dashboard.")).toBeInTheDocument()
    expect(opener).toHaveFocus()
    expect(opener).toHaveAttribute('aria-disabled', 'true')
    server.resetHandlers()
    await user.click(screen.getByRole('button', {name: 'Retry'}))
    await screen.findByText(moneyText(17070.55), {}, {timeout: 3000})
    expect(posted).toBe(1)
  }, 10000)

  it('restores focus when closing a pending transfer and blocks a second dialog', async () => {
    const {user, view, dialog, opener} = await enterAmount('50')
    await user.click(view.getByRole('button', {name: 'Continue'}))
    await user.click(view.getByRole('button', {name: 'Confirm transfer'}))
    expect(view.getByRole('button', {name: 'Sending…'})).toBeDisabled()
    fireEvent(dialog, new Event('cancel', {cancelable: true}))
    expect(opener).toHaveFocus()
    expect(opener).toHaveAttribute('aria-disabled', 'true')
    await user.click(opener)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    await screen.findByText(moneyText(17070.55), {}, {timeout: 4000})
    await waitFor(() => expect(opener).toHaveAttribute('aria-disabled', 'false'))
  }, 10000)

  it('focuses the new-recipient choice when payee search hides all saved options', async () => {
    const {user, view} = await openTransfer()
    await user.type(view.getByRole('searchbox', {name: 'Search payees'}), 'no-match')
    await user.click(view.getByRole('button', {name: 'Continue'}))
    const choice = view.getByRole('button', {name: /Send to someone new/})
    expect(choice).toHaveFocus()
    expect(choice).toHaveAttribute('aria-describedby', 'transfer-recipientChoice-error')
    expect(view.getByText('Choose a recipient or send to someone new.')).toBeInTheDocument()
  })

  it('restores payee search focus when clearing a query with no results', async () => {
    const {user, view} = await openTransfer()
    const search = view.getByRole('searchbox', {name: 'Search payees'})
    await user.type(search, 'no-match')
    const clear = view.getByRole('button', {name: 'Clear search'})
    clear.focus()
    await user.keyboard('{Enter}')
    expect(search).toHaveValue('')
    expect(search).toHaveFocus()
    expect(view.getByText('Jamie Tan')).toBeInTheDocument()
  })

  // Boundary tests
  it('accepts a 50-character note through review and successful submission', async () => {
    const {user, view} = await enterAmount('50')
    const note = 'n'.repeat(50)
    await user.type(view.getByLabelText(/Note/), note)
    await user.tab()
    expect(view.getByText('50/50')).toBeInTheDocument()
    expect(view.getByLabelText(/Note/)).toHaveAttribute('aria-invalid', 'false')
    await user.click(view.getByRole('button', {name: 'Continue'}))
    expect(view.getByRole('heading', {name: 'Check the details'})).toBeInTheDocument()
    expect(view.getByText(note)).toBeInTheDocument()
    await user.click(view.getByRole('button', {name: 'Confirm transfer'}))
    const success = await view.findByRole('heading', {name: 'Transfer sent'}, {timeout: 4000})
    expect(success).toHaveAttribute('aria-live', 'polite')
  }, 10000)

  it.each([
    {length: 1, allowed: false},
    {length: 2, allowed: true},
    {length: 50, allowed: true},
    {length: 51, allowed: false},
  ])('checks a $length-character recipient name (allowed: $allowed)', async ({length, allowed}) => {
    const {user, view} = await enterNewRecipient('A'.repeat(length))
    await user.click(view.getByRole('button', {name: 'Continue'}))
    if (allowed) {
      expect(view.getByRole('heading', {name: 'How much?'})).toBeInTheDocument()
    } else {
      expect(view.getByText('Enter a name between 2 and 50 characters.')).toBeInTheDocument()
      const name = view.getByLabelText(/Recipient name/)
      expect(name).toHaveAttribute('aria-invalid', 'true')
      expect(name).toHaveFocus()
      expect(view.queryByRole('heading', {name: 'How much?'})).not.toBeInTheDocument()
    }
  })

  it.each([
    {number: '1234567', allowed: false},
    {number: '12345678', allowed: true},
    {number: '123456789', allowed: false},
    {number: '1234abcd', allowed: false},
  ])('checks recipient account $number (allowed: $allowed)', async ({number, allowed}) => {
    const {user, view} = await enterNewRecipient('Alex Lim', number)
    await user.click(view.getByRole('button', {name: 'Continue'}))
    if (allowed) {
      expect(view.getByRole('heading', {name: 'How much?'})).toBeInTheDocument()
    } else {
      expect(view.getByText('Enter a valid 8-digit account number.')).toBeInTheDocument()
      const account = view.getByLabelText(/Account number/)
      expect(account).toHaveAttribute('aria-invalid', 'true')
      expect(account).toHaveFocus()
      expect(view.queryByRole('heading', {name: 'How much?'})).not.toBeInTheDocument()
    }
  })

  it.each([
    {amount: '0.99', allowed: false},
    {amount: '1.00', allowed: true},
    {amount: '4280.55', allowed: true},
    {amount: '4280.56', allowed: false},
  ])('checks the amount boundary at SGD $amount (allowed: $allowed)', async ({amount, allowed}) => {
    const submitted = vi.fn()
    server.use(http.post('*/api/transfers', () => {
      submitted()
      return undefined
    }))
    const {user, view} = await enterAmount(amount)
    await user.click(view.getByRole('button', {name: 'Continue'}))
    if (allowed) {
      expect(view.getByRole('heading', {name: 'Check the details'})).toBeInTheDocument()
      await user.click(view.getByRole('button', {name: 'Confirm transfer'}))
      await view.findByText('Transfer sent', {}, {timeout: 4000})
      expect(submitted).toHaveBeenCalledTimes(1)
      await user.click(view.getByRole('button', {name: 'Back to dashboard'}))
      expect(screen.getByText(moneyText(amount === '1.00' ? 4279.55 : 0))).toBeInTheDocument()
    } else {
      const input = view.getByLabelText('Amount', {exact: true})
      expect(input).toHaveAttribute('aria-invalid', 'true')
      expect(input).toHaveFocus()
      expect(view.getByText(amount === '0.99'
        ? 'Enter an amount of at least SGD 1.00 with no more than 2 decimal places.'
        : `Amount can't be more than your available balance (${moneyText(4280.55)}).`,
      )).toBeInTheDocument()
      expect(view.queryByRole('button', {name: 'Confirm transfer'})).not.toBeInTheDocument()
      expect(submitted).not.toHaveBeenCalled()
    }
  }, 10000)

  it('rejects an amount above the balance, focuses the amount and sends no request', async () => {
    const submitted = vi.fn()
    server.use(
      http.post('*/api/transfers', () => {
        submitted()
        return undefined
      }),
    )
    const {user, view} = await enterAmount('4281')
    await user.click(view.getByRole('button', {name: 'Continue'}))
    expect(
      await view.findByText(
        `Amount can't be more than your available balance (${moneyText(4280.55)}).`,
      ),
    ).toBeInTheDocument()
    expect(view.getByLabelText('Amount', {exact: true})).toHaveFocus()
    expect(submitted).not.toHaveBeenCalled()
  })

  it('rejects excess daily limit even with sufficient savings balance', async () => {
    const {user, view} = await enterAmount('5001')
    const account = view.getByLabelText('From account', {exact: true})
    expect(within(account).queryByRole('option', {name: /Rewards/})).not.toBeInTheDocument()
    await user.selectOptions(account, 'acc_savings')
    await user.click(view.getByRole('button', {name: 'Continue'}))
    expect(
      await view.findByText(
        `This transfer exceeds your remaining daily limit (${moneyText(5000)}).`,
      ),
    ).toBeInTheDocument()
  })

  it('formats digit input as cents and supports deletion, clearing and numeric paste', async () => {
    const {user, view} = await enterAmount('0')
    const amount = view.getByLabelText('Amount', {exact: true})
    expect(amount).toHaveValue('0.00')
    await user.type(amount, '1')
    expect(amount).toHaveValue('0.01')
    await user.type(amount, '2')
    expect(amount).toHaveValue('0.12')
    await user.type(amount, '3')
    expect(amount).toHaveValue('1.23')
    await user.keyboard('{Backspace}')
    expect(amount).toHaveValue('0.12')
    await user.keyboard('{Backspace}')
    expect(amount).toHaveValue('0.01')
    await user.keyboard('{Backspace}')
    expect(amount).toHaveValue('0.00')
    await user.paste('123')
    expect(amount).toHaveValue('1.23')
    await user.type(amount, 'abc-+.e ')
    expect(amount).toHaveValue('1.23')
    await user.paste('12x3')
    expect(amount).toHaveValue('1.23')
    await user.paste('1.23')
    expect(amount).toHaveValue('1.23')
    await user.clear(amount)
    expect(amount).toHaveValue('0.00')
    await user.type(amount, '50')
    expect(amount).toHaveValue('0.50')
    await user.click(view.getByRole('button', {name: 'Continue'}))
    expect(amount).toHaveAttribute('aria-invalid', 'true')
    expect(amount).toHaveAttribute('aria-describedby', expect.stringContaining('transfer-amount-error'))
    expect(view.queryByRole('button', {name: 'Confirm transfer'})).not.toBeInTheDocument()
  })

  it('validates a long note on blur and blocks Continue', async () => {
    const {user, view} = await enterAmount('50')
    await user.type(view.getByLabelText(/Note/), 'x'.repeat(51))
    await user.tab()
    expect(await view.findByText('Keep your note to 50 characters or fewer.')).toBeInTheDocument()
    expect(view.getByText('51/50')).toBeInTheDocument()
    await user.click(view.getByRole('button', {name: 'Continue'}))
    expect(view.getByLabelText(/Note/)).toHaveFocus()
    expect(view.queryByRole('button', {name: 'Confirm transfer'})).not.toBeInTheDocument()
  })

  it('allows transferring the exact remaining daily limit after a decimal transfer', async () => {
    const {user, view} = await enterAmount('4096.01')
    await user.selectOptions(view.getByLabelText('From account', {exact: true}), 'acc_savings')
    await user.click(view.getByRole('button', {name: 'Continue'}))
    await user.click(view.getByRole('button', {name: 'Confirm transfer'}))
    await view.findByText('Transfer sent', {}, {timeout: 4000})
    await user.click(view.getByRole('button', {name: 'Back to dashboard'}))
    expect(screen.getByText(moneyText(903.99))).toBeInTheDocument()
    await user.click(screen.getByRole('button', {name: 'New transfer'}))
    const next = within(screen.getByRole('dialog'))
    await user.click(next.getByText('Jamie Tan'))
    await user.click(next.getByRole('button', {name: 'Continue'}))
    await user.selectOptions(next.getByLabelText('From account', {exact: true}), 'acc_savings')
    await user.type(next.getByLabelText('Amount', {exact: true}), '90399')
    await user.click(next.getByRole('button', {name: 'Continue'}))
    expect(next.getByRole('heading', {name: 'Check the details'})).toBeInTheDocument()
    await user.click(next.getByRole('button', {name: 'Confirm transfer'}))
    await next.findByText('Transfer sent', {}, {timeout: 4000})
    await user.click(next.getByRole('button', {name: 'Back to dashboard'}))
    expect(screen.getByText(moneyText(0))).toBeInTheDocument()
  }, 15000)

})
