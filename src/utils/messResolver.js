// A subscription's messId can point to either a real mess (stored in
// Firestore's messProfiles/menus collections) or one of the demo listings
// shown in Browse Mess when no real mess owners have signed up yet in that
// area. These helpers check both places so student-facing pages (dashboard,
// subscriptions, billing) always have a name, area, and today's menu to show
// instead of falling back to a blank "Mess" label.

import { getMessProfile, getMenu } from '../firebase/firestore.js'
import { getDummyMessById } from '../data/dummyMesses.js'

export async function resolveMessProfile(messId) {
  if (messId.startsWith('dummy-')) {
    const dummy = getDummyMessById(messId)
    if (dummy) return { id: dummy.id, messName: dummy.messName, area: dummy.area, rating: dummy.rating, subscriberCount: dummy.subscriberCount }
  }
  return getMessProfile(messId)
}

export async function resolveMessMenu(messId, date) {
  if (messId.startsWith('dummy-')) {
    const dummy = getDummyMessById(messId)
    // Demo listings don't have per-date menus in Firestore — reuse their
    // fixed sample menu so the dashboard still shows real dish names and prices.
    return dummy ? dummy.todayMenu : null
  }
  return getMenu(messId, date)
}

// Subscription plans have grown beyond the original lunch/dinner/both set to
// include weekly and monthly bundles (see MessDetail.jsx PLANS). This maps
// every plan value to which meals it actually covers, so any page rendering
// a subscription's meal rows stays correct as new plan types are added.
export function planIncludesMeal(plan, meal) {
  if (plan === 'both' || plan === 'weekly' || plan === 'monthly') return true
  if (plan === 'monthly_lunch') return meal === 'lunch'
  return plan === meal
}
