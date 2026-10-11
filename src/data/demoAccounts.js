// Demo accounts for testing. Created by `npm run seed` (scripts/seed.mjs) and offered as
// quick-fill buttons on the login pages in development only (never in the production build).
//
// IMPORTANT: user ids must not contain "_" (the ledger document id is studentId_messId_month).

export const DEMO_PASSWORD = {
  admin: 'Admin@123',
  mess: 'Mess@123',
  student: 'Student@123',
  delivery: 'Delivery@123',
}

export const DEMO_ACCOUNTS = [
  { key: 'admin', role: 'admin', email: 'admin@messify.in', password: DEMO_PASSWORD.admin, name: 'Messify Admin', phone: '8238692705' },

  { key: 'mess1', role: 'mess', email: 'mess@messify.in', password: DEMO_PASSWORD.mess, name: 'Sunita Deshmukh', phone: '9822011001',
    messName: 'Annapurna Kitchens', area: 'Shradha Park, Wadi Link Road, MIDC, Hingna, Nagpur', lunch: ['Dal Fry, Jeera Rice, Aloo Gobi, 4 Phulka, Salad, Chaas', 70], dinner: ['Paneer Bhurji, Dal Tadka, Pulao, 4 Phulka, Gulab Jamun', 85], rating: 4.8 },
  { key: 'mess2', role: 'mess', email: 'mess2@messify.in', password: DEMO_PASSWORD.mess, name: 'Mahesh Kulkarni', phone: '9822011002',
    messName: 'Shree Krishna Dining', area: 'Hingna Road, Near MIDC Gate, Nagpur', lunch: ['Sev Tameta Shaak, Bajra Rotla, Kadhi, Khichdi, Chaas', 75], dinner: ['Ringna Bharta, Rotla with Makhan, Dal Bhat, Papad', 90], rating: 4.6 },

  { key: 'student1', role: 'student', email: 'student@messify.in', password: DEMO_PASSWORD.student, name: 'Aarav Trivedi', phone: '9890011001', area: 'RK Boys Hostel, Hingna, Nagpur' },
  { key: 'student2', role: 'student', email: 'student2@messify.in', password: DEMO_PASSWORD.student, name: 'Riddhi Patel', phone: '9890011002', area: 'Sai Girls PG, Wadi, Nagpur' },
  { key: 'student3', role: 'student', email: 'student3@messify.in', password: DEMO_PASSWORD.student, name: 'Karan Dave', phone: '9890011003', area: 'Vidya Nagar Flats, Hingna, Nagpur' },

  { key: 'delivery1', role: 'delivery', email: 'delivery@messify.in', password: DEMO_PASSWORD.delivery, name: 'Ramesh Barad', phone: '9765412340', vehicleNumber: 'MH-31-AB-1234' },
  { key: 'delivery2', role: 'delivery', email: 'delivery2@messify.in', password: DEMO_PASSWORD.delivery, name: 'Vikram Singh', phone: '9765412341', vehicleNumber: 'MH-31-CD-5678' },
]

// One quick-fill entry per role, shown on the login screens in dev.
export const QUICK_LOGINS = ['admin', 'mess1', 'student1', 'delivery1'].map((k) => DEMO_ACCOUNTS.find((a) => a.key === k))
