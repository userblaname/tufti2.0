import { initializeApp } from 'firebase/app'
import { getAuth, GoogleAuthProvider } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'
import { getDatabase, type Database } from 'firebase/database'
import type { Auth } from 'firebase/auth'
import type { Firestore } from 'firebase/firestore'

interface FirebaseServices {
  auth: Auth
  db: Firestore
  rtdb: Database
  googleProvider: GoogleAuthProvider
}

const firebaseConfig = {
  apiKey: "AIzaSyDsxSz0yyPIzs1svUcWuoZ_Sx0j3Px0e4Y",
  authDomain: "transurfing-7d261.firebaseapp.com",
  databaseURL: "https://transurfing-7d261-default-rtdb.firebaseio.com",
  projectId: "transurfing-7d261",
  storageBucket: "transurfing-7d261.firebasestorage.app",
  messagingSenderId: "793023203754",
  appId: "1:793023203754:web:f4f51774c6859f562d83d3"
}

function initializeFirebase(): FirebaseServices {
  try {
    const app = initializeApp(firebaseConfig)
    const auth = getAuth(app)
    const db = getFirestore(app)
    const rtdb = getDatabase(app)
    const googleProvider = new GoogleAuthProvider()

    // Configure Google Auth Provider
    googleProvider.addScope('profile')
    googleProvider.addScope('email')

    return { auth, db, rtdb, googleProvider }
  } catch (error) {
    console.error('Error initializing Firebase:', error)
    throw new Error('Failed to initialize Firebase services')
  }
}

export const { auth, db, rtdb, googleProvider } = initializeFirebase()
