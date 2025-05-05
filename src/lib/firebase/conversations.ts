import { collection, doc, addDoc, getDocs, query, where, orderBy, limit, serverTimestamp } from 'firebase/firestore'
import { db } from './config'
import type { Message } from '@/lib/types'

const MESSAGES_PER_PAGE = 50

export async function saveMessage(userId: string, message: Omit<Message, 'id'>) {
  const messagesRef = collection(db, 'messages')
  
  const messageData = {
    ...message,
    userId,
    createdAt: serverTimestamp()
  }
  
  const docRef = await addDoc(messagesRef, messageData)
  return docRef.id
}

export async function getUserMessages(userId: string, page = 1) {
  const messagesRef = collection(db, 'messages')
  const q = query(
    messagesRef,
    where('userId', '==', userId),
    orderBy('createdAt', 'desc'),
    limit(MESSAGES_PER_PAGE * page)
  )
  
  const snapshot = await getDocs(q)
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  })) as Message[]
}

export async function getMessageById(messageId: string) {
  const messageRef = doc(db, 'messages', messageId)
  const snapshot = await getDocs(messageRef)
  return snapshot.exists() ? snapshot.data() as Message : null
}