import { useEffect, useMemo, useState } from 'react'
import { collection, doc, onSnapshot, serverTimestamp, setDoc } from 'firebase/firestore'
import { db } from '../components/firebase'
import Sidebar from '../components/Sidebar'

function Admin({ user, onLogout }) {
  const [users, setUsers] = useState([])
  const [search, setSearch] = useState('')
  const [selectedUser, setSelectedUser] = useState(null)
  const [editRole, setEditRole] = useState('user')
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, 'users'),
      (snapshot) => {
        const data = snapshot.docs.map((item) => ({
          id: item.id,
          ...item.data(),
        }))
        setUsers(data)
        setError('')
      },
      (snapshotError) => {
        setError(`Unable to load users: ${snapshotError.message}`)
      }
    )

    return () => unsubscribe()
  }, [])

  const filteredUsers = useMemo(() => {
    const keyword = search.trim().toLowerCase()
    if (!keyword) return users

    return users.filter((item) =>
      [item.displayName, item.name, item.email, item.role]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(keyword))
    )
  }, [users, search])

  const activeUsers = users.filter((item) => item.role !== 'inactive').length
  const inactiveUsers = users.filter((item) => item.role === 'inactive').length

  const openEdit = (item) => {
    setSelectedUser(item)
    setEditRole(item.role === 'admin' ? 'admin' : item.role === 'inactive' ? 'inactive' : 'user')
    setMessage('')
    setError('')
  }

  const saveRole = async () => {
    if (!selectedUser) return
    if (!window.confirm("Save the changes to this user's role?")) return

    setSaving(true)
    setMessage('')
    setError('')

    try {
      await setDoc(
        doc(db, 'users', selectedUser.id),
        {
          role: editRole,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      )
      setMessage('User role updated successfully.')
      setSelectedUser(null)
    } catch (saveError) {
      setError(`Unable to update user: ${saveError.message}`)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="app-layout">
      <Sidebar active="/admin" admin onLogout={onLogout} />

      <main className="app-main bg-dark-subtle min-vh-100">
        <div className="p-3 p-md-4">
          <div className="d-flex flex-column flex-lg-row justify-content-between align-items-lg-center gap-3 mb-4">
            <div>
              <span className="section-kicker">ADMIN</span>
              <h1 className="mb-1 fw-bold">Admin Dashboard</h1>
              <p className="mb-0 text-secondary">Manage registered users and account roles.</p>
            </div>
            <div className="badge text-bg-dark fs-6 p-3">
              <i className="bi bi-shield-lock-fill me-2" />
              {user?.email || 'Administrator'}
            </div>
          </div>

          {message && <div className="alert alert-success">{message}</div>}
          {error && <div className="alert alert-danger">{error}</div>}

          <div className="row g-3 mb-4">
            <div className="col-12 col-md-4">
              <div className="card border-0 shadow-sm h-100">
                <div className="card-body">
                  <div className="text-secondary">Total Users</div>
                  <div className="display-6 fw-bold">{users.length}</div>
                </div>
              </div>
            </div>
            <div className="col-12 col-md-4">
              <div className="card border-0 shadow-sm h-100">
                <div className="card-body">
                  <div className="text-secondary">Active Users</div>
                  <div className="display-6 fw-bold text-success">{activeUsers}</div>
                </div>
              </div>
            </div>
            <div className="col-12 col-md-4">
              <div className="card border-0 shadow-sm h-100">
                <div className="card-body">
                  <div className="text-secondary">Inactive Users</div>
                  <div className="display-6 fw-bold text-danger">{inactiveUsers}</div>
                </div>
              </div>
            </div>
          </div>

          <div className="card border-0 shadow-sm">
            <div className="card-header bg-white p-3">
              <div className="row g-2 align-items-center">
                <div className="col-12 col-lg-6">
                  <h5 className="mb-1 fw-bold">User Management</h5>
                  <p className="mb-0 text-secondary">Users are loaded from the Firestore users collection.</p>
                </div>
                <div className="col-12 col-lg-6">
                  <div className="input-group">
                    <span className="input-group-text"><i className="bi bi-search" /></span>
                    <input
                      type="search"
                      className="form-control"
                      placeholder="Search name, email, or role"
                      value={search}
                      onChange={(event) => setSearch(event.target.value)}
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0">
                <thead>
                  <tr>
                    <th>User</th>
                    <th>Email</th>
                    <th>Role</th>
                    <th>Status</th>
                    <th className="text-end">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.length ? (
                    filteredUsers.map((item) => {
                      const name = item.displayName || item.name || 'Unnamed User'
                      const role = item.role || 'user'
                      const inactive = role === 'inactive'

                      return (
                        <tr key={item.id}>
                          <td>
                            <div className="d-flex align-items-center gap-2">
                              <div className="rounded-circle bg-warning text-dark d-flex align-items-center justify-content-center fw-bold" style={{ width: 40, height: 40 }}>
                                {name.charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <div className="fw-semibold">{name}</div>
                                <small className="text-secondary">{item.id}</small>
                              </div>
                            </div>
                          </td>
                          <td>{item.email || 'No email'}</td>
                          <td>
                            <span className={`badge ${role === 'admin' ? 'text-bg-dark' : 'text-bg-secondary'}`}>
                              {role}
                            </span>
                          </td>
                          <td>
                            <span className={`badge ${inactive ? 'text-bg-danger' : 'text-bg-success'}`}>
                              {inactive ? 'Inactive' : 'Active'}
                            </span>
                          </td>
                          <td className="text-end">
                            <button type="button" className="btn btn-sm btn-outline-dark" onClick={() => openEdit(item)}>
                              <i className="bi bi-pencil me-1" />
                              Edit
                            </button>
                          </td>
                        </tr>
                      )
                    })
                  ) : (
                    <tr>
                      <td colSpan="5" className="text-center py-5 text-secondary">
                        No users found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </main>

      {selectedUser && (
        <div className="modal d-block" tabIndex="-1" role="dialog" style={{ backgroundColor: 'rgba(0,0,0,.5)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title fw-bold">Edit User</h5>
                <button type="button" className="btn-close" onClick={() => setSelectedUser(null)} />
              </div>
              <form onSubmit={(event) => { event.preventDefault(); saveRole() }}>
              <div className="modal-body">
                <div className="mb-3">
                  <label className="form-label fw-semibold">Name</label>
                  <input className="form-control" value={selectedUser.displayName || selectedUser.name || ''} disabled />
                </div>
                <div className="mb-3">
                  <label className="form-label fw-semibold">Email</label>
                  <input className="form-control" value={selectedUser.email || ''} disabled />
                </div>
                <div className="mb-3">
                  <label className="form-label fw-semibold">Role</label>
                  <select className="form-select" value={editRole} onChange={(event) => setEditRole(event.target.value)}>
                    <option value="user">User</option>
                    <option value="admin">Admin</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setSelectedUser(null)}>Cancel</button>
                <button type="submit" className="btn btn-warning fw-bold" disabled={saving}>
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
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
