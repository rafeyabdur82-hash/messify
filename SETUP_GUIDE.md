# Messify — Setup & Deployment Guide

Poora guide: Firebase setup se lekar live deployment tak.

---

## 1. Project Overview

**Messify** ek React + Firebase based tiffin/mess subscription platform hai jisme 4 roles hain:

| Role | Kya kar sakta hai |
|---|---|
| **Student** | Mess browse, subscribe, daily menu dekhna, meal skip karna, billing dekhna, delivery track karna |
| **Mess Owner** | Daily menu update, subscribers dekhna, orders/routes banana, earnings dekhna, custom requests accept/reject |
| **Delivery Partner** | Assigned routes dekhna, stop-by-stop delivery mark karna, QR scan karna |
| **Admin** | Platform-wide stats dekhna |

**Tech stack:** React 18 (Vite) + Tailwind CSS (fully animated UI) + React Router + Firebase (Auth, Firestore, Storage)

---

## 2. Local Setup

### Prerequisites
- Node.js 18+ installed (check: `node -v`)
- Ek Google account (Firebase ke liye)
- Code editor (VS Code recommended)

### Steps

```bash
# 1. Project folder mein jao
cd gharse

# 2. Dependencies install karo
npm install

# 3. Dev server start karo
npm run dev
```

Ye `http://localhost:5173` pe app khol dega. Lekin abhi Firebase connect nahi hai, so login/signup kaam nahi karega jab tak Section 3 complete na ho.

---

## 3. Firebase Setup (ZARURI — iske bina app kaam nahi karega)

