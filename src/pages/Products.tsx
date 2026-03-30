import { useEffect, useState, useRef, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import type { Product, Category } from '../lib/types'
import {
  ArrowLeft, Save, Trash2, Plus, X, Image, Link,
  FileText, AlertCircle, ChevronRight, Search, Package,
  Download, Pencil
} from 'lucide-react'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { toast } from 'sonner'

// ─────────────────────────────────────────────
// Shared
// ─────────────────────────────────────────────

const QR_OPTIONS = [
  { value: '__none__', label: 'Sin estado' },
  { value: 'FUNCIONA', label: 'Funciona' },
  { value: 'NO FUNCIONA', label: 'No funciona' },
  { value: 'NO TIENE', label: 'No tiene' },
  { value: 'ENVIA A OTRO MODELO- NO CORRESPONDE', label: 'Otro modelo' },
]

// ─────────────────────────────────────────────
// Column definitions
// ─────────────────────────────────────────────

interface ColDef {
  key: string
  label: string
  w: string
  type: 'text' | 'number' | 'select' | 'textarea'
  mono?: boolean
}

const COLUMNS: ColDef[] = [
  { key: 'category_id', label: 'Categoria', w: '150px', type: 'select' },
  { key: 'name', label: 'Modelo', w: '240px', type: 'text' },
  { key: 'sku', label: 'SKU', w: '130px', type: 'text', mono: true },
  { key: 'observations', label: 'Observaciones', w: '220px', type: 'textarea' },
  { key: 'qr_status', label: 'QR', w: '130px', type: 'select' },
  { key: 'qr_image_url', label: 'QR Imagen', w: '180px', type: 'text' },
  { key: 'store_url', label: 'Link', w: '180px', type: 'text' },
  { key: 'short_description', label: 'Desc. Lista Precios', w: '280px', type: 'textarea' },
  { key: 'full_description', label: 'Descripcion TDS', w: '280px', type: 'textarea' },
]

// ─────────────────────────────────────────────
// Export to CSV
// ─────────────────────────────────────────────

function exportCSV(products: Product[], categories: Category[]) {
  const catMap = new Map(categories.map(c => [c.id, c.name]))
  const headers = ['Categoria', 'Modelo', 'SKU', 'Observaciones', 'QR', 'QR Imagen', 'Link', 'Desc. Lista Precios', 'Descripcion TDS', 'Imagenes']
  const rows = products.map(p => [
    catMap.get(p.category_id ?? '') ?? '',
    p.name,
    p.sku,
    p.observations ?? '',
    p.qr_status ?? '',
    p.qr_image_url ?? '',
    p.store_url ?? '',
    p.short_description ?? '',
    p.full_description ?? '',
    (p.images ?? []).join('\n'),
  ])
  const escape = (s: string) => `"${s.replace(/"/g, '""')}"`
  const csv = [headers.map(escape).join(','), ...rows.map(r => r.map(escape).join(','))].join('\n')
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `woods-productos-${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
  toast.success('CSV exportado')
}

// ─────────────────────────────────────────────
// Inline text cell
// ─────────────────────────────────────────────

interface ActiveCell { row: string; col: string }

function TextCell({
  value, row, col, active, onActivate, onSave, type = 'text', mono, w,
}: {
  value: string | number | null; row: string; col: string
  active: ActiveCell | null; onActivate: (c: ActiveCell) => void
  onSave: (id: string, f: string, v: string | number) => void
  type?: 'text' | 'number'; mono?: boolean; w: string
}) {
  const isActive = active?.row === row && active?.col === col
  const [local, setLocal] = useState(value ?? '')
  const ref = useRef<HTMLInputElement>(null)

  useEffect(() => { setLocal(value ?? '') }, [value])
  useEffect(() => {
    if (isActive && ref.current) { ref.current.focus(); if (type === 'text') ref.current.select() }
  }, [isActive, type])

  const commit = () => {
    const v = type === 'number' ? Number(local) : local
    if (v !== (value ?? '')) onSave(row, col, v)
  }
  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') { setLocal(value ?? ''); (e.target as HTMLElement).blur() }
    if (e.key === 'Enter') (e.target as HTMLElement).blur()
  }

  if (!isActive) {
    const isEmpty = local === '' || local === null
    return (
      <td onClick={() => onActivate({ row, col })}
        className={`border-b border-r border-bdr-l px-3 py-2 cursor-text text-[13px] truncate whitespace-nowrap overflow-hidden hover:bg-surface-hover transition-colors ${
          mono ? 'font-mono' : ''} ${type === 'number' ? 'text-center' : ''} ${isEmpty ? 'text-txt-m' : 'text-txt'}`}
        style={{ width: w, maxWidth: w, minWidth: w }}>
        {isEmpty ? '—' : String(local)}
      </td>
    )
  }

  return (
    <td className="border-b border-r border-bdr-l p-0" style={{ width: w, maxWidth: w, minWidth: w }}>
      <input ref={ref} type={type} value={local}
        onChange={e => setLocal(type === 'number' ? Number(e.target.value) : e.target.value)}
        onBlur={commit} onKeyDown={onKey}
        className={`w-full px-3 py-2 text-[13px] bg-surface text-txt outline-none ring-2 ring-inset ring-accent ${
          mono ? 'font-mono' : ''} ${type === 'number' ? 'text-center' : ''}`}
        min={type === 'number' ? 0 : undefined} />
    </td>
  )
}

// ─────────────────────────────────────────────
// Select cell
// ─────────────────────────────────────────────

function SelectCell({
  value, row, col, options, onSave, w,
}: {
  value: string; row: string; col: string
  options: { value: string; label: string }[]
  onSave: (id: string, f: string, v: string) => void
  w: string
}) {
  const handleChange = (val: string) => {
    const real = val === '__none__' ? '' : val
    onSave(row, col, real)
  }
  const current = value || '__none__'

  return (
    <td className="border-b border-r border-bdr-l p-0" style={{ width: w, maxWidth: w, minWidth: w }}>
      <Select value={current} onValueChange={handleChange}>
        <SelectTrigger className="border-0 rounded-none shadow-none h-auto px-3 py-2 text-[13px] bg-transparent hover:bg-surface-hover transition-colors focus:ring-0 focus:ring-offset-0">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map(o => (
            <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </td>
  )
}

// ─────────────────────────────────────────────
// Textarea cell — popover
// ─────────────────────────────────────────────

function TextareaCell({
  value, row, col, onSave, w, label,
}: {
  value: string | null; row: string; col: string
  onSave: (id: string, f: string, v: string) => void
  w: string; label: string
}) {
  const [open, setOpen] = useState(false)
  const [local, setLocal] = useState(value ?? '')
  const isEmpty = !value

  useEffect(() => { setLocal(value ?? '') }, [value])

  const commit = () => {
    if (local !== (value ?? '')) onSave(row, col, local)
    setOpen(false)
  }

  return (
    <td className="border-b border-r border-bdr-l p-0" style={{ width: w, maxWidth: w, minWidth: w }}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            className={`w-full text-left px-3 py-2 text-[13px] truncate whitespace-nowrap overflow-hidden hover:bg-surface-hover transition-colors block ${
              isEmpty ? 'text-txt-m' : 'text-txt'}`}
            style={{ maxWidth: w }}>
            {isEmpty ? '—' : value}
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-80" side="bottom" align="start">
          <div className="space-y-2">
            <p className="text-xs font-semibold text-txt-m uppercase tracking-wider">{label}</p>
            <Textarea
              value={local}
              onChange={e => setLocal(e.target.value)}
              className="min-h-[120px]"
              autoFocus
              onKeyDown={e => { if (e.key === 'Escape') setOpen(false) }}
            />
            <div className="flex justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>Cancelar</Button>
              <Button size="sm" onClick={commit}>Guardar</Button>
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </td>
  )
}

// ─────────────────────────────────────────────
// Table view
// ─────────────────────────────────────────────

function ProductsTable({ onEditForm, onNew }: {
  onEditForm: (p: Product) => void; onNew: () => void
}) {
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [activeCell, setActiveCell] = useState<ActiveCell | null>(null)
  const [filterCat, setFilterCat] = useState('__all__')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [deleting, setDeleting] = useState(false)

  const fetchAll = useCallback(async () => {
    setLoading(true)
    const [p, c] = await Promise.all([
      supabase.from('products').select('*').eq('is_active', true).order('name'),
      supabase.from('categories').select('*').order('name'),
    ])
    if (p.data) setProducts(p.data)
    if (c.data) setCategories(c.data)
    setLoading(false)
  }, [])

  useEffect(() => { fetchAll() }, [fetchAll])

  const catOptions = [{ value: '__none__', label: 'Sin categoria' }, ...categories.map(c => ({ value: c.id, label: c.name }))]

  const filtered = products.filter(p => {
    if (filterCat !== '__all__' && p.category_id !== filterCat) return false
    if (!search.trim()) return true
    const s = search.toLowerCase()
    return p.name.toLowerCase().includes(s) || p.sku.toLowerCase().includes(s)
  })

  const handleSave = useCallback(async (id: string, field: string, val: string | number) => {
    const { error } = await supabase.from('products').update({ [field]: val || null }).eq('id', id)
    if (!error) {
      setProducts(prev => prev.map(p => p.id === id ? { ...p, [field]: val || null } : p))
      toast.success('Guardado')
    } else {
      toast.error('Error al guardar')
    }
    setActiveCell(null)
  }, [])

  const toggleSelect = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const toggleAll = () => {
    if (selected.size === filtered.length) setSelected(new Set())
    else setSelected(new Set(filtered.map(p => p.id)))
  }

  const handleBulkDelete = async () => {
    if (selected.size === 0) return
    if (!confirm(`Seguro que quieres eliminar ${selected.size} producto(s)?`)) return
    setDeleting(true)
    const ids = Array.from(selected)
    const { error } = await supabase.from('products').update({ is_active: false }).in('id', ids)
    if (!error) {
      setProducts(prev => prev.filter(p => !selected.has(p.id)))
      toast.success(`${ids.length} producto(s) eliminados`)
      setSelected(new Set())
    } else {
      toast.error('Error al eliminar')
    }
    setDeleting(false)
  }

  return (
    <div className="flex flex-col h-full bg-surface">
      {/* Toolbar */}
      <div className="shrink-0 bg-surface border-b border-bdr px-3 py-2.5 space-y-2 z-10">
        {/* Selection bar — appears when items are selected */}
        {selected.size > 0 ? (
          <div className="flex items-center justify-between gap-2 bg-accent-soft rounded-xl px-3 py-2">
            <span className="text-sm font-medium text-accent">{selected.size} seleccionado{selected.size !== 1 ? 's' : ''}</span>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={() => setSelected(new Set())}>
                Cancelar
              </Button>
              <Button variant="danger" size="sm" onClick={handleBulkDelete} disabled={deleting}>
                <Trash2 size={14} /> Eliminar
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <div className="flex-1 min-w-0">
              <h1 className="text-base font-bold text-txt leading-tight">Productos</h1>
              <p className="text-[11px] text-txt-m">{filtered.length} registro{filtered.length !== 1 ? 's' : ''}</p>
            </div>
            <Button variant="secondary" size="sm" onClick={() => exportCSV(filtered, categories)} className="px-2.5">
              <Download size={14} />
            </Button>
            <Button size="sm" onClick={onNew}>
              <Plus size={14} /> Nuevo
            </Button>
          </div>
        )}

        {/* Search + filter row */}
        <div className="flex gap-2 items-center">
          <div className="relative flex-1 min-w-0">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-txt-m" />
            <Input
              type="text" placeholder="Buscar..."
              value={search} onChange={e => setSearch(e.target.value)}
              className="pl-9 pr-8 h-9 text-sm"
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-txt-m">
                <X size={14} />
              </button>
            )}
          </div>
          <div className="w-36 sm:w-48 shrink-0">
            <Select value={filterCat} onValueChange={setFilterCat}>
              <SelectTrigger className="rounded-xl bg-input border-bdr text-sm h-9">
                <SelectValue placeholder="Categoria" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">Todas</SelectItem>
                {categories.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-accent border-t-transparent" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-txt-m">
          <Package size={48} className="mb-3" />
          <p className="text-sm">No se encontraron productos</p>
        </div>
      ) : (
        <div className="flex-1 min-h-0 overflow-auto">
          <table className="w-full border-collapse" style={{ minWidth: '1600px' }}>
            <thead>
              <tr className="bg-app-bg sticky top-0 z-20">
                <th className="border-b border-r border-bdr px-2 py-2.5 text-center bg-app-bg"
                  style={{ width: '40px', minWidth: '40px' }}>
                  <Checkbox
                    checked={selected.size === filtered.length && filtered.length > 0}
                    onCheckedChange={toggleAll}
                  />
                </th>
                <th className="border-b border-r border-bdr px-2 py-2.5 text-[11px] font-semibold text-txt-m uppercase tracking-wider text-center bg-app-bg"
                  style={{ width: '48px', minWidth: '48px' }}>Img</th>
                {COLUMNS.map(col => (
                  <th key={col.key}
                    className="border-b border-r border-bdr px-3 py-2.5 text-[11px] font-semibold text-txt-s uppercase tracking-wider text-left bg-app-bg"
                    style={{ width: col.w, minWidth: col.w, maxWidth: col.w }}>
                    {col.label}
                  </th>
                ))}
                <th className="border-b border-bdr px-2 py-2.5 bg-app-bg sticky right-0"
                  style={{ width: '48px', minWidth: '48px' }} />
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => {
                const thumb = p.images?.[0]
                const hasImg = !!thumb
                const isSelected = selected.has(p.id)
                return (
                  <tr key={p.id} className={`group transition-colors ${isSelected ? 'bg-accent-soft' : 'hover:bg-surface-hover'}`}>
                    <td className="border-b border-r border-bdr-l px-2 py-2 text-center"
                      style={{ width: '40px' }}>
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => toggleSelect(p.id)}
                      />
                    </td>
                    <td className="border-b border-r border-bdr-l px-1.5 py-1.5 text-center" style={{ width: '48px' }}>
                      {hasImg ? (
                        <img src={thumb} alt="" className="w-8 h-8 rounded-md object-cover bg-app-bg mx-auto" />
                      ) : (
                        <div className="w-8 h-8 rounded-md bg-app-bg flex items-center justify-center mx-auto">
                          <Image size={12} className="text-txt-m" />
                        </div>
                      )}
                    </td>
                    {COLUMNS.map(col => {
                      const val = (p as unknown as Record<string, unknown>)[col.key]

                      if (col.type === 'select') {
                        const opts = col.key === 'category_id' ? catOptions : QR_OPTIONS
                        return (
                          <SelectCell key={col.key}
                            value={(val as string) || ''} row={p.id} col={col.key}
                            options={opts} onSave={handleSave} w={col.w} />
                        )
                      }

                      if (col.type === 'textarea') {
                        return (
                          <TextareaCell key={col.key}
                            value={val as string | null} row={p.id} col={col.key}
                            onSave={handleSave} w={col.w} label={col.label} />
                        )
                      }

                      return (
                        <TextCell key={col.key}
                          value={val as string | number | null} row={p.id} col={col.key}
                          active={activeCell} onActivate={setActiveCell} onSave={handleSave}
                          type={col.type} mono={col.mono} w={col.w} />
                      )
                    })}
                    {/* Actions */}
                    <td className={`border-b border-bdr-l px-1 py-2 text-center sticky right-0 ${isSelected ? 'bg-accent-soft' : 'bg-surface group-hover:bg-surface-hover'}`}
                      style={{ width: '48px' }}>
                      <button onClick={() => onEditForm(p)} title="Editar"
                        className="p-1.5 text-txt-m hover:text-accent hover:bg-accent-soft rounded-lg transition-colors">
                        <Pencil size={14} />
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────
// Product Form
// ─────────────────────────────────────────────

function Section({ title, icon, children, defaultOpen = true }: {
  title: string; icon: React.ReactNode; children: React.ReactNode; defaultOpen?: boolean
}) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="bg-surface rounded-2xl border border-bdr-l overflow-hidden">
      <button onClick={() => setOpen(!open)}
        className="w-full px-4 py-3.5 flex items-center gap-3 text-left active:bg-app-bg">
        <div className="w-8 h-8 rounded-lg bg-accent-soft flex items-center justify-center text-accent">{icon}</div>
        <span className="flex-1 font-semibold text-txt text-sm">{title}</span>
        <ChevronRight size={18} className={`text-txt-m transition-transform ${open ? 'rotate-90' : ''}`} />
      </button>
      {open && <div className="px-4 pb-4 space-y-3 border-t border-bdr-l pt-3">{children}</div>}
    </div>
  )
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-txt-s mb-1.5">
        {label} {required && <span className="text-danger">*</span>}
      </label>
      {children}
    </div>
  )
}

function ProductForm({ product, onBack, onSaved }: {
  product: Product | null; onBack: () => void; onSaved: () => void
}) {
  const [categories, setCategories] = useState<Category[]>([])
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [uploadingImages, setUploadingImages] = useState(false)

  const [name, setName] = useState(product?.name ?? '')
  const [sku, setSku] = useState(product?.sku ?? '')
  const [categoryId, setCategoryId] = useState(product?.category_id ?? '')
  const [observations, setObservations] = useState(product?.observations ?? '')
  const [qrStatus, setQrStatus] = useState(product?.qr_status ?? '')
  const [qrImageUrl, setQrImageUrl] = useState(product?.qr_image_url ?? '')
  const [storeUrl, setStoreUrl] = useState(product?.store_url ?? '')
  const [shortDescription, setShortDescription] = useState(product?.short_description ?? '')
  const [fullDescription, setFullDescription] = useState(product?.full_description ?? '')
  const [images, setImages] = useState<string[]>(product?.images ?? [])

  useEffect(() => {
    supabase.from('categories').select('*').order('name').then(({ data }) => { if (data) setCategories(data) })
  }, [])

  const catOptions = [{ value: '__none__', label: 'Sin categoria' }, ...categories.map(c => ({ value: c.id, label: c.name }))]
  const qrOptions = [...QR_OPTIONS]

  const handleSave = async () => {
    if (!name.trim() || !sku.trim()) { setError('Nombre y SKU son obligatorios'); return }
    setSaving(true); setError('')
    const payload = {
      name: name.trim(), sku: sku.trim(), category_id: categoryId || null,
      observations: observations.trim() || null, qr_status: qrStatus || null,
      qr_image_url: qrImageUrl.trim() || null, store_url: storeUrl.trim() || null,
      short_description: shortDescription.trim() || null,
      full_description: fullDescription.trim() || null,
      images, is_active: true,
    }
    const isEdit = product?.id
    const result = isEdit
      ? await supabase.from('products').update(payload).eq('id', product.id)
      : await supabase.from('products').insert(payload)
    if (result.error) {
      setError(result.error.message.includes('unique') ? 'Ya existe un producto con ese SKU' : result.error.message)
    } else {
      toast.success(isEdit ? 'Producto actualizado' : 'Producto creado')
      onSaved()
    }
    setSaving(false)
  }

  const handleDelete = async () => {
    if (!product?.id || !confirm('Seguro que quieres eliminar este producto?')) return
    setDeleting(true)
    await supabase.from('products').update({ is_active: false }).eq('id', product.id)
    toast.success('Producto eliminado')
    setDeleting(false); onSaved()
  }

  const compressImage = (file: File, maxWidth = 1200, quality = 0.82): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const img = new window.Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        let w = img.width
        let h = img.height
        if (w > maxWidth) { h = Math.round(h * (maxWidth / w)); w = maxWidth }
        canvas.width = w
        canvas.height = h
        const ctx = canvas.getContext('2d')!
        ctx.drawImage(img, 0, 0, w, h)
        canvas.toBlob(
          (blob) => blob ? resolve(blob) : reject(new Error('Compression failed')),
          'image/webp',
          quality
        )
      }
      img.onerror = () => reject(new Error('Failed to load image'))
      img.src = URL.createObjectURL(file)
    })
  }

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return
    setUploadingImages(true)

    const uploads = Array.from(files).map(async (file, i) => {
      try {
        const compressed = await compressImage(file)
        const storagePath = `${sku || 'new'}/${Date.now()}_${i}.webp`
        const { error } = await supabase.storage
          .from('product-images')
          .upload(storagePath, compressed, { contentType: 'image/webp', upsert: true })
        if (error) throw error
        const { data: urlData } = supabase.storage.from('product-images').getPublicUrl(storagePath)
        return urlData.publicUrl
      } catch (err) {
        console.error('Upload failed:', file.name, err)
        return null
      }
    })

    const results = await Promise.all(uploads)
    const successful = results.filter((url): url is string => url !== null)
    const failed = results.length - successful.length

    if (successful.length > 0) {
      setImages([...images, ...successful])
      toast.success(`${successful.length} imagen(es) subidas${failed ? ` (${failed} fallaron)` : ''}`)
    } else {
      toast.error('No se pudieron subir las imagenes')
    }

    setUploadingImages(false)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const removeImage = (idx: number) => setImages(images.filter((_, i) => i !== idx))

  return (
    <div className="flex flex-col h-full">
      <div className="shrink-0 bg-app-bg px-4 py-3 flex items-center justify-between border-b border-bdr-l z-10">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft size={20} />
        </Button>
        <h1 className="text-base font-bold text-txt truncate px-2">
          {product ? 'Editar Producto' : 'Nuevo Producto'}
        </h1>
        <Button size="sm" onClick={handleSave} disabled={saving}>
          {saving ? <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
            : <><Save size={16} /> Guardar</>}
        </Button>
      </div>

      {error && (
        <div className="mx-4 mt-3 bg-danger-bg border border-bdr text-danger-text px-4 py-3 rounded-xl text-sm flex items-center gap-2">
          <AlertCircle size={16} /> {error}
        </div>
      )}

      <div className="flex-1 min-h-0 overflow-y-auto px-4 py-4 space-y-3">
        <Section title="Informacion basica" icon={<FileText size={16} />}>
          <Field label="Modelo" required>
            <Input value={name} onChange={e => setName(e.target.value)}
              placeholder="Ej: Silla Ejecutiva Aura Blanco" />
          </Field>
          <Field label="SKU" required>
            <Input value={sku} onChange={e => setSku(e.target.value.toUpperCase())}
              placeholder="Ej: MOLDAVIA-BL" className="uppercase font-mono" />
          </Field>
          <Field label="Categoria">
            <Select value={categoryId || '__none__'} onValueChange={v => setCategoryId(v === '__none__' ? '' : v)}>
              <SelectTrigger className="w-full rounded-xl bg-input border-bdr h-12 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {catOptions.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
        </Section>

        <Section title="Descripciones" icon={<FileText size={16} />}>
          <Field label="Descripcion lista de precios">
            <Textarea value={shortDescription} onChange={e => setShortDescription(e.target.value)}
              placeholder="Descripcion corta tecnica..." />
          </Field>
          <Field label="Descripcion completa (TDS)">
            <Textarea value={fullDescription} onChange={e => setFullDescription(e.target.value)}
              placeholder="Descripcion detallada..." className="min-h-[150px]" />
          </Field>
        </Section>

        <Section title="Imagenes" icon={<Image size={16} />}>
          <input ref={fileInputRef} type="file" accept="image/*" multiple onChange={handleImageUpload} className="hidden" />
          <button onClick={() => fileInputRef.current?.click()} disabled={uploadingImages}
            className="w-full py-4 border-2 border-dashed border-bdr rounded-xl text-txt-m text-sm font-medium flex items-center justify-center gap-2 hover:border-accent hover:text-accent transition-colors active:bg-app-bg">
            {uploadingImages
              ? <><div className="animate-spin rounded-full h-4 w-4 border-2 border-accent border-t-transparent" /> Subiendo...</>
              : <><Plus size={18} /> Subir imagenes</>}
          </button>
          {images.length > 0 && (
            <div className="grid grid-cols-3 gap-2">
              {images.map((url, idx) => (
                <div key={idx} className="relative">
                  <img src={url} alt="" className="w-full h-24 object-cover rounded-lg bg-app-bg" />
                  <button onClick={() => removeImage(idx)}
                    className="absolute -top-1.5 -right-1.5 w-7 h-7 bg-danger-bg text-danger-text border border-bdr rounded-full flex items-center justify-center shadow-sm active:scale-90 transition-transform">
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </Section>

        <Section title="Links y QR" icon={<Link size={16} />} defaultOpen={false}>
          <Field label="URL tienda">
            <Input type="url" value={storeUrl} onChange={e => setStoreUrl(e.target.value)}
              placeholder="https://todoensillasmexico.com/..." />
          </Field>
          <Field label="Estado QR">
            <Select value={qrStatus || '__none__'} onValueChange={v => setQrStatus(v === '__none__' ? '' : v)}>
              <SelectTrigger className="w-full rounded-xl bg-input border-bdr h-12 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {qrOptions.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
          <Field label="URL imagen QR">
            <Input type="url" value={qrImageUrl} onChange={e => setQrImageUrl(e.target.value)}
              placeholder="URL de la imagen del QR" />
          </Field>
        </Section>

        <Section title="Observaciones" icon={<AlertCircle size={16} />} defaultOpen={false}>
          <Textarea value={observations} onChange={e => setObservations(e.target.value)}
            placeholder="Notas internas..." />
        </Section>

        {product?.id && (
          <Button variant="danger" className="w-full mt-4" onClick={handleDelete} disabled={deleting}>
            <Trash2 size={16} /> {deleting ? 'Eliminando...' : 'Eliminar producto'}
          </Button>
        )}
        <div className="h-8" />
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────

export default function Products() {
  const [view, setView] = useState<'table' | 'form'>('table')
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)

  const handleEditForm = (p: Product) => { setEditingProduct(p); setView('form') }
  const handleNew = () => { setEditingProduct(null); setView('form') }
  const handleBack = () => { setView('table'); setEditingProduct(null) }
  const handleSaved = () => { setView('table'); setEditingProduct(null) }

  if (view === 'form') {
    return <ProductForm product={editingProduct?.id ? editingProduct : null} onBack={handleBack} onSaved={handleSaved} />
  }

  return <ProductsTable onEditForm={handleEditForm} onNew={handleNew} />
}
