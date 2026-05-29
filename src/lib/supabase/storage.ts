import { createClient } from './client'

const BUCKET = 'covers'

export async function uploadCover(
  file: File | Blob,
  sourceKey: string
): Promise<string> {
  const supabase = createClient()

  // Check if already exists
  const { data: existing } = await supabase
    .from('cover_images')
    .select('storage_path')
    .eq('source_key', sourceKey)
    .single()

  if (existing) return existing.storage_path

  // Upload to storage
  const filePath = `${sourceKey}.jpg`
  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(filePath, file, { upsert: true })

  if (uploadError) throw uploadError

  // Record in cover_images table
  await supabase
    .from('cover_images')
    .insert({ source_key: sourceKey, storage_path: filePath })

  return filePath
}

export function getCoverUrl(storagePath: string): string {
  const supabase = createClient()
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(storagePath)
  return data.publicUrl
}

export async function uploadCoverFromUrl(
  imageUrl: string,
  sourceKey: string
): Promise<string> {
  // Fetch image via API route to avoid CORS
  const response = await fetch('/api/cover-upload', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ imageUrl, sourceKey }),
  })

  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: 'Unknown error' }))
    throw new Error(`Cover upload failed: ${err.error || response.status}`)
  }
  const { path } = await response.json()
  return path
}
