
import { useState, useEffect } from 'react'
import Sidebar from '../components/Sidebar'

function Damaged() {
  const api_url = 'https://web-inventory-rfai.onrender.com/api/damaged'

  const [damagedItems, setDamagedItems] = useState([])

  const [product, setProduct] = useState('')
  const [quantity, setQuantity] = useState('')
  const [date, setDate] = useState('')
  const [loss, setLoss] = useState('')
  const [reason, setReason] = useState('Broken during handling')

  const [editID, setEditID] = useState('')
  const [editProduct, setEditProduct] = useState('')
  const [editQuantity, setEditQuantity] = useState('')
  const [editDate, setEditDate] = useState('')
  const [editLoss, setEditLoss] = useState('')
  const [editReason, setEditReason] = useState('Broken during handling')

  const [showAddDamaged, setShowAddDamaged] = useState(false)
  const [isModalOpen, setIsModalOpen] = useState(false)

  // Custom confirmation modal
  const [confirmation, setConfirmation] = useState(null)
  const [isConfirming, setIsConfirming] = useState(false)

  // =========================
  // GET DAMAGED ITEMS
  // =========================
  async function loadDamagedItems() {
    try {
      const response = await fetch(api_url)

      if (!response.ok) {
        throw new Error('Failed to load damaged items.')
      }

      const data = await response.json()
      setDamagedItems(data)
    } catch (error) {
      console.error('Load damaged items error:', error)
    }
  }

  useEffect(() => {
    loadDamagedItems()
  }, [])

  // =========================
  // RESET ADD FORM
  // =========================
  function resetAddForm() {
    setProduct('')
    setQuantity('')
    setDate('')
    setLoss('')
    setReason('Broken during handling')
  }

  // =========================
  // CLOSE ADD MODAL
  // =========================
  function closeAddModal() {
    setShowAddDamaged(false)
    resetAddForm()
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
    setEditLoss('')
    setEditReason('Broken during handling')
  }

  // =========================
  // ADD DAMAGED ITEM - POST
  // =========================
  async function formSubmit(event) {
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
          loss,
          reason
        })
      })

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
        throw new Error(
          data.message || 'Failed to record damaged item.'
        )
      }

      if (data.id !== undefined) {
        setDamagedItems((oldItems) => [...oldItems, data])
      } else {
        await loadDamagedItems()
      }

      closeAddModal()
    } catch (error) {
      console.error('Add damaged item error:', error)
      alert(error.message || 'Failed to record damaged item.')
    }
  }

  // =========================
  // OPEN EDIT MODAL
  // =========================
  function openEditModal(item) {
    setEditID(item.id)
    setEditProduct(item.product ?? '')
    setEditQuantity(item.quantity ?? '')
    setEditDate(item.date ?? '')
    setEditLoss(item.loss ?? '')
    setEditReason(item.reason || 'Broken during handling')

    setIsModalOpen(true)
  }

  // =========================
  // REQUEST UPDATE CONFIRMATION
  // =========================
  function handleUpdate(event) {
    event.preventDefault()

    if (editID === '' || editID === null || editID === undefined) {
      alert('No damaged item has been selected.')
      return
    }

    setConfirmation({
      type: 'update',
      title: 'Save Changes?',
      message:
        'Are you sure you want to save the changes to this damaged item? Please review the information before proceeding.',
      confirmLabel: 'Yes, Save Changes',
      tone: 'save'
    })
  }

  // =========================
  // EXECUTE UPDATE - PUT
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
        loss: editLoss,
        reason: editReason
      })
    })

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
      throw new Error(
        data.message || 'Failed to update damaged item.'
      )
    }

    if (data.id !== undefined) {
      setDamagedItems((oldItems) =>
        oldItems.map((item) =>
          Number(item.id) === Number(editID) ? data : item
        )
      )
    } else {
      await loadDamagedItems()
    }

    setIsModalOpen(false)
    setEditID('')
    setEditProduct('')
    setEditQuantity('')
    setEditDate('')
    setEditLoss('')
    setEditReason('Broken during handling')
  }

  // =========================
  // REQUEST DELETE CONFIRMATION
  // =========================
  function handleDelete(id) {
    const selectedItem = damagedItems.find(
      (item) => Number(item.id) === Number(id)
    )

    setConfirmation({
      type: 'delete',
      id,
      title: 'Delete Damaged Item?',
      message:
        `Are you sure you want to permanently delete the damaged item "${selectedItem?.product || 'this product'}"? This action cannot be undone.`,
      confirmLabel: 'Yes, Delete Item',
      tone: 'delete'
    })
  }

  // =========================
  // EXECUTE DELETE - DELETE
  // =========================
  async function performDelete(id) {
    const response = await fetch(`${api_url}/${id}`, {
      method: 'DELETE'
    })

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
      throw new Error(
        data.message || 'Failed to delete damaged item.'
      )
    }

    setDamagedItems((oldItems) =>
      oldItems.filter(
        (item) => Number(item.id) !== Number(id)
      )
    )
  }

  // =========================
  // CONFIRM ACTION
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
      console.error('Damaged item action error:', error)
      alert(error.message || 'The operation could not be completed.')
    } finally {
      setIsConfirming(false)
    }
  }

  return (
    <div className="app-layout">
      <Sidebar active="/damaged-items" />

      <div className="app-main bg-dark-subtle min-vh-100">
        <div className="p-3 p-md-4" id="mainContent">

          {/* PAGE HEADER */}
          <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3 mb-4">
            <div>
              <h1 className="fw-bold">Damaged Items</h1>
              <p className="mb-0">
                Record products that are damaged, broken, or spoiled.
              </p>
            </div>

            <button
              type="button"
              className="btn btn-danger fw-bold"
              onClick={() => setShowAddDamaged(true)}
              style={{
                minHeight: '42px',
                borderRadius: '10px'
              }}
            >
              + Add Damaged Item
            </button>
          </div>

          {/* DAMAGED ITEMS TABLE */}
          <div className="bg-white p-3 rounded shadow-sm">
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Date</th>
                    <th>Product</th>
                    <th className="text-end">Qty</th>
                    <th className="text-end">Loss</th>
                    <th>Reason</th>
                    <th className="text-center">Action</th>
                  </tr>
                </thead>

                <tbody>
                  {damagedItems.length > 0 ? (
                    damagedItems.map((item, index) => (
                      <tr key={item.id ?? index}>
                        <td>{item.id}</td>
                        <td>{item.date}</td>
                        <td>{item.product}</td>
                        <td className="text-end">{item.quantity}</td>
                        <td className="text-end">
                          ₱{Number(item.loss || 0).toFixed(2)}
                        </td>
                        <td>{item.reason}</td>

                        <td>
                          <div className="d-flex flex-wrap justify-content-center gap-2">
                            <button
                              type="button"
                              className="btn btn-sm btn-outline-primary"
                              onClick={() => openEditModal(item)}
                            >
                              Edit
                            </button>

                            <button
                              type="button"
                              className="btn btn-sm btn-outline-danger"
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
                        colSpan="7"
                        className="text-center py-4 text-muted"
                      >
                        No damaged items found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* =========================
          ADD DAMAGED ITEM MODAL
      ========================= */}
      {showAddDamaged && (
        <div
          className="d-flex align-items-center justify-content-center p-3"
          role="dialog"
          aria-modal="true"
          aria-labelledby="add-damaged-title"
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
            background: 'rgba(2, 15, 29, 0.75)',
            backdropFilter: 'blur(4px)'
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
              className="d-flex justify-content-between align-items-center px-4 py-3"
              style={{
                background: '#0b3048',
                color: '#fff',
                borderBottom: '3px solid #dc3545'
              }}
            >
              <h5 id="add-damaged-title" className="fw-bold mb-0">
                Add Damaged Item
              </h5>

              <button
                type="button"
                className="btn-close btn-close-white"
                aria-label="Close"
                onClick={closeAddModal}
              />
            </div>

            <form onSubmit={formSubmit}>
              <div className="p-3 p-md-4">
                <div className="mb-3">
                  <label className="form-label fw-bold">Product</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Enter product name"
                    value={product}
                    onChange={(event) => setProduct(event.target.value)}
                    required
                  />
                </div>

                <div className="row g-3">
                  <div className="col-12 col-sm-6">
                    <label className="form-label fw-bold">Quantity</label>
                    <input
                      type="number"
                      className="form-control"
                      placeholder="0"
                      min="1"
                      step="1"
                      value={quantity}
                      onChange={(event) => setQuantity(event.target.value)}
                      required
                    />
                  </div>

                  <div className="col-12 col-sm-6">
                    <label className="form-label fw-bold">Date</label>
                    <input
                      type="date"
                      className="form-control"
                      value={date}
                      onChange={(event) => setDate(event.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="my-3">
                  <label className="form-label fw-bold">Loss (₱)</label>
                  <input
                    type="number"
                    className="form-control"
                    placeholder="0.00"
                    min="0"
                    step="0.01"
                    value={loss}
                    onChange={(event) => setLoss(event.target.value)}
                    required
                  />
                </div>

                <div className="mb-2">
                  <label className="form-label fw-bold">Reason</label>
                  <select
                    className="form-select"
                    value={reason}
                    onChange={(event) => setReason(event.target.value)}
                  >
                    <option>Broken during handling</option>
                    <option>Water damage</option>
                    <option>Expired / spoiled</option>
                    <option>Manufacturing defect</option>
                    <option>Other</option>
                  </select>
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

                <button type="submit" className="btn btn-danger fw-bold">
                  Record Damaged Item
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================
          EDIT DAMAGED ITEM MODAL
      ========================= */}
      {isModalOpen && (
        <div
          className="d-flex align-items-center justify-content-center p-3"
          role="dialog"
          aria-modal="true"
          aria-labelledby="edit-damaged-title"
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
            background: 'rgba(2, 15, 29, 0.75)',
            backdropFilter: 'blur(4px)'
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
              className="d-flex justify-content-between align-items-center px-4 py-3"
              style={{
                background: '#0b3048',
                color: '#fff',
                borderBottom: '3px solid #ffc107'
              }}
            >
              <h5 id="edit-damaged-title" className="fw-bold mb-0">
                Edit Damaged Item
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
                  <label className="form-label fw-bold">Record ID</label>
                  <input
                    type="text"
                    className="form-control"
                    value={editID}
                    readOnly
                  />
                </div>

                <div className="mb-3">
                  <label className="form-label fw-bold">Product</label>
                  <input
                    type="text"
                    className="form-control"
                    value={editProduct}
                    onChange={(event) => setEditProduct(event.target.value)}
                    required
                  />
                </div>

                <div className="row g-3">
                  <div className="col-12 col-sm-6">
                    <label className="form-label fw-bold">Quantity</label>
                    <input
                      type="number"
                      className="form-control"
                      min="1"
                      step="1"
                      value={editQuantity}
                      onChange={(event) => setEditQuantity(event.target.value)}
                      required
                    />
                  </div>

                  <div className="col-12 col-sm-6">
                    <label className="form-label fw-bold">Date</label>
                    <input
                      type="date"
                      className="form-control"
                      value={editDate}
                      onChange={(event) => setEditDate(event.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="my-3">
                  <label className="form-label fw-bold">Loss (₱)</label>
                  <input
                    type="number"
                    className="form-control"
                    min="0"
                    step="0.01"
                    value={editLoss}
                    onChange={(event) => setEditLoss(event.target.value)}
                    required
                  />
                </div>

                <div className="mb-2">
                  <label className="form-label fw-bold">Reason</label>
                  <select
                    className="form-select"
                    value={editReason}
                    onChange={(event) => setEditReason(event.target.value)}
                  >
                    <option>Broken during handling</option>
                    <option>Water damage</option>
                    <option>Expired / spoiled</option>
                    <option>Manufacturing defect</option>
                    <option>Other</option>
                  </select>
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

                <button type="submit" className="btn btn-warning fw-bold">
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================
          CONFIRMATION MODAL
      ========================= */}
      {confirmation && (
        <div
          className="d-flex align-items-center justify-content-center p-3"
          role="alertdialog"
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
            zIndex: 3000,
            overflowY: 'auto',
            background: 'rgba(2, 15, 29, 0.84)',
            backdropFilter: 'blur(5px)'
          }}
        >
          <div
            className="w-100"
            style={{
              maxWidth: '430px',
              borderRadius: '18px',
              overflow: 'hidden',
              color: '#f8fafc',
              background: 'linear-gradient(145deg, #0b3048, #08263b)',
              border: '1px solid rgba(255,255,255,.12)',
              boxShadow: '0 24px 70px rgba(0,0,0,.4)'
            }}
          >
            <div className="text-center px-4 pt-4 pb-3">
              <div
                className="d-inline-flex align-items-center justify-content-center mb-3"
                style={{
                  width: '66px',
                  height: '66px',
                  borderRadius: '50%',
                  background: confirmation.tone === 'delete'
                    ? 'rgba(220,53,69,.18)'
                    : 'rgba(255,193,7,.16)',
                  border: `2px solid ${
                    confirmation.tone === 'delete'
                      ? '#dc3545'
                      : '#ffc107'
                  }`,
                  color: confirmation.tone === 'delete'
                    ? '#ff6575'
                    : '#ffc107',
                  fontSize: '32px',
                  fontWeight: 800
                }}
                aria-hidden="true"
              >
                {confirmation.tone === 'delete' ? '!' : '?'}
              </div>

              <h4 id="confirmation-title" className="fw-bold mb-2">
                {confirmation.title}
              </h4>

              <p
                className="mb-0"
                style={{
                  color: '#d5e2ed',
                  lineHeight: 1.65
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
  )
}

export default Damaged
