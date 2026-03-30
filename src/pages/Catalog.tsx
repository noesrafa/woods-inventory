import { useEffect, useState, useCallback, useMemo, memo } from 'react'
import { supabase } from '../lib/supabase'
import type { Product, Category } from '../lib/types'
import { Search, X, Package, ChevronDown, ExternalLink, QrCode, Image } from 'lucide-react'
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription } from '@/components/ui/drawer'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

const PAGE_SIZE = 50

const QrBadge = memo(function QrBadge({ status }: { status: string | null }) {
  if (!status) return null
  const variant = status === 'FUNCIONA' ? 'success' as const
    : status === 'NO FUNCIONA' ? 'danger' as const
    : 'muted' as const
  return <Badge variant={variant}><QrCode size={10} /> {status}</Badge>
})

const ProductCard = memo(function ProductCard({
  product,
  categoryName,
  onSelect,
}: {
  product: Product
  categoryName: string
  onSelect: (p: Product) => void
}) {
  const thumbnail = product.images?.[0]
  const hasValidImage = !!thumbnail
  return (
    <button
      onClick={() => onSelect(product)}
      className="bg-surface rounded-xl shadow-sm p-3 text-left w-full active:bg-surface-hover transition-colors border border-bdr-l overflow-hidden"
    >
      <div className="flex items-start gap-3 min-w-0">
        {hasValidImage ? (
          <img src={thumbnail} alt="" className="w-14 h-14 rounded-lg object-cover bg-app-bg shrink-0" />
        ) : (
          <div className="w-14 h-14 rounded-lg bg-app-bg flex items-center justify-center shrink-0">
            <Image size={20} className="text-txt-m" />
          </div>
        )}
        <div className="flex-1 min-w-0 overflow-hidden">
          <p className="font-medium text-txt text-sm leading-tight truncate">{product.name}</p>
          <p className="text-xs text-txt-m mt-0.5 font-mono truncate">{product.sku}</p>
          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
            {categoryName && <Badge>{categoryName}</Badge>}
            <QrBadge status={product.qr_status} />
          </div>
        </div>
      </div>
    </button>
  )
})

