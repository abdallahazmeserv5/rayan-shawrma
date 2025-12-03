import { NextIntlClientProvider } from 'next-intl'
import React from 'react'
import Providers from './providers'

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <NextIntlClientProvider>
        <Providers>{children}</Providers>
      </NextIntlClientProvider>
    </>
  )
}
