import useSWRMutation from 'swr/mutation'

// Hook for summarizing agents
export function useSummarizeAgent() {
  return useSWRMutation(
    '/api/agents/summarize',
    async (url, { arg }) => {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(arg),
      })
      
      if (!response.ok) {
        throw new Error('Failed to summarize agent')
      }
      
      return response.json()
    }
  )
}
