import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/quiz-setup')({
  component: RouteComponent,
})

function RouteComponent() {
  return <div>Hello "/quiz-setup"!</div>
}
