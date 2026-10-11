// Central place for platform-wide business rules so they're easy to find
// and change later (e.g. if the commission rate changes).

// Platform commission taken from every approved subscription payment.
// Piyush (platform owner) earns this share; the mess owner receives the rest.
export const COMMISSION_RATE = 0.03 // 3%

export function splitPayment(amount) {
  const commission = Math.round(amount * COMMISSION_RATE)
  const messEarning = amount - commission
  return { amount, commission, messEarning }
}

// Business contact details used across the marketing pages and checkout.
export const BUSINESS = {
  name: 'Messify',
  city: 'Nagpur',
  addressLine1: 'Shradha Park, B-37-39/1, Wadi Link Road,',
  addressLine2: 'MIDC, Hingna, Nagpur, Maharashtra 441110',
  address: 'Shradha Park, B-37-39/1, Wadi Link Road, MIDC, Hingna, Nagpur, Maharashtra 441110',
  phone: '(+91) 82386 92705',
  phoneHref: 'tel:+918238692705',
}

// Coupon codes accepted at checkout. `min` is the minimum plan subtotal (₹).
// Note: one-time-use per student is not enforced yet.
export const COUPONS = {
  MESSIFY50: { flat: 50, min: 0, label: 'First-pass discount' },
  MESSIFY100: { flat: 100, min: 1800, label: 'Booklet discount' },
}

export function formatINR(amount) {
  return `₹${Number(amount || 0).toLocaleString('en-IN')}`
}
