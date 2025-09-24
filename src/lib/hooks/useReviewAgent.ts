import useSWRMutation from 'swr/mutation'

// Types for agent review
export interface AgentReviewData {
  id: string
  name: string
  description: string
  status: 'DRAFT' | 'ACTIVE' | 'REJECTED' | 'INACTIVE'
  actions: any[]
  variables: any[]
  settings: any
}

export interface PostReviewAgentInput {
  agentId: string
  reviewData: {
    status: 'ACTIVE' | 'REJECTED'
    feedback?: string
    changes?: any[]
  }
}

// Hook for reviewing agents
export function useReviewAgent() {
  return useSWRMutation(
    '/api/agents/review',
    async (url, { arg }: { arg: PostReviewAgentInput }) => {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(arg),
      })
      
      if (!response.ok) {
        throw new Error('Failed to review agent')
      }
      
      return response.json()
    }
  )
}
