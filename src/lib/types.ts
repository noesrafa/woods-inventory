export interface Category {
  id: string
  name: string
  created_at?: string
}

export interface Product {
  id: string
  category_id: string | null
  name: string
  sku: string
  observations: string | null
  qr_status: string | null
  qr_image_url: string | null
  store_url: string | null
  short_description: string | null
  full_description: string | null
  images: string[]
  is_active: boolean
  created_at?: string
  updated_at?: string
  category?: Category
}

export type UserRole = 'admin' | 'seller'

export interface Profile {
  id: string
  full_name: string | null
  role: UserRole
  avatar_url: string | null
  is_active: boolean
}
