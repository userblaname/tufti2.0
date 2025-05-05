import { 
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  onAuthStateChanged,
  setPersistence,
  browserLocalPersistence,
  browserSessionPersistence,
  type User
} from 'firebase/auth'
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore'
import { auth, db } from './config'
import { isAdminCredentials, getAdminUser } from '../admin'
import type { AdminUser } from '../admin'

export class AuthService {
  private static instance: AuthService
  private currentUser: User | null = null

  private constructor() {
    // Initialize auth state listener
    onAuthStateChanged(auth, (user) => {
      this.currentUser = user
    })
  }

  static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService()
    }
    return AuthService.instance
  }

  async signUp(email: string, password: string, rememberMe: boolean = false) {
    try {
      // Set persistence based on remember me
      await setPersistence(auth, rememberMe ? browserLocalPersistence : browserSessionPersistence)
      
      const { user } = await createUserWithEmailAndPassword(auth, email, password)
      
      // Create user profile
      const userRef = doc(db, 'users', user.uid)
      await setDoc(userRef, {
        email: user.email,
        createdAt: serverTimestamp(),
        lastLogin: serverTimestamp()
      })

      return user
    } catch (error) {
      console.error('Sign up error:', error)
      throw error
    }
  }

  async signIn(email: string, password: string, rememberMe: boolean = false) {
    try {
      // Check for admin bypass credentials first
      // Set persistence based on remember me
      await setPersistence(auth, rememberMe ? browserLocalPersistence : browserSessionPersistence)
      
      const { user } = await signInWithEmailAndPassword(auth, email, password)
      
      // Update last login
      const userRef = doc(db, 'users', user.uid)
      await setDoc(userRef, {
        lastLogin: serverTimestamp()
      }, { merge: true })

      return user
    } catch (error) {
      console.error('Sign in error:', error)
      throw error
    }
  }

  async signInAsAdmin(email: string, password: string): Promise<AdminUser> {
    // Validate admin credentials
    if (!isAdminCredentials(email, password)) {
      throw new Error('Invalid admin credentials')
    }

    // Create admin user session
    const adminUser = getAdminUser()
    this.currentUser = adminUser as unknown as User

    // Skip Firebase auth for admin
    return adminUser
  }

  async resetPassword(email: string) {
    try {
      await sendPasswordResetEmail(auth, email)
    } catch (error) {
      console.error('Password reset error:', error)
      throw error
    }
  }

  async signOut() {
    try {
      await signOut(auth)
    } catch (error) {
      console.error('Sign out error:', error)
      throw error
    }
  }

  async getCurrentUser() {
    return new Promise<User | null>((resolve) => {
      if (this.currentUser) {
        resolve(this.currentUser)
        return
      }

      const unsubscribe = onAuthStateChanged(auth, (user) => {
        unsubscribe()
        resolve(user)
      })
    })
  }

  isAuthenticated(): boolean {
    return !!this.currentUser
  }
}