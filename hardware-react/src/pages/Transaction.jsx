import { useEffect, useMemo, useState } from 'react'
import Sidebar from '../components/Sidebar'
import { API_URL, apiFetch } from '../config/api'

const API = API_URL('/api')

function Transactions() {
  const [records, setRecords] = useState([])
  const [search, setSearch] = useState('')
  const [type, setType] = useState('All Types')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  async function loadTransactions() {
    setLoading(true)
    setError('')
    try {
      const [salesResponse, stockResponse, damagedResponse] = await Promise.all([
        apiFetch(`${API}/sales`),
        apiFetch(`${API}/stock-in`),
        apiFetch(`${API}/damaged`),
      ])
      const failed = [salesResponse, stockResponse, damagedResponse].find(response => !response.ok)
      if (failed) throw new Error(`Unable to load transactions (HTTP ${failed.status}).`)
      const [sales, stockIns, damaged] = await Promise.all([
        salesResponse.json(), stockResponse.json(), damagedResponse.json(),
      ])
      const merged = [
        ...(Array.isArray(sales) ? sales : []).map(item => ({ ...item, type: 'Sales', quantityValue: item.quantity, noteValue: item.note || '' })),
        ...(Array.isArray(stockIns) ? stockIns : []).map(item => ({ ...item, type: 'Stock In', quantityValue: item.quantity, noteValue: item.note || '' })),
        ...(Array.isArray(damaged) ? damaged : []).map(item => ({ ...item, type: 'Damaged', quantityValue: item.quantity, noteValue: item.reason || '' })),
      ]
      merged.sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime())
      setRecords(merged)
    } catch (loadError) {
      setError(loadError.message || 'Unable to connect to the inventory API.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadTransactions() }, [])

  const filteredTransactions = useMemo(() => {
    const keyword = search.trim().toLowerCase()
    return records.filter(item => {
      const matchesSearch = [item.id, item.product, item.date, item.noteValue, item.type]
        .some(value => String(value || '').toLowerCase().includes(keyword))
      return matchesSearch && (type === 'All Types' || item.type === type)
    })
  }, [records, search, type])

  function formatAmount(item) {
    if (item.amount !== undefined && item.amount !== '') return Number(item.amount) || 0
    return 0
  }

  return (
    <div className="app-layout">
      <Sidebar active="/transactions" />
      <main className="app-main min-vh-100">
        <div id="mainContent">
          <div className="analytics-page-header">
            <div><span className="analytics-kicker">RECORDS / ACTIVITY LOG</span><h1>Transactions</h1><p>Combined history of sales, stock-in, and damaged-item records.</p></div>
            <button type="button" className="btn analytics-refresh-btn" onClick={loadTransactions} disabled={loading}><i className="bi bi-arrow-clockwise me-2" />{loading ? 'Refreshing…' : 'Refresh records'}</button>
          </div>

          {error && <div className="alert alert-danger" role="alert">{error}</div>}
          <section className="analytics-panel">
            <div className="row g-2 align-items-center mb-3">
              <div className="col-12 col-lg-6"><label className="visually-hidden" htmlFor="transaction-search">Search transactions</label><div className="input-group"><span className="input-group-text bg-white"><i className="bi bi-search" /></span><input id="transaction-search" className="form-control" placeholder="Search ID, product, date, or note…" value={search} onChange={event => setSearch(event.target.value)} /></div></div>
              <div className="col-12 col-sm-6 col-lg-3"><label className="visually-hidden" htmlFor="transaction-type">Transaction type</label><select id="transaction-type" className="form-select" value={type} onChange={event => setType(event.target.value)}><option>All Types</option><option>Stock In</option><option>Sales</option><option>Damaged</option></select></div>
              <div className="col-12 col-sm-6 col-lg-3 d-flex gap-2"><button type="button" className="btn analytics-refresh-btn flex-grow-1" onClick={() => { setSearch(''); setType('All Types') }}>Clear filters</button><span className="analytics-count align-self-center">{filteredTransactions.length}</span></div>
            </div>

            {loading ? <div className="analytics-loading"><span className="spinner-border spinner-border-sm me-2" />Loading transaction records…</div> : (
              <div className="table-responsive"><table className="table analytics-table align-middle mb-0"><thead><tr><th>Record ID</th><th>Date</th><th>Type</th><th>Product</th><th className="text-end">Quantity</th><th className="text-end">Amount</th><th>Note / Reason</th></tr></thead><tbody>
                {filteredTransactions.length ? filteredTransactions.map((item, index) => <tr key={`${item.type}-${item.id || index}`}><td>#{item.id ?? '—'}</td><td>{item.date ? new Date(item.date).toLocaleDateString('en-PH') : '—'}</td><td><span className={`analytics-type-badge type-${item.type.toLowerCase().replace(/\s/g, '-')}`}>{item.type}</span></td><td>{item.product || '—'}</td><td className="text-end">{Number(item.quantityValue) || 0}</td><td className="text-end">{item.type === 'Sales' ? `₱${formatAmount(item).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '—'}</td><td>{item.noteValue || '—'}</td></tr>) : <tr><td colSpan="7" className="text-center py-5 analytics-muted">{records.length ? 'No transactions match your filters.' : 'No transaction records returned by the API.'}</td></tr>}
              </tbody></table></div>
            )}
          </section>
          <p className="analytics-footnote">Records are combined from the existing /api/sales, /api/stock-in, and /api/damaged endpoints. This page does not create or modify transactions.</p>
        </div>
      </main>
    </div>
  )
}

export default Transactions
