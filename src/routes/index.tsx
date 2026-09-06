import { createFileRoute } from '@tanstack/react-router'
import { m } from '#/paraglide/messages.js'

export const Route = createFileRoute('/')({ component: Home })

function Home() {
  return (
    <div className="p-8">
      <h1 className="text-4xl font-bold">{m.starter_welcome()}</h1>
      <p className="mt-4 text-lg">
        {m.starter_edit_prefix()}
        <code>src/routes/index.tsx</code>
        {m.starter_edit_suffix()}
      </p>
    </div>
  )
}
