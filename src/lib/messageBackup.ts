import type { Message } from '@/lib/types'

const MESSAGES_KEY = 'tufti_messages_backup'
const MAX_BACKUP_MESSAGES = 100  // Reduced - Supabase is primary storage

/**
 * Local Storage backup for messages
 * Acts as a fallback when Supabase fails
 */

export function backupMessagesToLocal(messages: Message[]): void {
    try {
        // Keep only the most recent messages
        const toBackup = messages.slice(-MAX_BACKUP_MESSAGES)
        const serialized = JSON.stringify(toBackup.map(m => ({
            id: m.id,
            text: m.text,
            sender: m.sender,
            timestamp: m.timestamp instanceof Date ? m.timestamp.toISOString() : m.timestamp,
            thoughts: m.thoughts
        })))
        localStorage.setItem(MESSAGES_KEY, serialized)
        console.log('[Backup] ✅ Saved', toBackup.length, 'messages to localStorage')
    } catch (e) {
        console.error('[Backup] Failed to save to localStorage:', e)
    }
}

export function getBackupMessages(): Message[] {
    try {
        const stored = localStorage.getItem(MESSAGES_KEY)
        if (!stored) return []

        const parsed = JSON.parse(stored)
        return parsed.map((m: any) => ({
            ...m,
            timestamp: new Date(m.timestamp)
        }))
    } catch (e) {
        console.error('[Backup] Failed to load from localStorage:', e)
        return []
    }
}

export function clearBackupMessages(): void {
    try {
        localStorage.removeItem(MESSAGES_KEY)
        console.log('[Backup] Cleared localStorage backup')
    } catch (e) {
        console.error('[Backup] Failed to clear localStorage:', e)
    }
}

export function hasBackupMessages(): boolean {
    try {
        return !!localStorage.getItem(MESSAGES_KEY)
    } catch {
        return false
    }
}

/**
 * Sync localStorage messages to backend for memory embeddings
 * Call this when user logs in or periodically
 */
export async function syncToMemory(userId: string): Promise<{ synced: number; failed: number }> {
    // Memory sync only works with the local dev Express server — skip in production
    if (!import.meta.env.DEV) {
        return { synced: 0, failed: 0 }
    }

    try {
        const messages = getBackupMessages()
        if (messages.length === 0) {
            console.log('[Memory Sync] No messages to sync')
            return { synced: 0, failed: 0 }
        }

        console.log(`[Memory Sync] Starting sync of ${messages.length} messages...`)

        const response = await fetch('http://localhost:3001/api/memory/sync', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId, messages })
        })

        if (!response.ok) {
            throw new Error(`Sync failed: ${response.status}`)
        }

        const result = await response.json()
        console.log(`[Memory Sync] ✅ Complete: ${result.synced} synced, ${result.failed} failed`)
        return { synced: result.synced, failed: result.failed }
    } catch (e) {
        console.error('[Memory Sync] Error:', e)
        return { synced: 0, failed: -1 }
    }
}

