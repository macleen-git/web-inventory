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
  const [showResetModal, setShowResetModal] = useState(false)
  const [resetConfirmation, setResetConfirmation] = useState('')
  const [resetting, setResetting] = useState(false)
  const [resetMessage, setResetMessage] = useState({ type: '', text: '' })

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

  async function resetInventory(event) {
    event.preventDefault()
    if (resetConfirmation !== 'RESET INVENTORY') return
    setResetting(true)
    setResetMessage({ type: '', text: '' })
    try {
      const response = await apiFetch(API_URL('/api/settings/reset-inventory'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirmation: resetConfirmation }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.message || 'Unable to reset inventory.')
      setResetMessage({ type: 'success', text: 'Your inventory records were reset. Your account and Store Information were preserved.' })
      setResetConfirmation('')
      setShowResetModal(false)
    } catch (error) {
      setResetMessage({ type: 'danger', text: error.message || 'Unable to reset inventory.' })
    } finally {
      setResetting(false)
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
      <div className="app-main min-vh-100">
        <main className="settings-page p-4" id="mainContent">
          <header className="settings-page-heading mb-4">
            <div className="settings-eyebrow">PREFERENCES & ACCOUNT</div>
            <h1 className="mb-1"><b>Settings</b></h1>
            <p className="mb-0">Manage your store details, sign-in information, and inventory data.</p>
          </header>

          <section className="settings-card mb-4">
            <div className="settings-card-heading">
              <div>
                <span className="settings-card-kicker">STORE PROFILE</span>
                <h2>Store Information</h2>
                <p>Update the details displayed for your hardware store.</p>
              </div>
              <span className="settings-card-symbol" aria-hidden="true">⌂</span>
            </div>
            <form className="settings-card-body" onSubmit={saveSettings}>
              <div className="row g-3">
                <div className="col-12 col-md-6">
                  <label className="form-label" htmlFor="settings-store-name">Store Name</label>
                  <input id="settings-store-name" className="form-control" value={storeName} onChange={event => setStoreName(event.target.value)} maxLength={150} required />
                </div>
                <div className="col-12 col-md-6">
                  <label className="form-label" htmlFor="settings-owner-name">Owner Name</label>
                  <input id="settings-owner-name" className="form-control" value={ownerName} onChange={event => setOwnerName(event.target.value)} maxLength={150} required />
                </div>
                <div className="col-12 col-md-6">
                  <label className="form-label" htmlFor="settings-currency">Currency Symbol</label>
                  <input id="settings-currency" className="form-control" value={currency} onChange={event => setCurrency(event.target.value)} maxLength={3} required />
                  <div className="settings-field-hint">Used when displaying prices and totals.</div>
                </div>
              </div>
              <div className="settings-card-actions">
                <button className="btn btn-warning px-4" type="submit" disabled={saving || loading}><b>{saving ? 'Saving...' : 'Save Changes'}</b></button>
                {loading && <span className="small text-muted">Loading saved settings...</span>}
              </div>
              {message(storeMessage)}
            </form>
          </section>

          <div className="row g-4 mb-4">
            <div className="col-12 col-xl-6">
              <section className="settings-card h-100">
                <div className="settings-card-heading">
                  <div>
                    <span className="settings-card-kicker">LOGIN DETAILS</span>
                    <h2>Change Email</h2>
                    <p>Verify your new email before it becomes your login address.</p>
                  </div>
                  <span className="settings-card-symbol" aria-hidden="true">@</span>
                </div>
                <form className="settings-card-body" onSubmit={changeEmail}>
                  <div className="mb-3">
                    <label className="form-label" htmlFor="settings-current-email">Current Email</label>
                    <input id="settings-current-email" type="email" className="form-control" value={currentEmail} onChange={event => setCurrentEmail(event.target.value)} required />
                  </div>
                  <div className="mb-3">
                    <label className="form-label" htmlFor="settings-new-email">New Email</label>
                    <input id="settings-new-email" type="email" className="form-control" value={newEmail} onChange={event => setNewEmail(event.target.value)} required />
                  </div>
                  {usesPassword && <div className="mb-3">
                    <label className="form-label" htmlFor="settings-email-password">Current Password</label>
                    <input id="settings-email-password" type="password" className="form-control" value={emailPassword} onChange={event => setEmailPassword(event.target.value)} autoComplete="current-password" required />
                  </div>}
                  <div className="settings-card-actions">
                    <button type="submit" className="btn btn-outline-warning px-4" disabled={changingEmail}><b>{changingEmail ? 'Sending...' : 'Update Email'}</b></button>
                  </div>
                  {message(emailMessage)}
                </form>
              </section>
            </div>

            <div className="col-12 col-xl-6">
              <section className="settings-card h-100">
                <div className="settings-card-heading">
                  <div>
                    <span className="settings-card-kicker">ACCOUNT SECURITY</span>
                    <h2>Change Password</h2>
                    <p>Keep your account secure with an updated password.</p>
                  </div>
                  <span className="settings-card-symbol" aria-hidden="true">⌑</span>
                </div>
                <div className="settings-card-body">
                  {usesPassword ? <form onSubmit={changePassword}>
                    <div className="mb-3">
                      <label className="form-label" htmlFor="settings-current-password">Current Password</label>
                      <input id="settings-current-password" type="password" className="form-control" value={currentPassword} onChange={event => setCurrentPassword(event.target.value)} autoComplete="current-password" required />
                    </div>
                    <div className="mb-3">
                      <label className="form-label" htmlFor="settings-new-password">New Password</label>
                      <input id="settings-new-password" type="password" className="form-control" value={newPassword} onChange={event => setNewPassword(event.target.value)} autoComplete="new-password" minLength={6} required />
                    </div>
                    <div className="mb-3">
                      <label className="form-label" htmlFor="settings-confirm-password">Confirm New Password</label>
                      <input id="settings-confirm-password" type="password" className="form-control" value={confirmPassword} onChange={event => setConfirmPassword(event.target.value)} autoComplete="new-password" minLength={6} required />
                    </div>
                    <div className="settings-card-actions">
                      <button type="submit" className="btn btn-outline-warning px-4" disabled={changingPassword}><b>{changingPassword ? 'Updating...' : 'Change Password'}</b></button>
                    </div>
                  </form> : <div className="settings-info-note"><b>Google account</b><span>This account uses Google sign-in. Manage its password through your Google Account.</span></div>}
                  {message(passwordMessage)}
                </div>
              </section>
            </div>
          </div>

          <section className="settings-card settings-danger-card">
            <div className="settings-card-heading">
              <div>
                <span className="settings-card-kicker">DANGER ZONE</span>
                <h2>Reset Inventory Data</h2>
                <p>Remove your inventory records while keeping your login account and store information.</p>
              </div>
              <span className="settings-card-symbol settings-danger-symbol" aria-hidden="true">!</span>
            </div>
            <div className="settings-card-body">
              <div className="settings-warning-note">This permanently removes your Products, Stock In, Sales, and Damaged Items records. Other users' inventory will not be affected.</div>
              <div className="settings-card-actions">
                <button type="button" className="btn btn-outline-danger" onClick={() => { setResetConfirmation(''); setShowResetModal(true) }} disabled={resetting}>Reset My Inventory</button>
              </div>
              {message(resetMessage)}
            </div>
          </section>
        </main>
        {showResetModal && <div className="modal d-block" tabIndex="-1" role="dialog" aria-modal="true" style={{ backgroundColor: 'rgba(0,0,0,.55)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <form onSubmit={resetInventory}>
                <div className="modal-header">
                  <h5 className="modal-title text-danger"><b>Confirm Inventory Reset</b></h5>
                  <button type="button" className="btn-close" onClick={() => setShowResetModal(false)} disabled={resetting} aria-label="Close"></button>
                </div>
                <div className="modal-body">
                  <p>This action permanently deletes your Products, Stock In, Sales, and Damaged Items records. Your account and Store Information will be kept.</p>
                  <p className="mb-2">To continue, type <b>RESET INVENTORY</b> exactly as shown.</p>
                  <input className="form-control" value={resetConfirmation} onChange={event => setResetConfirmation(event.target.value)} placeholder="RESET INVENTORY" autoComplete="off" required />
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={() => setShowResetModal(false)} disabled={resetting}>Cancel</button>
                  <button type="submit" className="btn btn-danger" disabled={resetting || resetConfirmation !== 'RESET INVENTORY'}>{resetting ? 'Resetting...' : 'Permanently Reset Inventory'}</button>
                </div>
              </form>
            </div>
          </div>
        </div>}
      </div>
    </div>
  )
}

export default Settings
