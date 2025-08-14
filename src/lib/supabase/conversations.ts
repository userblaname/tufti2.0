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

export async function getLatestActiveConversation(userId: string): Promise<string | null> {
  const { data, error } = await supabase
    .from('conversations')
    .select('id')
    .eq('user_id', userId)
    .is('archived_at', null)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .limit(1)

  if (error) {
    console.error('getLatestActiveConversation error', error)
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

export async function getOrCreateConversation(userId: string): Promise<string | null> {
  const existing = await getLatestActiveConversation(userId)
  const id = existing ?? (await createConversation(userId))
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

export async function archiveConversation(conversationId: string, userId: string) {
  const { error } = await supabase
    .from('conversations')
    .update({ archived_at: new Date().toISOString() })
    .eq('id', conversationId)
    .eq('user_id', userId)
  if (error) console.error('archiveConversation error', error)
  return { ok: !error, error }
}

export async function deleteConversation(conversationId: string, userId: string) {
  const { error } = await supabase
    .from('conversations')
    .delete()
    .eq('id', conversationId)
    .eq('user_id', userId)
  if (error) console.error('deleteConversation error', error)
  return { ok: !error, error }
}


