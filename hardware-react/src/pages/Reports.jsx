
import { useState, useEffect, useMemo } from 'react'
import Sidebar from '../components/Sidebar'
import { API_URL, apiFetch } from '../config/api'

function Reports() {

  const [products, setProducts] = useState([])
  const [sales, setSales] = useState([])
  const [stockIns, setStockIns] = useState([])
  const [damaged, setDamaged] = useState([])

  const [period, setPeriod] = useState(() => window.localStorage.getItem('hardware-reports-period') || 'Last 7 days')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    async function getReports() {
      try {
        setLoading(true)
        setError('')

        const productResponse = await apiFetch(API_URL('/api/product'))
        const salesResponse = await apiFetch(API_URL('/api/sales'))
        const stockResponse = await apiFetch(API_URL('/api/stock-in'))
        const damagedResponse = await apiFetch(API_URL('/api/damaged'))

        if (
          !productResponse.ok ||
          !salesResponse.ok ||
          !stockResponse.ok ||
          !damagedResponse.ok
        ) {
          throw new Error('Hindi makuha ang data mula sa server.')
        }

        const productData = await productResponse.json()
        const salesData = await salesResponse.json()
        const stockData = await stockResponse.json()
        const damagedData = await damagedResponse.json()

        setProducts(Array.isArray(productData) ? productData : [])
        setSales(Array.isArray(salesData) ? salesData : [])
        setStockIns(Array.isArray(stockData) ? stockData : [])
        setDamaged(Array.isArray(damagedData) ? damagedData : [])

      } catch (error) {
        setError(error.message || 'May problema sa pagkuha ng reports.')
      } finally {
        setLoading(false)
      }
    }

    getReports()
  }, [])

  function getFilteredData(data) {
    if (period === 'All time') {
      return data
    }

    const today = new Date()
    today.setHours(23, 59, 59, 999)

    const days = period === 'Last 7 days'
      ? 7
      : period === 'Last 30 days'
        ? 30
        : 90

    const startDate = new Date()
    startDate.setDate(startDate.getDate() - (days - 1))
    startDate.setHours(0, 0, 0, 0)

    return data.filter(item => {
      if (!item.date) {
        return false
      }

      const itemDate = new Date(item.date)

      return !isNaN(itemDate.getTime()) &&
        itemDate >= startDate &&
        itemDate <= today
    })
  }

  function getProduct(productName) {
    return products.find(item =>
      String(item.product || '').toLowerCase() ===
      String(productName || '').toLowerCase()
    )
  }

  function getQuantity(item) {
    return Number(item.quantity) || 0
  }

  function getRevenue(item) {
    const product = getProduct(item.product)
    const quantity = getQuantity(item)

    if (item.amount !== undefined && item.amount !== '') {
      return Number(item.amount) || 0
    }

    return quantity * (Number(product?.sell) || 0)
  }

  function getProfit(item) {
    const product = getProduct(item.product)
    const revenue = getRevenue(item)
    const cost = item.unitCost !== undefined && item.unitCost !== ''
      ? getQuantity(item) * (Number(item.unitCost) || 0)
      : getQuantity(item) * (Number(product?.buy) || 0)

    return revenue - cost
  }

  const filteredSales = getFilteredData(sales)
  const filteredStockIns = getFilteredData(stockIns)
  const filteredDamaged = getFilteredData(damaged)

  const totalSales = filteredSales.reduce((total, item) => {
    return total + getRevenue(item)
  }, 0)

  const totalProfit = filteredSales.reduce((total, item) => {
    return total + getProfit(item)
  }, 0)

  const totalStockedIn = filteredStockIns.reduce((total, item) => {
    return total + getQuantity(item)
  }, 0)

  const totalDamagedLosses = filteredDamaged.reduce((total, item) => {
    const product = getProduct(item.product)
    return total + getQuantity(item) * (Number(product?.buy) || 0)
  }, 0)

  const dailyEarnings = useMemo(() => {
    const grouped = new Map()
    filteredSales.forEach(item => {
      if (!item.date) return
      const date = new Date(item.date)
      if (Number.isNaN(date.getTime())) return
      const key = date.getFullYear() + '-' + String(date.getMonth() + 1).padStart(2, '0') + '-' + String(date.getDate()).padStart(2, '0')
      const current = grouped.get(key) || { date: key, revenue: 0, profit: 0 }
      current.revenue += getRevenue(item)
      current.profit += getProfit(item)
      grouped.set(key, current)
    })
    return [...grouped.values()].sort((a, b) => a.date.localeCompare(b.date))
  }, [filteredSales, products])

  function formatMoney(amount) {
    return '₱' + amount.toLocaleString('en-PH', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })
  }

  function formSubmit(event) {
    event.preventDefault()
  }

  return (
    <div className="app-layout">

      <Sidebar active="/reports" />

      <div className="app-main bg-dark-subtle min-vh-100">

        <div className="reports-page-content" id="mainContent">

          <h1><b>Reports</b></h1>
          <p>Sales, profit, stock, and damaged/loss summaries</p>

          <form onSubmit={formSubmit} className="mb-4">

            <label className="form-label">Report Period</label>

            <select
              className="form-select"
              style={{ maxWidth: '220px' }}
              value={period}
              onChange={(event) => setPeriod(event.target.value)}
            >
              <option>Last 7 days</option>
              <option>Last 30 days</option>
              <option>Last 90 days</option>
              <option>All time</option>
            </select>

            <button type="submit" className="btn btn-warning mt-2">
              Apply Filter
            </button>

          </form>

          {loading && (
            <p>Loading reports...</p>
          )}

          {error && (
            <div className="alert alert-danger">
              {error}
            </div>
          )}

          {!loading && !error && (
            <>

              <div className="row g-3 mb-4">

                <div className="col-12 col-sm-6 col-xl-3">
                  <div className="card h-100">
                    <div className="card-body">
                      <p className="text-muted mb-2">Total Sales</p>
                      <h4><b>{formatMoney(totalSales)}</b></h4>
                    </div>
                  </div>
                </div>

                <div className="col-12 col-sm-6 col-xl-3">
                  <div className="card h-100">
                    <div className="card-body">
                      <p className="text-muted mb-2">Total Profit</p>
                      <h4><b>{formatMoney(totalProfit)}</b></h4>
                    </div>
                  </div>
                </div>

                <div className="col-12 col-sm-6 col-xl-3">
                  <div className="card h-100">
                    <div className="card-body">
                      <p className="text-muted mb-2">Units Stocked In</p>
                      <h4><b>{totalStockedIn.toLocaleString()}</b></h4>
                    </div>
                  </div>
                </div>

                <div className="col-12 col-sm-6 col-xl-3">
                  <div className="card h-100">
                    <div className="card-body">
                      <p className="text-muted mb-2">Damaged Losses</p>
                      <h4><b>{formatMoney(totalDamagedLosses)}</b></h4>
                    </div>
                  </div>
                </div>

              </div>

              <div className="card mb-4">
                <div className="card-header bg-white d-flex flex-wrap justify-content-between align-items-center gap-2">
                  <div><h5 className="mb-1"><b>Daily Earnings Overview</b></h5><small className="text-muted">Compare daily revenue and profit from your recorded sales</small></div>
                  <div className="d-flex gap-3 small"><span><i className="bi bi-square-fill me-1" style={{color:'#6c9ee8'}} />Revenue</span><span><i className="bi bi-square-fill me-1" style={{color:'#20b779'}} />Profit</span></div>
                </div>
                <div className="card-body">
                  {dailyEarnings.length ? <div className="d-flex align-items-end gap-2" style={{height:'230px',borderBottom:'1px solid #dee2e6',padding:'8px 4px 0',overflowX:'auto'}}>
                    {dailyEarnings.map(item => {
                      const max = Math.max(1,...dailyEarnings.map(day=>day.revenue))
                      const revenueHeight = Math.max(2,item.revenue/max*185)
                      const profitHeight = Math.max(2,item.profit/max*185)
                      return <div key={item.date} className="d-flex flex-column align-items-center justify-content-end flex-grow-1" style={{minWidth:dailyEarnings.length>14?'24px':'32px',height:'100%'}} title={`${item.date} | Revenue: ${formatMoney(item.revenue)} | Profit: ${formatMoney(item.profit)}`}>
                        <div className="d-flex align-items-end justify-content-center gap-1 w-100" style={{height:'185px'}}>
                          <div style={{height:revenueHeight,width:'42%',maxWidth:'18px',background:'#6c9ee8',borderRadius:'4px 4px 0 0'}} />
                          <div style={{height:profitHeight,width:'42%',maxWidth:'18px',background:'#20b779',borderRadius:'4px 4px 0 0'}} />
                        </div>
                        <small className="text-muted mt-2" style={{fontSize:'10px',whiteSpace:'nowrap'}}>{new Date(item.date+'T00:00:00').toLocaleDateString('en-PH',{month:'short',day:'numeric'})}</small>
                      </div>
                    })}
                  </div> : <div className="text-center text-muted py-5">No sales records for this period yet. The graph will appear when sales are recorded.</div>}
                  <div className="d-flex flex-wrap justify-content-between gap-2 mt-3 small">
                    <span><b>Total revenue:</b> {formatMoney(dailyEarnings.reduce((sum,item)=>sum+item.revenue,0))}</span>
                    <span><b>Total profit:</b> {formatMoney(dailyEarnings.reduce((sum,item)=>sum+item.profit,0))}</span>
                  </div>
                </div>
              </div>

              <div className="card">

                <div className="card-header bg-white">
                  <h5 className="mb-0"><b>Sales Report</b></h5>
                </div>

                <div className="card-body">

                  <div className="table-responsive">

                    <table className="table table-bordered table-hover align-middle">

                      <thead className="table-dark">
                        <tr>
                          <th>Date</th>
                          <th>Product</th>
                          <th>Units Sold</th>
                          <th>Revenue</th>
                          <th>Profit</th>
                        </tr>
                      </thead>

                      <tbody>
                        {filteredSales.length > 0 ? (
                          filteredSales.map((item, index) => (
                            <tr key={item.id || index}>
                              <td>
                                {item.date
                                  ? new Date(item.date).toLocaleDateString()
                                  : 'N/A'}
                              </td>

                              <td>{item.product || 'N/A'}</td>

                              <td>{getQuantity(item)}</td>

                              <td>{formatMoney(getRevenue(item))}</td>

                              <td>{formatMoney(getProfit(item))}</td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan="5" className="text-center">
                              No sales records found for this period.
                            </td>
                          </tr>
                        )}
                      </tbody>

                    </table>

                  </div>

                </div>

              </div>

            </>
          )}

        </div>

      </div>

    </div>
  )
}

export default Reports
