import { signInWithPopup, signInWithRedirect, signOut } from 'firebase/auth'
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore'
import { auth, db, googleProvider } from './config'

export async function signInWithGoogle() {
  try {
    let result;
    
    try {
      result = await signInWithPopup(auth, googleProvider)
    } catch (error: any) {
      if (error.code === 'auth/popup-blocked') {
        // Fallback to redirect
        await signInWithRedirect(auth, googleProvider)
        return // Auth will be handled by redirect result
      }
      throw error
    }
    
    const { user } = result
    
    const userRef = doc(db, 'users', user.uid)
    const userSnap = await getDoc(userRef)
    
    if (!userSnap.exists()) {
      const userData = {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
        photoURL: user.photoURL,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      }
      await setDoc(userRef, userData)
    } else {
      await setDoc(userRef, {
        updatedAt: serverTimestamp()
      }, { merge: true })
    }
    
    return user
  } catch (error: any) {
    console.error('Error during Google sign in:', error)
    throw error
  }
}

export async function logOut(): Promise<void> {
  await signOut(auth)
}