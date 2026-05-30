import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'

export function useTocItems(bookId: string) {
  return useQuery({
    queryKey: ['toc-items', bookId],
    queryFn: async () => {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('toc_items')
        .select('*')
        .eq('book_id', bookId)
        .order('sort_order')
      if (error) throw error
      return data
    },
    enabled: !!bookId,
  })
}

export function useReplaceBookToc() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ bookId, items }: { bookId: string; items: Array<{ title: string; indent: number; order: number }> }) => {
      const supabase = createClient()
      const { error } = await supabase.rpc('replace_book_toc', {
        p_book_id: bookId,
        p_items: items,
      })
      if (error) throw error
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['toc-items', variables.bookId] })
      queryClient.invalidateQueries({ queryKey: ['chapter-statuses'] })
      queryClient.invalidateQueries({ queryKey: ['reading-rounds'] })
    },
  })
}
