import { useState } from 'react'
import { EmailAuthProvider, reauthenticateWithCredential, updatePassword } from 'firebase/auth'
import { useAuth } from '../../context/AuthContext.jsx'
import { Card, Input, Button, Toast } from './UI.jsx'

// Firebase requires re-authentication with the current password before
// allowing a password change if the session is older than a few minutes —
// this card handles that flow in one step.
export default function ChangePasswordCard() {
  const { currentUser } = useAuth()
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    if (newPassword.length < 6) { setError('New password must be at least 6 characters.'); return }
    if (newPassword !== confirmPassword) { setError('New passwords do not match.'); return }

    setSaving(true)
    try {
      const credential = EmailAuthProvider.credential(currentUser.email, currentPassword)
      await reauthenticateWithCredential(currentUser, credential)
      await updatePassword(currentUser, newPassword)
      setCurrentPassword(''); setNewPassword(''); setConfirmPassword('')
      setToast('Password updated successfully.')
      setTimeout(() => setToast(''), 3000)
    } catch (err) {
      const map = {
        'auth/wrong-password': 'Current password is incorrect.',
        'auth/invalid-credential': 'Current password is incorrect.',
        'auth/too-many-requests': 'Too many attempts. Please wait and try again.',
        'auth/weak-password': 'New password is too weak.',
      }
      setError(map[err.code] || 'Could not update password. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card className="animate-fadeUp">
      <h3 className="text-base font-bold mb-3">Change Password</h3>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4 max-w-sm">
        <Input label="Current password" type="password" required value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} autoComplete="current-password" />
        <Input label="New password" type="password" required minLength={6} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} autoComplete="new-password" />
        <Input label="Confirm new password" type="password" required minLength={6} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} autoComplete="new-password" />
        {error && <p className="text-danger text-[13px] bg-[#F7E3E0] px-3.5 py-2.5 rounded-xl">{error}</p>}
        <Button type="submit" disabled={saving}>{saving ? 'Updating...' : 'Update Password'}</Button>
      </form>
      {toast && <Toast message={toast} onClose={() => setToast('')} />}
    </Card>
  )
}
