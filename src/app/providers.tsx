// In Next.js, this file would be called: app/providers.tsx
'use client'
import { toast } from 'sonner'

// Since QueryClientProvider relies on useContext under the hood, we have to put 'use client' on top
import { isServer, QueryCache, QueryClient, QueryClientProvider } from '@tanstack/react-query'

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: (_, error) => {
          const status = (error as any)?.status || (error as any)?.response?.status
          return ![401, 403, 422].includes(status)
        },
        refetchOnWindowFocus: true,
        staleTime: 60 * 1000 * 5,
      },
      mutations: {
        onError: (error) => {
          // Handle ofetch errors
          const errorData = (error as any)?.data
          const status = (error as any)?.status

          if (errorData) {
            // Handle validation errors (422)
            if (status === 422 && errorData.message) {
              toast.error(errorData.message)
              return
            }

            // Handle general API errors with message
            if (errorData.message) {
              toast.error(errorData.message)
              return
            }
          }
        },
      },
    },
    queryCache: new QueryCache({
      onError: (error) => {
        // Get error data from ofetch error
        const errorData = (error as any)?.data
        const status = (error as any)?.status

        // Handle 403 - Forbidden
        if (status === 403) {
          toast.error('Access denied!')
          return
        }

        // Handle 404 - Not Found
        if (status === 404) {
          toast.error('Resource not found!')
          return
        }

        // Handle 422 - Validation Error
        if (status === 422 && errorData?.message) {
          toast.error(errorData.message)
          return
        }

        // Generic error with message from API
        if (errorData?.message) {
          toast.error(errorData.message)
          return
        }

        // Fallback error
        toast.error('Something went wrong!')
      },
      onSuccess: (response: any) => {
        const message = response?.message || response?.data?.message || 'تمت العملية بنجاح'

        if (message) toast.success(message)
      },
    }),
  })
}

let browserQueryClient: QueryClient | undefined = undefined

export function getQueryClient() {
  if (isServer) {
    // Server: always make a new query client
    return makeQueryClient()
  } else {
    // Browser: make a new query client if we don't already have one
    // This is very important, so we don't re-make a new client if React
    // suspends during the initial render. This may not be needed if we
    // have a suspense boundary BELOW the creation of the query client
    if (!browserQueryClient) browserQueryClient = makeQueryClient()
    return browserQueryClient
  }
}

import { CartProvider } from '@/lib/cart-context'

export default function Providers({ children }: { children: React.ReactNode }) {
  // NOTE: Avoid useState when initializing the query client if you don't
  //       have a suspense boundary between this and the code that may
  //       suspend because React will throw away the client on the initial
  //       render if it suspends and there is no boundary
  const queryClient = getQueryClient()

  return (
    <QueryClientProvider client={queryClient}>
      <CartProvider>{children}</CartProvider>
    </QueryClientProvider>
  )
}
