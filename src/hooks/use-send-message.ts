import { sendMessageAPI } from '@/services/send-message'
import { useMutation } from '@tanstack/react-query'

export function useSendMessage() {
  return useMutation({
    mutationFn: sendMessageAPI,
  })
}
