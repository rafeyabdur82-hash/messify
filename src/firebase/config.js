// Firebase configuration
// IMPORTANT: Replace these values with YOUR OWN Firebase project credentials.
// Guide: Firebase Console -> Project Settings -> General -> Your apps -> Web app -> Config
// See SETUP_GUIDE.md section "Firebase Setup" for step-by-step instructions.
//
// Note: image uploads (payment screenshots, QR codes) use Cloudinary instead
// of Firebase Storage — see src/firebase/storage.js for that setup. Firebase
// Storage requires the paid Blaze plan even for free-tier usage, so it's not
// used here.

import { initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'

const firebaseConfig = {
  apiKey: "AIzaSyCAAovcLQ3voYcUHTX4WLOLcOZg3Wylt9U",
  authDomain: "messify-production.firebaseapp.com",
  databaseURL: "https://messify-production-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "messify-production",
  storageBucket: "messify-production.firebasestorage.app",
  messagingSenderId: "866940073849",
  appId: "1:866940073849:web:1b175d29e5dce307ffa1a8",
  measurementId: "G-BXR0WGFQJY"
}

const app = initializeApp(firebaseConfig)

export const auth = getAuth(app)
export const db = getFirestore(app)
export default app
