import { useEffect, useState } from 'react'
import { useAuth } from '../../context/AuthContext.jsx'
import PageLayout from '../../components/common/MessPage.jsx'
import { Card, Input, Textarea, Button, Toast, Badge } from '../../components/common/UI.jsx'
import ChangePasswordCard from '../../components/common/ChangePasswordCard.jsx'
import { ensureMessProfile, updateMessProfile } from '../../firebase/firestore.js'

export default function Profile() {
  const { profile, currentUser, updateUserProfile } = useAuth()
  const [messName, setMessName] = useState(profile?.messName || '')
  const [ownerName, setOwnerName] = useState(profile?.name || '')
  const [phone, setPhone] = useState(profile?.phone || '')
  const [area, setArea] = useState(profile?.area || '')
  const [fullAddress, setFullAddress] = useState(profile?.fullAddress || '')
  const [description, setDescription] = useState(profile?.description || '')
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState('')

  useEffect(() => {
    // Auto-repair: makes sure a public messProfiles listing exists even for
    // accounts created before this was automatic, so Browse Mess picks them up.
    if (currentUser) ensureMessProfile(currentUser.uid, profile)
  }, [currentUser])

  async function handleSave(e) {
    e.preventDefault()
    setSaving(true)
    const updates = { messName, name: ownerName, phone, area, fullAddress, description }
    await updateUserProfile(updates)
    // Keep the public student-facing listing in sync with what the owner just edited.
    await updateMessProfile(currentUser.uid, { messName, area, description })
    setSaving(false)
    setToast('Profile updated successfully. Changes are now visible to students.')
    setTimeout(() => setToast(''), 3500)
  }

  return (
    <PageLayout title="Mess Profile" subtitle="Manage your business details">
      <div className="flex flex-col gap-6">
        <Card className="animate-fadeUp">
          <div className="flex items-center justify-between flex-wrap gap-4 mb-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-masala text-white grid place-items-center text-2xl font-bold font-display flex-shrink-0">
                {profile?.messName?.[0]?.toUpperCase() || 'M'}
              </div>
              <div>
                <h3 className="text-xl">{profile?.messName}</h3>
                <Badge tone="info">Mess Owner</Badge>
              </div>
            </div>
            <div className="flex gap-4 text-sm">
              <div className="text-center">
                <div className="font-mono text-lg font-bold text-masala">{profile?.rating?.toFixed(1) || 'New'}</div>
                <div className="text-xs text-charcoal-soft">Rating</div>
              </div>
              <div className="text-center">
                <div className="font-mono text-lg font-bold text-masala">{profile?.subscriberCount || 0}</div>
                <div className="text-xs text-charcoal-soft">Subscribers</div>
              </div>
            </div>
          </div>

          <div className="bg-tamarind/10 border border-tamarind-light/40 rounded-xl p-3.5 mb-5 text-xs text-tamarind">
            This information is shown to students in Browse Mess. Keep your mess name and area accurate so they can find you.
          </div>

          <form onSubmit={handleSave} className="flex flex-col gap-4 max-w-lg">
            <Input label="Mess / Business name" required value={messName} onChange={(e) => setMessName(e.target.value)} />
            <Input label="Owner name" required value={ownerName} onChange={(e) => setOwnerName(e.target.value)} />
            <Input label="Email" value={profile?.email || ''} disabled className="opacity-60" />
            <p className="text-xs text-charcoal-soft -mt-2">Email can't be changed here. Contact support if you need to update it.</p>
            <Input label="Phone number" type="tel" required value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="98765 43210" />
            <Input label="Area / Locality" required value={area} onChange={(e) => setArea(e.target.value)} placeholder="Civil Lines, Nagpur" />
            <Textarea label="Full address (optional)" value={fullAddress} onChange={(e) => setFullAddress(e.target.value)} placeholder="Shop number, street, landmark" />
            <Textarea label="About your mess (optional)" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="e.g. Pure vegetarian home-style meals since 2015" />
            <div>
              <Button type="submit" disabled={saving}>{saving ? 'Saving...' : 'Save Changes'}</Button>
            </div>
          </form>
        </Card>

        <ChangePasswordCard />
      </div>

      {toast && <Toast message={toast} onClose={() => setToast('')} />}
    </PageLayout>
  )
}
