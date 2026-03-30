import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import type { Product, Sale, Client, SaleStatus, SaleChannel } from '../lib/types'
import {
  Plus,
  Search,
  X,
  Minus,
  ShoppingCart,
  ChevronRight,
  ArrowLeft,
  Check,
  Trash2,
} from 'lucide-react'

const STATUS_LABELS: Record<SaleStatus, string> = {
  quoted: 'Cotizado',
  sold: 'Vendido',
  preparing: 'Preparando',
  delivered: 'Entregado',
  cancelled: 'Cancelado',
}

const STATUS_COLORS: Record<SaleStatus, string> = {
  quoted: 'bg-blue-100 text-blue-700',
  sold: 'bg-green-100 text-green-700',
  preparing: 'bg-yellow-100 text-yellow-700',
  delivered: 'bg-gray-100 text-gray-600',
  cancelled: 'bg-red-100 text-red-700',
}

const CHANNEL_LABELS: Record<SaleChannel, string> = {
  store: 'Tienda',
  whatsapp: 'WhatsApp',
  phone: 'Telefono',
}

const STATUS_FLOW: SaleStatus[] = ['quoted', 'sold', 'preparing', 'delivered']

interface CartItem {
  product: Product
  quantity: number
  unit_price: number
}

// ---- Sale Creation Flow ----

