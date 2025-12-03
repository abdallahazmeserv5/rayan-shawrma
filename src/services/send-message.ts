'use server'

import { toast } from 'sonner'

// base get
export interface BaseFetchOptions extends Omit<RequestInit, 'body'> {
  url: string
  body?: Record<string, any> | FormData | string | null
  externalApi?: boolean
  lang?: string
}

export async function baseFetch({
  url,
  method = 'GET',
  headers,
  body,
  externalApi,
  lang = 'ar',
  credentials = 'include',
  ...rest
}: BaseFetchOptions) {
  try {
    const response = await fetch(
      externalApi ? url : `${process.env.NEXT_PUBLIC_PAYLOAD_SERVER_URL}${url}`,
      {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Accept-Language': lang,
          ...headers,
        },
        cache: 'no-store',
        credentials,
        body: body ? JSON.stringify(body) : undefined,
        ...rest,
      },
    )

    if (!response.ok) {
      const errorText = await response.text().catch(() => '')

      throw new Error(`Fetch failed: ${response.status} ${response.statusText} → ${errorText}`)
    }
    const data = response.json()
    return data
  } catch (error: any) {
    try {
      const parsed = JSON.parse(error?.message?.split('→')[1].trim())
      toast.error(parsed.errors[0].message || parsed.errors[0].data.errors[0].message)
      return null
    } catch {
      return null
    }
  }
}

// export async function sendMessage({
//   number,
//   message,
//   retries = 3,
// }: {
//   number: string
//   message: string
//   retries?: number
// }) {
//   try {
//     const cleanNumber = number.startsWith('+') ? number.slice(1) : number

//     // WhatsApp Bots API token
//     const apiToken =
//       process.env.NEXT_PUBLIC_WHATSAPP_API_TOKEN ||
//       'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1aWQiOiJtcVZrWndYclc3bWdxcnh0M2hMTXphNGpMY3hvTkJ1diIsInJvbGUiOiJ1c2VyIiwiaWF0IjoxNzY0NDE5MTE2fQ.McpAZAco_1xvyfD74cdI_IfMlyuKrqhZWTZ0SSwmW8U'

//     console.log({ apiToken, cleanNumber, message })
//     for (let attempt = 0; attempt <= retries; attempt++) {
//       const res = await baseFetch({
//         url: `https://app.needbots.com/api/send`,
//         externalApi: true,
//         method: 'POST',
//         body: {
//           messageObject: {
//             number: cleanNumber,
//             type: 'text',
//             message,
//           },
//         },
//       })

//       console.log('WhatsApp API Response:', res)

//       // Check if the API returned success
//       if (res && res.success) {
//         return res
//       }

//       // If not successful, log the error
//       if (res && !res.success) {
//         console.error('API returned failure:', res.message)
//       }

//       // wait 200ms before retrying
//       if (attempt < retries) {
//         await new Promise((resolve) => setTimeout(resolve, 200))
//       }
//     }

//     return null
//   } catch (error) {
//     console.error('sendMessage error:', error)
//     return null
//   }
// }

export async function sendMessageAPI(data: { to: string; text: string; sessionId: string }) {
  const whatsappServiceUrl = process.env.WHATSAPP_SERVICE_URL || 'http://localhost:3001'
  const res = await fetch(`${whatsappServiceUrl}/message/send`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  })

  if (!res.ok) {
    const errorText = await res.text()
    throw new Error(`Failed to send message: ${errorText}`)
  }

  return res.json()
}
