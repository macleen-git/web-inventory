import { useState } from 'react'
import Sidebar from '../components/Sidebar'

function Transactions() {

  const [search, setSearch] = useState('')
  const [type, setType] = useState('All Types')

  const [transactions] = useState([
    {
      id: 'T0003',
      date: 'Aug 22, 2026',
      type: 'Sales',
      product: 'Claw Hammer 16oz',
      qty: 3,
      amount: 780,
      note: 'Walk-in customer'
    },
    {
      id: 'T0002',
      date: 'Aug 21, 2026',
      type: 'Stock In',
      product: 'PVC Pipe 1/2in',
      qty: 20,
      amount: 1300,
      note: 'Supplier delivery'
    },
    {
      id: 'T0001',
      date: 'Aug 20, 2026',
      type: 'Damaged',
      product: 'GI Wire 1kg',
      qty: 2,
      amount: 180,
      note: 'Water damage'
    }
  ])

  const filteredTransactions = transactions.filter((item) => {

    const searchValue = search.toLowerCase()

    const matchSearch =
      item.product.toLowerCase().includes(searchValue) ||
      item.note.toLowerCase().includes(searchValue) ||
      item.id.toLowerCase().includes(searchValue) ||
      item.date.toLowerCase().includes(searchValue)

    const matchType =
      type === 'All Types' || item.type === type

    return matchSearch && matchType
  })

  function formSubmit(event) {
    event.preventDefault()
  }

  return (
    <div className="app-layout">

      <Sidebar active="/transactions" />

      <div className="app-main bg-dark-subtle min-vh-100">

        <div className="p-4" id="mainContent">

          <h1>
            <b>Transactions</b>
          </h1>

          <p>
            Full history of Stock In, Sales, and Damaged Items
          </p>

          <form onSubmit={formSubmit}>

            <div className="row g-2 mb-3 align-items-center">

              <div className="col-12 col-md-6">

                <input
                  type="text"
                  className="form-control"
                  placeholder="Search by ID, product, date or note..."
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                />

              </div>

              <div className="col-12 col-md-3">

                <select
                  className="form-select"
                  value={type}
                  onChange={(event) => setType(event.target.value)}
                >

                  <option value="All Types">All Types</option>
                  <option value="Stock In">Stock In</option>
                  <option value="Sales">Sales</option>
                  <option value="Damaged">Damaged</option>

                </select>

              </div>

              <div className="col-12 col-md-3">

                <button
                  type="button"
                  className="btn btn-warning me-2"
                  onClick={() => {
                    setSearch('')
                    setType('All Types')
                  }}
                >
                  Clear Filter
                </button>

              </div>

            </div>

          </form>

          <div className="bg-white p-3 rounded shadow-sm">

            <div className="d-flex justify-content-between align-items-center mb-3">

              <h5 className="mb-0">
                Transaction Records
              </h5>

              <span className="badge bg-secondary">
                {filteredTransactions.length} Records
              </span>

            </div>

            <div className="table-responsive">

              <table className="table table-hover align-middle mb-0">

                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Date</th>
                    <th>Type</th>
                    <th>Product</th>
                    <th className="text-end">Qty</th>
                    <th className="text-end">Amount</th>
                    <th>Note</th>
                  </tr>
                </thead>

                <tbody>

                  {filteredTransactions.length > 0 ? (

                    filteredTransactions.map((item) => (

                      <tr key={item.id}>

                        <td>{item.id}</td>

                        <td>{item.date}</td>

                        <td>

                          {item.type === 'Sales' && (
                            <span className="badge bg-success">
                              Sales
                            </span>
                          )}

                          {item.type === 'Stock In' && (
                            <span className="badge bg-primary">
                              Stock In
                            </span>
                          )}

                          {item.type === 'Damaged' && (
                            <span className="badge bg-danger">
                              Damaged
                            </span>
                          )}

                        </td>

                        <td>{item.product}</td>

                        <td className="text-end">
                          {item.qty}
                        </td>

                        <td className="text-end">
                          ₱{Number(item.amount).toLocaleString(
                            'en-PH',
                            {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2
                            }
                          )}
                        </td>

                        <td>{item.note}</td>

                      </tr>

                    ))

                  ) : (

                    <tr>
                      <td colSpan="7" className="text-center py-4">

                        <p className="text-muted mb-0">
                          No transactions found.
                        </p>

                      </td>
                    </tr>

                  )}

                </tbody>

              </table>

            </div>

          </div>

        </div>

      </div>

    </div>
  )
}

export default Transactions