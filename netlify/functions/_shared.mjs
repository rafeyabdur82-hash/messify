import { initializeApp, getApps, cert } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
import { getFirestore } from 'firebase-admin/firestore'

// FIREBASE_SERVICE_ACCOUNT = the whole service-account JSON, pasted as one env var in Netlify.
if (!getApps().length) {
  initializeApp({ credential: cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)) })
}
export const adminDb = getFirestore()

export const json = (status, body) => ({
  statusCode: status,
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
})

// Returns the signed-in Firebase uid from the "Authorization: Bearer <idToken>" header.
export async function requireUser(event) {
  const token = (event.headers.authorization || event.headers.Authorization || '').replace(/^Bearer /, '')
  if (!token) throw Object.assign(new Error('Not signed in'), { status: 401 })
  try {
    return (await getAuth().verifyIdToken(token)).uid
  } catch {
    throw Object.assign(new Error('Invalid session'), { status: 401 })
  }
}

export const razorpayAuth = () =>
  'Basic ' + Buffer.from(`${process.env.RAZORPAY_KEY_ID}:${process.env.RAZORPAY_KEY_SECRET}`).toString('base64')
