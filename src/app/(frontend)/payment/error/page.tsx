'use client'

import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { XCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

function ErrorContent() {
  const searchParams = useSearchParams()
  const orderId = searchParams.get('orderId')

  return (
    <div className="container mx-auto px-4 py-16">
      <div className="max-w-md mx-auto text-center space-y-6">
        <div className="flex justify-center">
          <div className="rounded-full bg-red-100 p-6">
            <XCircle className="h-16 w-16 text-red-600" />
          </div>
        </div>

        <h1 className="text-3xl font-bold">Payment Failed</h1>

        <p className="text-muted-foreground">
          Unfortunately, your payment could not be processed. Please try again or contact support.
        </p>

        {orderId && (
          <div className="bg-muted rounded-lg p-4">
            <p className="text-sm text-muted-foreground mb-1">Order ID</p>
            <p className="font-mono font-semibold">{orderId}</p>
          </div>
        )}

        <div className="pt-4 space-y-3">
          <Button asChild size="lg" className="w-full">
            <Link href="/">Back to Menu</Link>
          </Button>

          <p className="text-sm text-muted-foreground">Need help? Contact our support team.</p>
        </div>
      </div>
    </div>
  )
}

export default function PaymentErrorPage() {
  return (
    <Suspense fallback={<div className="container mx-auto px-4 py-16 text-center">Loading...</div>}>
      <ErrorContent />
    </Suspense>
  )
}