function ProductDetail({
  product,
  categoryName,
  onClose,
}: {
  product: Product
  categoryName: string
  onClose: () => void
}) {
  const [activeImage, setActiveImage] = useState(0)
  const validImages = product.images || []

  return (
    <Drawer open onOpenChange={(open) => { if (!open) onClose() }}>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>{product.name}</DrawerTitle>
          <DrawerDescription className="sr-only">Detalle del producto</DrawerDescription>
        </DrawerHeader>

        <div className="overflow-y-auto p-4 space-y-4">
          {validImages.length > 0 && (
            <div>
              <img src={validImages[activeImage]} alt="" className="w-full h-48 object-contain bg-app-bg rounded-xl" />
              {validImages.length > 1 && (
                <div className="flex gap-2 mt-2 overflow-x-auto pb-1">
                  {validImages.map((url, idx) => (
                    <button key={idx} onClick={() => setActiveImage(idx)}
                      className={`w-12 h-12 rounded-lg overflow-hidden shrink-0 border-2 ${activeImage === idx ? 'border-accent' : 'border-transparent'}`}>
                      <img src={url} alt="" className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="outline" className="font-mono">{product.sku}</Badge>
            {categoryName && <Badge>{categoryName}</Badge>}
            <QrBadge status={product.qr_status} />
          </div>

          {product.short_description && (
            <div>
              <p className="text-sm font-medium text-txt-s mb-1">Descripcion (Lista de precios)</p>
              <p className="text-sm text-txt-s leading-relaxed whitespace-pre-line">{product.short_description}</p>
            </div>
          )}

          {product.full_description && (
            <div>
              <p className="text-sm font-medium text-txt-s mb-1">Descripcion TDS</p>
              <p className="text-sm text-txt-s leading-relaxed whitespace-pre-line">{product.full_description}</p>
            </div>
          )}

          {product.observations && (
            <div className="bg-warning-bg rounded-xl p-3">
              <p className="text-sm font-medium text-warning-text mb-1">Observaciones</p>
              <p className="text-xs text-warning-text/80 leading-relaxed">{product.observations}</p>
            </div>
          )}

          {product.store_url && (
            <Button variant="link" asChild className="p-0 h-auto">
              <a href={product.store_url} target="_blank" rel="noopener noreferrer">
                <ExternalLink size={14} /> Ver en tienda
              </a>
            </Button>
          )}
        </div>
      </DrawerContent>
    </Drawer>
  )
}

export default function Catalog() {
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [page, setPage] = useState(0)
  const [hasMore, setHasMore] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)

  const categoryMap = useMemo(() => {
    const map = new Map<string, string>()
    for (const c of categories) map.set(c.id, c.name)
    return map
  }, [categories])

  const fetchProducts = useCallback(async (pageNum: number, searchTerm: string, categoryId: string | null, replace: boolean) => {
    if (replace) setLoading(true)
    else setLoadingMore(true)

    let query = supabase.from('products').select('*').eq('is_active', true).order('name')
      .range(pageNum * PAGE_SIZE, (pageNum + 1) * PAGE_SIZE - 1)

    if (searchTerm.trim()) {
      const term = `%${searchTerm.trim()}%`
      query = query.or(`name.ilike.${term},sku.ilike.${term}`)
    }
    if (categoryId) query = query.eq('category_id', categoryId)

    const { data, error } = await query
    if (!error && data) {
      if (replace) setProducts(data)
      else setProducts((prev) => [...prev, ...data])
      setHasMore(data.length === PAGE_SIZE)
    }
    setLoading(false)
    setLoadingMore(false)
  }, [])

  useEffect(() => {
    supabase.from('categories').select('*').order('name').then(({ data }) => { if (data) setCategories(data) })
  }, [])

  useEffect(() => {
    setPage(0)
    fetchProducts(0, search, selectedCategory, true)
  }, [search, selectedCategory, fetchProducts])

  useEffect(() => {
    const channel = supabase.channel('products-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, (payload) => {
        if (payload.eventType === 'UPDATE') {
          const updated = payload.new as Product
          setProducts((prev) => prev.map((p) => (p.id === updated.id ? { ...p, ...updated } : p)))
          setSelectedProduct((prev) => prev?.id === updated.id ? { ...prev, ...updated } : prev)
        }
      }).subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [])

  const loadMore = () => {
    const nextPage = page + 1
    setPage(nextPage)
    fetchProducts(nextPage, search, selectedCategory, false)
  }

  const handleSelectProduct = useCallback((p: Product) => { setSelectedProduct(p) }, [])

  return (
    <div className="flex flex-col h-full">
      <div className="shrink-0 bg-app-bg px-4 pt-3 pb-2 space-y-2 z-10">
        <div className="relative">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-txt-m" />
          <Input
            type="text"
            placeholder="Buscar por nombre o SKU..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 pr-10"
          />
          {search && <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-txt-m p-1"><X size={16} /></button>}
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4 scrollbar-hide">
          <Button
            variant={!selectedCategory ? 'default' : 'secondary'}
            size="sm"
            onClick={() => setSelectedCategory(null)}
            className="shrink-0 rounded-full"
          >
            Todos
          </Button>
          {categories.map((cat) => (
            <Button
              key={cat.id}
              variant={selectedCategory === cat.id ? 'default' : 'secondary'}
              size="sm"
              onClick={() => setSelectedCategory(selectedCategory === cat.id ? null : cat.id)}
              className="shrink-0 rounded-full"
            >
              {cat.name}
            </Button>
          ))}
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto px-4 pb-8">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-accent border-t-transparent" />
          </div>
        ) : products.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-txt-m">
            <Package size={48} className="mb-3" />
            <p className="text-sm">No se encontraron productos</p>
          </div>
        ) : (
          <>
            <p className="text-xs text-txt-m mb-2 mt-1">{products.length} producto{products.length !== 1 ? 's' : ''}</p>
            <div className="grid gap-2">
              {products.map((product) => (
                <ProductCard key={product.id} product={product}
                  categoryName={categoryMap.get(product.category_id ?? '') ?? ''} onSelect={handleSelectProduct} />
              ))}
            </div>
            {hasMore && (
              <Button variant="secondary" className="w-full mt-4" onClick={loadMore} disabled={loadingMore}>
                {loadingMore ? <div className="animate-spin rounded-full h-4 w-4 border-2 border-accent border-t-transparent" />
                  : <><ChevronDown size={16} /> Cargar mas</>}
              </Button>
            )}
          </>
        )}
      </div>

      {selectedProduct && (
        <ProductDetail product={selectedProduct} categoryName={categoryMap.get(selectedProduct.category_id ?? '') ?? ''}
          onClose={() => setSelectedProduct(null)} />
      )}
    </div>
  )
}
