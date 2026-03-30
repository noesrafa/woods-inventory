-- =============================================
-- WOODS INVENTORY - Schema Migration
-- Drops old products table and recreates 1:1 with Excel
-- =============================================

-- 1. Drop dependent foreign keys first (keep tables intact)
ALTER TABLE IF EXISTS sale_items DROP CONSTRAINT IF EXISTS sale_items_product_id_fkey;
ALTER TABLE IF EXISTS stock_movements DROP CONSTRAINT IF EXISTS stock_movements_product_id_fkey;

-- 2. Drop old tables
DROP TABLE IF EXISTS products CASCADE;
DROP TABLE IF EXISTS categories CASCADE;

-- 3. Create categories (simplified - just name)
CREATE TABLE categories (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL UNIQUE,
  created_at timestamptz DEFAULT now()
);

-- 4. Create products (1:1 with Excel columns)
CREATE TABLE products (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  category_id uuid REFERENCES categories(id),
  name text NOT NULL,                    -- MODELO
  sku text NOT NULL UNIQUE,              -- SKU
  observations text,                     -- OBSERVACIONES
  qr_status text,                        -- QR (FUNCIONA/NO FUNCIONA/etc)
  qr_image_url text,                     -- QR URL
  store_url text,                        -- LINK
  short_description text,                -- DESCRIPCION-LISTA DE PRECIOS
  full_description text,                 -- DESCRIPCION TDS
  images text[] DEFAULT '{}',            -- IMAGENES (array of URLs)
  stock integer DEFAULT 0,               -- For inventory tracking
  min_stock integer DEFAULT 5,           -- For low stock alerts
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 5. Re-add foreign keys to dependent tables
ALTER TABLE sale_items ADD CONSTRAINT sale_items_product_id_fkey
  FOREIGN KEY (product_id) REFERENCES products(id);
ALTER TABLE stock_movements ADD CONSTRAINT stock_movements_product_id_fkey
  FOREIGN KEY (product_id) REFERENCES products(id);

-- 6. Enable RLS but allow authenticated users
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

-- Policies for products
CREATE POLICY "Anyone can read products" ON products FOR SELECT USING (true);
CREATE POLICY "Authenticated can insert products" ON products FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Authenticated can update products" ON products FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated can delete products" ON products FOR DELETE USING (auth.role() = 'authenticated');

-- Policies for categories
CREATE POLICY "Anyone can read categories" ON categories FOR SELECT USING (true);
CREATE POLICY "Authenticated can insert categories" ON categories FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Authenticated can update categories" ON categories FOR UPDATE USING (auth.role() = 'authenticated');

-- 7. Create storage bucket for product images
INSERT INTO storage.buckets (id, name, public)
VALUES ('product-images', 'product-images', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies - allow authenticated uploads
CREATE POLICY "Anyone can view product images" ON storage.objects
  FOR SELECT USING (bucket_id = 'product-images');
CREATE POLICY "Authenticated can upload product images" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'product-images' AND auth.role() = 'authenticated');
CREATE POLICY "Authenticated can update product images" ON storage.objects
  FOR UPDATE USING (bucket_id = 'product-images' AND auth.role() = 'authenticated');
CREATE POLICY "Authenticated can delete product images" ON storage.objects
  FOR DELETE USING (bucket_id = 'product-images' AND auth.role() = 'authenticated');

-- 8. Index for fast lookups
CREATE INDEX idx_products_sku ON products(sku);
CREATE INDEX idx_products_category ON products(category_id);
CREATE INDEX idx_products_active ON products(is_active);

-- 9. Auto-update updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER products_updated_at
  BEFORE UPDATE ON products
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();
