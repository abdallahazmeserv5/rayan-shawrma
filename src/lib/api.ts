// Global API error handler with toast notifications
import { toast } from 'sonner'

export async function apiFetch(url: string, options?: RequestInit) {
  try {
    const response = await fetch(url, options)

    // If response is not OK, try to get error message
    if (!response.ok) {
      let errorMessage = 'An error occurred'

      try {
        const errorData = await response.json()
        errorMessage = errorData.error || errorData.message || errorMessage
      } catch {
        // If response is not JSON, use status text
        errorMessage = response.statusText || `HTTP ${response.status}`
      }

      // Show error toast
      toast.error('API Error', {
        description: errorMessage,
      })

      throw new Error(errorMessage)
    }

    return response
  } catch (error) {
    // Network errors or fetch failures
    if (error instanceof TypeError && error.message.includes('fetch')) {
      toast.error('Connection Error', {
        description: 'Could not connect to the server. Please check if the service is running.',
      })
    } else if (!(error instanceof Error && error.message !== 'An error occurred')) {
      // Only show toast if we haven't already shown one above
      toast.error('Error', {
        description: error instanceof Error ? error.message : 'An unexpected error occurred',
      })
    }

    throw error
  }
}
