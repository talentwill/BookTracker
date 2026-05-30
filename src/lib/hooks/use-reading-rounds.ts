import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'

export function useReadingRounds(bookId: string) {
  return useQuery({
    queryKey: ['reading-rounds', bookId],
    queryFn: async () => {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('reading_rounds')
        .select('*')
        .eq('book_id', bookId)
        .order('round_number')
      if (error) throw error
      return data
    },
    enabled: !!bookId,
  })
}

export function useStartNewRound() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ bookId, inheritSchedule }: { bookId: string; inheritSchedule: boolean }) => {
      const supabase = createClient()
      const { data, error } = await supabase.rpc('start_new_round', {
        p_book_id: bookId,
        p_inherit_schedule: inheritSchedule,
      })
      if (error) throw error
      return data
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['reading-rounds', variables.bookId] })
      queryClient.invalidateQueries({ queryKey: ['chapter-statuses'] })
    },
  })
}
