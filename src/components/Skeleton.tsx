interface SkeletonProps {
  className: string
}

export default function Skeleton({className}: SkeletonProps) {
  return (
    <span
      aria-hidden="true"
      className={`block max-w-full rounded-sm bg-[linear-gradient(90deg,var(--skeleton),var(--skeleton-highlight),var(--skeleton))] motion-safe:animate-pulse ${className}`}
    />
  )
}
