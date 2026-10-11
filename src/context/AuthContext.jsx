import { createContext, useContext, useEffect, useState } from 'react'
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
  setPersistence,
  browserLocalPersistence,
  browserSessionPersistence,
} from 'firebase/auth'
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore'
import { auth, db } from '../firebase/config'

const AuthContext = createContext(null)

export function useAuth() {
  return useContext(AuthContext)
}

// Retry helper: Firestore reads right after signup/login can occasionally race
// with the auth token propagating, especially on a slow connection or right
// after a fresh deploy. A couple of short retries fixes the "signed in but
// profile never loads" symptom without masking a real missing-document case.
async function fetchProfileDoc(uid, attempt = 1) {
  const snap = await getDoc(doc(db, 'users', uid))
  if (snap.exists()) return snap.data()
  if (attempt < 3) {
    await new Promise((r) => setTimeout(r, 400 * attempt))
    return fetchProfileDoc(uid, attempt + 1)
  }
  return null
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null)
  const [profile, setProfile] = useState(null) // Firestore user doc: { role, name, ... }
  const [loading, setLoading] = useState(true)
  const [authError, setAuthError] = useState('')

  // role: 'student' | 'mess' | 'delivery' | 'admin'
  async function signup(email, password, name, role, extra = {}) {
    // Explicit local persistence: without this call Firebase falls back to its
    // default, which in some browsers (private/incognito, some in-app webviews,
    // certain extension/security-tool setups) does not reliably survive a full
    // page reload — the exact symptom of "works right after signup, but a
    // fresh login later fails."
    await setPersistence(auth, browserLocalPersistence)
    const cred = await createUserWithEmailAndPassword(auth, email, password)
    await updateProfile(cred.user, { displayName: name })

    const userDoc = {
      uid: cred.user.uid,
      name,
      email,
      role,
      createdAt: serverTimestamp(),
      ...extra,
    }
    await setDoc(doc(db, 'users', cred.user.uid), userDoc)

    // Mess owners also need a public messProfiles document — this is what
    // powers Browse Mess on the student side. Without this, a mess owner's
    // account exists but their tiffin service never appears to students.
    if (role === 'mess') {
      await setDoc(doc(db, 'messProfiles', cred.user.uid), {
        ownerId: cred.user.uid,
        messName: extra.messName || name,
        area: extra.area || '',
        rating: 0,
        subscriberCount: 0,
        description: '',
        createdAt: serverTimestamp(),
      })
    }

    setProfile(userDoc)
    return cred.user
  }

  async function login(email, password, remember = true) {
    await setPersistence(auth, remember ? browserLocalPersistence : browserSessionPersistence)
    const cred = await signInWithEmailAndPassword(auth, email, password)
    // Load the profile immediately rather than waiting for the next
    // onAuthStateChanged tick, and return it so the caller can redirect to
    // the correct role-specific page right away instead of guessing.
    const data = await fetchProfileDoc(cred.user.uid)
    setProfile(data)
    return { user: cred.user, profile: data }
  }

  function logout() {
    return signOut(auth)
  }

  async function fetchProfile(uid) {
    const data = await fetchProfileDoc(uid)
    setProfile(data)
    return data
  }

  async function updateUserProfile(updates) {
    if (!currentUser) return
    await setDoc(doc(db, 'users', currentUser.uid), updates, { merge: true })
    setProfile((prev) => ({ ...prev, ...updates }))
  }

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(
      auth,
      async (user) => {
        setCurrentUser(user)
        setAuthError('')
        if (user) {
          try {
            await fetchProfile(user.uid)
          } catch (err) {
            // Surface Firestore/permission errors instead of silently leaving
            // profile null — this is what used to look like "login doesn't work."
            console.error('Failed to load profile:', err)
            setAuthError('We could not load your account details. Please check your connection and try again.')
          }
        } else {
          setProfile(null)
        }
        setLoading(false)
      },
      (err) => {
        console.error('Auth state error:', err)
        setAuthError('Something went wrong while checking your login. Please refresh and try again.')
        setLoading(false)
      }
    )
    return unsubscribe
  }, [])

  const value = {
    currentUser,
    profile,
    loading,
    authError,
    signup,
    login,
    logout,
    updateUserProfile,
    refreshProfile: () => currentUser && fetchProfile(currentUser.uid),
  }

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  )
}
