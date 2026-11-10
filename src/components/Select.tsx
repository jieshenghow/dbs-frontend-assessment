import type {ComponentProps} from 'react'
import {ChevronDown} from 'lucide-react'

interface SelectProps extends ComponentProps<'select'> {
  hasValue: boolean
}

export default function Select({hasValue, className = '', children, ...props}: SelectProps) {
  return (
    <div className="relative">
      <select
        {...props}
        className={`h-12 min-w-0 w-full appearance-none rounded-sm border border-text-subtle bg-surface py-3 pr-16 pl-3 aria-invalid:border-negative focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring ${hasValue ? 'text-text' : 'text-text-subtle'} ${className}`}
      >
        {children}
      </select>
      <ChevronDown
        aria-hidden="true"
        size={20}
        className="pointer-events-none absolute top-1/2 right-[31px] -translate-y-1/2 text-text-subtle"
      />
    </div>
  )
}
