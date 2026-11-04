import { useCallback, useEffect, useMemo, useState } from 'react'
import Sidebar from '../components/Sidebar'
import { API_URL, apiFetch } from '../config/api'

const API = API_URL('/api')
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

function inSelectedPeriod(value, selectedDate) {
  const date = parseDate(value)
  if (!date || !selectedDate) return false
  return dateKey(date) === selectedDate
}

function todayKey() {
  return dateKey(new Date())
}
function MetricCard({ label, value, note, icon, accent }) {
  return (
    <article className="analytics-metric-card">
      <div className="d-flex align-items-start justify-content-between gap-3">
        <div>
          <p className="analytics-eyebrow mb-2">{label}</p>
          <div className="analytics-metric-value" title={String(value)}>{value}</div>
          <small className="analytics-muted">{note}</small>
        </div>
        <span className={`analytics-metric-icon ${accent || ''}`} aria-hidden="true">
          <i className={`bi ${icon}`} />
        </span>
      </div>
    </article>
  )
}

function BarChart({ title, subtitle, items, format = value => value, refreshing = false }) {
  const width = 720
  const height = 230
  const left = 62
  const right = 14
  const top = 18
  const bottom = 34
  const maxValue = Math.max(1, ...items.map(item => item.value))
  const points = items.map((item, index) => ({
    ...item,
    x: items.length <= 1 ? (left + width - right) / 2 : left + index * (width - left - right) / (items.length - 1),
    y: top + (1 - item.value / maxValue) * (height - top - bottom),
  }))
  const line = points.map(point => `${point.x},${point.y}`).join(' ')
  return (
    <section className={`analytics-panel h-100 ${refreshing ? 'analytics-chart-refreshing' : ''}`}>
      <div className="analytics-panel-heading"><div><h2>{title}</h2><p>{subtitle}</p></div></div>
      {items.length ? (
        <div className="sales-trend-chart analytics-sales-trend">
          <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label={title} preserveAspectRatio="none">
            {[0,1,2,3,4].map(tick => {
              const y = top + tick * (height - top - bottom) / 4
              const value = maxValue * (1 - tick / 4)
              return <g key={tick}><line x1={left} y1={y} x2={width-right} y2={y} className="sales-chart-grid" /><text x={left-9} y={y+4} textAnchor="end" className="sales-chart-axis">{format(value)}</text></g>
            })}
            {points.length > 1 && <polyline key={`${refreshing ? "refresh" : "idle"}-${items.map(item => item.value).join("-")}`} points={line} pathLength="1" className="sales-chart-line sales-chart-line-draw" />}
            {points.map(point => <g key={point.key || point.label}><circle cx={point.x} cy={point.y} r="4.5" className="sales-chart-dot"><title>{point.label}: {format(point.value)}</title></circle><text x={point.x} y={height-8} textAnchor="middle" className="sales-chart-axis">{point.label}</text></g>)}
          </svg>
        </div>
      ) : <div className="analytics-empty">No sales records available for this period.</div>}
    </section>
  )
}

