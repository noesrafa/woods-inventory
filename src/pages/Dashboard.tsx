import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { Product, Sale } from '../lib/types'
import { Package, AlertTriangle, XCircle, ShoppingCart, TrendingUp } from 'lucide-react'

interface DashboardStats {
  totalProducts: number
  inStock: number
  lowStock: number
  outOfStock: number
  salesToday: number
}

const STATUS_LABELS: Record<string, string> = {
  quoted: 'Cotizado',
  sold: 'Vendido',
  preparing: 'Preparando',
  delivered: 'Entregado',
  cancelled: 'Cancelado',
}

const STATUS_COLORS: Record<string, string> = {
  quoted: 'bg-blue-100 text-blue-700',
  sold: 'bg-green-100 text-green-700',
  preparing: 'bg-yellow-100 text-yellow-700',
  delivered: 'bg-gray-100 text-gray-600',
  cancelled: 'bg-red-100 text-red-700',
}

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [lowStockProducts, setLowStockProducts] = useState<Product[]>([])
  const [recentSales, setRecentSales] = useState<Sale[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchDashboard = async () => {
      // Fetch all counts in parallel
      const [productsRes, , outOfStockRes, salesTodayRes, recentSalesRes] = await Promise.all([
        supabase.from('products').select('id', { count: 'exact', head: true }).eq('is_active', true),
        supabase.from('products').select('id', { count: 'exact', head: true }).eq('is_active', true).gt('stock', 0),
        supabase.from('products').select('id', { count: 'exact', head: true }).eq('is_active', true).eq('stock', 0),
        supabase.from('sales').select('id', { count: 'exact', head: true }).gte('created_at', new Date().toISOString().split('T')[0]),
        supabase.from('sales').select('*, client:clients(name)').order('created_at', { ascending: false }).limit(5),
      ])

      // Low stock: need to filter client-side since we can't compare columns directly
      // Fetch products where stock > 0 and stock is low
      const { data: allActiveProducts } = await supabase
        .from('products')
        .select('*')
        .eq('is_active', true)
        .gt('stock', 0)
        .order('stock')
        .limit(500)

      const lowStockFiltered = (allActiveProducts ?? []).filter(p => p.stock <= p.min_stock).slice(0, 20)
      const inStockCount = (productsRes.count ?? 0) - (outOfStockRes.count ?? 0)

      setStats({
        totalProducts: productsRes.count ?? 0,
        inStock: inStockCount,
        lowStock: lowStockFiltered.length,
        outOfStock: outOfStockRes.count ?? 0,
        salesToday: salesTodayRes.count ?? 0,
      })
      setLowStockProducts(lowStockFiltered)
      setRecentSales((recentSalesRes.data ?? []) as Sale[])
      setLoading(false)
    }

    fetchDashboard()
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-[#0f3460] border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-xl font-bold text-gray-900">Dashboard</h1>

      {/* Stat Cards */}
      {stats && (
        <div className="grid grid-cols-2 gap-3">
          <StatCard
            icon={<Package size={20} className="text-[#0f3460]" />}
            label="Total Productos"
            value={stats.totalProducts}
            bg="bg-[#0f3460]/5"
          />
          <StatCard
            icon={<TrendingUp size={20} className="text-[#0cca4a]" />}
            label="En Stock"
            value={stats.inStock}
            bg="bg-green-50"
          />
          <StatCard
            icon={<AlertTriangle size={20} className="text-[#f59e0b]" />}
            label="Stock Bajo"
            value={stats.lowStock}
            bg="bg-yellow-50"
          />
          <StatCard
            icon={<XCircle size={20} className="text-[#e94560]" />}
            label="Agotados"
            value={stats.outOfStock}
            bg="bg-red-50"
          />
          <StatCard
            icon={<ShoppingCart size={20} className="text-[#0f3460]" />}
            label="Ventas Hoy"
            value={stats.salesToday}
            bg="bg-[#0f3460]/5"
            className="col-span-2"
          />
        </div>
      )}

      {/* Low Stock Alert */}
      {lowStockProducts.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
            <AlertTriangle size={16} className="text-[#f59e0b]" />
            Productos con Stock Bajo
          </h2>
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 divide-y divide-gray-50">
            {lowStockProducts.map((p) => (
              <div key={p.id} className="px-4 py-3 flex items-center justify-between">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-gray-800 truncate">{p.name}</p>
                  <p className="text-xs text-gray-400 font-mono">{p.sku}</p>
                </div>
                <div className="text-right ml-3">
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700">
                    {p.stock} / {p.min_stock}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Sales */}
      {recentSales.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-gray-700 mb-2">Ventas Recientes</h2>
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 divide-y divide-gray-50">
            {recentSales.map((sale) => {
              const clientObj = sale.client as { name: string } | null
              return (
                <div key={sale.id} className="px-4 py-3 flex items-center justify-between">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-800 truncate">
                      {clientObj?.name ?? 'Sin cliente'}
                    </p>
                    <p className="text-xs text-gray-400">
                      {new Date(sale.created_at).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 ml-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[sale.status] ?? ''}`}>
                      {STATUS_LABELS[sale.status] ?? sale.status}
                    </span>
                    <span className="text-sm font-semibold text-gray-700">
                      ${Number(sale.total).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

function StatCard({
  icon,
  label,
  value,
  bg,
  className = '',
}: {
  icon: React.ReactNode
  label: string
  value: number
  bg: string
  className?: string
}) {
  return (
    <div className={`${bg} rounded-xl p-4 ${className}`}>
      <div className="flex items-center gap-2 mb-1">
        {icon}
        <span className="text-xs text-gray-500">{label}</span>
      </div>
      <p className="text-2xl font-bold text-gray-900">{value.toLocaleString()}</p>
    </div>
  )
}
