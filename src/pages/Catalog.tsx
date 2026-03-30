import { useEffect, useState, useCallback, useMemo, memo } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import type { Product, Category } from '../lib/types'
import { Search, X, Plus, Minus, Package, ChevronDown } from 'lucide-react'

const PAGE_SIZE = 50

const StockBadge = memo(function StockBadge({ stock, minStock }: { stock: number; minStock: number }) {
  if (stock === 0) {
    return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">Agotado</span>
  }
  if (stock <= minStock) {
    return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700">{stock}</span>
  }
  return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">{stock}</span>
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
  return (
    <button
      onClick={() => onSelect(product)}
      className="bg-white rounded-xl shadow-sm p-4 text-left w-full active:bg-gray-50 transition-colors border border-gray-100"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="font-medium text-gray-900 text-sm leading-tight truncate">{product.name}</p>
          <p className="text-xs text-gray-400 mt-0.5 font-mono">{product.sku}</p>
          {categoryName && (
            <p className="text-xs text-[#0f3460]/60 mt-1">{categoryName}</p>
          )}
        </div>
        <StockBadge stock={product.stock} minStock={product.min_stock} />
      </div>
    </button>
  )
})

function ProductDetail({
  product,
  categoryName,
  isAdmin,
  onClose,
  onStockChange,
}: {
  product: Product
  categoryName: string
  isAdmin: boolean
  onClose: () => void
  onStockChange: (productId: string, delta: number) => Promise<void>
}) {
  const [adjusting, setAdjusting] = useState(false)

  const handleStockChange = async (delta: number) => {
    setAdjusting(true)
    await onStockChange(product.id, delta)
    setAdjusting(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white w-full max-w-lg rounded-t-2xl sm:rounded-2xl max-h-[85vh] overflow-y-auto safe-area-bottom">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-100 px-4 py-3 flex items-center justify-between rounded-t-2xl">
          <h2 className="text-lg font-bold text-gray-900 truncate pr-4">{product.name}</h2>
          <button onClick={onClose} className="p-2 -mr-2 text-gray-400 hover:text-gray-600 min-w-[44px] min-h-[44px] flex items-center justify-center">
            <X size={20} />
          </button>
        </div>

        <div className="p-4 space-y-4">
          {/* SKU & Category */}
          <div className="flex items-center gap-3 flex-wrap">
            <span className="bg-gray-100 text-gray-600 text-xs font-mono px-2.5 py-1 rounded-lg">{product.sku}</span>
            {categoryName && (
              <span className="bg-[#0f3460]/10 text-[#0f3460] text-xs px-2.5 py-1 rounded-lg">{categoryName}</span>
            )}
          </div>

          {/* Stock Section */}
          <div className="bg-gray-50 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Stock actual</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-2xl font-bold text-gray-900">{product.stock}</span>
                  <StockBadge stock={product.stock} minStock={product.min_stock} />
                </div>
                <p className="text-xs text-gray-400 mt-1">Min: {product.min_stock}</p>
              </div>

              {isAdmin && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleStockChange(-1)}
                    disabled={adjusting || product.stock === 0}
                    className="w-11 h-11 rounded-xl bg-white border border-gray-200 flex items-center justify-center text-gray-600 hover:bg-gray-100 disabled:opacity-30 active:bg-gray-200 transition-colors"
                  >
                    <Minus size={18} />
                  </button>
                  <button
                    onClick={() => handleStockChange(1)}
                    disabled={adjusting}
                    className="w-11 h-11 rounded-xl bg-[#0f3460] flex items-center justify-center text-white hover:bg-[#0b2545] disabled:opacity-50 active:bg-[#0b2545] transition-colors"
                  >
                    <Plus size={18} />
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Description */}
          {product.description && (
            <div>
              <p className="text-sm font-medium text-gray-700 mb-1">Descripcion</p>
              <p className="text-sm text-gray-500 leading-relaxed">{product.description}</p>
            </div>
          )}

          {/* Dimensions */}
          {product.dimensions && (
            <div>
              <p className="text-sm font-medium text-gray-700 mb-1">Dimensiones</p>
              <p className="text-sm text-gray-500">{product.dimensions}</p>
            </div>
          )}

          {/* Colors */}
          {product.colors && product.colors.length > 0 && (
            <div>
              <p className="text-sm font-medium text-gray-700 mb-1">Colores</p>
              <div className="flex flex-wrap gap-1.5">
                {product.colors.map((c) => (
                  <span key={c} className="bg-gray-100 text-gray-600 text-xs px-2.5 py-1 rounded-lg">{c}</span>
                ))}
              </div>
            </div>
          )}

          {/* Materials */}
          {product.materials && product.materials.length > 0 && (
            <div>
              <p className="text-sm font-medium text-gray-700 mb-1">Materiales</p>
              <div className="flex flex-wrap gap-1.5">
                {product.materials.map((m) => (
                  <span key={m} className="bg-gray-100 text-gray-600 text-xs px-2.5 py-1 rounded-lg">{m}</span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default function Catalog() {
  const { profile } = useAuth()
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [page, setPage] = useState(0)
  const [hasMore, setHasMore] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)

  const isAdmin = profile?.role === 'admin'

  const categoryMap = useMemo(() => {
    const map = new Map<string, string>()
    for (const c of categories) {
      map.set(c.id, c.name)
    }
    return map
  }, [categories])

  const fetchProducts = useCallback(async (pageNum: number, searchTerm: string, categoryId: string | null, replace: boolean) => {
    if (replace) setLoading(true)
    else setLoadingMore(true)

    let query = supabase
      .from('products')
      .select('*')
      .eq('is_active', true)
      .order('name')
      .range(pageNum * PAGE_SIZE, (pageNum + 1) * PAGE_SIZE - 1)

    if (searchTerm.trim()) {
      const term = `%${searchTerm.trim()}%`
      query = query.or(`name.ilike.${term},sku.ilike.${term}`)
    }

    if (categoryId) {
      query = query.eq('category_id', categoryId)
    }

    const { data, error } = await query

    if (!error && data) {
      if (replace) {
        setProducts(data)
      } else {
        setProducts((prev) => [...prev, ...data])
      }
      setHasMore(data.length === PAGE_SIZE)
    }

    setLoading(false)
    setLoadingMore(false)
  }, [])

  // Fetch categories once
  useEffect(() => {
    supabase.from('categories').select('*').order('name').then(({ data }) => {
      if (data) setCategories(data)
    })
  }, [])

  // Fetch products on search/category change
  useEffect(() => {
    setPage(0)
    fetchProducts(0, search, selectedCategory, true)
  }, [search, selectedCategory, fetchProducts])

  // Real-time subscription
  useEffect(() => {
    const channel = supabase
      .channel('products-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'products' },
        (payload) => {
          if (payload.eventType === 'UPDATE') {
            const updated = payload.new as Product
            setProducts((prev) =>
              prev.map((p) => (p.id === updated.id ? { ...p, ...updated } : p))
            )
            // Also update selected product if open
            setSelectedProduct((prev) =>
              prev?.id === updated.id ? { ...prev, ...updated } : prev
            )
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  const loadMore = () => {
    const nextPage = page + 1
    setPage(nextPage)
    fetchProducts(nextPage, search, selectedCategory, false)
  }

  const handleStockChange = async (productId: string, delta: number) => {
    const product = products.find((p) => p.id === productId)
    if (!product) return

    const newStock = Math.max(0, product.stock + delta)
    await supabase
      .from('products')
      .update({ stock: newStock })
      .eq('id', productId)

    // Also record stock movement
    await supabase.from('stock_movements').insert({
      product_id: productId,
      user_id: profile?.id ?? null,
      type: delta > 0 ? 'in' : 'out',
      quantity: Math.abs(delta),
      reason: 'Ajuste manual',
    })
  }

  const handleSelectProduct = useCallback((p: Product) => {
    setSelectedProduct(p)
  }, [])

  return (
    <div className="flex flex-col h-full">
      {/* Search - sticky */}
      <div className="sticky top-0 z-30 bg-gray-50 px-4 pt-3 pb-2 space-y-2">
        <div className="relative">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar por nombre o SKU..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-10 py-3 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0f3460] focus:border-transparent transition-shadow"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 p-1"
            >
              <X size={16} />
            </button>
          )}
        </div>

        {/* Category chips */}
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4 scrollbar-hide">
          <button
            onClick={() => setSelectedCategory(null)}
            className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
              !selectedCategory
                ? 'bg-[#0f3460] text-white'
                : 'bg-white text-gray-600 border border-gray-200'
            }`}
          >
            Todos
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(selectedCategory === cat.id ? null : cat.id)}
              className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                selectedCategory === cat.id
                  ? 'bg-[#0f3460] text-white'
                  : 'bg-white text-gray-600 border border-gray-200'
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>
      </div>

      {/* Products */}
      <div className="flex-1 px-4 pb-4">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-[#0f3460] border-t-transparent" />
          </div>
        ) : products.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-400">
            <Package size={48} className="mb-3" />
            <p className="text-sm">No se encontraron productos</p>
          </div>
        ) : (
          <>
            <p className="text-xs text-gray-400 mb-2 mt-1">
              {products.length} producto{products.length !== 1 ? 's' : ''}
            </p>
            <div className="grid gap-2">
              {products.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  categoryName={categoryMap.get(product.category_id ?? '') ?? ''}
                  onSelect={handleSelectProduct}
                />
              ))}
            </div>

            {hasMore && (
              <button
                onClick={loadMore}
                disabled={loadingMore}
                className="w-full mt-4 py-3 text-sm font-medium text-[#0f3460] bg-white border border-gray-200 rounded-xl hover:bg-gray-50 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
              >
                {loadingMore ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-[#0f3460] border-t-transparent" />
                ) : (
                  <>
                    <ChevronDown size={16} />
                    Cargar mas
                  </>
                )}
              </button>
            )}
          </>
        )}
      </div>

      {/* Product Detail Sheet */}
      {selectedProduct && (
        <ProductDetail
          product={selectedProduct}
          categoryName={categoryMap.get(selectedProduct.category_id ?? '') ?? ''}
          isAdmin={isAdmin}
          onClose={() => setSelectedProduct(null)}
          onStockChange={handleStockChange}
        />
      )}
    </div>
  )
}
