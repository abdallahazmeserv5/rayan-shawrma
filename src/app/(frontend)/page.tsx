import { ProductsList } from '@/components/products/products-list'
import { FloatingCart } from '@/components/cart/floating-cart'

export default async function Home() {
  return (
    <main className="w-full flex flex-col gap-8 bg-white">
      <section className="container mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-2">Our Menu</h1>
          <p className="text-muted-foreground">Choose your favorite dishes</p>
        </div>

        <ProductsList />
      </section>

      <FloatingCart />
    </main>
  )
}
