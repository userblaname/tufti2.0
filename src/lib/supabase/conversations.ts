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
  console.log('[saveMessage] Attempting save:', {
    conversationId: conversationId?.substring(0, 8),
    userId: userId?.substring(0, 8),
    role,
    textLen: text?.length
  })

  const { data, error } = await supabase
    .from('messages')
    .insert({ conversation_id: conversationId, user_id: userId, role, text })
    .select('id')

  if (error) {
    console.error('[saveMessage] ❌ ERROR:', error.message, error.code, error.details)
    return { ok: false, error }
  }

  console.log('[saveMessage] ✅ Saved successfully, id:', data?.[0]?.id?.substring(0, 8))
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
  // IMPORTANT: Supabase has a hard limit of 1000 rows per request.
  // We must paginate to retrieve all messages.

  let allMessages: DbMessageRow[] = [];
  let from = 0;
  const PAGE_SIZE = 1000;
  let moreAvailable = true;

  while (moreAvailable) {
    const { data, error } = await supabase
      .from('messages')
      .select('id, conversation_id, user_id, role, text, created_at')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true })
      .range(from, from + PAGE_SIZE - 1);

    if (error) {
      console.error('fetchMessages error', error);
      return allMessages; // Return whatever we have so far
    }

    if (data) {
      allMessages = [...allMessages, ...(data as DbMessageRow[])];

      if (data.length < PAGE_SIZE) {
        moreAvailable = false;
      } else {
        from += PAGE_SIZE;
      }
    } else {
      moreAvailable = false;
    }
  }

  return allMessages;
}

/**
 * Fetch messages with cursor-based pagination for infinite scroll
 * Gets the most recent messages first, then loads older ones on demand
 * @param conversationId - The conversation to fetch messages from
 * @param limit - Number of messages per page (default 50)
 * @param beforeTimestamp - Cursor: fetch messages older than this timestamp
 * @returns Messages in chronological order (oldest first within batch) and hasMore flag
 */
export async function fetchMessagesPaginated(
  conversationId: string,
  limit: number = 50,
  beforeTimestamp?: string
): Promise<{ messages: DbMessageRow[], hasMore: boolean }> {
  let query = supabase
    .from('messages')
    .select('id, conversation_id, user_id, role, text, created_at')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: false })
    .limit(limit + 1) // Fetch one extra to check if more exist

  if (beforeTimestamp) {
    query = query.lt('created_at', beforeTimestamp)
  }

  const { data, error } = await query

  if (error) {
    console.error('fetchMessagesPaginated error', error)
    return { messages: [], hasMore: false }
  }

  const hasMore = (data?.length || 0) > limit
  const messages = (hasMore ? data!.slice(0, limit) : (data || [])) as DbMessageRow[]

  // Reverse to get chronological order (oldest first within batch)
  return { messages: messages.reverse(), hasMore }
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

// Get the most recent archived conversation (for recovery)
export async function getLatestArchivedConversation(userId: string): Promise<string | null> {
  const { data, error } = await supabase
    .from('conversations')
    .select('id')
    .eq('user_id', userId)
    .not('archived_at', 'is', null)
    .order('archived_at', { ascending: false })
    .limit(1)

  if (error) {
    console.error('getLatestArchivedConversation error', error)
    return null
  }
  return data?.[0]?.id ?? null
}

// Unarchive a conversation to recover it
export async function unarchiveConversation(conversationId: string, userId: string) {
  const { error } = await supabase
    .from('conversations')
    .update({ archived_at: null })
    .eq('id', conversationId)
    .eq('user_id', userId)
  if (error) console.error('unarchiveConversation error', error)
  return { ok: !error, error }
}

// EMERGENCY: Get ALL messages for a user across ALL conversations
export async function fetchAllMessagesForUser(userId: string): Promise<DbMessageRow[]> {
  const { data, error } = await supabase
    .from('messages')
    .select('id, conversation_id, user_id, role, text, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: true })

  if (error) {
    console.error('fetchAllMessagesForUser error', error)
    return []
  }
  return (data as DbMessageRow[]) ?? []
}

// Get the conversation with the most messages (likely the main one)
export async function getConversationWithMostMessages(userId: string): Promise<string | null> {
  // Get all conversations for this user
  const { data: convs, error: convError } = await supabase
    .from('conversations')
    .select('id')
    .eq('user_id', userId)

  if (convError || !convs?.length) return null

  // For each, count messages and find the one with most
  let maxCount = 0
  let bestConvId: string | null = null

  for (const conv of convs) {
    const { count } = await supabase
      .from('messages')
      .select('*', { count: 'exact', head: true })
      .eq('conversation_id', conv.id)

    if (count && count > maxCount) {
      maxCount = count
      bestConvId = conv.id
    }
  }

  console.log(`[conversations] Found conversation ${bestConvId} with ${maxCount} messages`)
  return bestConvId
}
