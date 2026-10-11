// Publishes firestore.rules to the project in scripts/serviceAccountKey.json (no Firebase CLI needed).
//   npm run publish-rules
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { initializeApp, cert } from 'firebase-admin/app'
import { getSecurityRules } from 'firebase-admin/security-rules'

const here = path.dirname(fileURLToPath(import.meta.url))
const key = JSON.parse(fs.readFileSync(path.join(here, 'serviceAccountKey.json'), 'utf8'))
initializeApp({ credential: cert(key) })
const source = fs.readFileSync(path.join(here, '..', 'firestore.rules'), 'utf8')
await getSecurityRules().releaseFirestoreRulesetFromSource(source)
console.log(`Published firestore.rules to ${key.project_id}`)
