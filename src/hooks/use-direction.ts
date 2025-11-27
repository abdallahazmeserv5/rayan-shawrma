import { useLocale } from 'next-intl'

export const useDirection = () => {
  const local = useLocale()
  const isRtl = local === 'ar'
  const dir = isRtl ? 'rtl' : ('ltr' as const)
  return { isRtl, dir }
}
