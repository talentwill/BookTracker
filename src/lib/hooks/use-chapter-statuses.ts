import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'

export function useChapterStatuses(roundId: string) {
  const supabase = createClient()
  return useQuery({
    queryKey: ['chapter-statuses', roundId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('chapter_statuses')
        .select('*')
        .eq('round_id', roundId)
      if (error) throw error
      return data
    },
    enabled: !!roundId,
  })
}

export function useAllChapterStatuses(bookId: string) {
  const supabase = createClient()
  return useQuery({
    queryKey: ['chapter-statuses', 'all', bookId],
    queryFn: async () => {
      const { data: rounds } = await supabase
        .from('reading_rounds')
        .select('id')
        .eq('book_id', bookId)
      if (!rounds?.length) return []

      const roundIds = rounds.map(r => r.id)
      const { data, error } = await supabase
        .from('chapter_statuses')
        .select('*')
        .in('round_id', roundIds)
      if (error) throw error
      return data
    },
    enabled: !!bookId,
  })
}

export function useToggleChapter() {
  const supabase = createClient()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ tocItemId, roundId, checked, checkedAt }: { tocItemId: string; roundId: string; checked: boolean; checkedAt?: string }) => {
      const { error } = await supabase
        .from('chapter_statuses')
        .update({
          checked,
          checked_at: checked ? (checkedAt ?? new Date().toISOString()) : null,
        })
        .match({ toc_item_id: tocItemId, round_id: roundId })
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chapter-statuses'] })
    },
  })
}

export function useScheduleChapter() {
  const supabase = createClient()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ tocItemId, roundId, date }: { tocItemId: string; roundId: string; date: string | null }) => {
      const { error } = await supabase
        .from('chapter_statuses')
        .update({ scheduled_date: date })
        .match({ toc_item_id: tocItemId, round_id: roundId })
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chapter-statuses'] })
    },
  })
}
