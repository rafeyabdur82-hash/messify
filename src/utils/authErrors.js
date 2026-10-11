const MESSAGES = {
  'auth/invalid-credential': 'Email or password is incorrect.',
  'auth/user-not-found': 'No account found with this email.',
  'auth/wrong-password': 'Incorrect password.',
  'auth/invalid-email': 'Please enter a valid email address.',
  'auth/user-disabled': 'This account has been disabled. Contact support.',
  'auth/too-many-requests': 'Too many attempts. Please wait a few minutes and try again.',
  'auth/network-request-failed': 'Network error. Check your internet connection and try again.',
  'auth/configuration-not-found': 'Login is not enabled yet: in Firebase console turn on Authentication → Email/Password.',
  'auth/operation-not-allowed': 'Email/Password sign-in is disabled: enable it in Firebase console → Authentication.',
  'auth/api-key-not-valid': 'Firebase API key is invalid. Check src/firebase/config.js.',
  'permission-denied': 'Database access denied. Publish firestore.rules and run npm run seed.',
  'unavailable': 'Firestore is not reachable. Create the Firestore database in Firebase console.',
}

export function mapAuthError(code) {
  return MESSAGES[code] || `Something went wrong${code ? ` (${code})` : ''}. Please try again.`
}

export const ROLE_HOME = { student: '/student', mess: '/mess', delivery: '/delivery', admin: '/admin' }
