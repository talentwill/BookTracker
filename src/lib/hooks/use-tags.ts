import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'

const supabase = createClient()

export function useTags() {
  return useQuery({
    queryKey: ['tags'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tags')
        .select('*, book_tags(count)')
        .order('name')
      if (error) throw error
      return data
    },
  })
}

export function useBookTags(bookId: string) {
  return useQuery({
    queryKey: ['book-tags', bookId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('book_tags')
        .select('tag_id, tags(*)')
        .eq('book_id', bookId)
      if (error) throw error
      return (data?.map(bt => Array.isArray(bt.tags) ? bt.tags[0] : bt.tags) || []).filter(Boolean)
    },
    enabled: !!bookId,
  })
}

export function useAddBookTag() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ bookId, tagName }: { bookId: string; tagName: string }) => {
      const { data: existing } = await supabase
        .from('tags')
        .select('id')
        .eq('name', tagName)
        .limit(1)
        .single()

      let tagId = existing?.id
      if (!tagId) {
        const { data: newTag } = await supabase
          .from('tags')
          .insert({ name: tagName })
          .select('id')
          .single()
        tagId = newTag?.id
      }

      const { error } = await supabase
        .from('book_tags')
        .insert({ book_id: bookId, tag_id: tagId })
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tags'] })
      queryClient.invalidateQueries({ queryKey: ['book-tags'] })
    },
  })
}

export function useRemoveBookTag() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ bookId, tagId }: { bookId: string; tagId: string }) => {
      const { error } = await supabase
        .from('book_tags')
        .delete()
        .match({ book_id: bookId, tag_id: tagId })
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tags'] })
      queryClient.invalidateQueries({ queryKey: ['book-tags'] })
    },
  })
}
