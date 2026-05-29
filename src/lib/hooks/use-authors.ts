import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'

const supabase = createClient()

export function useAuthors() {
  return useQuery({
    queryKey: ['authors'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('authors')
        .select('*')
        .order('created_at', { ascending: false })
      if (error) throw error
      return data
    },
  })
}

export function useAuthor(id: string) {
  return useQuery({
    queryKey: ['authors', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('authors')
        .select('*')
        .eq('id', id)
        .single()
      if (error) throw error
      return data
    },
    enabled: !!id,
  })
}

export function useUpdateAuthor() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ authorId, updates }: { authorId: string; updates: { name?: string; note?: string } }) => {
      const { error } = await supabase.from('authors').update(updates).eq('id', authorId)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['authors'] })
      queryClient.invalidateQueries({ queryKey: ['books'] })
    },
  })
}
