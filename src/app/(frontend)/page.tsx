import { ProductsList } from '@/components/products/products-list'
import { FloatingCart } from '@/components/cart/floating-cart'
import { MenuHeader } from '@/components/menu-header'

export default async function Home() {
  return (
    <main className="w-full flex flex-col bg-gray-50 min-h-screen">
      <MenuHeader />

      <section className="container mx-auto py-6">
        <ProductsList />
      </section>

      <FloatingCart />
    </main>
  )
}
