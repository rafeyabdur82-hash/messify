import { useEffect, useMemo, useState } from 'react'
import { collection, onSnapshot, query, where } from 'firebase/firestore'
import { db } from '../firebase/config'

const todayStr = () => new Date().toISOString().slice(0, 10)

// Live, public view of the network: every listed mess joined with its menu for today.
// Reads only messProfiles + menus (both publicly readable), so it works before login.
export function usePublicMesses() {
  const [profiles, setProfiles] = useState(null)
  const [menus, setMenus] = useState({})

  useEffect(() => {
    const unsubP = onSnapshot(collection(db, 'messProfiles'),
      (snap) => setProfiles(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
      () => setProfiles([]))
    const unsubM = onSnapshot(query(collection(db, 'menus'), where('date', '==', todayStr())),
      (snap) => setMenus(Object.fromEntries(snap.docs.map((d) => [d.data().messId, d.data()]))),
      () => setMenus({}))
    return () => { unsubP(); unsubM() }
  }, [])

  return useMemo(() => {
    const messes = (profiles || []).map((m) => ({
      ...m,
      todayMenu: menus[m.id] && (menus[m.id].lunch?.items || menus[m.id].dinner?.items) ? menus[m.id] : null,
    }))
    messes.sort((a, b) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0))
    return { loading: profiles === null, messes, withMenu: messes.filter((m) => m.todayMenu).length, recent: messes.slice(0, 3) }
  }, [profiles, menus])
}
