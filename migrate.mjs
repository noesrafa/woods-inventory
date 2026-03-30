import { createClient } from '@supabase/supabase-js'
import XLSX from 'xlsx'
import https from 'https'
import http from 'http'
import path from 'path'
import { URL } from 'url'

// Set these env vars before running: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
const SUPABASE_URL = process.env.SUPABASE_URL
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('Missing env vars: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

// ─── Download a file as Buffer (follows redirects) ───
function downloadFile(url, maxRedirects = 5) {
  return new Promise((resolve, reject) => {
    if (maxRedirects <= 0) return reject(new Error('Too many redirects'))
    const parsedUrl = new URL(url)
    const client = parsedUrl.protocol === 'https:' ? https : http
    const req = client.get(url, { timeout: 30000 }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return resolve(downloadFile(res.headers.location, maxRedirects - 1))
      }
      if (res.statusCode !== 200) return reject(new Error(`HTTP ${res.statusCode}`))
      const chunks = []
      res.on('data', c => chunks.push(c))
      res.on('end', () => resolve(Buffer.concat(chunks)))
      res.on('error', reject)
    })
    req.on('error', reject)
    req.on('timeout', () => { req.destroy(); reject(new Error('Timeout')) })
  })
}

// ─── Upload image to Supabase Storage ───
async function uploadImage(sku, imageUrl, index) {
  try {
    const decoded = decodeURIComponent(imageUrl)
    const ext = (path.extname(decoded).toLowerCase().match(/\.(jpg|jpeg|png|webp|gif)/)?.[0]) || '.jpg'
    const storagePath = `${sku}/${index}${ext}`

    const buffer = await downloadFile(imageUrl)
    if (buffer.length < 100) throw new Error('File too small')

    const contentType = ext === '.png' ? 'image/png' : ext === '.webp' ? 'image/webp' : 'image/jpeg'

    const { error } = await supabase.storage
      .from('product-images')
      .upload(storagePath, buffer, { contentType, upsert: true })

    if (error) throw new Error(error.message)

    const { data: urlData } = supabase.storage
      .from('product-images')
      .getPublicUrl(storagePath)

    return urlData.publicUrl
  } catch (err) {
    console.error(`    ✗ [${index}] ${err.message}`)
    return imageUrl // fallback: keep original URL
  }
}

// ─── Main ───
async function main() {
  console.log('🚀 WOODS INVENTORY — Data Migration\n')

  // 1. Setup storage bucket
  console.log('📦 Storage bucket...')
  const { data: buckets } = await supabase.storage.listBuckets()
  if (!buckets?.some(b => b.id === 'product-images')) {
    await supabase.storage.createBucket('product-images', { public: true })
    console.log('  ✓ Created')
  } else {
    console.log('  ✓ Already exists')
  }

  // 2. Clean existing products
  console.log('\n🗑️  Cleaning old data...')
  await supabase.from('products').delete().neq('id', '00000000-0000-0000-0000-000000000000')
  await supabase.from('categories').delete().neq('id', '00000000-0000-0000-0000-000000000000')
  console.log('  ✓ Cleaned')

  // 3. Create category
  console.log('\n📂 Creating category...')
  const { data: catData, error: catError } = await supabase
    .from('categories')
    .insert({ name: 'SILLAS EJECUTIVAS' })
    .select()
    .single()
  if (catError) { console.error('  ✗', catError.message); return }
  console.log(`  ✓ ID: ${catData.id}`)

  // 4. Read Excel
  console.log('\n📊 Reading Excel...')
  const workbook = XLSX.readFile('/Users/rafael/Desktop/mobiliario.xlsx')
  const sheet = workbook.Sheets[workbook.SheetNames[0]]
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 })
  const dataRows = rows.slice(1).filter(r => r[2]) // rows with SKU
  console.log(`  ✓ ${dataRows.length} products found\n`)

  // 5. Migrate each product
  let success = 0, failed = 0, totalImages = 0

  for (let i = 0; i < dataRows.length; i++) {
    const row = dataRows[i]
    const sku = String(row[2]).trim()
    const rawName = String(row[1] || '').trim()
    const name = rawName.replace(/^\d+\.\s*/, '') // remove "1. " prefix
    const observations = row[3] ? String(row[3]).trim() : null
    const qrStatus = row[4] ? String(row[4]).trim() : null
    const qrUrl = row[5] ? String(row[5]).trim() : null
    const storeUrl = row[6] ? String(row[6]).trim() : null
    const shortDesc = row[7] ? String(row[7]).trim() : null
    const fullDesc = row[8] ? String(row[8]).trim() : null
    const imagesRaw = row[9] ? String(row[9]).trim() : ''

    console.log(`[${i + 1}/${dataRows.length}] ${sku} — ${name}`)

    // Upload product images
    const rawImageUrls = imagesRaw.split('\n').map(u => u.trim()).filter(u => u.startsWith('http'))
    let imageUrls = []
    if (rawImageUrls.length > 0) {
      console.log(`  📸 ${rawImageUrls.length} images...`)
      for (let j = 0; j < rawImageUrls.length; j++) {
        const newUrl = await uploadImage(sku, rawImageUrls[j], j)
        imageUrls.push(newUrl)
        totalImages++
      }
      console.log(`  ✓ ${imageUrls.length} uploaded`)
    }

    // Upload QR image
    let qrImageUrl = null
    if (qrUrl && qrUrl.startsWith('http')) {
      qrImageUrl = await uploadImage(sku, qrUrl, 'qr')
    }

    // Insert product
    const { error } = await supabase.from('products').insert({
      category_id: catData.id,
      name: name || sku,
      sku,
      observations,
      qr_status: qrStatus,
      qr_image_url: qrImageUrl,
      store_url: storeUrl,
      short_description: shortDesc,
      full_description: fullDesc,
      images: imageUrls,
      stock: 0,
      min_stock: 5,
      is_active: true,
    })

    if (error) {
      console.error(`  ✗ INSERT FAILED: ${error.message}`)
      failed++
    } else {
      success++
    }
  }

  console.log(`\n${'═'.repeat(50)}`)
  console.log(`✅ Migration complete!`)
  console.log(`   Products: ${success} ok / ${failed} failed`)
  console.log(`   Images uploaded: ${totalImages}`)
  console.log(`${'═'.repeat(50)}`)
}

main().catch(console.error)
