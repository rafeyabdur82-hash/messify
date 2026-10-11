// Static marketing content for the landing page (converted from public/pages/landing-page-full.html).
import { BUSINESS } from '../constants.js'

export const SUPPORT_PHONE = BUSINESS.phone
export const SUPPORT_PHONE_HREF = BUSINESS.phoneHref
export const HQ_ADDRESS = BUSINESS.address

export const DIET_TYPES = [
  'Pure Veg Gujarati Thali',
  'Kathiyawadi Unlimited',
  'Strict Jain (No Onion/Garlic)',
  'North Indian Executive',
]

export const HERO_IMAGE = '/meal-image.png'

export const TRUST_ITEMS = [
  { kind: 'phone', title: SUPPORT_PHONE, sub: 'Direct Mess Helpline' },
  { kind: 'big', title: 'Messes', sub: 'Listed on Messify Live' },
  { kind: 'check', title: '100% Shuddh Shakahari', sub: 'Hygienic Groundnut Oil Only' },
  { kind: 'plain', title: 'Live Menu Updates', sub: 'Cooked Fresh Every Morning & Evening' },
]

export const PLANS = [
  {
    id: 'weekly', badge: '✂️ TRIAL PASS', title: 'Weekly Trial Pass', desc: '14 Consecutive Meals (Lunch & Dinner)',
    price: '₹999', oldPrice: '₹1,200', saving: 'Save ₹201 this week (₹71 / meal)',
    features: ['7 Days unlimited lunch & dinner', 'Free Trial Sweet dish on Day 1', 'Skip up to 2 meals with app notification'],
    cta: 'Subscribe via UPI (₹999)',
  },
  {
    id: 'monthly', featured: true, badge: '👑 Most Popular Student Choice', title: 'Monthly Full Pass', desc: '60 Meals Booklet (Lunch + Dinner)',
    price: '₹3,600', oldPrice: '₹4,500', ribbon: '₹900 OFF', saving: 'Just ₹60 / unlimited hearty meal!',
    features: ['Full 30-Day unlimited dining or tiffin', 'Free Sunday Farsan & Sweet Specials', '10 Meal Skips allowed with 1-tap rollover', 'Dedicated Mess Manager Whatsapp Support'],
    cta: 'Get Pass via GPay / PhonePe',
  },
  {
    id: 'lunch', badge: '✂️ 30 PASSES BOOKLET', title: 'Monthly Lunch Booklet', desc: '30 Individual Lunch Passes (Flexible Use)',
    price: '₹1,800', oldPrice: '₹2,200', saving: 'Flat ₹60 per plate (Struck from ₹110)',
    features: ['30 Lunch passes valid for 45 calendar days', 'Perfect for Office Goers & College Students', 'Shareable with roommates or classmates'],
    cta: 'Subscribe via UPI (₹1,800)',
  },
]

export const STEPS = [
  { n: 1, title: 'Pick Your Mess', text: 'Filter by distance, Gujarati / Kathiyawadi / Jain menu, oil purity scores, and student verified reviews.', color: 'bg-brand-forest text-brand-gold' },
  { n: 2, title: 'UPI Instant Payment', text: 'Scan the QR or click to pay via GPay, PhonePe, or Paytm with flat promotional discounts pre-applied.', color: 'bg-brand-saffron text-white' },
  { n: 3, title: 'Instant Confirmation', text: 'The mess owner instantly receives your booking and your digital QR pass is added to your account.', color: 'bg-brand-forest text-brand-gold' },
  { n: 4, title: 'Relish Daily Meals', text: 'Walk in for unlimited dining or receive hot doorstep tiffin delivery before 12:30 PM & 8:00 PM every day!', color: 'bg-green-700 text-white' },
]

export const COUPONS = [
  { amount: '₹50', was: '₹110', now: 'To ₹60', note: '(Single Dish)' },
  { amount: '₹100', was: '2500', now: 'To 2400', note: '(30 Passes Booklet)' },
]

export const OWNER_FEATURES = [
  { icon: '💰', title: 'Automated UPI Payouts', text: 'Direct T+1 daily settlement into your bank account.' },
  { icon: '📲', title: '1-Click Daily Menu Broadcast', text: 'Notify subscribers on WhatsApp with your fresh daily shaak.' },
  { icon: '📊', title: 'Zero-Hassle Attendance QR', text: 'Students scan your QR code; no manual registers needed.' },
  { icon: '🛵', title: 'Batch Route Delivery Maps', text: 'Automated delivery route optimization for hostel drops.' },
]

export const FAQS = [
  { q: 'How do meal skips and wallet credits work?', a: 'Simply open Messify before 9:00 AM for lunch or before 5:00 PM for dinner and tap "Skip Meal". Your meal credit is automatically extended to your validity period, ensuring zero financial loss.' },
  { q: 'Can I pay via UPI apps like Google Pay, PhonePe, and Paytm?', a: 'Yes! We support all major UPI payment apps, QR scanners, and Rupay cards with instant confirmation. You receive a digital pass with a unique QR code directly on your mobile device.' },
  { q: 'Is the food genuinely 100% Pure Vegetarian and cooked in Groundnut Oil?', a: 'Every partnered mess undergoes physical kitchen verification. We strictly verify that only 100% Shuddh groundnut / sunflower cooking oils are used (No Palm Oil) and all premises are purely vegetarian. Strict Jain options are prepared separately.' },
  { q: 'Can I switch messes during my active monthly subscription?', a: 'Yes, our "Flexi-Pass" option lets you switch your dining mess once every 7 days to try different verified kitchens around Nagpur without losing unused pass balances.' },
]

export const FOOTER_LINKS = [
  { label: "Today's Live Mess Menus", href: '#messes' },
  { label: 'Student 30-Passes Booklet (₹60/meal)', href: '#plans' },
]

export const QUALITY_PROMISES = ['100% Shuddh Shakahari', 'No Recycled / Palm Oil', 'Daily Fresh Hand-Rolled Rotli', 'UPI Verified Fast Check-in']
