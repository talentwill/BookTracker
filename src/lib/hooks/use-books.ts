import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'

export function useBooks() {
  const supabase = createClient()
  return useQuery({
    queryKey: ['books'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('books')
        .select('*, authors(*)')
        .order('created_at', { ascending: false })
      if (error) throw error
      return data
    },
  })
}

export function useBook(id: string) {
  const supabase = createClient()
  return useQuery({
    queryKey: ['books', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('books')
        .select('*, authors(*)')
        .eq('id', id)
        .single()
      if (error) throw error
      return data
    },
    enabled: !!id,
  })
}

export function useAddBook() {
  const supabase = createClient()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (params: {
      title: string
      authorName: string
      tocText: string
      meta?: Record<string, unknown>
    }) => {
      const { data, error } = await supabase.rpc('add_book', {
        p_title: params.title,
        p_author_name: params.authorName,
        p_toc_text: params.tocText,
        p_meta: params.meta || {},
      })
      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['books'] })
      queryClient.invalidateQueries({ queryKey: ['authors'] })
      queryClient.invalidateQueries({ queryKey: ['toc-items'] })
      queryClient.invalidateQueries({ queryKey: ['reading-rounds'] })
      queryClient.invalidateQueries({ queryKey: ['chapter-statuses'] })
    },
  })
}

export function useDeleteBook() {
  const supabase = createClient()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (bookId: string) => {
      const { error } = await supabase.rpc('delete_book', { p_book_id: bookId })
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['books'] })
      queryClient.invalidateQueries({ queryKey: ['authors'] })
    },
  })
}

export function useUpdateBookStatus() {
  const supabase = createClient()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ bookId, status }: { bookId: string; status: string }) => {
      const { error } = await supabase
        .from('books')
        .update({
          reading_status: status,
          started_reading_at: status === 'reading' ? new Date().toISOString() : undefined,
          finished_reading_at: status === 'finished' ? new Date().toISOString() : undefined,
        })
        .eq('id', bookId)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['books'] })
    },
  })
}

export function useUpdateBookDate() {
  const supabase = createClient()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ bookId, field, value }: { bookId: string; field: 'started_reading_at' | 'finished_reading_at'; value: string | null }) => {
      const { error } = await supabase
        .from('books')
        .update({ [field]: value })
        .eq('id', bookId)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['books'] })
    },
  })
}

export function useUpdateBookTitle() {
  const supabase = createClient()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ bookId, title }: { bookId: string; title: string }) => {
      const { error } = await supabase.from('books').update({ title }).eq('id', bookId)
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['books'] }),
  })
}

export function useUpdateBookAuthor() {
  const supabase = createClient()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ bookId, authorName }: { bookId: string; authorName: string }) => {
      const { data: existing } = await supabase
        .from('authors')
        .select('id')
        .eq('name', authorName)
        .limit(1)
        .single()

      let authorId = existing?.id
      if (!authorId) {
        const { data: newAuthor } = await supabase
          .from('authors')
          .insert({ name: authorName })
          .select('id')
          .single()
        authorId = newAuthor?.id
      }

      const { error } = await supabase.from('books').update({ author_id: authorId }).eq('id', bookId)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['books'] })
      queryClient.invalidateQueries({ queryKey: ['authors'] })
    },
  })
}

export function useUpdateBookCover() {
  const supabase = createClient()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ bookId, coverUrl }: { bookId: string; coverUrl: string }) => {
      const { error } = await supabase.from('books').update({ cover_url: coverUrl }).eq('id', bookId)
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['books'] }),
  })
}
