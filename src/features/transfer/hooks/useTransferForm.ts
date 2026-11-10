import {useEffect, useRef, useState} from 'react'
import {useForm, useWatch} from 'react-hook-form'
import {zodResolver} from '@hookform/resolvers/zod'
import {useAccounts, useCustomer, usePayees, useCreateTransfer} from '@/api/banking'
import {ApiError} from '@/api/client'
import type {CreateTransferRequest} from '@/api/types'
import {remainingDailyLimit} from '@/lib/balances'
import {amountFields, createTransferSchema, recipientFields} from '@/features/transfer/schema'
import type {
  TransferFailure,
  TransferField,
  TransferFormValues,
  TransferState,
} from '@/features/transfer/types'

const fieldMapping: Record<string, TransferField> = {
  payeeId: 'recipientChoice',
  fromAccountId: 'fromAccountId',
  amount: 'amount',
  note: 'note',
  'recipient.name': 'recipientName',
  'recipient.accountNumber': 'accountNumber',
  'recipient.bank': 'bank',
}

function buildRequest(values: TransferFormValues): CreateTransferRequest {
  const base = {
    fromAccountId: values.fromAccountId,
    amount: Math.round(Number(values.amount) * 100) / 100,
    note: values.note || undefined,
  }
  if (values.recipientChoice === 'new') {
    return {
      ...base,
      recipient: {
        name: values.recipientName.trim(),
        accountNumber: values.accountNumber,
        bank: values.bank,
      },
    }
  }
  return {...base, payeeId: values.recipientChoice}
}

export function useTransferForm() {
  const accountsQuery = useAccounts()
  const customerQuery = useCustomer()
  const payeesQuery = usePayees()
  const mutation = useCreateTransfer()
  const accounts = (accountsQuery.data?.accounts ?? []).filter(
    (account) => account.type === 'checking' || account.type === 'savings',
  )
  const payees = payeesQuery.data?.payees ?? []
  const remaining = customerQuery.data ? remainingDailyLimit(customerQuery.data.customer) : 0
  const [state, setState] = useState<TransferState>({step: 'recipient'})
  const [search, setSearch] = useState('')
  const [failure, setFailure] = useState<TransferFailure | null>(null)
  const [focusRequest, setFocusRequest] = useState<{field: TransferField} | null>(null)
  const locked = useRef(false)
  const completed = useRef(false)
  const form = useForm<TransferFormValues>({
    resolver: zodResolver(createTransferSchema(accounts, payees, remaining)),
    mode: 'onBlur',
    reValidateMode: 'onBlur',
    defaultValues: {
      recipientChoice: '',
      recipientName: '',
      accountNumber: '',
      bank: '',
      fromAccountId: accounts[0]?.id ?? '',
      amount: '',
      note: '',
    },
  })
  const {control, getValues, setValue, trigger, getFieldState, setError} = form
  const values = useWatch({control})
  const account = accounts.find((item) => item.id === values.fromAccountId)
  const recipient =
    values.recipientChoice === 'new'
      ? {
          name: values.recipientName?.trim() ?? '',
          bank: values.bank ?? '',
          accountNumberMasked: `•••• ${values.accountNumber?.slice(-4) ?? ''}`,
        }
      : payees.find((item) => item.id === values.recipientChoice)
  const loading = accountsQuery.isPending || customerQuery.isPending
  const failed = accountsQuery.isError || customerQuery.isError
  const firstAccountId = accounts[0]?.id

  useEffect(() => {
    if (!getValues('fromAccountId') && firstAccountId) setValue('fromAccountId', firstAccountId)
  }, [firstAccountId, getValues, setValue])

  async function validate(fields: TransferField[]) {
    if (await trigger(fields, {shouldFocus: true})) return true
    const field = fields.find((name) => getFieldState(name).invalid)
    if (field) setFocusRequest({field})
    return false
  }

  async function advance() {
    if (locked.current || mutation.isPending || loading || failed) return
    locked.current = true
    try {
      const fields = state.step === 'recipient' ? recipientFields : amountFields
      if ((state.step === 'recipient' || state.step === 'amount') && (await validate(fields))) {
        setFailure(null)
        setFocusRequest(null)
        setState({step: state.step === 'recipient' ? 'amount' : 'review'})
      }
    } finally {
      locked.current = false
    }
  }

  function back() {
    if (locked.current || mutation.isPending || state.step === 'success') return
    setFocusRequest(null)
    setState({step: state.step === 'review' ? 'amount' : 'recipient'})
  }

  async function send() {
    if (
      state.step !== 'review' ||
      locked.current ||
      completed.current ||
      mutation.isPending ||
      loading ||
      failed
    )
      return
    locked.current = true
    try {
      if (!(await trigger())) {
        const field = [...recipientFields, ...amountFields].find(
          (name) => getFieldState(name).invalid,
        )
        if (field) {
          setState({step: recipientFields.includes(field) ? 'recipient' : 'amount'})
          setFocusRequest({field})
        }
        return
      }
      setFailure(null)
      const response = await mutation.mutateAsync(buildRequest(getValues()))
      completed.current = true
      setFocusRequest(null)
      setState({step: 'success', response})
    } catch (error) {
      const fields = error instanceof ApiError ? (error.fields ?? {}) : {}
      setFailure({
        message:
          error instanceof ApiError && error.code !== 'INTERNAL_ERROR'
            ? error.message
            : "Something went wrong. Your money hasn't left your account. Try again.",
        fields,
      })
      for (const [field, message] of Object.entries(fields)) {
        const name = Object.hasOwn(fieldMapping, field) ? fieldMapping[field] : undefined
        if (name) setError(name, {type: 'server', message})
      }
    } finally {
      locked.current = false
    }
  }

  return {
    form,
    state,
    search,
    setSearch,
    focusRequest,
    accounts,
    payees,
    remaining,
    payeesLoading: payeesQuery.isPending,
    payeesFailed: payeesQuery.isError,
    retryPayees: () => {
      void payeesQuery.refetch()
    },
    loading,
    failed,
    sending: mutation.isPending,
    retryDetails: () => {
      void accountsQuery.refetch()
      void customerQuery.refetch()
    },
    summary: {account, recipient, amount: Number(values.amount), note: values.note ?? ''},
    failure,
    advance,
    back,
    send,
  }
}
