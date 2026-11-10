import {z} from 'zod'
import type {Account, Payee} from '@/api/types'
import type {TransferField, TransferFormValues} from '@/features/transfer/types'
import {formatMoney} from '@/lib/format'

export const supportedBanks = [
  'DBS',
  'POSB',
  'OCBC',
  'UOB',
  'Citibank',
  'HSBC',
  'Standard Chartered',
  'Maybank',
] as const

export const recipientFields: TransferField[] = [
  'recipientChoice',
  'recipientName',
  'accountNumber',
  'bank',
]
export const amountFields: TransferField[] = ['fromAccountId', 'amount', 'note']

export function createTransferSchema(accounts: Account[], payees: Payee[], remaining: number) {
  return z
    .object({
      recipientChoice: z.string(),
      recipientName: z.string(),
      accountNumber: z.string(),
      bank: z.string(),
      fromAccountId: z.string(),
      amount: z.string(),
      note: z.string(),
    })
    .superRefine((values, context) => {
      const issue = (field: keyof TransferFormValues, message: string) =>
        context.addIssue({code: 'custom', path: [field], message})
      if (values.recipientChoice === 'new') {
        const name = values.recipientName.trim()
        if (name.length < 2 || name.length > 50)
          issue('recipientName', 'Enter a name between 2 and 50 characters.')
        if (!/^\d{8}$/.test(values.accountNumber))
          issue('accountNumber', 'Enter a valid 8-digit account number.')
        if (!supportedBanks.some((bank) => bank === values.bank)) issue('bank', 'Choose a bank.')
      } else if (!payees.some((payee) => payee.id === values.recipientChoice)) {
        issue('recipientChoice', 'Choose a recipient or send to someone new.')
      }
      const account = accounts.find(
        (item) =>
          item.id === values.fromAccountId && (item.type === 'checking' || item.type === 'savings'),
      )
      if (!account) issue('fromAccountId', 'Choose a deposit account.')
      const cents = Math.round(Number(values.amount) * 100)
      if (!/^\d+(\.\d{1,2})?$/.test(values.amount) || !Number.isSafeInteger(cents) || cents < 100) {
        issue('amount', 'Enter an amount of at least SGD 1.00 with no more than 2 decimal places.')
      } else if (account && cents > Math.round(account.balance * 100)) {
        issue(
          'amount',
          `Amount can't be more than your available balance (${formatMoney(account.balance)}).`,
        )
      } else if (cents > Math.round(remaining * 100)) {
        issue(
          'amount',
          `This transfer exceeds your remaining daily limit (${formatMoney(remaining)}).`,
        )
      }
      if (values.note.length > 50) issue('note', 'Keep your note to 50 characters or fewer.')
    })
}