### Step 1: Firebase Project Banao
1. [console.firebase.google.com](https://console.firebase.google.com) pe jao
2. "Add project" click karo
3. Naam do: `gharse` (ya kuch bhi)
4. Google Analytics — optional, skip kar sakte ho
5. "Create Project" click karo

### Step 2: Web App Register Karo
1. Project overview page pe `</>` (Web) icon click karo
2. App nickname: `messify-web`
3. **"Also set up Firebase Hosting"** ko check karo (deployment ke liye chahiye)
4. Register karo — ab aapko ek config object dikhega jaisa ye:

```js
const firebaseConfig = {
  apiKey: "AIzaSy...",
  authDomain: "gharse-xxxxx.firebaseapp.com",
  projectId: "gharse-xxxxx",
  storageBucket: "gharse-xxxxx.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abc123"
}
```

5. Ye poora object copy karo

### Step 3: Config File Update Karo
Project mein `src/firebase/config.js` file kholo aur `YOUR_API_KEY` waghera ko apne actual values se replace karo:

```js
const firebaseConfig = {
  apiKey: "AIzaSy...",              // <- yahan apna actual value daalo
  authDomain: "gharse-xxxxx.firebaseapp.com",
  projectId: "gharse-xxxxx",
  storageBucket: "gharse-xxxxx.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abc123"
}
```

### Step 4: Authentication Enable Karo
1. Firebase Console mein left sidebar se **Build → Authentication** pe jao
2. "Get Started" click karo
3. **Email/Password** provider select karo aur Enable karo
4. Save karo

### Step 5: Firestore Database Banao
1. Left sidebar se **Build → Firestore Database** pe jao
2. "Create Database" click karo
3. Location select karo (e.g., `asia-south1` — Mumbai, India ke liye sabse fast)
4. **Start in production mode** select karo (security rules hum khud denge)

### Step 6: Security Rules Lagao
1. Firestore Database mein "Rules" tab pe jao
2. Project ke `firestore.rules` file ka poora content copy karo
3. Firebase Console ke rules editor mein paste karo
4. "Publish" click karo

Isse ye ensure hota hai ki:
- Students sirf apna data edit kar sakein
- Mess owners sirf apna menu/subscribers manage kar sakein
- Koi bhi kisi aur ka private data na dekh/edit kar sake

### Step 7: Test Karo
```bash
npm run dev
```
Ab `/signup` page pe jaake account banao — agar sab sahi hai to account create ho jayega aur aap dashboard pe redirect ho jaoge.

---

## 4. Seeding Test Data (Optional but Recommended)

Pehli baar test karne ke liye:

1. Ek **mess owner** account signup karo (role: "Mess/Tiffin Owner")
2. Login karke `/mess/menu` pe jao aur aaj ka menu daalo (lunch + dinner)
3. Firebase Console → Firestore → `users` collection mein us mess owner ka document dhoondo (uid se)
4. Ek naya collection `messProfiles` banao (agar auto nahi bana) — document ID us mess owner ke `uid` jaisa hi rakho, aur fields daalo:
   ```
   ownerId: <uid>
   messName: "Sharma Tiffin Service"
   area: "Sitabuldi, Nagpur"
   rating: 4.5
   subscriberCount: 0
   ```
5. Ab ek **student** account banao, `/student/browse` pe jaake ye mess dhoondo aur subscribe karo

> **Note:** Production mein ye `messProfiles` document automatically banna chahiye jab mess owner signup kare. Abhi ye manual step hai — agar chaho to main isse automate karne ke liye signup flow update kar sakta hoon (mess signup ke waqt `messProfiles` doc bhi auto-create ho jayega). Bata dena agar ye chahiye.

---

## 5. Live Deployment (Firebase Hosting — FREE)

### Step 1: Firebase CLI Install Karo
```bash
npm install -g firebase-tools
```

### Step 2: Login Karo
```bash
firebase login
```
Browser khulega, apne Google account se login karo.

### Step 3: Firebase Init Karo
Project folder ke andar:
```bash
firebase init hosting
```

Jab pooche:
- **"Use an existing project"** select karo → apna `gharse-xxxxx` project chuno
- **Public directory:** `dist` likho (Vite ka build output yahi hota hai)
- **Configure as single-page app?** → **Yes**
- **Set up automatic builds with GitHub?** → No (abhi ke liye)
- Agar `dist/index.html` already exist karta hai to overwrite mat karo (No bolo)

### Step 4: Build Karo
```bash
npm run build
```
Isse `dist/` folder banega jisme production-ready files hongi.

### Step 5: Deploy Karo
```bash
firebase deploy --only hosting
```

Kuch seconds mein ye output dega:
```
Hosting URL: https://gharse-xxxxx.web.app
```

**Bas! Aapki website live hai.** Ye URL kisi ke saath bhi share kar sakte ho.

### Future Updates Deploy Karne Ke Liye
Jab bhi code mein changes karo:
```bash
npm run build
firebase deploy --only hosting
```

---

## 6. Alternative Deployment Options

Agar Firebase Hosting ke alawa kuch aur use karna hai:

### Vercel (bhi free, aur bhi easy)
```bash
npm install -g vercel
vercel
```
Prompts follow karo — ye automatically Vite detect kar lega.

### Netlify
```bash
npm install -g netlify-cli
netlify deploy --prod
```
Build command: `npm run build`, Publish directory: `dist`

Dono options mein Firebase config (Section 3) same tarike se kaam karega kyunki wo sirf frontend se Firebase se connect ho raha hai — hosting provider se koi farak nahi padta.

---

## 7. Custom Domain (Optional)

Agar apna khud ka domain use karna hai (e.g., `gharse.in`):

1. Firebase Console → Hosting → "Add custom domain"
2. Apna domain enter karo
3. Firebase jo DNS records dega, unhe apne domain registrar (GoDaddy, Namecheap, etc.) mein add karo
4. 24-48 ghante mein SSL certificate automatically activate ho jayega

---

## 8. Environment & Costs

- **Firebase Free Tier (Spark Plan)** is project ke liye kaafi hai starting mein:
  - Firestore: 50K reads/day, 20K writes/day free
  - Auth: Unlimited free
  - Hosting: 10GB storage, 360MB/day transfer free
- Jab users badhenge (1000+ daily active), Blaze plan (pay-as-you-go) pe upgrade karna padega — lekin tab tak revenue bhi aana chahiye.

---

## 9. Project Structure Reference

```
gharse/
├── src/
│   ├── components/
│   │   └── common/        → Navbar, Buttons, Cards, PageLayout (reusable UI)
│   ├── context/
│   │   └── AuthContext.jsx → Login/signup/role logic
│   ├── firebase/
│   │   ├── config.js       → Firebase credentials (EDIT THIS)
│   │   └── firestore.js    → All database read/write functions
│   ├── pages/
│   │   ├── Landing.jsx, Login.jsx, Signup.jsx
│   │   ├── student/         → Student-facing pages
│   │   ├── mess/             → Mess owner pages
│   │   ├── delivery/         → Delivery partner pages
│   │   └── admin/             → Admin dashboard
│   ├── App.jsx              → All routes defined here
│   └── main.jsx              → Entry point
├── firestore.rules            → Database security rules
└── package.json
```

---

## 10. Next Steps / Roadmap (Phase 2 & 3)

Ye version mein sab core features + AI suggestions (static/rotating tips) + lightweight route tracking + QR scanning already ban chuke hain. Aage badhane ke liye:

1. **Real AI recommendations:** Abhi tips rotate ho rahe hain static array se. Real AI ke liye Claude API ya OpenAI API call add karna hoga jo user ke past orders dekh kar suggest kare (see `anthropic_api_in_artifacts` pattern agar Claude API use karna hai).
2. **Payment integration:** Razorpay ya Paytm add karke actual online payment lena.
3. **Push notifications:** Firebase Cloud Messaging se students/mess owners ko notify karna (naya menu, skip confirmation, route update).
4. **Auto mess profile creation:** Signup ke waqt automatically `messProfiles` document create karna (abhi manual hai).
5. **Real map integration:** Agar chaho to Google Maps API se actual lat/lng based tracking (abhi stop-count based lightweight version hai).
6. **Weekend Off-Day Pass:** Sunday ko local street-food discount coupons — naya collection `weekendDeals` banake implement kiya ja sakta hai.

---

## Troubleshooting

| Problem | Solution |
|---|---|
| "Firebase: Error (auth/invalid-api-key)" | `src/firebase/config.js` mein apna real API key nahi daala |
| Login ke baad blank page | Check karo `messProfiles` doc bana hai ya nahi (Section 4) |
| "Missing or insufficient permissions" | Firestore rules publish nahi hui — Section 3, Step 6 dobara karo |
| `npm run build` fail ho raha hai | `node -v` check karo, Node 18+ hona chahiye |
| Deploy ke baad routes 404 dete hain | `firebase init hosting` mein "single-page app" ko Yes bola tha ya nahi check karo |

---

Koi bhi step mein atak jao, bata dena — main us specific error ke saath help kar dunga.
