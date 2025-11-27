'use client'
import Image, { ImageProps } from 'next/image'
import { useState } from 'react'
import clsx from 'clsx'

export default function ImageFallback({ src = '', alt = '', className, ...props }: ImageProps) {
  const fallbackUrl = '/fallback-image.webp'
  const [imgSrc, setImgSrc] = useState(src || fallbackUrl)

  return (
    <Image
      {...props}
      alt={alt || 'image'}
      src={imgSrc}
      className={clsx('object-cover', className)}
      onError={() => {
        setImgSrc(fallbackUrl)
      }}
    />
  )
}
