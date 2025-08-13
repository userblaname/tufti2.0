import { supabase } from './client'

type Role = 'user' | 'tufti'

export async function getLatestConversation(userId: string): Promise<string | null> {
  const { data, error } = await supabase
    .from('conversations')
    .select('id')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(1)

  if (error) {
    console.error('getLatestConversation error', error)
    return null
  }
  return data?.[0]?.id ?? null
}

export async function createConversation(userId: string): Promise<string | null> {
  const { data, error } = await supabase
    .from('conversations')
    .insert({ user_id: userId })
    .select('id')
    .single()

  if (error) {
    console.error('createConversation error', error)
    return null
  }
  return data?.id ?? null
}

const cacheKey = (userId: string) => `tufti_conversation_id:${userId}`

export function clearCachedConversationId(userId: string) {
  if (typeof window === 'undefined') return
  try { localStorage.removeItem(cacheKey(userId)) } catch {}
}

export async function getOrCreateConversation(userId: string): Promise<string | null> {
  // Try cached id but verify ownership
  if (typeof window !== 'undefined') {
    const cached = localStorage.getItem(cacheKey(userId))
    if (cached) {
      const { data, error } = await supabase
        .from('conversations')
        .select('id')
        .eq('id', cached)
        .eq('user_id', userId)
        .maybeSingle()
      if (!error && data?.id) return cached
      clearCachedConversationId(userId)
    }
  }

  const existing = await getLatestConversation(userId)
  const id = existing ?? (await createConversation(userId))
  if (id && typeof window !== 'undefined') {
    try { localStorage.setItem(cacheKey(userId), id) } catch {}
  }
  return id
}

export async function saveMessage(params: { conversationId: string, userId: string, role: Role, text: string }) {
  const { conversationId, userId, role, text } = params
  const { error } = await supabase
    .from('messages')
    .insert({ conversation_id: conversationId, user_id: userId, role, text })
  if (error) {
    console.error('saveMessage error', error)
    return { ok: false, error }
  }
  return { ok: true }
}

export interface DbMessageRow {
  id: string
  conversation_id: string
  user_id: string
  role: Role
  text: string
  created_at: string
}

export async function fetchMessages(conversationId: string): Promise<DbMessageRow[]> {
  const { data, error } = await supabase
    .from('messages')
    .select('id, conversation_id, user_id, role, text, created_at')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true })

  if (error) {
    console.error('fetchMessages error', error)
    return []
  }
  return (data as DbMessageRow[]) ?? []
}


