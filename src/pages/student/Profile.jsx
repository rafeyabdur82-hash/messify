import { useState } from 'react'
import { useAuth } from '../../context/AuthContext.jsx'
import PageLayout from '../../components/common/StudentPage.jsx'
import { Card, Input, Textarea, Button, Toast, Badge } from '../../components/common/UI.jsx'
import ChangePasswordCard from '../../components/common/ChangePasswordCard.jsx'

export default function Profile() {
  const { profile, updateUserProfile } = useAuth()
  const [name, setName] = useState(profile?.name || '')
  const [phone, setPhone] = useState(profile?.phone || '')
  const [area, setArea] = useState(profile?.area || '')
  const [hostelRoom, setHostelRoom] = useState(profile?.hostelRoom || '')
  const [dietaryNotes, setDietaryNotes] = useState(profile?.dietaryNotes || '')
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState('')

  async function handleSave(e) {
    e.preventDefault()
    setSaving(true)
    await updateUserProfile({ name, phone, area, hostelRoom, dietaryNotes })
    setSaving(false)
    setToast('Profile updated successfully.')
    setTimeout(() => setToast(''), 3000)
  }

  return (
    <PageLayout title="My Profile" subtitle="Manage your personal details">
      <div className="flex flex-col gap-6">
        <Card className="animate-fadeUp">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-16 h-16 rounded-full bg-masala text-white grid place-items-center text-2xl font-bold font-display flex-shrink-0">
              {profile?.name?.[0]?.toUpperCase() || 'S'}
            </div>
            <div>
              <h3 className="text-xl">{profile?.name}</h3>
              <Badge tone="info">Student</Badge>
            </div>
          </div>

          <form onSubmit={handleSave} className="flex flex-col gap-4 max-w-lg">
            <Input label="Full name" required value={name} onChange={(e) => setName(e.target.value)} />
            <Input label="Email" value={profile?.email || ''} disabled className="opacity-60" />
            <p className="text-xs text-charcoal-soft -mt-2">Email can't be changed here. Contact support if you need to update it.</p>
            <Input label="Phone number" type="tel" required value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="98765 43210" />
            <Input label="Area / Hostel" required value={area} onChange={(e) => setArea(e.target.value)} placeholder="City Hostel, Nagpur" />
            <Input label="Room number (optional)" value={hostelRoom} onChange={(e) => setHostelRoom(e.target.value)} placeholder="e.g. Block B, Room 204" />
            <Textarea label="Dietary notes / allergies (optional)" value={dietaryNotes} onChange={(e) => setDietaryNotes(e.target.value)} placeholder="e.g. No onion-garlic, peanut allergy" />
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
