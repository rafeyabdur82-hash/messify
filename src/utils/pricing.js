// Shared subscription plan definitions and pricing logic, used by both the
// plan-selection screen (MessDetail) and the payment screen (Payment).
// Payment.jsx recomputes the price from the mess's actual menu instead of
// trusting the amount passed in the URL, so a student can't tamper with the
// query string to submit a payment claim for a lower amount than the mess
// owner would expect to see.

import { COUPONS } from '../constants.js'

export const PLANS = [
  { id: 'weekly', label: 'Weekly', desc: '7 days, lunch + dinner', multiplier: 7 },
  { id: 'monthly', label: 'Monthly', desc: '30 days, lunch + dinner', multiplier: 30 },
  { id: 'monthly_lunch', label: 'Monthly (Lunch Only)', desc: '30 days, lunch only', multiplier: 30, lunchOnly: true },
]

export function calculatePlanPrice(planId, menu) {
  const plan = PLANS.find((p) => p.id === planId)
  if (!plan) return 0
  const lunchPrice = menu?.lunch?.price || 70
  const dinnerPrice = menu?.dinner?.price || 85
  const daily = plan.lunchOnly ? lunchPrice : lunchPrice + dinnerPrice
  const total = daily * plan.multiplier
  return Math.round(total * 0.92) // bundled discount vs paying daily
}

// Full price breakdown for a plan + optional coupon code. Used by both the
// checkout page and the payment page so the amount always matches.
export function priceBreakdown(planId, menu, couponCode = '') {
  const subtotal = calculatePlanPrice(planId, menu)
  const code = (couponCode || '').trim().toUpperCase()
  const coupon = COUPONS[code]
  if (!code) return { subtotal, discount: 0, total: subtotal, code: '', error: '' }
  if (!coupon) return { subtotal, discount: 0, total: subtotal, code: '', error: 'This coupon code is not valid.' }
  if (subtotal < coupon.min) {
    return { subtotal, discount: 0, total: subtotal, code: '', error: `${code} needs a plan of at least ₹${coupon.min}.` }
  }
  const discount = Math.min(coupon.flat, subtotal)
  return { subtotal, discount, total: subtotal - discount, code, label: coupon.label, error: '' }
}
