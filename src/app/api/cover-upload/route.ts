import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  const { imageUrl, sourceKey } = await request.json()

  if (!imageUrl || !sourceKey) {
    return NextResponse.json(
      { error: 'Missing imageUrl or sourceKey' },
      { status: 400 }
    )
  }

  try {
    // Fetch image
    const imageResponse = await fetch(imageUrl)
    if (!imageResponse.ok) throw new Error('Failed to fetch image')
    const imageBlob = await imageResponse.blob()

    // Upload to Supabase Storage
    const supabase = await createClient()
    const filePath = `${sourceKey}.jpg`

    const { error: uploadError } = await supabase.storage
      .from('covers')
      .upload(filePath, imageBlob, { upsert: true })

    if (uploadError) throw uploadError

    // Record in cover_images
    await supabase
      .from('cover_images')
      .upsert({ source_key: sourceKey, storage_path: filePath })

    return NextResponse.json({ path: filePath })
  } catch (error) {
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 })
  }
}
