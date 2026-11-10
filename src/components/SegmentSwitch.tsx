import type {Segment} from '@/api/types'

const segments = ['retail', 'premium'] as const

type SegmentSwitchProps = {
  segment: Segment
  changeSegment: (segment: Segment) => void
}

export default function SegmentSwitch({segment, changeSegment}: SegmentSwitchProps) {
  return (
    <div
      role="group"
      aria-label="Customer segment"
      className="relative isolate flex shrink-0 rounded-sm bg-surface-muted p-1"
    >
      <div
        aria-hidden="true"
        className={`pointer-events-none absolute top-1 left-1 h-tap-target w-20.5 rounded-sm bg-surface transition-transform duration-base ease-out motion-reduce:transition-none ${segment === 'premium' ? 'translate-x-full' : 'translate-x-0'}`}
      />
      {segments.map((value) => (
        <button
          type="button"
          aria-pressed={segment === value}
          key={value}
          className={`relative flex h-tap-target w-20.5 cursor-pointer items-center justify-center rounded-sm text-sm select-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring ${segment === value ? 'font-semibold text-brand' : 'font-normal text-text-muted'}`}
          onClick={() => changeSegment(value)}
        >
          {value === 'retail' ? 'Retail' : 'Premium'}
        </button>
      ))}
    </div>
  )
}
