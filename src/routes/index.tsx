import { createFileRoute } from '@tanstack/react-router'
import { PageContainer } from '../components/layout/page-container'
import { EmptyAnswerState } from '../components/answer/empty-answer-state'
import { useAsk } from '../lib/use-ask'

export const Route = createFileRoute('/')({
  component: Home,
})

function Home() {
  const ask = useAsk()
  return (
    <PageContainer>
      <EmptyAnswerState onPick={ask} />
    </PageContainer>
  )
}
