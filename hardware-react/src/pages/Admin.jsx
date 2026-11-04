import { useCallback, useEffect, useMemo, useState } from 'react'
import { auth } from '../components/firebase'
import { API_URL } from '../config/api'
import Sidebar from '../components/Sidebar'

const API = API_URL('/api')

function Metric({ label, value, note, icon, tone = '' }) {
  return <article className="admin-v2-metric">
    <div><p>{label}</p><strong>{Number(value || 0).toLocaleString()}</strong><small>{note}</small></div>
    <span className={tone}><i className={`bi ${icon}`} /></span>
  </article>
}

function Admin({ user, onLogout }) {
  const [users, setUsers] = useState([])
  const [overview, setOverview] = useState(null)
  const [period, setPeriod] = useState('month')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [lastUpdated, setLastUpdated] = useState(null)

  const request = useCallback(async (path, options = {}) => {
    const token = await auth.currentUser?.getIdToken()
    if (!token) throw new Error('Your sign-in session expired. Please sign in again.')
    const response = await fetch(API + path, {
      ...options,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, ...(options.headers || {}) },
    })
    if (!response.ok) {
      const body = await response.json().catch(() => ({}))
      throw new Error(body.message || `Request failed (HTTP ${response.status}).`)
    }
    return response.status === 204 ? null : response.json()
  }, [])

  const load = useCallback(async (showLoading = true) => {
    if (showLoading) setLoading(true)
    setError('')
    try {
      const [directory, stats] = await Promise.all([
        request('/admin/users'),
        request(`/admin/overview?period=${period}`),
      ])
      setUsers(Array.isArray(directory) ? directory : [])
      setOverview(stats)
      setLastUpdated(new Date())
    } catch (err) {
      setError(err.message || 'Unable to load administrator data.')
    } finally {
      setLoading(false)
    }
  }, [period, request])

  useEffect(() => { load() }, [load])
  useEffect(() => {
    const heartbeat = async () => {
      try { await request('/activity/heartbeat', { method: 'POST' }) } catch (err) { /* Dashboard displays API errors on its next refresh. */ }
    }
    heartbeat()
    const timer = window.setInterval(heartbeat, 60000)
    const refresh = window.setInterval(() => load(false), 60000)
    return () => { window.clearInterval(timer); window.clearInterval(refresh) }
  }, [load, request])

  const summary = overview?.summary || {}
  const filteredUsers = useMemo(() => {
    const term = search.trim().toLowerCase()
    if (!term) return users
    return users.filter(item => [item.displayName, item.email, item.role, item.status].some(value => String(value || '').toLowerCase().includes(term)))
  }, [users, search])
  const activity = overview?.realtime || []
  const maxActivity = Math.max(1, ...activity.map(item => Number(item.users) || 0))
  const onlineNow = activity.length ? Math.max(...activity.map(item => Number(item.users) || 0)) : 0
  const newTrend = overview?.newUsersTrend || []

  return <div className="app-layout">
    <Sidebar active="/admin" admin onLogout={onLogout} />
    <main className="app-main min-vh-100">
      <div id="mainContent" className="admin-v2-content">
        <header className="admin-v2-header">
          <div><span className="admin-v2-kicker">HARDWARE TOOLS / ADMINISTRATION</span><h1>General Users</h1><p>Efficient management for everyday users.</p></div>
          <div className="admin-v2-profile"><span><i className="bi bi-shield-check" /></span><div><strong>{user?.displayName || 'Administrator'}</strong><small>{user?.email || 'Signed in'}</small></div></div>
        </header>

        {error && <div className="alert alert-danger" role="alert">{error}</div>}
        <div className="row g-3 admin-v2-metrics">
          <div className="col-12 col-md-4"><Metric label="Total Users" value={summary.totalUsers} note="Registered accounts" icon="bi-people" /></div>
          <div className="col-12 col-md-4"><Metric label="New Users" value={summary.newUsers} note="Joined in the last 30 days" icon="bi-person-plus" tone="purple" /></div>
          <div className="col-12 col-md-4"><Metric label="Total Admins" value={summary.totalAdmins} note="Admin and superadmin accounts" icon="bi-person-check" tone="blue" /></div>
        </div>

        <div className="row g-3 mt-1 align-items-stretch">
          <div className="col-12 col-xl-8">
            <section className="admin-v2-panel h-100">
              <div className="admin-v2-panel-head"><div><h2>User Management</h2><p>Registered accounts and access status</p></div><button className="admin-v2-refresh" type="button" onClick={() => load()} disabled={loading}><i className="bi bi-arrow-clockwise" /> Refresh</button></div>
              <div className="admin-v2-search"><i className="bi bi-search" /><input value={search} onChange={event => setSearch(event.target.value)} placeholder="Search user name, email, or role" aria-label="Search users" /></div>
              <div className="table-responsive">
                <table className="table align-middle admin-v2-table mb-0"><thead><tr><th>User</th><th>Email</th><th>Role</th><th>Status</th></tr></thead>
                  <tbody>{loading ? <tr><td colSpan="4" className="text-center py-5">Loading users from MySQL…</td></tr> : filteredUsers.length ? filteredUsers.map(item => <tr key={item.id}>
                    <td><div className="admin-v2-user">{item.photoURL ? <img src={item.photoURL} alt="" /> : <span>{(item.displayName || 'U').charAt(0).toUpperCase()}</span>}<strong>{item.displayName || 'Unnamed User'}</strong></div></td>
                    <td>{item.email || '—'}</td><td><span className={`admin-v2-role ${item.role}`}>{item.role}</span></td>
                    <td><span className={`admin-v2-status ${item.status}`}>{item.status}</span></td>
                  </tr>) : <tr><td colSpan="4" className="text-center py-5">No user accounts found.</td></tr>}</tbody>
                </table>
              </div>
              <div className="admin-v2-foot">{filteredUsers.length} account(s) {lastUpdated && <span>· Updated {lastUpdated.toLocaleTimeString()}</span>}</div>
            </section>
          </div>

          <div className="col-12 col-xl-4">
            <section className="admin-v2-panel admin-v2-realtime h-100">
              <div className="admin-v2-panel-head"><div><h2>Realtime User</h2><p>Activity recorded in the last 30 minutes</p></div>
                <select value={period} onChange={event => setPeriod(event.target.value)} aria-label="New user trend period"><option value="day">Daily</option><option value="week">Weekly</option><option value="month">Monthly</option></select>
              </div>
              <div className="admin-v2-online"><span>Peak active users / minute</span><strong>{onlineNow}</strong></div>
              {activity.length ? <div className="admin-v2-bars" role="img" aria-label="User activity over the last 30 minutes">{activity.map((item,index) => <div key={item.label + index} title={`${item.label}: ${item.users} active users`}><span style={{height:`${Math.max(5,(Number(item.users)||0)/maxActivity*100)}%`}} /></div>)}</div> : <div className="admin-v2-no-data">No recent activity yet. Activity appears as signed-in users open the app.</div>}
              <div className="admin-v2-trend-head"><strong>New user registrations</strong><span>{period === 'day' ? 'Daily' : period === 'week' ? '7 days' : '30 days'}</span></div>
              <div className="admin-v2-trend-list">{newTrend.length ? newTrend.slice(-5).map(item => <div key={String(item.label)}><span>{new Date(item.label).toLocaleDateString('en-PH',{month:'short',day:'numeric'})}</span><strong>{Number(item.count).toLocaleString()}</strong></div>) : <p>No new registrations in this period.</p>}</div>
            </section>
          </div>
        </div>
        <p className="admin-v2-note">User records and activity metrics are loaded from the MySQL database. Last refresh: {lastUpdated ? lastUpdated.toLocaleString() : '—'}.</p>
      </div>
    </main>
  </div>
}

export default Admin
