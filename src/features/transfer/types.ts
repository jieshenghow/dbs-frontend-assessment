import type {TransferResponse} from '@/api/types'

export interface TransferFormValues {
  recipientChoice: string
  recipientName: string
  accountNumber: string
  bank: string
  fromAccountId: string
  amount: string
  note: string
}

export type TransferField = keyof TransferFormValues
export type TransferStep = 'recipient' | 'amount' | 'review'
export type TransferState = {step: TransferStep} | {step: 'success'; response: TransferResponse}

export interface TransferFailure {
  message: string
  fields: Record<string, string>
}
