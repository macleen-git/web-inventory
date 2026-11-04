import { useEffect, useMemo, useState } from 'react'
import { collection, doc, onSnapshot, serverTimestamp, setDoc } from 'firebase/firestore'
import { db } from '../components/firebase'
import Sidebar from '../components/Sidebar'

function MetricCard({ label, value, note, icon, accent = '' }) {
  return (
    <article className="analytics-metric-card">
      <div className="d-flex align-items-start justify-content-between gap-3">
        <div>
          <p className="analytics-eyebrow mb-2">{label}</p>
          <div className="analytics-metric-value">{value}</div>
          <small className="analytics-muted">{note}</small>
        </div>
        <span className={`analytics-metric-icon ${accent}`} aria-hidden="true">
          <i className={`bi ${icon}`} />
        </span>
      </div>
    </article>
  )
}

function Admin({ user, onLogout }) {
  const [users, setUsers] = useState([])
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [selectedUser, setSelectedUser] = useState(null)
  const [editRole, setEditRole] = useState('user')
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, 'users'),
      (snapshot) => {
        setUsers(snapshot.docs.map((item) => ({ id: item.id, ...item.data() })))
        setError('')
      },
      (snapshotError) => setError(`Unable to load users: ${snapshotError.message}`)
    )
    return () => unsubscribe()
  }, [])

  const activeUsers = users.filter((item) => item.role !== 'inactive')
  const inactiveUsers = users.filter((item) => item.role === 'inactive')
  const admins = users.filter((item) => item.role === 'admin')

  const filteredUsers = useMemo(() => {
    const keyword = search.trim().toLowerCase()
    return users.filter((item) => {
      const role = item.role || 'user'
      const status = role === 'inactive' ? 'inactive' : 'active'
      const matchesSearch = !keyword || [item.displayName, item.name, item.email, role, item.id]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(keyword))
      return matchesSearch && (roleFilter === 'all' || role === roleFilter) &&
        (statusFilter === 'all' || status === statusFilter)
    })
  }, [users, search, roleFilter, statusFilter])

  const openEdit = (item) => {
    setSelectedUser(item)
    setEditRole(item.role === 'admin' ? 'admin' : item.role === 'inactive' ? 'inactive' : 'user')
    setMessage('')
    setError('')
  }

  const saveRole = async () => {
    if (!selectedUser) return
    if (selectedUser.id === user?.uid && editRole !== 'admin') {
      setError('You cannot remove your own administrator access.')
      return
    }
    if (!window.confirm("Save the changes to this user's account?")) return

    setSaving(true)
    setMessage('')
    setError('')
    try {
      await setDoc(doc(db, 'users', selectedUser.id), {
        role: editRole,
        updatedAt: serverTimestamp(),
      }, { merge: true })
      setMessage('Account changes saved.')
      setSelectedUser(null)
    } catch (saveError) {
      setError(`Unable to update account: ${saveError.message}`)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="app-layout">
      <Sidebar active="/admin" admin onLogout={onLogout} />
      <main className="app-main min-vh-100">
        <div id="mainContent">
          <div className="analytics-page-header">
            <div>
              <span className="analytics-kicker">HARDWARE TOOLS / ADMINISTRATION</span>
              <h1>Admin Dashboard</h1>
              <p>Manage registered accounts, access roles, and account status.</p>
            </div>
            <div className="admin-session-chip">
              <span className="app-user-avatar"><i className="bi bi-shield-lock-fill" /></span>
              <span><strong>{user?.displayName || 'Administrator'}</strong><small>{user?.email || 'Signed in'}</small></span>
            </div>
          </div>

          {message && <div className="alert alert-success mx-3 mx-md-4" role="status">{message}</div>}
          {error && <div className="alert alert-danger mx-3 mx-md-4" role="alert">{error}</div>}

          <div className="row g-3 mb-4 px-3 px-md-4">
            <div className="col-12 col-sm-6 col-xl-3">
              <MetricCard label="Total accounts" value={users.length.toLocaleString()} note="All registered accounts" icon="bi-people" />
            </div>
            <div className="col-12 col-sm-6 col-xl-3">
              <MetricCard label="Active accounts" value={activeUsers.length.toLocaleString()} note="Accounts with access" icon="bi-person-check" />
            </div>
            <div className="col-12 col-sm-6 col-xl-3">
              <MetricCard label="Administrators" value={admins.length.toLocaleString()} note="Accounts with admin role" icon="bi-shield-check" accent="is-yellow" />
            </div>
            <div className="col-12 col-sm-6 col-xl-3">
              <MetricCard label="Inactive accounts" value={inactiveUsers.length.toLocaleString()} note="Accounts marked inactive" icon="bi-person-x" accent="is-alert" />
            </div>
          </div>

          <section className="analytics-panel mx-3 mx-md-4 mb-4">
            <div className="analytics-panel-heading admin-users-heading">
              <div>
                <h2>Account management</h2>
                <p>Search accounts and manage their current access role.</p>
              </div>
              <span className="analytics-count">{filteredUsers.length} accounts</span>
            </div>

            <div className="row g-2 mb-3">
              <div className="col-12 col-lg-5">
                <div className="input-group admin-search">
                  <span className="input-group-text"><i className="bi bi-search" /></span>
                  <input type="search" className="form-control" placeholder="Search name, email, or account ID" value={search} onChange={(event) => setSearch(event.target.value)} />
                </div>
              </div>
              <div className="col-6 col-lg-3">
                <select className="form-select admin-filter" value={roleFilter} onChange={(event) => setRoleFilter(event.target.value)} aria-label="Filter by role">
                  <option value="all">All roles</option>
                  <option value="user">User</option>
                  <option value="admin">Admin</option>
                  <option value="inactive">Inactive (legacy)</option>
                </select>
              </div>
              <div className="col-6 col-lg-3">
                <select className="form-select admin-filter" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} aria-label="Filter by status">
                  <option value="all">All statuses</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
              <div className="col-12 col-lg-1 d-grid">
                <button type="button" className="btn analytics-refresh-btn" onClick={() => { setSearch(''); setRoleFilter('all'); setStatusFilter('all') }} title="Clear filters">
                  <i className="bi bi-arrow-counterclockwise" /><span className="d-lg-none ms-2">Clear filters</span>
                </button>
              </div>
            </div>

            <div className="table-responsive">
              <table className="table analytics-table align-middle mb-0 admin-users-table">
                <thead><tr><th>Account</th><th>Email</th><th>Role</th><th>Status</th><th className="text-end">Action</th></tr></thead>
                <tbody>
                  {filteredUsers.length ? filteredUsers.map((item) => {
                    const name = item.displayName || item.name || 'Unnamed User'
                    const role = item.role || 'user'
                    const inactive = role === 'inactive'
                    return (
                      <tr key={item.id}>
                        <td>
                          <div className="d-flex align-items-center gap-2">
                            {item.photoURL
                              ? <img src={item.photoURL} alt="" className="admin-avatar" />
                              : <span className="admin-avatar admin-avatar-fallback">{name.charAt(0).toUpperCase()}</span>}
                            <span className="min-w-0"><strong className="d-block text-truncate">{name}</strong><small className="analytics-muted">{item.id}</small></span>
                          </div>
                        </td>
                        <td>{item.email || 'No email'}</td>
                        <td><span className={`analytics-type-badge ${role === 'admin' ? 'type-stock-in' : 'type-sales'}`}>{role}</span></td>
                        <td><span className={`admin-status ${inactive ? 'is-inactive' : 'is-active'}`}><span />{inactive ? 'Inactive' : 'Active'}</span></td>
                        <td className="text-end"><button type="button" className="btn admin-edit-btn" onClick={() => openEdit(item)}><i className="bi bi-pencil-square me-1" />Manage</button></td>
                      </tr>
                    )
                  }) : (
                    <tr><td colSpan="5" className="text-center py-5 analytics-muted">No matching accounts found.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
          <p className="analytics-footnote px-3 px-md-4">Account information shown here is read from the current users collection.</p>
        </div>
      </main>

      {selectedUser && (
        <div className="modal d-block admin-modal-layer" tabIndex="-1" role="dialog" aria-modal="true" onMouseDown={(event) => { if (event.target === event.currentTarget) setSelectedUser(null) }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content admin-modal-content">
              <div className="modal-header">
                <div><span className="analytics-kicker">ACCOUNT SETTINGS</span><h5 className="modal-title fw-bold mb-0">Manage account</h5></div>
                <button type="button" className="btn-close" aria-label="Close" onClick={() => setSelectedUser(null)} />
              </div>
              <form onSubmit={(event) => { event.preventDefault(); saveRole() }}>
                <div className="modal-body">
                  <div className="admin-modal-user mb-4">
                    <span className="admin-avatar admin-avatar-fallback">{(selectedUser.displayName || selectedUser.name || 'U').charAt(0).toUpperCase()}</span>
                    <span><strong>{selectedUser.displayName || selectedUser.name || 'Unnamed User'}</strong><small>{selectedUser.email || 'No email address'}</small></span>
                  </div>
                  <label className="form-label fw-semibold" htmlFor="admin-role">Access role / account state</label>
                  <select id="admin-role" className="form-select admin-filter" value={editRole} onChange={(event) => setEditRole(event.target.value)}>
                    <option value="user">User</option>
                    <option value="admin">Admin</option>
                    <option value="inactive">Inactive (legacy)</option>
                  </select>
                  <p className="form-text mt-2 mb-0">Role changes affect access to the application. Confirm the account before saving.</p>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-light" onClick={() => setSelectedUser(null)}>Cancel</button>
                  <button type="submit" className="btn admin-primary-btn" disabled={saving}>{saving ? 'Saving…' : 'Save changes'}</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Admin
