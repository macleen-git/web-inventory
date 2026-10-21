import Sidebar from '../components/Sidebar'

const STATS = [
  { label: 'Total Products', value: '250', icon: 'bi-box-seam', tone: 'stat-blue' },
  { label: 'Total Stock', value: '1,245', icon: 'bi-layers', tone: 'stat-green' },
  { label: 'Low Stock Items', value: '18', icon: 'bi-exclamation-triangle', tone: 'stat-amber' },
  { label: 'Total Sales', value: '₱45,680', icon: 'bi-cash-coin', tone: 'stat-navy' },
]

const TRANSACTIONS = [
  { date: 'Aug 22, 2026', product: 'Claw Hammer 16oz', type: 'Sale', qty: 3, badge: 'bg-success', icon: 'bi-cart-check' },
  { date: 'Aug 21, 2026', product: 'PVC Pipe 1/2in', type: 'Stock In', qty: 20, badge: 'bg-primary', icon: 'bi-box-arrow-in-down' },
  { date: 'Aug 20, 2026', product: 'GI Wire 1kg', type: 'Damaged', qty: 2, badge: 'bg-danger', icon: 'bi-exclamation-triangle' },
]

function Dashboard() {
  return (
    <div className="app-layout">

      <Sidebar active="/dashboard" />

      <div className="app-main bg-dark-subtle min-vh-100">

        <div className="p-4" id="mainContent">

          <div className="dash-header mb-4">
            <span className="section-kicker">OVERVIEW</span>
            <h1 className="mb-1">
              <b>Dashboard</b>
            </h1>
            <p className="mb-0 text-secondary">
              Welcome to Hardware Store Dashboard
            </p>
          </div>

          <div className="row g-3">

            {STATS.map((stat) => (
              <div className="col-12 col-md-6 col-lg-3" key={stat.label}>
                <div className={`stat-card ${stat.tone} p-3 rounded-4 shadow-sm h-100`}>
                  <div className="stat-icon">
                    <i className={`bi ${stat.icon}`} />
                  </div>
                  <h6 className="mb-1 mt-3">{stat.label}</h6>
                  <h3 className="mb-0"><b>{stat.value}</b></h3>
                </div>
              </div>
            ))}

          </div>

          <div className="row g-3 mt-1">

            <div className="col-12">

              <div className="bg-white p-3 rounded-4 shadow-sm dash-table-card">

                <h6 className="mb-3 d-flex align-items-center gap-2">
                  <i className="bi bi-clock-history text-warning" />
                  <b>Recent Transactions</b>
                </h6>

                <div className="table-responsive">

                  <table className="table table-hover align-middle mb-0">

                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Product</th>
                        <th>Type</th>
                        <th className="text-end">Qty</th>
                      </tr>
                    </thead>

                    <tbody>

                      {TRANSACTIONS.map((tx) => (
                        <tr key={`${tx.date}-${tx.product}`}>
                          <td>{tx.date}</td>

                          <td>{tx.product}</td>

                          <td>
                            <span className={`badge ${tx.badge} d-inline-flex align-items-center gap-1`}>
                              <i className={`bi ${tx.icon}`} />
                              {tx.type}
                            </span>
                          </td>

                          <td className="text-end">
                            {tx.qty}
                          </td>
                        </tr>
                      ))}

                    </tbody>

                  </table>

                </div>

              </div>

            </div>

          </div>

        </div>

      </div>

    </div>
  );
}

export default Dashboard;
