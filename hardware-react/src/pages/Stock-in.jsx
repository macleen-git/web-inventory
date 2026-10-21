
import { useState, useEffect } from 'react'
import Sidebar from '../components/Sidebar'

export default function StockIn() {
  const [stockIns, setStockIns] = useState([])

  // ADD STOCK FORM
  const [product, setProduct] = useState('')
  const [quantity, setQuantity] = useState('')
  const [date, setDate] = useState('')
  const [note, setNote] = useState('')

  // EDIT STOCK FORM
  const [editID, setEditID] = useState('')
  const [editProduct, setEditProduct] = useState('')
  const [editQuantity, setEditQuantity] = useState('')
  const [editDate, setEditDate] = useState('')
  const [editNote, setEditNote] = useState('')

  // SEARCH AND FILTER
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('All Stock In')

  // FORM MODALS
  const [showAddStock, setShowAddStock] = useState(false)
  const [isModalOpen, setIsModalOpen] = useState(false)

  // CONFIRMATION MODAL
  const [confirmation, setConfirmation] = useState(null)
  const [isConfirming, setIsConfirming] = useState(false)

  const api_url = 'https://web-inventory-rfai.onrender.com/api/stock-in'

  // =========================
  // GET STOCK-IN RECORDS
  // =========================
  async function loadStockIns() {
    const response = await fetch(api_url)

    if (!response.ok) {
      throw new Error('Failed to fetch stock-in records')
    }

    const data = await response.json()
    setStockIns(data)
  }

  useEffect(() => {
    loadStockIns().catch((error) => {
      console.error('Fetch error:', error)
    })
  }, [])

  // =========================
  // SEARCH AND FILTER
  // =========================
  const filteredStockIns = stockIns
    .filter((item) => {
      const searchText = search.toLowerCase().trim()

      return (
        String(item.id ?? '').toLowerCase().includes(searchText) ||
        String(item.product ?? '').toLowerCase().includes(searchText) ||
        String(item.note ?? '').toLowerCase().includes(searchText) ||
        String(item.date ?? '').toLowerCase().includes(searchText)
      )
    })
    .sort((a, b) => {
      const dateA = new Date(`${a.date}T00:00:00`).getTime()
      const dateB = new Date(`${b.date}T00:00:00`).getTime()

      if (status === 'Older') {
        return dateA - dateB
      }

      return dateB - dateA
    })
    .filter((item, index, array) => {
      if (status === 'All Stock In') {
        return true
      }

      const validDates = array
        .map((record) =>
          new Date(`${record.date}T00:00:00`).getTime()
        )
        .filter((value) => !Number.isNaN(value))

      if (validDates.length === 0) {
        return false
      }

      const latestDate = Math.max(...validDates)
      const itemDate = new Date(`${item.date}T00:00:00`).getTime()

      if (Number.isNaN(itemDate)) {
        return false
      }

      if (status === 'Recent') {
        return itemDate === latestDate
      }

      if (status === 'Older') {
        return itemDate < latestDate
      }

      return true
    })

  // =========================
  // ADD STOCK - POST
  // =========================
  async function formAddStock(event) {
    event.preventDefault()

    try {
      const response = await fetch(api_url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          product,
          quantity,
          date,
          note
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || 'Failed to add stock-in record')
      }

      setStockIns((previous) => [...previous, data])

      setProduct('')
      setQuantity('')
      setDate('')
      setNote('')
      setShowAddStock(false)
    } catch (error) {
      console.error('Add stock error:', error)
      alert(error.message || 'Failed to add stock-in record')
    }
  }

  // =========================
  // OPEN EDIT MODAL
  // =========================
  function openEditModal(item) {
    setEditID(item.id)
    setEditProduct(item.product || '')
    setEditQuantity(item.quantity ?? '')
    setEditDate(item.date || '')
    setEditNote(item.note || '')
    setIsModalOpen(true)
  }

  // =========================
  // CLOSE EDIT MODAL
  // =========================
  function closeEditModal() {
    if (isConfirming) return

    setIsModalOpen(false)
    setEditID('')
    setEditProduct('')
    setEditQuantity('')
    setEditDate('')
    setEditNote('')
  }

  // =========================
  // CLOSE ADD MODAL
  // =========================
  function closeAddModal() {
    setShowAddStock(false)
    setProduct('')
    setQuantity('')
    setDate('')
    setNote('')
  }

  // =========================
  // UPDATE - REQUEST CONFIRMATION
  // =========================
  function handleUpdate(event) {
    event.preventDefault()

    if (!editID) {
      alert('No stock-in record selected.')
      return
    }

    setConfirmation({
      type: 'update',
      title: 'Save Changes?',
      message:
        'Are you sure you want to save these changes to this stock-in record? Please review the updated details before proceeding.',
      confirmLabel: 'Yes, Save Changes',
      tone: 'save'
    })
  }

  // =========================
  // UPDATE - PUT
  // =========================
  async function performUpdate() {
    const response = await fetch(`${api_url}/${editID}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        product: editProduct,
        quantity: editQuantity,
        date: editDate,
        note: editNote
      })
    })

    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.message || 'Failed to update stock-in record')
    }

    setStockIns((previous) =>
      previous.map((item) =>
        Number(item.id) === Number(editID) ? data : item
      )
    )

    setIsModalOpen(false)
    setEditID('')
    setEditProduct('')
    setEditQuantity('')
    setEditDate('')
    setEditNote('')
  }

  // =========================
  // DELETE - REQUEST CONFIRMATION
  // =========================
  function handleDelete(id) {
    const item = stockIns.find(
      (record) => Number(record.id) === Number(id)
    )

    setConfirmation({
      type: 'delete',
      id,
      title: 'Delete Stock-In Record?',
      message: `Are you sure you want to delete the stock-in record for "${item?.product || 'this product'}" dated ${item?.date || 'N/A'}? This action cannot be undone.`,
      confirmLabel: 'Yes, Delete Record',
      tone: 'delete'
    })
  }

  // =========================
  // DELETE - DELETE REQUEST
  // =========================
  async function performDelete(id) {
    const response = await fetch(`${api_url}/${id}`, {
      method: 'DELETE'
    })

    // Some APIs return JSON; others return an empty response.
    const responseText = await response.text()
    let data = {}

    if (responseText) {
      try {
        data = JSON.parse(responseText)
      } catch {
        data = { message: responseText }
      }
    }

    if (!response.ok) {
      throw new Error(data.message || 'Failed to delete stock-in record')
    }

    setStockIns((previous) =>
      previous.filter((item) => Number(item.id) !== Number(id))
    )
  }

  // =========================
  // CONFIRM PENDING ACTION
  // =========================
  async function confirmPendingAction() {
    if (!confirmation || isConfirming) return

    setIsConfirming(true)

    try {
      if (confirmation.type === 'update') {
        await performUpdate()
      } else if (confirmation.type === 'delete') {
        await performDelete(confirmation.id)
      }

      setConfirmation(null)
    } catch (error) {
      console.error('Stock-in operation error:', error)
      alert(error.message || 'The operation could not be completed.')
    } finally {
      setIsConfirming(false)
    }
  }

  return (
    <div className="app-layout">
      <Sidebar active="/stock-in" />

      <div className="app-main bg-dark-subtle min-vh-100">
        <div className="p-3 p-md-4" id="mainContent">
          <h1>
            <b>Stock In</b>
          </h1>

          <p>Record and manage new stock arriving from suppliers.</p>

          {/* SEARCH, FILTER, ADD */}
          <div className="row g-2 mb-3 align-items-center">
            <div className="col-12 col-md-6">
              <input
                type="text"
                className="form-control"
                placeholder="Search product, note, ID, or date..."
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </div>

            <div className="col-6 col-md-3">
              <select
                className="form-select"
                value={status}
                onChange={(event) => setStatus(event.target.value)}
              >
                <option value="All Stock In">All Stock In</option>
                <option value="Recent">Recent</option>
                <option value="Older">Older</option>
              </select>
            </div>

            <div className="col-6 col-md-3 text-md-end">
              <button
                type="button"
                className="btn btn-warning w-100 w-md-auto"
                onClick={() => setShowAddStock(true)}
              >
                <b>+ Add Stock</b>
              </button>
            </div>
          </div>

          {/* STOCK-IN TABLE */}
          <div className="bg-white p-3 rounded shadow-sm">
            <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
              <h5 className="mb-0">
                <b>Stock In Records</b>
              </h5>

              <span className="badge bg-secondary">
                {filteredStockIns.length} Records
              </span>
            </div>

            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Product</th>
                    <th className="text-end">Quantity</th>
                    <th>Note</th>
                    <th>Action</th>
                  </tr>
                </thead>

                <tbody>
                  {filteredStockIns.length > 0 ? (
                    filteredStockIns.map((item, index) => (
                      <tr key={item.id ?? index}>
                        <td>{item.date || '-'}</td>
                        <td>{item.product || '-'}</td>
                        <td className="text-end">+{item.quantity}</td>
                        <td>{item.note || '-'}</td>

                        <td>
                          <div className="d-flex flex-wrap gap-2">
                            <button
                              type="button"
                              className="btn btn-outline-primary btn-sm"
                              onClick={() => openEditModal(item)}
                            >
                              Edit
                            </button>

                            <button
                              type="button"
                              className="btn btn-outline-danger btn-sm"
                              onClick={() => handleDelete(item.id)}
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td
                        colSpan="5"
                        className="text-center py-4 text-muted"
                      >
                        {search || status !== 'All Stock In'
                          ? 'No matching stock-in records found.'
                          : 'No stock-in records found.'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* =========================
              EDIT STOCK-IN MODAL
          ========================= */}
          {isModalOpen && (
            <div
              className="d-flex align-items-center justify-content-center p-3"
              role="dialog"
              aria-modal="true"
              aria-labelledby="edit-stock-title"
              onMouseDown={(event) => {
                if (event.target === event.currentTarget) {
                  closeEditModal()
                }
              }}
              style={{
                position: 'fixed',
                inset: 0,
                zIndex: 1050,
                overflowY: 'auto',
                background: 'rgba(2, 15, 29, 0.65)',
                backdropFilter: 'blur(3px)'
              }}
            >
              <div
                className="w-100"
                style={{
                  maxWidth: '500px',
                  borderRadius: '16px',
                  overflow: 'hidden',
                  background: '#fff',
                  boxShadow: '0 20px 60px rgba(0,0,0,.3)'
                }}
              >
                <div
                  className="modal-header px-4 py-3"
                  style={{
                    background: '#0b3048',
                    color: '#fff',
                    borderBottom: '3px solid #ffc107'
                  }}
                >
                  <h5 id="edit-stock-title" className="modal-title fw-bold">
                    Edit Stock In
                  </h5>

                  <button
                    type="button"
                    className="btn-close btn-close-white"
                    aria-label="Close"
                    onClick={closeEditModal}
                  />
                </div>

                <form onSubmit={handleUpdate}>
                  <div className="p-3 p-md-4">
                    <div className="mb-3">
                      <label htmlFor="editID" className="form-label">
                        Record ID
                      </label>
                      <input
                        id="editID"
                        type="text"
                        className="form-control"
                        value={editID}
                        readOnly
                      />
                    </div>

                    <div className="mb-3">
                      <label htmlFor="editProduct" className="form-label">
                        Product
                      </label>
                      <input
                        id="editProduct"
                        type="text"
                        className="form-control"
                        value={editProduct}
                        onChange={(event) => setEditProduct(event.target.value)}
                        required
                      />
                    </div>

                    <div className="mb-3">
                      <label htmlFor="editQuantity" className="form-label">
                        Quantity
                      </label>
                      <input
                        id="editQuantity"
                        type="number"
                        className="form-control"
                        min="1"
                        step="1"
                        value={editQuantity}
                        onChange={(event) => setEditQuantity(event.target.value)}
                        required
                      />
                    </div>

                    <div className="mb-3">
                      <label htmlFor="editDate" className="form-label">
                        Date
                      </label>
                      <input
                        id="editDate"
                        type="date"
                        className="form-control"
                        value={editDate}
                        onChange={(event) => setEditDate(event.target.value)}
                        required
                      />
                    </div>

                    <div className="mb-3">
                      <label htmlFor="editNote" className="form-label">
                        Note
                      </label>
                      <input
                        id="editNote"
                        type="text"
                        className="form-control"
                        placeholder="Supplier name / PO number"
                        value={editNote}
                        onChange={(event) => setEditNote(event.target.value)}
                      />
                    </div>
                  </div>

                  <div className="d-flex flex-column flex-sm-row justify-content-end gap-2 px-3 px-md-4 pb-4">
                    <button
                      type="button"
                      className="btn btn-outline-secondary"
                      onClick={closeEditModal}
                    >
                      Cancel
                    </button>

                    <button
                      type="submit"
                      className="btn btn-warning fw-bold"
                    >
                      Save Changes
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* =========================
              ADD STOCK-IN MODAL
          ========================= */}
          {showAddStock && (
            <div
              className="d-flex align-items-center justify-content-center p-3"
              role="dialog"
              aria-modal="true"
              aria-labelledby="add-stock-title"
              onMouseDown={(event) => {
                if (event.target === event.currentTarget) {
                  closeAddModal()
                }
              }}
              style={{
                position: 'fixed',
                inset: 0,
                zIndex: 1050,
                overflowY: 'auto',
                background: 'rgba(2, 15, 29, 0.65)',
                backdropFilter: 'blur(3px)'
              }}
            >
              <div
                className="w-100"
                style={{
                  maxWidth: '500px',
                  borderRadius: '16px',
                  overflow: 'hidden',
                  background: '#fff',
                  boxShadow: '0 20px 60px rgba(0,0,0,.3)'
                }}
              >
                <div
                  className="modal-header px-4 py-3"
                  style={{
                    background: '#0b3048',
                    color: '#fff',
                    borderBottom: '3px solid #ffc107'
                  }}
                >
                  <h5 id="add-stock-title" className="modal-title fw-bold">
                    Add Stock
                  </h5>

                  <button
                    type="button"
                    className="btn-close btn-close-white"
                    aria-label="Close"
                    onClick={closeAddModal}
                  />
                </div>

                <form onSubmit={formAddStock}>
                  <div className="p-3 p-md-4">
                    <div className="mb-3">
                      <label htmlFor="product" className="form-label">
                        Product
                      </label>
                      <input
                        id="product"
                        type="text"
                        className="form-control"
                        placeholder="Enter product name"
                        value={product}
                        onChange={(event) => setProduct(event.target.value)}
                        required
                      />
                    </div>

                    <div className="mb-3">
                      <label htmlFor="quantity" className="form-label">
                        Quantity
                      </label>
                      <input
                        id="quantity"
                        type="number"
                        className="form-control"
                        placeholder="Enter quantity"
                        min="1"
                        step="1"
                        value={quantity}
                        onChange={(event) => setQuantity(event.target.value)}
                        required
                      />
                    </div>

                    <div className="mb-3">
                      <label htmlFor="date" className="form-label">
                        Date
                      </label>
                      <input
                        id="date"
                        type="date"
                        className="form-control"
                        value={date}
                        onChange={(event) => setDate(event.target.value)}
                        required
                      />
                    </div>

                    <div className="mb-3">
                      <label htmlFor="note" className="form-label">
                        Note
                      </label>
                      <input
                        id="note"
                        type="text"
                        className="form-control"
                        placeholder="Supplier name / PO number"
                        value={note}
                        onChange={(event) => setNote(event.target.value)}
                      />
                    </div>
                  </div>

                  <div className="d-flex flex-column flex-sm-row justify-content-end gap-2 px-3 px-md-4 pb-4">
                    <button
                      type="button"
                      className="btn btn-outline-secondary"
                      onClick={closeAddModal}
                    >
                      Cancel
                    </button>

                    <button
                      type="submit"
                      className="btn btn-warning fw-bold"
                    >
                      Record Stock In
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* =========================
              CUSTOM CONFIRMATION MODAL
          ========================= */}
          {confirmation && (
            <div
              className="d-flex align-items-center justify-content-center p-3"
              role="dialog"
              aria-modal="true"
              aria-labelledby="confirmation-title"
              onMouseDown={(event) => {
                if (
                  event.target === event.currentTarget &&
                  !isConfirming
                ) {
                  setConfirmation(null)
                }
              }}
              style={{
                position: 'fixed',
                inset: 0,
                zIndex: 2000,
                overflowY: 'auto',
                background: 'rgba(2, 15, 29, 0.8)',
                backdropFilter: 'blur(5px)'
              }}
            >
              <div
                className="w-100 shadow-lg"
                style={{
                  maxWidth: '430px',
                  borderRadius: '18px',
                  overflow: 'hidden',
                  color: '#f8fafc',
                  background: 'linear-gradient(145deg, #0b3048, #08263b)',
                  border: '1px solid rgba(255, 193, 7, 0.4)',
                  boxShadow: '0 24px 70px rgba(0,0,0,.4)'
                }}
              >
                <div className="text-center px-4 pt-4 pb-3">
                  <div
                    className="d-inline-flex align-items-center justify-content-center mb-3"
                    style={{
                      width: '64px',
                      height: '64px',
                      borderRadius: '50%',
                      background: confirmation.tone === 'delete'
                        ? '#dc3545'
                        : '#ffc107',
                      color: '#fff',
                      fontSize: '30px',
                      fontWeight: 800
                    }}
                    aria-hidden="true"
                  >
                    {confirmation.tone === 'delete' ? '!' : '?'}
                  </div>

                  <h4
                    id="confirmation-title"
                    className="fw-bold mb-2"
                  >
                    {confirmation.title}
                  </h4>

                  <p
                    className="mb-0"
                    style={{
                      color: '#d5e2ed',
                      lineHeight: 1.6
                    }}
                  >
                    {confirmation.message}
                  </p>
                </div>

                <div className="d-flex flex-column flex-sm-row gap-2 p-3 p-sm-4 pt-2">
                  <button
                    type="button"
                    className="btn btn-outline-light flex-fill"
                    disabled={isConfirming}
                    onClick={() => setConfirmation(null)}
                    style={{
                      minHeight: '44px',
                      borderRadius: '10px'
                    }}
                  >
                    Cancel
                  </button>

                  <button
                    type="button"
                    className={`btn flex-fill fw-bold ${
                      confirmation.tone === 'delete'
                        ? 'btn-danger'
                        : 'btn-warning'
                    }`}
                    disabled={isConfirming}
                    onClick={confirmPendingAction}
                    style={{
                      minHeight: '44px',
                      borderRadius: '10px'
                    }}
                  >
                    {isConfirming
                      ? 'Please wait...'
                      : confirmation.confirmLabel}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
