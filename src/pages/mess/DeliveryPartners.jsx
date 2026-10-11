import { useEffect, useState } from 'react'
import { useAuth } from '../../context/AuthContext.jsx'
import PageLayout from '../../components/common/MessPage.jsx'
import { Card, Select, Button, Badge, EmptyState, Spinner } from '../../components/common/UI.jsx'
import { getDeliveryPartnerAccounts, getMessDeliveryPartners, linkDeliveryPartner, unlinkDeliveryPartner } from '../../firebase/firestore.js'

export default function DeliveryPartners() {
  const { currentUser } = useAuth()
  const [partners, setPartners] = useState([])
  const [deliveryAccounts, setDeliveryAccounts] = useState([])
  const [loading, setLoading] = useState(true)
  const [email, setEmail] = useState('')
  const [linking, setLinking] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => { load() }, [currentUser])

  async function load() {
    setLoading(true)
    const [data, accounts] = await Promise.all([
      getMessDeliveryPartners(currentUser.uid),
      getDeliveryPartnerAccounts(),
    ])
    setPartners(data)
    setDeliveryAccounts(accounts)
    setLoading(false)
  }

  async function handleLink(e) {
    e.preventDefault()
    setError('')
    setLinking(true)
    const result = await linkDeliveryPartner(currentUser.uid, email)
    setLinking(false)
    if (!result.success) { setError(result.reason); return }
    setEmail('')
    load()
  }

  async function handleUnlink(id) {
    await unlinkDeliveryPartner(id)
    load()
  }

  const linkedEmails = new Set(partners.map((partner) => partner.email?.toLowerCase()))

  if (loading) return <PageLayout><Spinner /></PageLayout>

  return (
    <PageLayout title="Delivery Partners" subtitle="Link delivery accounts so you can assign them to routes">
      <Card className="mb-6 animate-fadeUp">
        <h3 className="text-base font-bold mb-3">Link a delivery partner</h3>
        <p className="text-xs text-charcoal-soft mb-4">Select a delivery partner account to link it to your mess. Linked accounts are marked in the list.</p>
        <form onSubmit={handleLink} className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1">
            <Select required value={email} onChange={(e) => setEmail(e.target.value)}>
              <option value="" disabled>Select a delivery partner</option>
              {deliveryAccounts.map((account) => {
                const linked = linkedEmails.has(account.email?.toLowerCase())
                return (
                  <option key={account.id} value={account.email} disabled={linked}>
                    {account.name || 'Delivery Partner'} · {account.email}{linked ? ' (Linked)' : ''}
                  </option>
                )
              })}
            </Select>
          </div>
          <Button type="submit" disabled={linking || !email}>{linking ? 'Linking...' : 'Link Partner'}</Button>
        </form>
        {deliveryAccounts.length === 0 && <p className="text-xs text-charcoal-soft mt-3">No delivery partner accounts found. They must sign up choosing “Delivery Partner” first.</p>}
        {error && <p className="text-danger text-[13px] bg-[#F7E3E0] px-3.5 py-2.5 rounded-xl mt-3">{error}</p>}
      </Card>

      {partners.length === 0 ? (
        <EmptyState icon="🛵" title="No delivery partners linked yet" message="Link a partner above so you can assign them to delivery routes." />
      ) : (
        <Card className="animate-fadeUp">
          {partners.map((p) => (
            <div key={p.id} className="flex justify-between items-center py-3.5 border-t border-sooji first:border-t-0">
              <div>
                <strong className="text-sm">{p.name}</strong>
                <p className="text-xs text-charcoal-soft mt-0.5">{p.email} {p.phone ? `· ${p.phone}` : ''}</p>
              </div>
              <div className="flex items-center gap-3">
                <Badge tone="info">Linked</Badge>
                <button className="text-xs text-danger font-semibold" onClick={() => handleUnlink(p.id)}>Unlink</button>
              </div>
            </div>
          ))}
        </Card>
      )}
    </PageLayout>
  )
}
