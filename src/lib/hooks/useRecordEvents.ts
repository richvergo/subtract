import useSWRMutation from 'swr/mutation'

// Hook for recording events
export function useRecordEvents() {
  return useSWRMutation(
    '/api/events/record',
    async (url, { arg }) => {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(arg),
      })
      
      if (!response.ok) {
        throw new Error('Failed to record event')
      }
      
      return response.json()
    }
  )
}
