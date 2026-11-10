import {Check} from 'lucide-react'
import type {TransferStep} from '@/features/transfer/types'

interface StepperProps {
  step: TransferStep
}

export default function Stepper({step}: StepperProps) {
  const steps = ['recipient', 'amount', 'review'] as const
  const active = steps.indexOf(step)
  return (
    <ol aria-label="Transfer progress" className="flex items-center gap-2 text-xs">
      {steps.map((item, index) => (
        <li
          key={item}
          aria-current={item === step ? 'step' : undefined}
          className={`flex flex-1 items-center gap-2 ${index === active ? 'font-semibold text-brand' : 'text-text-muted'}`}
        >
          <span
            aria-hidden="true"
            className={`flex size-6 shrink-0 items-center justify-center rounded-full font-semibold ${index <= active ? 'bg-brand text-on-brand' : 'bg-surface-muted text-text-muted'}`}
          >
            {index < active ? <Check size={16} /> : index + 1}
          </span>
          <span className="capitalize">{item}</span>
        </li>
      ))}
    </ol>
  )
}
