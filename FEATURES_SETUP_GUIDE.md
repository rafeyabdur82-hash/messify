# New Features Setup Guide — Payments, Admin Panel, Delivery, QR

This covers the extra one-time setup needed for everything added in this update:
manual UPI payments with approval, the admin panel, delivery partner assignment,
QR codes, notifications, and the AI assistant.

---

## 1. Set up Cloudinary (free image hosting for payment screenshots & QR codes)

Firebase Storage now requires a paid Blaze plan even for free-tier usage, so image
uploads (payment screenshots, mess QR codes) use **Cloudinary** instead — a
free image-hosting service that needs no credit card.

1. Go to [cloudinary.com](https://cloudinary.com) and create a free account
2. On your Dashboard (the page you land on after logging in), copy your **Cloud name** — it's shown right at the top
3. Go to **Settings** (gear icon, top right) → **Upload** tab → scroll to **Upload presets** → click **Add upload preset**
4. Set **Signing Mode** to **Unsigned** (important — this lets the browser upload directly without needing a secret key)
5. Save, then copy the preset name shown (or set your own name before saving)
6. Open `src/firebase/storage.js` in the project and fill in both values:
   ```js
   const CLOUD_NAME = 'your-cloud-name-here'
   const UPLOAD_PRESET = 'your-preset-name-here'
   ```

Cloudinary's free tier gives you 25GB storage and 25GB bandwidth per month — more than enough for payment screenshots and QR codes at any realistic scale for this app.

Then build and deploy as usual:

```bash
npm install
npm run build
firebase deploy --only hosting,firestore:rules
```

(No Storage rules to deploy anymore — Firebase Storage isn't used.)

---

## 3. Create your Admin account (you, the platform owner)

There's no public "sign up as Admin" option — that's intentional, so no one else can grant themselves admin access. To make your own account an admin:

1. Sign up normally on the live site as a Student (or any role) — or use an account you already have
2. Go to **Firebase Console → Firestore Database → `users` collection**
3. Find your account's document (search by your email)
4. Edit the `role` field from `student` (or whatever it is) to `admin`
5. Save, then log out and log back in on the site

You'll now land on `/admin` with the full dashboard: platform stats, all students, all mess owners with their earnings, delivery partners, and every payment across the platform.

---

## 4. How the payment flow works

1. Student picks a plan (Weekly / Monthly / Monthly Lunch-only) and clicks **Continue to Payment**
2. They see the mess owner's uploaded UPI QR code and the exact amount to pay
3. Student pays via their own UPI app (GPay/PhonePe/etc.), then submits: their name, UTR/transaction number, and a screenshot
4. The mess owner gets a notification and reviews it on **Payments** in their dashboard — screenshot, UTR, amount
5. On **Approve**: the subscription activates, the student is notified, and the mess owner's confirmed earnings update
6. On **Reject**: the student is notified their payment couldn't be verified

**Mess owners must upload their payment QR code first** (Dashboard → QR Code → Payment QR Code) or students won't be able to complete a payment for them.

## 5. Commission rate

Set in `src/constants.js`:
```js
export const COMMISSION_RATE = 0.03 // 3%
```
Change this single number to adjust your platform's cut — it's used everywhere (payment splitting, admin dashboard, mess ledger) automatically.

## 6. Delivery partners

1. A delivery partner signs up choosing "Delivery Partner" as their role — that's their normal account
2. The mess owner goes to **Delivery** in their dashboard and links that partner by email
3. When creating a delivery route (Orders page), the mess owner picks a linked partner and can manually reorder stops before confirming

## 7. QR codes (two different kinds)

- **Payment QR** (uploaded by mess owner): what students scan to actually pay
- **Mess location QR** (auto-generated): a shareable/printable code that links straight to the mess's subscription page — found on the same QR Code page, with a download button

## 8. Notifications

The bell icon in the navbar shows real-time notifications for all roles — new payments to approve, payment approvals/rejections, etc. No setup needed, it works automatically off Firestore.

## 9. AI Assistant

The floating chat button (bottom-right, all pages) is a rule-based assistant — it recognizes common questions about subscribing, payments, skipping meals, billing, and delivery, and links to the right page. It does not call any external AI API (that would require a backend server to keep an API key secure, which a static Firebase-hosted site doesn't have).

---

## Known limitations (be upfront about these)

- **Payments are manually verified, not gateway-processed.** There's no Razorpay/Stripe integration — this is intentional given the "student pays via UPI, mess owner approves" flow you asked for. Adding a real payment gateway later is possible but is a separate, larger project (needs a business merchant account and backend).
- **The AI assistant is rule-based**, not a live LLM connection.
- **Mess recommendations** use rating + area-matching as the signal (a reasonable stand-in for full order-history-based ML, which would need much more usage data to be meaningful anyway).
