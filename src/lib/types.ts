export interface Category {
  id: string
  name: string
  slug: string
  icon: string | null
}

export interface Product {
  id: string
  sku: string
  name: string
  description: string | null
  category_id: string | null
  image_url: string | null
  stock: number
  min_stock: number
  colors: string[] | null
  materials: string[] | null
  dimensions: string | null
  is_active: boolean
  category?: Category
}

export interface Client {
  id: string
  name: string
  phone: string | null
  email: string | null
  company: string | null
  notes: string | null
}

export type SaleStatus = 'quoted' | 'sold' | 'preparing' | 'delivered' | 'cancelled'
export type SaleChannel = 'store' | 'whatsapp' | 'phone'

export interface Sale {
  id: string
  client_id: string | null
  seller_id: string | null
  status: SaleStatus
  channel: SaleChannel
  notes: string | null
  total: number
  created_at: string
  updated_at: string
  client?: Client
  seller?: Profile
  sale_items?: SaleItem[]
}

export interface SaleItem {
  id: string
  sale_id: string
  product_id: string
  quantity: number
  unit_price: number
  subtotal: number
  product?: Product
}

export type StockMovementType = 'in' | 'out' | 'adjustment'

export interface StockMovement {
  id: string
  product_id: string
  user_id: string | null
  type: StockMovementType
  quantity: number
  reason: string | null
  reference_id: string | null
}

export type UserRole = 'admin' | 'seller'

export interface Profile {
  id: string
  full_name: string | null
  role: UserRole
  avatar_url: string | null
  is_active: boolean
}