function NewSaleFlow({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const { profile } = useAuth()
  const [step, setStep] = useState<'products' | 'client' | 'confirm'>('products')
  const [cart, setCart] = useState<CartItem[]>([])
  const [channel, setChannel] = useState<SaleChannel>('store')
  const [notes, setNotes] = useState('')
  const [creating, setCreating] = useState(false)

  // Client fields
  const [clientSearch, setClientSearch] = useState('')
  const [clientResults, setClientResults] = useState<Client[]>([])
  const [selectedClient, setSelectedClient] = useState<Client | null>(null)
  const [clientName, setClientName] = useState('')
  const [clientPhone, setClientPhone] = useState('')

  // Product search
  const [productSearch, setProductSearch] = useState('')
  const [productResults, setProductResults] = useState<Product[]>([])
  const [searchingProducts, setSearchingProducts] = useState(false)

  const total = cart.reduce((sum, item) => sum + item.quantity * item.unit_price, 0)

  const searchProducts = useCallback(async (term: string) => {
    if (term.trim().length < 2) {
      setProductResults([])
      return
    }
    setSearchingProducts(true)
    const t = `%${term.trim()}%`
    const { data } = await supabase
      .from('products')
      .select('*')
      .eq('is_active', true)
      .gt('stock', 0)
      .or(`name.ilike.${t},sku.ilike.${t}`)
      .order('name')
      .limit(20)
    setProductResults(data ?? [])
    setSearchingProducts(false)
  }, [])

  useEffect(() => {
    const timer = setTimeout(() => searchProducts(productSearch), 300)
    return () => clearTimeout(timer)
  }, [productSearch, searchProducts])

  const searchClients = useCallback(async (term: string) => {
    if (term.trim().length < 2) {
      setClientResults([])
      return
    }
    const t = `%${term.trim()}%`
    const { data } = await supabase
      .from('clients')
      .select('*')
      .or(`name.ilike.${t},phone.ilike.${t}`)
      .limit(10)
    setClientResults(data ?? [])
  }, [])

  useEffect(() => {
    const timer = setTimeout(() => searchClients(clientSearch), 300)
    return () => clearTimeout(timer)
  }, [clientSearch, searchClients])

  const addToCart = (product: Product) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.product.id === product.id)
      if (existing) {
        return prev.map((item) =>
          item.product.id === product.id
            ? { ...item, quantity: Math.min(item.quantity + 1, product.stock) }
            : item
        )
      }
      return [...prev, { product, quantity: 1, unit_price: 0 }]
    })
  }

  const updateQuantity = (productId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.product.id !== productId) return item
          const newQty = item.quantity + delta
          if (newQty <= 0) return null
          return { ...item, quantity: Math.min(newQty, item.product.stock) }
        })
        .filter(Boolean) as CartItem[]
    )
  }

  const updatePrice = (productId: string, price: number) => {
    setCart((prev) =>
      prev.map((item) =>
        item.product.id === productId ? { ...item, unit_price: price } : item
      )
    )
  }

  const removeFromCart = (productId: string) => {
    setCart((prev) => prev.filter((item) => item.product.id !== productId))
  }

  const selectClient = (client: Client) => {
    setSelectedClient(client)
    setClientName(client.name)
    setClientPhone(client.phone ?? '')
    setClientSearch('')
    setClientResults([])
  }

  const handleCreate = async () => {
    if (cart.length === 0) return
    setCreating(true)

    try {
      // Create or find client
      let clientId: string | null = null
      if (selectedClient) {
        clientId = selectedClient.id
      } else if (clientName.trim()) {
        const { data: newClient } = await supabase
          .from('clients')
          .insert({ name: clientName.trim(), phone: clientPhone.trim() || null })
          .select()
          .single()
        clientId = newClient?.id ?? null
      }

      // Create sale
      const { data: sale } = await supabase
        .from('sales')
        .insert({
          client_id: clientId,
          seller_id: profile?.id ?? null,
          status: 'quoted' as SaleStatus,
          channel,
          notes: notes.trim() || null,
          total,
        })
        .select()
        .single()

      if (sale) {
        // Create sale items
        const items = cart.map((item) => ({
          sale_id: sale.id,
          product_id: item.product.id,
          quantity: item.quantity,
          unit_price: item.unit_price,
          subtotal: item.quantity * item.unit_price,
        }))
        await supabase.from('sale_items').insert(items)
      }

      onCreated()
    } catch {
      // Error handling silently
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-gray-50 flex flex-col">
      {/* Header */}
      <div className="bg-[#0f3460] text-white px-4 py-3 flex items-center gap-3">
        <button onClick={step === 'products' ? onClose : () => setStep(step === 'confirm' ? 'client' : 'products')} className="p-1 min-w-[44px] min-h-[44px] flex items-center justify-center">
          <ArrowLeft size={20} />
        </button>
        <h2 className="text-lg font-bold flex-1">
          {step === 'products' && 'Agregar Productos'}
          {step === 'client' && 'Datos del Cliente'}
          {step === 'confirm' && 'Confirmar Venta'}
        </h2>
        {step === 'products' && cart.length > 0 && (
          <button
            onClick={() => setStep('client')}
            className="bg-white/20 px-3 py-1.5 rounded-lg text-sm font-medium flex items-center gap-1"
          >
            Siguiente <ChevronRight size={16} />
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Step 1: Products */}
        {step === 'products' && (
          <div className="p-4 space-y-3">
            <div className="relative">
              <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar producto por nombre o SKU..."
                value={productSearch}
                onChange={(e) => setProductSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0f3460]"
                autoFocus
              />
            </div>

            {/* Search results */}
            {searchingProducts && (
              <div className="flex justify-center py-4">
                <div className="animate-spin rounded-full h-6 w-6 border-2 border-[#0f3460] border-t-transparent" />
              </div>
            )}
            {productResults.length > 0 && (
              <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
                {productResults.map((p) => {
                  const inCart = cart.find((i) => i.product.id === p.id)
                  return (
                    <button
                      key={p.id}
                      onClick={() => addToCart(p)}
                      className="w-full px-4 py-3 flex items-center justify-between text-left active:bg-gray-50"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-gray-800 truncate">{p.name}</p>
                        <p className="text-xs text-gray-400 font-mono">{p.sku} - Stock: {p.stock}</p>
                      </div>
                      {inCart ? (
                        <span className="text-xs font-medium text-[#0cca4a] bg-green-50 px-2 py-1 rounded-lg">
                          x{inCart.quantity}
                        </span>
                      ) : (
                        <Plus size={18} className="text-[#0f3460] shrink-0" />
                      )}
                    </button>
                  )
                })}
              </div>
            )}

            {/* Cart */}
            {cart.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                  <ShoppingCart size={16} />
                  Carrito ({cart.length})
                </h3>
                <div className="space-y-2">
                  {cart.map((item) => (
                    <div key={item.product.id} className="bg-white rounded-xl border border-gray-200 p-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-800 truncate">{item.product.name}</p>
                          <p className="text-xs text-gray-400 font-mono">{item.product.sku}</p>
                        </div>
                        <button onClick={() => removeFromCart(item.product.id)} className="text-gray-300 hover:text-red-400 p-1">
                          <Trash2 size={16} />
                        </button>
                      </div>
                      <div className="flex items-center justify-between mt-2 gap-3">
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => updateQuantity(item.product.id, -1)}
                            className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center text-gray-600 active:bg-gray-200"
                          >
                            <Minus size={14} />
                          </button>
                          <span className="w-8 text-center text-sm font-medium">{item.quantity}</span>
                          <button
                            onClick={() => updateQuantity(item.product.id, 1)}
                            disabled={item.quantity >= item.product.stock}
                            className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center text-gray-600 active:bg-gray-200 disabled:opacity-30"
                          >
                            <Plus size={14} />
                          </button>
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="text-xs text-gray-400">$</span>
                          <input
                            type="number"
                            value={item.unit_price || ''}
                            onChange={(e) => updatePrice(item.product.id, parseFloat(e.target.value) || 0)}
                            placeholder="Precio"
                            className="w-24 text-right text-sm border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-[#0f3460]"
                            min="0"
                            step="0.01"
                          />
                        </div>
                      </div>
                      {item.unit_price > 0 && (
                        <p className="text-xs text-gray-400 text-right mt-1">
                          Subtotal: ${(item.quantity * item.unit_price).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                        </p>
                      )}
                    </div>
                  ))}
                </div>

                <div className="mt-3 bg-[#0f3460]/5 rounded-xl p-3 flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">Total</span>
                  <span className="text-lg font-bold text-[#0f3460]">
                    ${total.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Step 2: Client */}
        {step === 'client' && (
          <div className="p-4 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Buscar cliente existente</label>
              <div className="relative">
                <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Nombre o telefono..."
                  value={clientSearch}
                  onChange={(e) => setClientSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0f3460]"
                />
              </div>
              {clientResults.length > 0 && (
                <div className="mt-2 bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
                  {clientResults.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => selectClient(c)}
                      className="w-full px-4 py-3 text-left active:bg-gray-50 flex items-center justify-between"
                    >
                      <div>
                        <p className="text-sm font-medium text-gray-800">{c.name}</p>
                        {c.phone && <p className="text-xs text-gray-400">{c.phone}</p>}
                      </div>
                      <ChevronRight size={16} className="text-gray-300" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="border-t border-gray-200 pt-4">
              <p className="text-xs text-gray-400 mb-3">O ingresa los datos manualmente:</p>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nombre del cliente</label>
                  <input
                    type="text"
                    value={clientName}
                    onChange={(e) => { setClientName(e.target.value); setSelectedClient(null) }}
                    placeholder="Nombre completo"
                    className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0f3460]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Telefono</label>
                  <input
                    type="tel"
                    value={clientPhone}
                    onChange={(e) => setClientPhone(e.target.value)}
                    placeholder="(opcional)"
                    className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0f3460]"
                  />
                </div>
              </div>
            </div>

            {/* Channel */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Canal de venta</label>
              <div className="flex gap-2">
                {(['store', 'whatsapp', 'phone'] as SaleChannel[]).map((ch) => (
                  <button
                    key={ch}
                    onClick={() => setChannel(ch)}
                    className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                      channel === ch
                        ? 'bg-[#0f3460] text-white'
                        : 'bg-white text-gray-600 border border-gray-200'
                    }`}
                  >
                    {CHANNEL_LABELS[ch]}
                  </button>
                ))}
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Notas (opcional)</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Observaciones..."
                rows={2}
                className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0f3460] resize-none"
              />
            </div>

            <button
              onClick={() => setStep('confirm')}
              className="w-full bg-[#0f3460] text-white py-3 rounded-xl font-semibold active:scale-[0.98] transform transition-all"
            >
              Revisar Venta
            </button>
          </div>
        )}

        {/* Step 3: Confirm */}
        {step === 'confirm' && (
          <div className="p-4 space-y-4">
            {/* Client summary */}
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <p className="text-xs text-gray-400 mb-1">Cliente</p>
              <p className="text-sm font-medium text-gray-800">{clientName || 'Sin cliente'}</p>
              {clientPhone && <p className="text-xs text-gray-500">{clientPhone}</p>}
              <p className="text-xs text-gray-400 mt-2">Canal: {CHANNEL_LABELS[channel]}</p>
              {notes && <p className="text-xs text-gray-400 mt-1">Notas: {notes}</p>}
            </div>

            {/* Items summary */}
            <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
              {cart.map((item) => (
                <div key={item.product.id} className="px-4 py-3 flex items-center justify-between">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-800 truncate">{item.product.name}</p>
                    <p className="text-xs text-gray-400">x{item.quantity} @ ${item.unit_price.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</p>
                  </div>
                  <span className="text-sm font-semibold text-gray-700 ml-3">
                    ${(item.quantity * item.unit_price).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              ))}
            </div>

            <div className="bg-[#0f3460]/5 rounded-xl p-4 flex items-center justify-between">
              <span className="font-semibold text-gray-700">Total</span>
              <span className="text-xl font-bold text-[#0f3460]">
                ${total.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
              </span>
            </div>

            <button
              onClick={handleCreate}
              disabled={creating || cart.length === 0}
              className="w-full bg-[#0cca4a] text-white py-3.5 rounded-xl font-bold text-base active:scale-[0.98] transform transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {creating ? (
                <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" />
              ) : (
                <>
                  <Check size={20} />
                  Confirmar Venta
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// ---- Status update modal ----

function StatusUpdateSheet({
  sale,
  onClose,
  onUpdate,
}: {
  sale: Sale
  onClose: () => void
  onUpdate: () => void
}) {
  const [updating, setUpdating] = useState(false)
  const currentIdx = STATUS_FLOW.indexOf(sale.status as SaleStatus)

  const handleUpdateStatus = async (newStatus: SaleStatus) => {
    setUpdating(true)
    await supabase.from('sales').update({ status: newStatus, updated_at: new Date().toISOString() }).eq('id', sale.id)
    setUpdating(false)
    onUpdate()
  }

  const clientObj = sale.client as { name: string } | null

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white w-full max-w-lg rounded-t-2xl sm:rounded-2xl safe-area-bottom">
        <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
          <h3 className="font-bold text-gray-900">Detalle de Venta</h3>
          <button onClick={onClose} className="p-2 text-gray-400 min-w-[44px] min-h-[44px] flex items-center justify-center">
            <X size={20} />
          </button>
        </div>
        <div className="p-4 space-y-3">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-medium text-gray-800">{clientObj?.name ?? 'Sin cliente'}</p>
              <p className="text-xs text-gray-400">
                {new Date(sale.created_at).toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' })}
              </p>
              <p className="text-xs text-gray-400">Canal: {CHANNEL_LABELS[sale.channel] ?? sale.channel}</p>
            </div>
            <span className="text-lg font-bold text-gray-800">
              ${Number(sale.total).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
            </span>
          </div>

          <div>
            <p className="text-xs text-gray-400 mb-2">Estado actual</p>
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${STATUS_COLORS[sale.status as SaleStatus] ?? ''}`}>
              {STATUS_LABELS[sale.status as SaleStatus] ?? sale.status}
            </span>
          </div>

          {sale.status !== 'cancelled' && sale.status !== 'delivered' && (
            <div>
              <p className="text-xs text-gray-400 mb-2">Cambiar estado</p>
              <div className="flex flex-wrap gap-2">
                {STATUS_FLOW.slice(currentIdx + 1).map((s) => (
                  <button
                    key={s}
                    onClick={() => handleUpdateStatus(s)}
                    disabled={updating}
                    className={`px-3 py-2 rounded-xl text-sm font-medium border transition-colors active:scale-95 ${STATUS_COLORS[s]} border-transparent disabled:opacity-50`}
                  >
                    {STATUS_LABELS[s]}
                  </button>
                ))}
                <button
                  onClick={() => handleUpdateStatus('cancelled')}
                  disabled={updating}
                  className="px-3 py-2 rounded-xl text-sm font-medium bg-red-50 text-red-600 border border-red-100 disabled:opacity-50 active:scale-95"
                >
                  Cancelar
                </button>
              </div>
            </div>
          )}

          {sale.notes && (
            <div>
              <p className="text-xs text-gray-400 mb-1">Notas</p>
              <p className="text-sm text-gray-600">{sale.notes}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ---- Main Sales Page ----

export default function Sales() {
  const [sales, setSales] = useState<Sale[]>([])
  const [loading, setLoading] = useState(true)
  const [showNew, setShowNew] = useState(false)
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null)

  const fetchSales = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('sales')
      .select('*, client:clients(name)')
      .order('created_at', { ascending: false })
      .limit(50)
    setSales((data ?? []) as Sale[])
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchSales()
  }, [fetchSales])

  const handleSaleCreated = () => {
    setShowNew(false)
    fetchSales()
  }

  const handleStatusUpdated = () => {
    setSelectedSale(null)
    fetchSales()
  }

  if (showNew) {
    return <NewSaleFlow onClose={() => setShowNew(false)} onCreated={handleSaleCreated} />
  }

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">Ventas</h1>
        <button
          onClick={() => setShowNew(true)}
          className="bg-[#0f3460] text-white px-4 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-1.5 active:scale-95 transition-transform"
        >
          <Plus size={18} />
          Nueva Venta
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-[#0f3460] border-t-transparent" />
        </div>
      ) : sales.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-gray-400">
          <ShoppingCart size={48} className="mb-3" />
          <p className="text-sm">No hay ventas registradas</p>
        </div>
      ) : (
        <div className="space-y-2">
          {sales.map((sale) => {
            const clientObj = sale.client as { name: string } | null
            return (
              <button
                key={sale.id}
                onClick={() => setSelectedSale(sale)}
                className="w-full bg-white rounded-xl shadow-sm border border-gray-100 p-4 text-left active:bg-gray-50 transition-colors"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-800 truncate">
                      {clientObj?.name ?? 'Sin cliente'}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-gray-400">
                        {new Date(sale.created_at).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })}
                      </span>
                      <span className="text-xs text-gray-300">|</span>
                      <span className="text-xs text-gray-400">{CHANNEL_LABELS[sale.channel] ?? sale.channel}</span>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-semibold text-gray-800">
                      ${Number(sale.total).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                    </p>
                    <span className={`inline-block mt-1 px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[sale.status as SaleStatus] ?? ''}`}>
                      {STATUS_LABELS[sale.status as SaleStatus] ?? sale.status}
                    </span>
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      )}

      {selectedSale && (
        <StatusUpdateSheet
          sale={selectedSale}
          onClose={() => setSelectedSale(null)}
          onUpdate={handleStatusUpdated}
        />
      )}
    </div>
  )
}
