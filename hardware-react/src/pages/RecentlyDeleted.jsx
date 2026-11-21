import { useCallback, useEffect, useState } from 'react'
import Sidebar from '../components/Sidebar'
import { API_URL, apiFetch } from '../config/api'

function RecentlyDeleted() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState('')
  const [message, setMessage] = useState({ type: '', text: '' })
  const [filter, setFilter] = useState('All')

  const load = useCallback(async () => {
    setLoading(true)

    try {
      const response = await apiFetch(API_URL('/api/recently-deleted'))
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || 'Unable to load Recently Deleted.')
      }

      setItems(Array.isArray(data) ? data : [])
    } catch (error) {
      setMessage({
        type: 'danger',
        text: error.message || 'Unable to load deleted records.',
      })
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const restore = async item => {
    const key = item.type + ':' + item.id
    setBusy(key)
    setMessage({ type: '', text: '' })

    try {
      const response = await apiFetch(
        API_URL('/api/recently-deleted/' + item.type + '/' + item.id + '/restore'),
        { method: 'POST' }
      )
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || 'Unable to restore record.')
      }

      setMessage({ type: 'success', text: data.message || 'Record restored.' })
      await load()
    } catch (error) {
      setMessage({ type: 'danger', text: error.message })
    } finally {
      setBusy('')
    }
  }

  const remove = async item => {
    if (!window.confirm('Permanently delete this record? This cannot be undone.')) {
      return
    }

    const key = item.type + ':' + item.id
    setBusy(key)
    setMessage({ type: '', text: '' })

    try {
      const response = await apiFetch(
        API_URL('/api/recently-deleted/' + item.type + '/' + item.id),
        { method: 'DELETE' }
      )
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || 'Unable to delete record.')
      }

      setMessage({ type: 'success', text: data.message || 'Record permanently deleted.' })
      await load()
    } catch (error) {
      setMessage({ type: 'danger', text: error.message })
    } finally {
      setBusy('')
    }
  }

  const emptyTrash = async () => {
    if (!items.length) {
      return
    }

    if (!window.confirm('Permanently delete ALL records currently in Recently Deleted? This cannot be undone.')) {
      return
    }

    setBusy('empty')
    setMessage({ type: '', text: '' })

    try {
      const response = await apiFetch(API_URL('/api/recently-deleted'), {
        method: 'DELETE',
      })
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || 'Unable to empty trash.')
      }

      setMessage({ type: 'success', text: data.message || 'Recently Deleted emptied.' })
      await load()
    } catch (error) {
      setMessage({ type: 'danger', text: error.message })
    } finally {
      setBusy('')
    }
  }

  const filtered = filter === 'All' ? items : items.filter(item => item.module === filter)

  const daysLeft = item => {
    const expiry = new Date(String(item.deleted_at).replace(' ', 'T')).getTime() + 30 * 86400000
    return Math.max(0, Math.ceil((expiry - Date.now()) / 86400000))
  }

  return (
    <div className="app-layout">
      <Sidebar active="/recently-deleted" />

      <div className="app-main min-vh-100">
        <main className="p-4" id="mainContent">
          <header className="d-flex flex-wrap align-items-start justify-content-between gap-3 mb-4">
            <div>
              <div className="small fw-bold text-warning mb-1">RECOVERY & CLEANUP</div>
              <h1 className="fw-bold mb-1">Recently Deleted</h1>
              <p className="text-muted mb-0">
                Restore deleted inventory records within 30 days.
              </p>
            </div>

            <button
              className="btn btn-outline-danger"
              type="button"
              onClick={emptyTrash}
              disabled={!items.length || !!busy}
            >
              {busy === 'empty' ? 'Please wait...' : 'Empty Trash'}
            </button>
          </header>

          <div className="alert alert-info">
            Deleted records are kept for 30 days, then automatically removed. Restoring a stock or
            sales record also adjusts the product stock safely.
          </div>

          {message.text && (
            <div className={'alert alert-' + message.type} role="alert">
              {message.text}
            </div>
          )}

          <div className="d-flex flex-wrap gap-2 mb-3">
            {['All', 'Products', 'Stock In', 'Sales', 'Damaged Items'].map(value => (
              <button
                key={value}
                type="button"
                className={'btn btn-sm ' + (filter === value ? 'btn-warning' : 'btn-outline-secondary')}
                onClick={() => setFilter(value)}
              >
                {value}
                {value === 'All' ? ' (' + items.length + ')' : ''}
              </button>
            ))}
          </div>

          <div className="table-responsive rounded border">
            <table className="table table-hover align-middle mb-0">
              <thead>
                <tr>
                  <th>Record</th>
                  <th>Module</th>
                  <th>Deleted On</th>
                  <th>Time Left</th>
                  <th className="text-end">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="5" className="text-center py-5">
                      Loading deleted records...
                    </td>
                  </tr>
                ) : filtered.length ? (
                  filtered.map(item => {
                    const key = item.type + ':' + item.id

                    return (
                      <tr key={key}>
                        <td className="fw-semibold">{item.label}</td>
                        <td>{item.module}</td>
                        <td>{String(item.deleted_at).slice(0, 19)}</td>
                        <td>
                          <span className="badge text-bg-warning">
                            {daysLeft(item)} days
                          </span>
                        </td>
                        <td>
                          <div className="d-flex justify-content-end gap-2">
                            <button
                              className="btn btn-sm btn-success"
                              type="button"
                              onClick={() => restore(item)}
                              disabled={!!busy}
                            >
                              {busy === key ? 'Working...' : 'Restore'}
                            </button>
                            <button
                              className="btn btn-sm btn-outline-danger"
                              type="button"
                              onClick={() => remove(item)}
                              disabled={!!busy}
                            >
                              Delete forever
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })
                ) : (
                  <tr>
                    <td colSpan="5" className="text-center text-muted py-5">
                      <i className="bi bi-trash3 fs-2 d-block mb-2" />
                      {filter === 'All'
                        ? 'Your Recently Deleted folder is empty.'
                        : 'No deleted ' + filter.toLowerCase() + ' records.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </main>
      </div>
    </div>
  )
}

export default RecentlyDeleted
