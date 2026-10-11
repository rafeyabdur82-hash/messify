import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import StudentPage from '../../components/common/StudentPage.jsx'
import Icon from '../../components/common/Icon.jsx'
import { getAllMessProfiles } from '../../firebase/firestore.js'
import { formatINR } from '../../constants.js'

export default function BrowseMess() {
  const [messes, setMesses] = useState([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [attempt, setAttempt] = useState(0)
  const navigate = useNavigate()

  useEffect(() => {
    let alive = true
    setLoading(true)
    setError('')
    getAllMessProfiles()
      .then((data) => { if (alive) setMesses(data) })
      .catch((err) => {
        console.error('Browse mess failed', err)
        if (!alive) return
        setError(err.code === 'permission-denied'
          ? 'Mess listings are blocked by the database rules. Publish firestore.rules in Firebase console.'
          : `Could not load messes${err.code ? ` (${err.code})` : ''}. Check your connection and that Firestore is created.`)
      })
      .finally(() => { if (alive) setLoading(false) })
    return () => { alive = false }
  }, [attempt])

  const q = search.trim().toLowerCase()
  const filtered = messes.filter((m) => !q || m.messName?.toLowerCase().includes(q) || m.area?.toLowerCase().includes(q))

  return (
    <StudentPage title="Find a mess in your area" subtitle="Verified tiffin providers near you">
      <div className="relative max-w-2xl">
        <Icon name="search" className="absolute left-4 top-1/2 -translate-y-1/2 text-outline pointer-events-none" />
        <input
          className="w-full pl-12 pr-5 py-3 bg-surface-container-lowest rounded-full shadow-sm text-body-md focus:outline-none focus:shadow-md border border-outline-variant focus:border-primary transition-all"
          placeholder="Search by mess name or area..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {loading && (
        <div className="flex justify-center py-16"><Icon name="progress_activity" className="text-4xl text-primary animate-spin" /></div>
      )}

      {!loading && error && (
        <div className="bg-error-container text-on-error-container rounded-xl p-space-md flex items-start gap-space-sm max-w-2xl" role="alert">
          <Icon name="error" className="text-error text-xl" />
          <div className="flex-1">
            <p className="font-label-md text-label-md text-error">Couldn't load messes</p>
            <p className="font-body-sm text-body-sm mt-0.5">{error}</p>
          </div>
          <button type="button" onClick={() => setAttempt((n) => n + 1)} className="px-3 py-1.5 rounded-full bg-primary-container text-surface-bright font-label-md text-label-md">Retry</button>
        </div>
      )}

      {!loading && !error && filtered.length === 0 && (
        <p className="text-on-surface-variant">{messes.length === 0 ? 'No messes have joined yet. Check back soon!' : `No messes match “${search}”.`}</p>
      )}

      {!loading && !error && filtered.length > 0 && (
        <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-space-md">
          {filtered.map((m) => (
            <button
              type="button" key={m.id} onClick={() => navigate(`/student/mess/${m.id}`)}
              className="text-left bg-surface-container-lowest rounded-xl p-space-md shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all flex flex-col gap-space-xs border border-outline-variant/40"
            >
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-headline-sm text-headline-sm text-on-surface leading-tight">{m.messName}</h3>
                <span className="flex items-center gap-0.5 font-label-md text-label-md text-secondary whitespace-nowrap">
                  <Icon name="star" className="text-base" />{m.rating ? Number(m.rating).toFixed(1) : 'New'}
                </span>
              </div>
              <p className="flex items-center gap-1 font-body-sm text-body-sm text-on-surface-variant">
                <Icon name="location_on" className="text-base" />{m.area || 'Nagpur'}
              </p>
              {m.todayMenu?.lunch?.items && (
                <p className="font-body-sm text-body-sm text-on-surface-variant line-clamp-2">
                  <span className="font-semibold text-on-surface">Today's lunch:</span> {m.todayMenu.lunch.items}
                  {m.todayMenu.lunch.price ? ` · ${formatINR(m.todayMenu.lunch.price)}` : ''}
                </p>
              )}
              <div className="mt-auto pt-space-xs flex justify-between items-center">
                <span className="px-2 py-0.5 rounded bg-surface-container-high text-primary font-label-xs text-label-xs">{m.subscriberCount || 0} subscribers</span>
                <span className="flex items-center gap-1 font-label-md text-label-md text-secondary">View menu <Icon name="arrow_forward" className="text-base" /></span>
              </div>
            </button>
          ))}
        </div>
      )}
    </StudentPage>
  )
}
