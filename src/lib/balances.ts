import type {Customer} from '@/api/types'

export function remainingDailyLimit(customer: Customer) {
  const limit = Math.round(customer.dailyTransferLimit * 100)
  const used = Math.round(customer.transferredToday * 100)
  return Math.max(0, limit - used) / 100
}
