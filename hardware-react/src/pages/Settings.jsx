import { useState } from 'react'
import Sidebar from '../components/Sidebar'

function Settings() {

  const [storeName, setStoreName] = useState('Hardware Store')
  const [ownerName, setOwnerName] = useState('')
  const [currency, setCurrency] = useState('₱')

  const [currentEmail, setCurrentEmail] = useState('')
  const [newEmail, setNewEmail] = useState('')

  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  function saveSettings(event) {
    event.preventDefault()
  }

  function changeEmail(event) {
    event.preventDefault()
  }

  function changePassword(event) {
    event.preventDefault()
  }

  return (
    <div className="app-layout">

      <Sidebar active="/settings" />

      <div className="app-main bg-dark-subtle min-vh-100">

        <div className="p-4" id="mainContent">

          <h1>
            <b>Settings</b>
          </h1>

          <p>
            Manage store information and account settings
          </p>

          <div className="row g-3">

            {/* STORE INFORMATION */}

            <div className="col-12">

              <div className="bg-white p-4 rounded shadow-sm">

                <h5 className="mb-3">
                  <b>Store Information</b>
                </h5>

                <form onSubmit={saveSettings}>

                  <div className="row g-3">

                    <div className="col-12 col-md-6">

                      <label className="form-label">
                        <b>Store Name</b>
                      </label>

                      <input
                        type="text"
                        className="form-control"
                        value={storeName}
                        onChange={(event) => setStoreName(event.target.value)}
                        required
                      />

                    </div>

                    <div className="col-12 col-md-6">

                      <label className="form-label">
                        <b>Owner Name</b>
                      </label>

                      <input
                        type="text"
                        className="form-control"
                        placeholder="Enter owner name"
                        value={ownerName}
                        onChange={(event) => setOwnerName(event.target.value)}
                        required
                      />

                    </div>

                    <div className="col-12 col-md-6">

                      <label className="form-label">
                        <b>Currency Symbol</b>
                      </label>

                      <input
                        type="text"
                        className="form-control"
                        value={currency}
                        onChange={(event) => setCurrency(event.target.value)}
                        maxLength="3"
                        required
                      />

                    </div>

                  </div>

                  <button
                    type="submit"
                    className="btn btn-warning mt-4"
                  >
                    <b>Save Settings</b>
                  </button>

                </form>

              </div>

            </div>


            {/* CHANGE EMAIL */}

            <div className="col-12 col-lg-6">

              <div className="bg-white p-4 rounded shadow-sm h-100">

                <h5 className="mb-2">
                  <b>Change Email</b>
                </h5>

                <p className="text-muted small">
                  Enter your current email and the new email address.
                </p>

                <form onSubmit={changeEmail}>

                  <div className="mb-3">

                    <label className="form-label">
                      <b>Current Email</b>
                    </label>

                    <input
                      type="email"
                      className="form-control"
                      placeholder="Enter current email"
                      value={currentEmail}
                      onChange={(event) => setCurrentEmail(event.target.value)}
                      required
                    />

                  </div>

                  <div className="mb-3">

                    <label className="form-label">
                      <b>New Email</b>
                    </label>

                    <input
                      type="email"
                      className="form-control"
                      placeholder="Enter new email"
                      value={newEmail}
                      onChange={(event) => setNewEmail(event.target.value)}
                      required
                    />

                  </div>

                  <button
                    type="submit"
                    className="btn btn-outline-warning"
                  >
                    <b>Update Email</b>
                  </button>

                </form>

              </div>

            </div>


            {/* CHANGE PASSWORD */}

            <div className="col-12 col-lg-6">

              <div className="bg-white p-4 rounded shadow-sm h-100">

                <h5 className="mb-2">
                  <b>Change Password</b>
                </h5>

                <p className="text-muted small">
                  Enter your current password and choose a new password.
                </p>

                <form onSubmit={changePassword}>

                  <div className="mb-3">

                    <label className="form-label">
                      <b>Current Password</b>
                    </label>

                    <input
                      type="password"
                      className="form-control"
                      placeholder="Enter current password"
                      value={currentPassword}
                      onChange={(event) => setCurrentPassword(event.target.value)}
                      required
                    />

                  </div>

                  <div className="mb-3">

                    <label className="form-label">
                      <b>New Password</b>
                    </label>

                    <input
                      type="password"
                      className="form-control"
                      placeholder="Enter new password"
                      value={newPassword}
                      onChange={(event) => setNewPassword(event.target.value)}
                      required
                    />

                  </div>

                  <div className="mb-3">

                    <label className="form-label">
                      <b>Confirm New Password</b>
                    </label>

                    <input
                      type="password"
                      className="form-control"
                      placeholder="Confirm new password"
                      value={confirmPassword}
                      onChange={(event) => setConfirmPassword(event.target.value)}
                      required
                    />

                  </div>

                  <button
                    type="submit"
                    className="btn btn-outline-secondary"
                  >
                    <b>Change Password</b>
                  </button>

                </form>

              </div>

            </div>

          </div>

        </div>

      </div>

    </div>
  )
}

export default Settings