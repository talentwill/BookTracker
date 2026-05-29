import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import sharp from 'sharp'

export async function POST(request: NextRequest) {
  const { imageUrl, sourceKey } = await request.json()

  if (!imageUrl || !sourceKey) {
    return NextResponse.json(
      { error: 'Missing imageUrl or sourceKey' },
      { status: 400 }
    )
  }

  // Validate imageUrl domain (only allow Douban and common image CDNs)
  try {
    const url = new URL(imageUrl)
    const allowedHosts = [
      'img1.doubanio.com', 'img2.doubanio.com', 'img3.doubanio.com',
      'img9.doubanio.com', 'img10.doubanio.com',
      'images-na.ssl-images-amazon.com',
      'books.google.com',
    ]
    if (!allowedHosts.some(h => url.hostname === h || url.hostname.endsWith('.' + h))) {
      return NextResponse.json({ error: 'Image domain not allowed' }, { status: 403 })
    }
  } catch {
    return NextResponse.json({ error: 'Invalid imageUrl' }, { status: 400 })
  }

  // Sanitize sourceKey: only allow alphanumeric, underscore, hyphen
  const sanitizedKey = sourceKey.replace(/[^a-zA-Z0-9_-]/g, '')
  if (!sanitizedKey) {
    return NextResponse.json({ error: 'Invalid sourceKey' }, { status: 400 })
  }

  try {
    // Fetch image with user-agent header (Douban blocks bare requests)
    const imageResponse = await fetch(imageUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Referer': 'https://book.douban.com/',
      },
    })
    if (!imageResponse.ok) {
      return NextResponse.json({ error: `Failed to fetch image: ${imageResponse.status}` }, { status: 502 })
    }
    const imageBuffer = await imageResponse.arrayBuffer()

    // Compress: resize to max 400px width, JPEG 0.7 quality
    const compressed = await sharp(Buffer.from(imageBuffer))
      .resize({ width: 400, withoutEnlargement: true })
      .jpeg({ quality: 70 })
      .toBuffer()

    // Use service role key for storage operations (bypasses RLS)
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
    const filePath = `${sanitizedKey}.jpg`

    const { error: uploadError } = await supabase.storage
      .from('covers')
      .upload(filePath, compressed, { upsert: true, contentType: 'image/jpeg' })

    if (uploadError) {
      return NextResponse.json({ error: `Storage upload failed: ${uploadError.message}` }, { status: 500 })
    }

    // Record in cover_images
    await supabase
      .from('cover_images')
      .upsert({ source_key: sanitizedKey, storage_path: filePath })

    // Return full public URL
    const { data: urlData } = supabase.storage.from('covers').getPublicUrl(filePath)
    return NextResponse.json({ path: urlData.publicUrl })
  } catch (error) {
    return NextResponse.json({ error: `Upload failed: ${error instanceof Error ? error.message : 'Unknown error'}` }, { status: 500 })
  }
}
