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
