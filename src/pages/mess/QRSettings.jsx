import { useEffect, useState, useRef } from 'react'
import { QRCodeCanvas } from 'qrcode.react'
import { useAuth } from '../../context/AuthContext.jsx'
import PageLayout from '../../components/common/MessPage.jsx'
import { Card, Button, Toast, Spinner } from '../../components/common/UI.jsx'
import { getMessProfile, updateMessProfile } from '../../firebase/firestore.js'
import { uploadImage } from '../../firebase/storage.js'

export default function QRSettings() {
  const { currentUser, profile } = useAuth()
  const [mess, setMess] = useState(null)
  const [loading, setLoading] = useState(true)
  const [file, setFile] = useState(null)
  const [preview, setPreview] = useState('')
  const [uploading, setUploading] = useState(false)
  const [toast, setToast] = useState('')
  const qrRef = useRef(null)

  const messUrl = `${window.location.origin}/student/mess/${currentUser?.uid}`

  useEffect(() => {
    getMessProfile(currentUser.uid).then((m) => { setMess(m); setLoading(false) })
  }, [currentUser])

  function handleFileChange(e) {
    const f = e.target.files[0]
    if (!f) return
    setFile(f)
    setPreview(URL.createObjectURL(f))
  }

  async function handleUpload() {
    if (!file) return
    setUploading(true)
    try {
      const path = `payment-qr/${currentUser.uid}.jpg`
      const url = await uploadImage(path, file)
      await updateMessProfile(currentUser.uid, { paymentQrUrl: url })
      setMess((prev) => ({ ...prev, paymentQrUrl: url }))
      setToast('Payment QR code updated. Students will now see this when they subscribe.')
      setTimeout(() => setToast(''), 3500)
    } catch (err) {
      console.error(err)
      setToast('Something went wrong uploading your QR code.')
      setTimeout(() => setToast(''), 3500)
    } finally {
      setUploading(false)
    }
  }

  function handleDownloadLocationQR() {
    const canvas = qrRef.current?.querySelector('canvas')
    if (!canvas) return
    const link = document.createElement('a')
    link.download = `${profile?.messName || 'mess'}-qr-code.png`
    link.href = canvas.toDataURL('image/png')
    link.click()
  }

  if (loading) return <PageLayout><Spinner /></PageLayout>

  return (
    <PageLayout title="QR Codes" subtitle="Manage your payment QR and your mess's shareable QR code">
      <div className="grid md:grid-cols-2 gap-5">
        <Card className="animate-fadeUp">
          <h3 className="text-base font-bold mb-2">Payment QR Code</h3>
          <p className="text-xs text-charcoal-soft mb-4">Upload your UPI QR code (from GPay, PhonePe, Paytm, or your bank app). Students will scan this to pay you directly when subscribing.</p>

          {mess?.paymentQrUrl && !preview && (
            <img src={mess.paymentQrUrl} alt="Current payment QR" className="w-48 h-48 object-contain mx-auto border border-sooji rounded-xl p-2 mb-4" />
          )}
          {preview && (
            <img src={preview} alt="New QR preview" className="w-48 h-48 object-contain mx-auto border border-masala rounded-xl p-2 mb-4" />
          )}

          <label className="flex flex-col gap-2 mb-4">
            <span className="text-[13px] font-bold text-charcoal-soft">{mess?.paymentQrUrl ? 'Replace QR code' : 'Upload QR code'}</span>
            <input type="file" accept="image/*" onChange={handleFileChange} className="text-sm" />
          </label>

          <Button disabled={!file || uploading} onClick={handleUpload}>{uploading ? 'Uploading...' : 'Save Payment QR Code'}</Button>
        </Card>

        <Card className="animate-fadeUp" style={{ animationDelay: '.1s' }}>
          <h3 className="text-base font-bold mb-2">Your Mess QR Code</h3>
          <p className="text-xs text-charcoal-soft mb-4">Auto-generated for your mess's listing page. Print it and put it up at your location, or share it directly — students who scan it go straight to your subscription page.</p>

          <div ref={qrRef} className="flex justify-center mb-4 p-4 bg-dahi rounded-xl">
            <QRCodeCanvas value={messUrl} size={180} bgColor="#FBF6EE" fgColor="#2A2320" level="M" includeMargin />
          </div>
          <p className="text-xs text-center text-charcoal-soft font-mono mb-4 break-all">{messUrl}</p>

          <Button variant="outline" full onClick={handleDownloadLocationQR}>Download QR Code</Button>
        </Card>
      </div>

      {toast && <Toast message={toast} onClose={() => setToast('')} />}
    </PageLayout>
  )
}
