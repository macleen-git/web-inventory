import { useCallback, useEffect, useMemo, useState } from 'react'
import Sidebar from '../components/Sidebar'

const API = 'https://web-inventory-rfai.onrender.com/api'
const ENDPOINTS = ['product', 'sales', 'stock-in', 'damaged']

function asNumber(value) {
  const number = Number(value)
  return Number.isFinite(number) ? number : 0
}

function parseDate(value) {
  if (!value) return null
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

function money(value) {
  return '₱' + asNumber(value).toLocaleString('en-PH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

function dateKey(date) {
  return [date.getFullYear(), String(date.getMonth() + 1).padStart(2, '0'), String(date.getDate()).padStart(2, '0')].join('-')
}

function inSelectedPeriod(value, period) {
  const date = parseDate(value)
  if (!date) return false
  if (period === 'All time') return true
  const now = new Date()
  const start = new Date(now)
  if (period === 'Last 7 days') start.setDate(now.getDate() - 6)
  else if (period === 'Last 30 days') start.setDate(now.getDate() - 29)
  else start.setMonth(now.getMonth() - 11, 1)
  start.setHours(0, 0, 0, 0)
  return date >= start && date <= now
}

function MetricCard({ label, value, note, icon, accent }) {
  return (
    <article className="analytics-metric-card">
      <div className="d-flex align-items-start justify-content-between gap-3">
        <div>
          <p className="analytics-eyebrow mb-2">{label}</p>
          <div className="analytics-metric-value">{value}</div>
          <small className="analytics-muted">{note}</small>
        </div>
        <span className={`analytics-metric-icon ${accent || ''}`} aria-hidden="true">
          <i className={`bi ${icon}`} />
        </span>
      </div>
    </article>
  )
}

function BarChart({ title, subtitle, items, format = value => value }) {
  const maximum = Math.max(1, ...items.map(item => item.value))
  return (
    <section className="analytics-panel h-100">
      <div className="analytics-panel-heading">
        <div>
          <h2>{title}</h2>
          <p>{subtitle}</p>
        </div>
      </div>
      {items.length ? (
        <div className="analytics-bars" role="img" aria-label={title}>
          {items.map(item => (
            <div className="analytics-bar-column" key={item.label} title={`${item.label}: ${format(item.value)}`}>
              <strong>{format(item.value)}</strong>
              <div className="analytics-bar-track">
                <span style={{ height: `${Math.max(item.value > 0 ? 5 : 0, item.value / maximum * 100)}%` }} />
              </div>
              <small>{item.label}</small>
            </div>
          ))}
        </div>
      ) : <div className="analytics-empty">No records for this period.</div>}
    </section>
  )
}

function Dashboard() {
  const [data, setData] = useState({ products: [], sales: [], stockIns: [], damaged: [] })
  const [period, setPeriod] = useState('Last 7 days')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [updatedAt, setUpdatedAt] = useState(null)

  const loadData = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const responses = await Promise.all(ENDPOINTS.map(endpoint => fetch(`${API}/${endpoint}`)))
      const failed = responses.find(response => !response.ok)
      if (failed) throw new Error(`Unable to load dashboard data (HTTP ${failed.status}).`)
      const [products, sales, stockIns, damaged] = await Promise.all(responses.map(response => response.json()))
      setData({
        products: Array.isArray(products) ? products : [],
        sales: Array.isArray(sales) ? sales : [],
        stockIns: Array.isArray(stockIns) ? stockIns : [],
        damaged: Array.isArray(damaged) ? damaged : [],
      })
      setUpdatedAt(new Date())
    } catch (loadError) {
      setError(loadError.message || 'Unable to connect to the inventory API.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadData() }, [loadData])

  const filteredSales = useMemo(() => data.sales.filter(item => inSelectedPeriod(item.date, period)), [data.sales, period])
  const filteredStockIns = useMemo(() => data.stockIns.filter(item => inSelectedPeriod(item.date, period)), [data.stockIns, period])
  const filteredDamaged = useMemo(() => data.damaged.filter(item => inSelectedPeriod(item.date, period)), [data.damaged, period])

  const totalStock = data.products.reduce((sum, item) => sum + asNumber(item.stock), 0)
  const lowStock = data.products.filter(item => asNumber(item.stock) > 0 && asNumber(item.stock) <= 5)
  const outOfStock = data.products.filter(item => asNumber(item.stock) <= 0)
  const totalRevenue = filteredSales.reduce((sum, item) => sum + asNumber(item.amount), 0)
  const unitsSold = filteredSales.reduce((sum, item) => sum + asNumber(item.quantity), 0)

  const salesTrend = useMemo(() => {
    const groups = new Map()
    filteredSales.forEach(item => {
      const date = parseDate(item.date)
      if (!date) return
      const label = period === 'Last 7 days' || period === 'Last 30 days'
        ? date.toLocaleDateString('en-PH', { month: 'short', day: 'numeric' })
        : date.toLocaleDateString('en-PH', { month: 'short', year: '2-digit' })
      const key = period === 'Last 7 days' || period === 'Last 30 days'
        ? dateKey(date)
        : `${date.getFullYear()}-${date.getMonth()}`
      groups.set(key, { label, value: (groups.get(key)?.value || 0) + asNumber(item.amount) })
    })
    return [...groups.values()].slice(-12)
  }, [filteredSales, period])

  const movement = [
    { label: 'Stock In', value: filteredStockIns.reduce((sum, item) => sum + asNumber(item.quantity), 0) },
    { label: 'Sales / Out', value: unitsSold },
    { label: 'Damaged', value: filteredDamaged.reduce((sum, item) => sum + asNumber(item.quantity), 0) },
  ]

  const topProducts = useMemo(() => {
    const totals = new Map()
    filteredSales.forEach(item => totals.set(item.product, (totals.get(item.product) || 0) + asNumber(item.quantity)))
    return [...totals.entries()].map(([name, quantity]) => ({ name, quantity })).sort((a, b) => b.quantity - a.quantity).slice(0, 5)
  }, [filteredSales])

  const categories = useMemo(() => {
    const totals = new Map()
    data.products.forEach(item => {
      const category = item.category || 'Uncategorized'
      totals.set(category, (totals.get(category) || 0) + 1)
    })
    return [...totals.entries()].sort((a, b) => b[1] - a[1])
  }, [data.products])

  const recentActivity = useMemo(() => [
    ...data.sales.map(item => ({ ...item, type: 'Sale', dateValue: parseDate(item.date), quantityValue: item.quantity })),
    ...data.stockIns.map(item => ({ ...item, type: 'Stock In', dateValue: parseDate(item.date), quantityValue: item.quantity })),
    ...data.damaged.map(item => ({ ...item, type: 'Damaged', dateValue: parseDate(item.date), quantityValue: item.quantity })),
  ].sort((a, b) => (b.dateValue?.getTime() || 0) - (a.dateValue?.getTime() || 0)).slice(0, 6), [data])

  return (
    <div className="app-layout">
      <Sidebar active="/dashboard" />
      <main className="app-main min-vh-100">
        <div id="mainContent">
          <div className="analytics-page-header">
            <div>
              <span className="analytics-kicker">HARDWARE TOOLS / OVERVIEW</span>
              <h1>Dashboard</h1>
              <p>Monitor inventory health, sales performance, and recent activity.</p>
            </div>
            <div className="d-flex flex-wrap align-items-center gap-2">
              <select className="form-select analytics-period-select" value={period} onChange={event => setPeriod(event.target.value)} aria-label="Dashboard date range">
                <option>Last 7 days</option>
                <option>Last 30 days</option>
                <option>Last 12 months</option>
                <option>All time</option>
              </select>
              <button type="button" className="btn analytics-refresh-btn" onClick={loadData} disabled={loading}>
                <i className="bi bi-arrow-clockwise me-2" />{loading ? 'Refreshing…' : 'Refresh'}
              </button>
            </div>
          </div>

          {error && <div className="alert alert-danger" role="alert">{error} <button className="btn btn-sm btn-outline-danger ms-2" onClick={loadData}>Try again</button></div>}
          {loading && !updatedAt && <div className="analytics-loading"><span className="spinner-border spinner-border-sm me-2" />Loading live inventory data…</div>}

          <div className="row g-3 mb-4">
            <div className="col-12 col-sm-6 col-xl-3"><MetricCard label="Products" value={data.products.length.toLocaleString()} note="Registered inventory items" icon="bi-box-seam" /></div>
            <div className="col-12 col-sm-6 col-xl-3"><MetricCard label="Units on hand" value={totalStock.toLocaleString()} note={`${lowStock.length} low · ${outOfStock.length} out of stock`} icon="bi-stack" accent="is-yellow" /></div>
            <div className="col-12 col-sm-6 col-xl-3"><MetricCard label="Sales revenue" value={money(totalRevenue)} note={`${unitsSold.toLocaleString()} units sold in selected period`} icon="bi-graph-up-arrow" /></div>
            <div className="col-12 col-sm-6 col-xl-3"><MetricCard label="Stock alerts" value={(lowStock.length + outOfStock.length).toLocaleString()} note="Low and out-of-stock products" icon="bi-exclamation-triangle" accent="is-alert" /></div>
          </div>

          <div className="row g-3 mb-4">
            <div className="col-12 col-xl-8"><BarChart title="Sales trend" subtitle={`Revenue · ${period.toLowerCase()}`} items={salesTrend} format={money} /></div>
            <div className="col-12 col-xl-4">
              <section className="analytics-panel h-100">
                <div className="analytics-panel-heading"><div><h2>Inventory movement</h2><p>Recorded units in selected period</p></div></div>
                <div className="analytics-movement-list">
                  {movement.map(item => <div className="analytics-movement-row" key={item.label}><span>{item.label}</span><strong>{item.value.toLocaleString()}</strong></div>)}
                </div>
                <small className="analytics-muted d-block mt-3">Movement totals are based on the corresponding API records.</small>
              </section>
            </div>
          </div>

          <div className="row g-3 mb-4">
            <div className="col-12 col-xl-6">
              <section className="analytics-panel h-100">
                <div className="analytics-panel-heading"><div><h2>Top-selling products</h2><p>Ranked by recorded quantity sold</p></div></div>
                {topProducts.length ? topProducts.map((item, index) => <div className="analytics-rank-row" key={item.name}><span className="analytics-rank-number">{index + 1}</span><span className="flex-grow-1">{item.name}</span><strong>{item.quantity.toLocaleString()} sold</strong></div>) : <div className="analytics-empty">No sales records found for this period.</div>}
              </section>
            </div>
            <div className="col-12 col-xl-6">
              <section className="analytics-panel h-100">
                <div className="analytics-panel-heading"><div><h2>Category distribution</h2><p>Products grouped by category</p></div></div>
                {categories.length ? categories.map(([name, count]) => <div className="analytics-category-row" key={name}><div className="d-flex justify-content-between gap-2 mb-1"><span>{name}</span><strong>{count}</strong></div><div className="analytics-progress"><span style={{ width: `${count / Math.max(1, data.products.length) * 100}%` }} /></div></div>) : <div className="analytics-empty">No product categories available.</div>}
              </section>
            </div>
          </div>

          <div className="row g-3">
            <div className="col-12 col-xl-5">
              <section className="analytics-panel h-100">
                <div className="analytics-panel-heading"><div><h2>Stock-level monitoring</h2><p>Products requiring attention</p></div><span className="analytics-count">{lowStock.length + outOfStock.length}</span></div>
                {lowStock.length + outOfStock.length ? [...outOfStock, ...lowStock].slice(0, 7).map(item => <div className="analytics-stock-row" key={item.id}><div className="min-w-0"><strong>{item.product}</strong><small>{item.category || 'Uncategorized'}</small></div><span className={asNumber(item.stock) <= 0 ? 'analytics-stock-badge is-out' : 'analytics-stock-badge is-low'}>{asNumber(item.stock) <= 0 ? 'Out of stock' : 'Low stock'} · {asNumber(item.stock)}</span></div>) : <div className="analytics-empty">No low-stock or out-of-stock products.</div>}
              </section>
            </div>
            <div className="col-12 col-xl-7">
              <section className="analytics-panel h-100">
                <div className="analytics-panel-heading"><div><h2>Recent activity</h2><p>Latest stock and sales records</p></div></div>
                <div className="table-responsive"><table className="table analytics-table align-middle mb-0"><thead><tr><th>Date</th><th>Type</th><th>Product</th><th className="text-end">Qty</th></tr></thead><tbody>
                  {recentActivity.length ? recentActivity.map((item, index) => <tr key={`${item.type}-${item.id || index}`}><td>{item.dateValue ? item.dateValue.toLocaleDateString('en-PH') : '—'}</td><td><span className={`analytics-type-badge type-${item.type.toLowerCase().replace(/\s/g, '-')}`}>{item.type}</span></td><td>{item.product || '—'}</td><td className="text-end">{asNumber(item.quantityValue).toLocaleString()}</td></tr>) : <tr><td colSpan="4" className="text-center py-4 analytics-muted">No activity records available.</td></tr>}
                </tbody></table></div>
              </section>
            </div>
          </div>
          <div className="analytics-footnote">Data source: existing inventory API{updatedAt ? ` · Updated ${updatedAt.toLocaleTimeString('en-PH')}` : ''}. Dashboard figures reflect the records returned by the API.</div>
        </div>
      </main>
    </div>
  )
}

export default Dashboard