function Dashboard() {
  const [data, setData] = useState({ products: [], sales: [], stockIns: [], damaged: [] })
  const [selectedDate, setSelectedDate] = useState(todayKey)
  const [trendPeriod, setTrendPeriod] = useState('Today')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [updatedAt, setUpdatedAt] = useState(null)

  const loadData = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const responses = await Promise.all(ENDPOINTS.map(endpoint => apiFetch(`${API}/${endpoint}`)))
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
  const filteredSales = useMemo(() => data.sales.filter(item => inSelectedPeriod(item.date, selectedDate)), [data.sales, selectedDate])
  const filteredStockIns = useMemo(() => data.stockIns.filter(item => inSelectedPeriod(item.date, selectedDate)), [data.stockIns, selectedDate])
  const filteredDamaged = useMemo(() => data.damaged.filter(item => inSelectedPeriod(item.date, selectedDate)), [data.damaged, selectedDate])

  const totalStock = data.products.reduce((sum, item) => sum + asNumber(item.stock), 0)
  const lowStock = data.products.filter(item => asNumber(item.stock) > 0 && asNumber(item.stock) <= 5)
  const outOfStock = data.products.filter(item => asNumber(item.stock) <= 0)
  const totalRevenue = filteredSales.reduce((sum, item) => sum + asNumber(item.amount), 0)
  const unitsSold = filteredSales.reduce((sum, item) => sum + asNumber(item.quantity), 0)

  const salesTrend = useMemo(() => {
    const now = new Date()
    const records = data.sales.map(item => ({ date: parseDate(item.date), amount: asNumber(item.amount) })).filter(item => item.date)
    const makeKey = date => dateKey(date)

    if (trendPeriod === 'Today') {
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      const hourly = Array.from({ length: 24 }, (_, hour) => ({ key: String(hour), label: hour === 0 ? '12 AM' : hour < 12 ? `${hour} AM` : hour === 12 ? '12 PM' : `${hour - 12} PM`, value: 0 }))
      records.filter(item => makeKey(item.date) === makeKey(today)).forEach(item => {
        const bucket = hourly[item.date.getHours()]
        bucket.value += item.amount
      })
      return hourly.filter((item, index) => index % 2 === 0)
    }

    if (trendPeriod === '7 Days' || trendPeriod === '30 Days') {
      const days = trendPeriod === '7 Days' ? 7 : 30
      const buckets = Array.from({ length: days }, (_, index) => {
        const date = new Date(now.getFullYear(), now.getMonth(), now.getDate() - (days - 1 - index))
        return { key: makeKey(date), label: date.toLocaleDateString('en-PH', { month: 'numeric', day: 'numeric' }), value: 0 }
      })
      const lookup = new Map(buckets.map(bucket => [bucket.key, bucket]))
      records.forEach(item => {
        const bucket = lookup.get(makeKey(item.date))
        if (bucket) bucket.value += item.amount
      })
      return buckets
    }

    if (trendPeriod === '90 Days') {
      const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 89)
      const buckets = Array.from({ length: 13 }, (_, index) => {
        const date = new Date(start.getFullYear(), start.getMonth(), start.getDate() + index * 7)
        return { key: makeKey(date), label: date.toLocaleDateString('en-PH', { month: 'short', day: 'numeric' }), value: 0 }
      })
      records.forEach(item => {
        const day = Math.floor((new Date(item.date.getFullYear(), item.date.getMonth(), item.date.getDate()) - start) / 86400000)
        if (day >= 0 && day < 90) buckets[Math.min(12, Math.floor(day / 7))].value += item.amount
      })
      return buckets
    }

    if (!records.length) return []
    const earliest = records.reduce((min, item) => item.date < min ? item.date : min, records[0].date)
    const monthCount = Math.max(1, (now.getFullYear() - earliest.getFullYear()) * 12 + now.getMonth() - earliest.getMonth() + 1)
    const buckets = Array.from({ length: monthCount }, (_, index) => {
      const date = new Date(earliest.getFullYear(), earliest.getMonth() + index, 1)
      return { key: `${date.getFullYear()}-${date.getMonth()}`, label: date.toLocaleDateString('en-PH', { month: 'short', year: '2-digit' }), value: 0 }
    })
    records.forEach(item => {
      const index = (item.date.getFullYear() - earliest.getFullYear()) * 12 + item.date.getMonth() - earliest.getMonth()
      if (buckets[index]) buckets[index].value += item.amount
    })
    return buckets
  }, [data.sales, trendPeriod])

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
              <button type="button" className="btn analytics-refresh-btn" onClick={loadData} disabled={loading}>
                <i className="bi bi-arrow-clockwise me-2" />{loading ? 'Refreshing…' : 'Refresh'}
              </button>
              <input
                type="date"
                className="form-control analytics-period-select"
                value={selectedDate}
                max={todayKey()}
                onChange={event => setSelectedDate(event.target.value || todayKey())}
                aria-label="Select dashboard date"
                title="Choose a date to view that day's sales and stock movement"
              />
            </div>
          </div>

          {error && <div className="alert alert-danger" role="alert">{error} <button className="btn btn-sm btn-outline-danger ms-2" onClick={loadData}>Try again</button></div>}
          {loading && !updatedAt && <div className="analytics-loading"><span className="spinner-border spinner-border-sm me-2" />Loading live inventory data…</div>}

          <div className="row g-3 mb-4">
            <div className="col-12 col-sm-6 col-xl-3"><MetricCard label="Products" value={data.products.length.toLocaleString()} note="Registered inventory items" icon="bi-box-seam" /></div>
            <div className="col-12 col-sm-6 col-xl-3"><MetricCard label="Units on hand" value={totalStock.toLocaleString()} note={`${lowStock.length} low · ${outOfStock.length} out of stock`} icon="bi-stack" accent="is-yellow" /></div>
            <div className="col-12 col-sm-6 col-xl-3"><MetricCard label="Sales revenue" value={money(totalRevenue)} note={`${unitsSold.toLocaleString()} units sold on selected date`} icon="bi-graph-up-arrow" /></div>
            <div className="col-12 col-sm-6 col-xl-3"><MetricCard label="Stock alerts" value={(lowStock.length + outOfStock.length).toLocaleString()} note="Low and out-of-stock products" icon="bi-exclamation-triangle" accent="is-alert" /></div>
          </div>

          <div className="row g-3 analytics-trend-row">
            <div className="col-12 col-xl-8">
              <div className="analytics-trend-toolbar">
                <div className="analytics-trend-periods" role="group" aria-label="Sales trend period">
                  {['Today', '7 Days', '30 Days', '90 Days', 'All Time'].map(period => (
                    <button key={period} type="button" className={`btn btn-sm ${trendPeriod === period ? 'is-active' : ''}`} onClick={() => setTrendPeriod(period)}>{period}</button>
                  ))}
                </div>
              </div>
              <BarChart title="Sales trend" subtitle={`Revenue · ${trendPeriod === 'Today' ? 'Hourly' : trendPeriod === 'All Time' ? 'Monthly' : trendPeriod === '90 Days' ? 'Weekly' : 'Daily'} view`} items={salesTrend} format={money} refreshing={loading && Boolean(updatedAt)} />
            </div>
            <div className="col-12 col-xl-4">
              <section className="analytics-panel h-100">
                <div className="analytics-panel-heading"><div><h2>Inventory movement</h2><p>Recorded units on selected date</p></div></div>
                <div className="analytics-movement-list">
                  {movement.map(item => <div className="analytics-movement-row" key={item.label}><span>{item.label}</span><strong>{item.value.toLocaleString()}</strong></div>)}
                </div>
                <small className="analytics-muted d-block mt-3">Movement totals are based on the corresponding API records.</small>
              </section>
            </div>
          </div>

          <div className="row g-3 mb-4 analytics-lower-row">
            <div className="col-12 col-xl-6">
              <section className="analytics-panel h-100">
                <div className="analytics-panel-heading"><div><h2>Top-selling products</h2><p>Ranked by recorded quantity sold</p></div></div>
                {topProducts.length ? topProducts.map((item, index) => <div className="analytics-rank-row" key={item.name}><span className="analytics-rank-number">{index + 1}</span><span className="flex-grow-1">{item.name}</span><strong>{item.quantity.toLocaleString()} sold</strong></div>) : <div className="analytics-empty">No sales records found for this date.</div>}
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
                <div className="analytics-recent-scroll">
                  <div className="table-responsive">
                    <table className="table analytics-table analytics-recent-table align-middle mb-0">
                      <colgroup>
                        <col className="recent-col-date" />
                        <col className="recent-col-type" />
                        <col className="recent-col-product" />
                        <col className="recent-col-qty" />
                      </colgroup>
                      <thead>
                        <tr><th>Date</th><th>Type</th><th>Product</th><th className="text-end">Qty</th></tr>
                      </thead>
                      <tbody>
                        {recentActivity.length ? recentActivity.map((item, index) => (
                          <tr key={`${item.type}-${item.id || index}`}>
                            <td className="recent-date-cell">{item.dateValue ? item.dateValue.toLocaleDateString('en-PH') : '—'}</td>
                            <td><span className={`analytics-type-badge type-${item.type.toLowerCase().replace(/\s/g, '-')}`}>{item.type}</span></td>
                            <td className="recent-product-cell" title={item.product || '—'}>{item.product || '—'}</td>
                            <td className="text-end recent-qty-cell">{asNumber(item.quantityValue).toLocaleString()}</td>
                          </tr>
                        )) : (
                          <tr><td colSpan="4" className="text-center py-4 analytics-muted">No activity records available.</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
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
