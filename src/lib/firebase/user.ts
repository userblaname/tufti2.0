import { doc, getDoc, updateDoc } from 'firebase/firestore'
import { db } from './config'
import type { UserProfile } from '@/lib/types'

export async function getUserProfile(userId: string): Promise<UserProfile | null> {
  const userRef = doc(db, 'users', userId)
  const snapshot = await getDoc(userRef)
  return snapshot.exists() ? snapshot.data() as UserProfile : null
}

export async function updateUserProfile(userId: string, updates: Partial<UserProfile>): Promise<void> {
  const userRef = doc(db, 'users', userId)
  await updateDoc(userRef, {
    ...updates,
    updatedAt: new Date()
  })
}