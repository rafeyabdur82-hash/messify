import { useEffect, useState } from 'react'
import { useAuth } from '../../context/AuthContext.jsx'
import PageLayout from '../../components/common/StudentPage.jsx'
import { Card, Select, EmptyState, Spinner } from '../../components/common/UI.jsx'
import { getStudentSubscriptions, getLedger } from '../../firebase/firestore.js'
import { resolveMessProfile } from '../../utils/messResolver.js'

const currentMonth = () => new Date().toISOString().slice(0, 7)

export default function Billing() {
  const { currentUser } = useAuth()
  const [subs, setSubs] = useState([])
  const [messNames, setMessNames] = useState({})
  const [selectedMess, setSelectedMess] = useState('')
  const [entries, setEntries] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const data = await getStudentSubscriptions(currentUser.uid)
      setSubs(data)
      const nameMap = {}
      for (const s of data) { const mess = await resolveMessProfile(s.messId); nameMap[s.messId] = mess?.messName || 'Mess' }
      setMessNames(nameMap)
      if (data.length > 0) setSelectedMess(data[0].messId)
      setLoading(false)
    }
    load()
  }, [currentUser])

  useEffect(() => {
    if (!selectedMess) return
    getLedger(currentUser.uid, selectedMess, currentMonth()).then((data) => setEntries(data.entries || []))
  }, [selectedMess, currentUser])

  const total = entries.reduce((sum, e) => sum + (e.type === 'charge' ? e.amount : -e.amount), 0)

  if (loading) return <PageLayout><Spinner /></PageLayout>

  return (
    <PageLayout title="Billing & Ledger" subtitle="Your complete breakdown for this month">
      {subs.length === 0 ? (
        <EmptyState icon="🧾" title="No billing data yet" message="Once you subscribe, your bill will show up here." />
      ) : (
        <>
          <div className="max-w-xs mb-6 animate-fadeUp">
            <Select label="Select mess" value={selectedMess} onChange={(e) => setSelectedMess(e.target.value)}>
              {subs.map((s) => <option key={s.messId} value={s.messId}>{messNames[s.messId]}</option>)}
            </Select>
          </div>

          <div className="flex justify-between items-center p-5 bg-masala text-white rounded-2xl mb-5 animate-fadeUp" style={{ animationDelay: '.1s' }}>
            <div>
              <div className="text-xs opacity-85">This month's total</div>
              <div className="font-mono text-[32px] font-bold">₹{total}</div>
            </div>
            <div className="text-xs text-right opacity-85">
              {entries.filter((e) => e.type === 'charge').length} meals eaten<br />
              {entries.filter((e) => e.type === 'skip').length} meals skipped
            </div>
          </div>

          <Card className="animate-fadeUp" style={{ animationDelay: '.2s' }}>
            {entries.length === 0 ? (
              <p className="text-charcoal-soft text-sm">No entries yet this month.</p>
            ) : (
              <table className="w-full border-collapse">
                <thead>
                  <tr className="text-[11px] uppercase tracking-wide text-charcoal-soft">
                    <th className="text-left py-2.5 border-b-2 border-sooji">Date</th>
                    <th className="text-left py-2.5 border-b-2 border-sooji">Meal</th>
                    <th className="text-left py-2.5 border-b-2 border-sooji">Type</th>
                    <th className="text-right py-2.5 border-b-2 border-sooji">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {entries.map((e, i) => (
                    <tr key={i} className="text-sm">
                      <td className="py-3 border-b border-sooji">{e.date}</td>
                      <td className="py-3 border-b border-sooji capitalize">{e.meal}</td>
                      <td className="py-3 border-b border-sooji">{e.type === 'charge' ? 'Eaten' : 'Skipped'}</td>
                      <td className="py-3 border-b border-sooji text-right font-mono">{e.type === 'skip' ? '−' : ''}₹{e.amount}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Card>
        </>
      )}
    </PageLayout>
  )
}
