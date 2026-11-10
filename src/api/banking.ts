import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query'
import {apiFetch} from '@/api/client'
import type {
  AccountsResponse,
  CreateTransferRequest,
  CustomerResponse,
  PayeesResponse,
  TransactionsResponse,
  TransferResponse,
} from '@/api/types'

export function useAccounts() {
  return useQuery({
    queryKey: ['accounts'],
    queryFn: () => apiFetch<AccountsResponse>('/api/accounts'),
    retry: false,
  })
}

export function useCustomer() {
  return useQuery({
    queryKey: ['customer'],
    queryFn: () => apiFetch<CustomerResponse>('/api/customer'),
    retry: false,
  })
}

export function useTransactions() {
  return useQuery({
    queryKey: ['transactions'],
    queryFn: () => apiFetch<TransactionsResponse>('/api/transactions?limit=8'),
    retry: false,
  })
}

export function usePayees() {
  return useQuery({
    queryKey: ['payees'],
    queryFn: () => apiFetch<PayeesResponse>('/api/payees'),
    retry: false,
  })
}

export function useCreateTransfer() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationKey: ['transfer'],
    mutationFn: (request: CreateTransferRequest) =>
      apiFetch<TransferResponse>('/api/transfers', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(request),
      }),
    retry: false,
    onSuccess: async () => {
      await Promise.all(
        ['customer', 'accounts', 'transactions'].map((key) =>
          queryClient.invalidateQueries({queryKey: [key]}),
        ),
      )
    },
  })
}
