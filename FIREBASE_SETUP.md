# Firebase setup — project `messify-prod`

Credentials are already in `src/firebase/config.js`. Do these steps once, in order.

## 1. Turn on the services (Firebase console)
1. **Authentication** — https://console.firebase.google.com/project/messify-prod/authentication
   → **Get started** → **Email/Password** → Enable → Save.
2. **Firestore** — https://console.firebase.google.com/project/messify-prod/firestore
   → **Create database** → production mode → location `asia-south1`.
   No tables to create by hand: `npm run seed` (step 3) creates every collection.

## 2. Publish the security rules
Paste `firestore.rules` into **Firestore → Rules → Publish**, or:
```bash
npm install -g firebase-tools
firebase login
firebase deploy --only firestore:rules
```

## 3. Create demo accounts + demo data in every table
1. Firebase console → ⚙ **Project settings → Service accounts → Generate new private key**.
2. Save the downloaded file as **`scripts/serviceAccountKey.json`** (it is git-ignored; never share it).
3. Run:
```bash
npm run seed
```
Safe to run again (it refreshes the demo data; nothing is duplicated and only demo ids are touched).

### Demo logins
| Role | Name | Details | Email | Password | Where to sign in |
|---|---|---|---|---|---|
| Admin | Messify Admin | 8238692705 | admin@messify.in | Admin@123 | `/admin/login` |
| Mess owner | Sunita Deshmukh | Annapurna Kitchens, Hingna | mess@messify.in | Mess@123 | `/login` → *Mess Owner* tab |
| Mess owner 2 | Mahesh Kulkarni | Shree Krishna Dining, Hingna Road | mess2@messify.in | Mess@123 | same |
| Student | Aarav Trivedi | RK Boys Hostel, Hingna | student@messify.in | Student@123 | `/login` → *Student* tab |
| Student 2 | Riddhi Patel | Sai Girls PG, Wadi | student2@messify.in | Student@123 | same |
| Student 3 | Karan Dave | Vidya Nagar Flats, Hingna | student3@messify.in | Student@123 | same |
| Delivery | Ramesh Barad | MH-31-AB-1234 | delivery@messify.in | Delivery@123 | `/login` → *Delivery* tab |
| Delivery 2 | Vikram Singh | MH-31-CD-5678 | delivery2@messify.in | Delivery@123 | same |

With `npm run dev`, the login pages also show one-click **fill demo login** buttons. They are not
included in production builds.

Seeded data: 2 messes with menus for 3 days, 5 orders (active paid, cash-on-delivery, pending, rejected),
4 payments (approved / pending / rejected), skips, monthly ledgers, custom requests, 2 delivery routes
(one running, with a live GPS point near Hingna), tiffin boxes, notifications and partner links.

## 4. What each role can do
- **Student** — browse, checkout (UPI QR or cash on delivery), skip meals, custom requests, tiffin QR, live delivery map, billing.
- **Mess owner** — add/edit the daily menu, approve payments, subscribers, create delivery routes, upload UPI QR, ledger.
- **Delivery** — routes, start route + share live location, mark stops delivered, scan box QR.
- **Admin** — `/admin`: live overview and 12 realtime tables (users, messes, menus, orders, payments,
  deliveries, skips, requests, ledger, tiffin boxes, notifications, partner links) with search and CSV export.

## 5. Quick test
1. Sign in as **mess@messify.in** → Menu → change today's lunch price → save.
2. Sign in as **student@messify.in** → dashboard shows the new price; skip dinner; send a custom request.
3. Sign in as **delivery@messify.in** → Routes → open the running lunch route → mark the stop delivered.
4. Keep **admin@messify.in** open in another window: the tables update while you do the steps above.

## Notes
- Images (payment proof, UPI QR) are stored inside Firestore unless you fill Cloudinary in `src/firebase/storage.js`.
- Online payment is manual verification (UPI QR + proof), not a gateway. Cash-on-delivery orders are not in the commission totals.
- Delivery live location works while the delivery partner keeps the route page open.
- Routes contain every student's address/phone on that route; students on the same route can read them.
- **Change or delete the demo accounts before real users sign up** — their passwords are public in this file.
