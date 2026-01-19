import { useInfiniteQuery, QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase/client'
import type { Message } from '@/lib/types'

const MESSAGES_PER_PAGE = 50

/**
 * Paginated message fetching hook
 * Loads 50 messages at a time with lazy loading for older messages
 */
export function useMessages(conversationId: string | null) {
    return useInfiniteQuery({
        queryKey: ['messages', conversationId],
        queryFn: async ({ pageParam = 0 }) => {
            if (!conversationId) return []

            const { data, error } = await supabase
                .from('messages')
                .select('*')
                .eq('conversation_id', conversationId)
                .order('created_at', { ascending: false })
                .range(pageParam, pageParam + MESSAGES_PER_PAGE - 1)

            if (error) throw error
            return (data || []) as Message[]
        },
        getNextPageParam: (lastPage, allPages) =>
            lastPage.length === MESSAGES_PER_PAGE ? allPages.length * MESSAGES_PER_PAGE : undefined,
        initialPageParam: 0,
        enabled: !!conversationId,
        staleTime: 30000, // 30 seconds
        refetchOnWindowFocus: false,
    })
}

/**
 * Create a QueryClient for the app
 */
export function createQueryClient() {
    return new QueryClient({
        defaultOptions: {
            queries: {
                retry: 2,
                retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
            },
        },
    })
}

export { QueryClientProvider }
