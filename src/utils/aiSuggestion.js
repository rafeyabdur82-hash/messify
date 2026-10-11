// Lightweight "AI suggestion" generator for the student dashboard.
// Not a real ML model — rules-based personalization using name, time of day,
// and the student's own subscribed mess + menu, so the tip always names a
// real dish from a real (or demo) mess the student can actually order from.
// This keeps the door open to swap in a real Claude/OpenAI call later
// (see SETUP_GUIDE.md roadmap) without changing how it's called.

const BREAKFAST_LINES = [
  (name, dish, mess) => `Good morning, ${name}! Start your day with ${dish} from ${mess} — it's a great way to fuel up before class.`,
  (name, dish, mess) => `${name}, it's breakfast time — ${mess} has ${dish} on today's menu. Worth grabbing before it runs out.`,
  (name, dish, mess) => `Rise and shine, ${name}! ${dish} from ${mess} is a solid, light start to the day.`,
]

const LUNCH_LINES = [
  (name, dish, mess) => `${name}, for lunch today ${mess} is serving ${dish} — you've rated their food well before, this one's worth trying.`,
  (name, dish, mess) => `Hey ${name}, lunch idea: ${dish} from ${mess}. Comforting and filling for a busy afternoon.`,
  (name, dish, mess) => `${name}, today is a good day to try ${dish} from ${mess} for lunch — it pairs well with a short break after.`,
]

const DINNER_LINES = [
  (name, dish, mess) => `${name}, wind down tonight with ${dish} from ${mess} — a warm, home-style dinner to end the day.`,
  (name, dish, mess) => `Evening, ${name}! ${mess} has ${dish} for dinner tonight — light enough to sleep well after.`,
  (name, dish, mess) => `${name}, dinner suggestion: ${dish} from ${mess}. Simple, hearty, and ready when you are.`,
]

function pickDish(menu, mealKey) {
  const raw = menu?.[mealKey]?.items
  if (!raw) return null
  // Take the first 1-2 items from a comma list as the "highlight dish"
  const items = raw.split(',').map((s) => s.trim()).filter(Boolean)
  return items.slice(0, 2).join(' and ') || raw
}

function currentMealSlot() {
  const hour = new Date().getHours()
  if (hour < 11) return 'breakfast'
  if (hour < 17) return 'lunch'
  return 'dinner'
}

/**
 * Generate a personalized AI-style suggestion.
 * @param {string} studentName - first name of the student
 * @param {Array} subscriptions - active subscriptions [{ messId, plan }]
 * @param {Object} menusByMessId - { [messId]: menu } menu docs keyed by mess id
 * @param {Object} messNamesById - { [messId]: messName }
 * @returns {string} a ready-to-show suggestion sentence
 */
export function generateMealSuggestion(studentName, subscriptions = [], menusByMessId = {}, messNamesById = {}) {
  const name = studentName || 'there'
  const slot = currentMealSlot()
  const lineSets = { breakfast: BREAKFAST_LINES, lunch: LUNCH_LINES, dinner: DINNER_LINES }
  const lines = lineSets[slot]

  // Find a subscription whose mess actually has a menu item for this meal slot
  const candidate = subscriptions.find((s) => {
    const menu = menusByMessId[s.messId]
    return menu?.[slot === 'breakfast' ? 'breakfast' : slot]?.items
  })

  if (candidate) {
    const mess = messNamesById[candidate.messId] || 'your mess'
    const dish = pickDish(menusByMessId[candidate.messId], slot) || 'today\'s special'
    const line = lines[new Date().getDate() % lines.length]
    return line(name, dish, mess)
  }

  // Fallback when no subscription/menu data is available yet
  const fallback = {
    breakfast: `Good morning, ${name}! Once you subscribe to a mess, we'll suggest a breakfast dish here every morning.`,
    lunch: `${name}, browse a mess near you to get personalized lunch suggestions based on today's menu.`,
    dinner: `${name}, subscribe to a mess to get a dinner suggestion tailored to your taste every evening.`,
  }
  return fallback[slot]
}
