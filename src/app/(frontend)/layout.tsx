import { createQueryClient } from '@/lib/query-client'
import { dehydrate, HydrationBoundary } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import 'leaflet/dist/leaflet.css'
import type { Metadata } from 'next'
import { NextIntlClientProvider } from 'next-intl'
import { getLocale } from 'next-intl/server'
import { Alexandria } from 'next/font/google'
import type React from 'react'
import Providers from './../providers'
import './globals.css'

const _alexandra = Alexandria({
  subsets: ['latin', 'arabic'],
  weight: ['400', '700'],
})

export const metadata: Metadata = {
  title: 'دار الشوون للعقارات - أفضل وسيط عقاري',
  description: 'منصة تعاملك مع أفضل وسيط عقاري في السوق',
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const local = await getLocale()
  const queryClient = createQueryClient()

  return (
    <html lang={local} dir={local === 'ar' ? 'rtl' : 'ltr'}>
      <body className={`${_alexandra.className} antialiased bg-white`}>
        <HydrationBoundary state={dehydrate(queryClient)}>
          {children}
          <ReactQueryDevtools initialIsOpen={false} />
        </HydrationBoundary>
      </body>
    </html>
  )
}
