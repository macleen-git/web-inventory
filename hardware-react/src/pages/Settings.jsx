import { useEffect, useState } from 'react'
import {
  EmailAuthProvider,
  reauthenticateWithCredential,
  reauthenticateWithPopup,
  verifyBeforeUpdateEmail,
  updatePassword,
} from 'firebase/auth'
import Sidebar from '../components/Sidebar'
import { auth, googleProvider } from '../components/firebase'
import { API_URL, apiFetch } from '../config/api'

function Settings() {
  const [storeName, setStoreName] = useState('Hardware Store')
  const [ownerName, setOwnerName] = useState('')
  const [currency, setCurrency] = useState('₱')
  const [currentEmail, setCurrentEmail] = useState('')
  const [newEmail, setNewEmail] = useState('')
  const [emailPassword, setEmailPassword] = useState('')
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [changingEmail, setChangingEmail] = useState(false)
  const [changingPassword, setChangingPassword] = useState(false)
  const [storeMessage, setStoreMessage] = useState({ type: '', text: '' })
  const [emailMessage, setEmailMessage] = useState({ type: '', text: '' })
  const [passwordMessage, setPasswordMessage] = useState({ type: '', text: '' })

  useEffect(() => {
    const user = auth.currentUser
    setCurrentEmail(user?.email || '')
    if (!user) {
      setStoreMessage({ type: 'danger', text: 'Please sign in again.' })
      setLoading(false)
      return
    }
    apiFetch(API_URL('/api/settings/' + encodeURIComponent(user.uid)))
      .then(async response => {
        const data = await response.json()
        if (!response.ok) throw new Error(data.message || 'Unable to load store settings.')
        setStoreName(data.storeName || 'Hardware Store')
        setOwnerName(data.ownerName || '')
        setCurrency(data.currency || '₱')
      })
      .catch(error => setStoreMessage({ type: 'danger', text: error.message }))
      .finally(() => setLoading(false))
  }, [])

  async function saveSettings(event) {
    event.preventDefault()
    const user = auth.currentUser
    if (!user) return setStoreMessage({ type: 'danger', text: 'Please sign in again.' })
    setSaving(true)
    setStoreMessage({ type: '', text: '' })
    try {
      const response = await apiFetch(API_URL('/api/settings/' + encodeURIComponent(user.uid)), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ storeName, ownerName, currency }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.message || 'Unable to save settings.')
      setStoreMessage({ type: 'success', text: 'Store information saved successfully.' })
    } catch (error) {
      setStoreMessage({ type: 'danger', text: error.message || 'Unable to save settings.' })
    } finally {
      setSaving(false)
    }
  }

  async function reauthenticate(user, password) {
    const providers = user.providerData.map(item => item.providerId)
    if (providers.includes('password')) {
      if (!password) throw new Error('Enter your current password.')
      await reauthenticateWithCredential(user, EmailAuthProvider.credential(user.email, password))
    } else if (providers.includes('google.com')) {
      await reauthenticateWithPopup(user, googleProvider)
    } else {
      throw new Error('This sign-in provider is not supported for account changes.')
    }
  }

  async function changeEmail(event) {
    event.preventDefault()
    const user = auth.currentUser
    setEmailMessage({ type: '', text: '' })
    if (!user) return setEmailMessage({ type: 'danger', text: 'Please sign in again.' })
    if (currentEmail.trim().toLowerCase() !== (user.email || '').toLowerCase()) {
      return setEmailMessage({ type: 'danger', text: 'Current email does not match your signed-in account.' })
    }
    if (!newEmail.trim() || newEmail.trim().toLowerCase() === (user.email || '').toLowerCase()) {
      return setEmailMessage({ type: 'danger', text: 'Enter a different email address.' })
    }
    setChangingEmail(true)
    try {
      await reauthenticate(user, emailPassword)
      await verifyBeforeUpdateEmail(user, newEmail.trim())
      setEmailMessage({ type: 'success', text: 'Verification email sent. Open the link sent to your new email. Your login email changes only after verification.' })
      setNewEmail('')
      setEmailPassword('')
    } catch (error) {
      setEmailMessage({ type: 'danger', text: error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential' ? 'Current password is incorrect.' : error.message || 'Unable to update email.' })
    } finally {
      setChangingEmail(false)
    }
  }

  async function changePassword(event) {
    event.preventDefault()
    const user = auth.currentUser
    setPasswordMessage({ type: '', text: '' })
    if (!user) return setPasswordMessage({ type: 'danger', text: 'Please sign in again.' })
    if (newPassword.length < 6) return setPasswordMessage({ type: 'danger', text: 'New password must be at least 6 characters.' })
    if (newPassword !== confirmPassword) return setPasswordMessage({ type: 'danger', text: 'New password and confirmation do not match.' })
    setChangingPassword(true)
    try {
      await reauthenticate(user, currentPassword)
      await updatePassword(user, newPassword)
      setPasswordMessage({ type: 'success', text: 'Password changed. Use the new password on your next email/password login.' })
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } catch (error) {
      setPasswordMessage({ type: 'danger', text: error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential' ? 'Current password is incorrect.' : error.message || 'Unable to change password.' })
    } finally {
      setChangingPassword(false)
    }
  }

  const message = item => item.text ? <div className={'alert alert-' + item.type + ' mt-3 mb-0'} role="alert">{item.text}</div> : null
  const usesPassword = auth.currentUser?.providerData.some(item => item.providerId === 'password')

  return (
    <div className="app-layout">
      <Sidebar active="/settings" />
      <div className="app-main bg-dark-subtle min-vh-100">
        <div className="p-4" id="mainContent">
          <h1><b>Settings</b></h1>
          <p>Manage store information and account security.</p>
          <div className="row g-3">
            <div className="col-12">
              <div className="bg-white p-4 rounded shadow-sm">
                <h5 className="mb-3"><b>Store Information</b></h5>
                <form onSubmit={saveSettings}>
                  <div className="row g-3">
                    <div className="col-12 col-md-6">
                      <label className="form-label"><b>Store Name</b></label>
                      <input className="form-control" value={storeName} onChange={event => setStoreName(event.target.value)} maxLength={150} required />
                    </div>
                    <div className="col-12 col-md-6">
                      <label className="form-label"><b>Owner Name</b></label>
                      <input className="form-control" value={ownerName} onChange={event => setOwnerName(event.target.value)} maxLength={150} required />
                    </div>
                    <div className="col-12 col-md-6">
                      <label className="form-label"><b>Currency Symbol</b></label>
                      <input className="form-control" value={currency} onChange={event => setCurrency(event.target.value)} maxLength={3} required />
                    </div>
                  </div>
                  <button className="btn btn-warning mt-4" type="submit" disabled={saving || loading}><b>{saving ? 'Saving...' : 'Save Settings'}</b></button>
                  {message(storeMessage)}
                  {loading && <p className="small text-muted mt-2 mb-0">Loading saved settings...</p>}
                </form>
              </div>
            </div>
            <div className="col-12 col-lg-6">
              <div className="bg-white p-4 rounded shadow-sm h-100">
                <h5 className="mb-2"><b>Change Email</b></h5>
                <p className="small text-muted">Firebase Authentication manages your login email. Verification is required before the new email takes effect.</p>
                <form onSubmit={changeEmail}>
                  <div className="mb-3">
                    <label className="form-label"><b>Current Email</b></label>
                    <input type="email" className="form-control" value={currentEmail} onChange={event => setCurrentEmail(event.target.value)} required />
                  </div>
                  <div className="mb-3">
                    <label className="form-label"><b>New Email</b></label>
                    <input type="email" className="form-control" value={newEmail} onChange={event => setNewEmail(event.target.value)} required />
                  </div>
                  {usesPassword && <div className="mb-3">
                    <label className="form-label"><b>Current Password</b></label>
                    <input type="password" className="form-control" value={emailPassword} onChange={event => setEmailPassword(event.target.value)} autoComplete="current-password" required />
                  </div>}
                  <button type="submit" className="btn btn-outline-warning" disabled={changingEmail}><b>{changingEmail ? 'Sending...' : 'Update Email'}</b></button>
                  {message(emailMessage)}
                </form>
              </div>
            </div>
            <div className="col-12 col-lg-6">
              <div className="bg-white p-4 rounded shadow-sm h-100">
                <h5 className="mb-2"><b>Change Password</b></h5>
                <p className="small text-muted">Confirm your current password before choosing a new one.</p>
                {usesPassword ? <form onSubmit={changePassword}>
                  <div className="mb-3">
                    <label className="form-label"><b>Current Password</b></label>
                    <input type="password" className="form-control" value={currentPassword} onChange={event => setCurrentPassword(event.target.value)} autoComplete="current-password" required />
                  </div>
                  <div className="mb-3">
                    <label className="form-label"><b>New Password</b></label>
                    <input type="password" className="form-control" value={newPassword} onChange={event => setNewPassword(event.target.value)} autoComplete="new-password" minLength={6} required />
                  </div>
                  <div className="mb-3">
                    <label className="form-label"><b>Confirm New Password</b></label>
                    <input type="password" className="form-control" value={confirmPassword} onChange={event => setConfirmPassword(event.target.value)} autoComplete="new-password" minLength={6} required />
                  </div>
                  <button type="submit" className="btn btn-outline-secondary" disabled={changingPassword}><b>{changingPassword ? 'Updating...' : 'Change Password'}</b></button>
                </form> : <div className="alert alert-info mb-0">This account uses Google sign-in. Manage its password through your Google Account.</div>}
                {message(passwordMessage)}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Settings
