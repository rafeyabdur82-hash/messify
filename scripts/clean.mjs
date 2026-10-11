// Wipes transactional test data from Firestore so you can test from a clean slate.
//
//   npm run clean          (dry run: only counts)
//   npm run clean -- --yes (really deletes)
//
// KEPT:    users (and all Auth logins), messProfiles, menus, messDeliveryPartners
// DELETED: subscriptions, payments, skips, ledger, customRequests, routes, tiffinBoxes, notifications
// Also resets subscriberCount to 0 on every mess profile.

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { initializeApp, cert } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'

const here = path.dirname(fileURLToPath(import.meta.url))
const keyPath = process.env.GOOGLE_APPLICATION_CREDENTIALS || path.join(here, 'serviceAccountKey.json')
if (!fs.existsSync(keyPath)) { console.error(`Service-account key not found at ${keyPath}`); process.exit(1) }
const key = JSON.parse(fs.readFileSync(keyPath, 'utf8'))
initializeApp({ credential: cert(key) })
const db = getFirestore()

const DELETE = ['subscriptions', 'payments', 'skips', 'ledger', 'customRequests', 'routes', 'tiffinBoxes', 'notifications']
const yes = process.argv.includes('--yes')
console.log(`Project: ${key.project_id}  (${yes ? 'DELETING' : 'dry run, nothing deleted'})\n`)

for (const name of DELETE) {
  const snap = await db.collection(name).get()
  if (yes && snap.size) {
    for (let i = 0; i < snap.docs.length; i += 400) {
      const batch = db.batch()
      snap.docs.slice(i, i + 400).forEach((d) => batch.delete(d.ref))
      await batch.commit()
    }
  }
  console.log(`${name.padEnd(16)} ${yes ? 'deleted' : 'would delete'} ${snap.size}`)
}

const profiles = await db.collection('messProfiles').get()
if (yes) {
  const batch = db.batch()
  profiles.docs.forEach((d) => batch.update(d.ref, { subscriberCount: 0 }))
  await batch.commit()
}
console.log(`${'messProfiles'.padEnd(16)} ${yes ? 'reset subscriberCount on' : 'would reset subscriberCount on'} ${profiles.size}`)
for (const keep of ['users', 'menus', 'messDeliveryPartners']) {
  console.log(`${keep.padEnd(16)} kept ${(await db.collection(keep).count().get()).data().count}`)
}
if (!yes) console.log('\nRun  npm run clean -- --yes  to delete for real.')
