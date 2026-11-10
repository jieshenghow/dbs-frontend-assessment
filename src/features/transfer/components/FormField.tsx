import type {ReactNode} from 'react'
import {useFormContext} from 'react-hook-form'
import type {TransferFormValues} from '@/features/transfer/types'

export function fieldDescription(
  field: keyof TransferFormValues,
  invalid: boolean,
  helper?: string,
) {
  return (
    [helper, invalid ? `transfer-${field}-error` : undefined].filter(Boolean).join(' ') || undefined
  )
}

interface FormFieldProps {
  name: keyof TransferFormValues
  label: string
  children: ReactNode
  trailing?: ReactNode
  errorClassName?: string
}

export default function FormField({
  name,
  label,
  children,
  trailing,
  errorClassName = 'text-sm',
}: FormFieldProps) {
  const {
    formState: {errors},
  } = useFormContext<TransferFormValues>()
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <label className="block text-sm font-semibold" htmlFor={`transfer-${name}`}>
          {label}
        </label>
        {trailing}
      </div>
      {children}
      {errors[name] && (
        <p id={`transfer-${name}-error`} className={`wrap-break-word text-negative ${errorClassName}`}>
          {errors[name].message}
        </p>
      )}
    </div>
  )
}
