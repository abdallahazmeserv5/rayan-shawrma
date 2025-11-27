'use client'
import Link from 'next/link'
import ImageFallback from './image-fallback'

export default function Logo({ primary = false }: { primary?: boolean }) {
  const logoImage = primary ? '/header/logo-primary.png' : '/header/shwaibi-logo.webp'

  return (
    <Link href={'/'}>
      <ImageFallback
        alt="Logo of shwaipi for renting"
        src={logoImage}
        width={120}
        height={100}
        className="object-contain! h-25"
      />
    </Link>
  )
}
