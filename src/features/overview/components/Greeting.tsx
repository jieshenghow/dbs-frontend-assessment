interface GreetingProps {
  username: string
}

export default function Greeting({username}: GreetingProps) {
  const dateLabel = new Intl.DateTimeFormat('en-SG', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    timeZone: 'Asia/Singapore',
  }).format(new Date())

  return (
    <div className="flex flex-col gap-2">
      <h1 className="text-2xl leading-tight font-semibold tracking-tight text-text sm:text-3xl">
        Good evening, {username}
      </h1>
      <p className="text-sm text-text-muted">{dateLabel}</p>
    </div>
  )
}
