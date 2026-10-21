
import { useState, useEffect } from 'react'
import Sidebar from '../components/Sidebar'

function Reports() {

  const [products, setProducts] = useState([])
  const [sales, setSales] = useState([])
  const [stockIns, setStockIns] = useState([])
  const [damaged, setDamaged] = useState([])

  const [period, setPeriod] = useState('Last 7 days')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    async function getReports() {
      try {
        setLoading(true)
        setError('')

        const productResponse = await fetch('http://localhost:8080/api/product')
        const salesResponse = await fetch('http://localhost:8080/api/sales')
        const stockResponse = await fetch('http://localhost:8080/api/stock-in')
        const damagedResponse = await fetch('http://localhost:8080/api/damaged')

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
    const cost = getQuantity(item) * (Number(product?.buy) || 0)

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

        <div className="p-4" id="mainContent">

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
