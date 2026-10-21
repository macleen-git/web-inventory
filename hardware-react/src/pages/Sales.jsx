
import { useEffect, useState } from 'react'
import Sidebar from '../components/Sidebar'

export default function Sales() {
  const api_url = 'http://localhost:8080/api/sales'

  const [sales, setSales] = useState([])

  // ADD SALE
  const [product, setProduct] = useState('')
  const [quantity, setQuantity] = useState('')
  const [date, setDate] = useState('')
  const [amount, setAmount] = useState('')
  const [note, setNote] = useState('')

  // EDIT SALE
  const [editID, setEditID] = useState('')
  const [editProduct, setEditProduct] = useState('')
  const [editQuantity, setEditQuantity] = useState('')
  const [editDate, setEditDate] = useState('')
  const [editAmount, setEditAmount] = useState('')
  const [editNote, setEditNote] = useState('')

  // MODALS
  const [showAddSale, setShowAddSale] = useState(false)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [confirmation, setConfirmation] = useState(null)
  const [isConfirming, setIsConfirming] = useState(false)

  // SEARCH
  const [search, setSearch] = useState('')

  // CALCULATOR
  const [showCalculator, setShowCalculator] = useState(false)
  const [showHistory, setShowHistory] = useState(false)
  const [display, setDisplay] = useState('0')
  const [firstNumber, setFirstNumber] = useState(null)
  const [operator, setOperator] = useState(null)
  const [waitingForNumber, setWaitingForNumber] = useState(false)
  const [history, setHistory] = useState([])

  // =========================
  // GET SALES
  // =========================
  useEffect(() => {
    async function loadSales() {
      try {
        const response = await fetch(api_url)

        if (!response.ok) {
          throw new Error('Failed to fetch sales')
        }

        const data = await response.json()
        setSales(data)
      } catch (error) {
        console.error('Fetch sales error:', error)
      }
    }

    loadSales()
  }, [])

  // =========================
  // SEARCH
  // =========================
  const filteredSales = sales.filter((item) => {
    const term = search.trim().toLowerCase()

    if (!term) return true

    return [
      item.id,
      item.product,
      item.date,
      item.note,
      item.quantity,
      item.amount
    ].some((value) =>
      String(value ?? '').toLowerCase().includes(term)
    )
  })

  // =========================
  // ADD SALE - POST
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
          amount,
          note
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
        throw new Error(data.message || 'Failed to record sale')
      }

      // Add the returned record when the server provides it.
      if (data.id !== undefined) {
        setSales((previous) => [...previous, data])
      } else {
        const refreshResponse = await fetch(api_url)

        if (refreshResponse.ok) {
          setSales(await refreshResponse.json())
        }
      }

      closeAddModal()
    } catch (error) {
      console.error('Add sale error:', error)
      alert(error.message || 'Failed to record sale')
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
    setEditAmount(item.amount ?? '')
    setEditNote(item.note ?? '')
    setIsModalOpen(true)
  }

  // =========================
  // UPDATE - ASK CONFIRMATION
  // =========================
  function handleUpdate(event) {
    event.preventDefault()

    if (!editID) {
      alert('No sale selected.')
      return
    }

    setConfirmation({
      type: 'update',
      title: 'Save Changes?',
      message:
        'Are you sure you want to save these changes to this sales record? Please review the updated details before proceeding.',
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
        amount: editAmount,
        note: editNote
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
      throw new Error(data.message || 'Failed to update sale')
    }

    if (data.id !== undefined) {
      setSales((previous) =>
        previous.map((item) =>
          Number(item.id) === Number(editID) ? data : item
        )
      )
    } else {
      const refreshResponse = await fetch(api_url)

      if (refreshResponse.ok) {
        setSales(await refreshResponse.json())
      }
    }

    closeEditModal()
  }

  // =========================
  // DELETE - ASK CONFIRMATION
  // =========================
  function handleDelete(id) {
    const item = sales.find(
      (sale) => Number(sale.id) === Number(id)
    )

    setConfirmation({
      type: 'delete',
      id,
      title: 'Delete Sales Record?',
      message:
        `Are you sure you want to delete the sales record for "${item?.product || 'this product'}"? This action cannot be undone.`,
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
      throw new Error(data.message || 'Failed to delete sale')
    }

    setSales((previous) =>
      previous.filter(
        (item) => Number(item.id) !== Number(id)
      )
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
      console.error('Sales operation error:', error)
      alert(error.message || 'The operation could not be completed.')
    } finally {
      setIsConfirming(false)
    }
  }

  // =========================
  // CLOSE ADD MODAL
  // =========================
  function closeAddModal() {
    setShowAddSale(false)
    setProduct('')
    setQuantity('')
    setDate('')
    setAmount('')
    setNote('')
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
    setEditAmount('')
    setEditNote('')
  }

  // =========================
  // CALCULATOR
  // =========================
  function formatNumber(number) {
    if (!Number.isFinite(number)) return 'Error'

    return Number(number.toPrecision(12)).toString()
  }

  function calculateResult(first, second, op) {
    if (op === '+') return first + second
    if (op === '-') return first - second
    if (op === '×') return first * second

    if (op === '÷') {
      if (second === 0) return null
      return first / second
    }

    return second
  }

  function calculatorInput(value) {
    if (value === 'C') {
      setDisplay('0')
      setFirstNumber(null)
      setOperator(null)
      setWaitingForNumber(false)
      return
    }

    if (value === '⌫') {
      if (waitingForNumber || display === 'Error') {
        setDisplay('0')
        setWaitingForNumber(false)
        return
      }

      setDisplay(
        display.length > 1 ? display.slice(0, -1) : '0'
      )
      return
    }

    if (value === '.') {
      if (waitingForNumber || display === 'Error') {
        setDisplay('0.')
        setWaitingForNumber(false)
      } else if (!display.includes('.')) {
        setDisplay(display + '.')
      }

      return
    }

    if (['+', '-', '×', '÷'].includes(value)) {
      const currentNumber = Number(display)

      if (!Number.isFinite(currentNumber)) return

      if (
        operator !== null &&
        !waitingForNumber &&
        firstNumber !== null
      ) {
        const result = calculateResult(
          firstNumber,
          currentNumber,
          operator
        )

        if (result === null) {
          setDisplay('Error')
          setFirstNumber(null)
          setOperator(null)
          setWaitingForNumber(true)
          return
        }

        setDisplay(formatNumber(result))
        setFirstNumber(result)
      } else {
        setFirstNumber(currentNumber)
      }

      setOperator(value)
      setWaitingForNumber(true)
      return
    }

    if (value === '=') {
      if (
        operator === null ||
        firstNumber === null ||
        waitingForNumber
      ) {
        return
      }

      const secondNumber = Number(display)

      const result = calculateResult(
        firstNumber,
        secondNumber,
        operator
      )

      if (result === null) {
        setDisplay('Error')
        setFirstNumber(null)
        setOperator(null)
        setWaitingForNumber(true)
        return
      }

      const answer = formatNumber(result)

      setHistory((previous) => [
        {
          id: Date.now() + Math.random(),
          expression:
            `${formatNumber(firstNumber)} ${operator} ${formatNumber(secondNumber)}`,
          result: answer
        },
        ...previous
      ])

      setDisplay(answer)
      setFirstNumber(null)
      setOperator(null)
      setWaitingForNumber(true)
      return
    }

    if (/^\d$/.test(value)) {
      if (waitingForNumber || display === 'Error') {
        setDisplay(value)
        setWaitingForNumber(false)
      } else {
        setDisplay(display === '0' ? value : display + value)
      }
    }
  }

  function handleCalculatorKey(event) {
    if (event.key === 'Escape') {
      closeCalculator()
      return
    }

    if (showHistory) return

    if (/^\d$/.test(event.key)) {
      calculatorInput(event.key)
    }

    if (event.key === '.') calculatorInput('.')
    if (event.key === '+') calculatorInput('+')
    if (event.key === '-') calculatorInput('-')
    if (event.key === '*') calculatorInput('×')

    if (event.key === '/') {
      event.preventDefault()
      calculatorInput('÷')
    }

    if (event.key === 'Enter' || event.key === '=') {
      event.preventDefault()
      calculatorInput('=')
    }

    if (event.key === 'Backspace') {
      event.preventDefault()
      calculatorInput('⌫')
    }
  }

  function closeCalculator() {
    setShowCalculator(false)
    setShowHistory(false)
  }

  return (
    <div className="app-layout">
      <Sidebar active="/sales" />

      <div className="app-main bg-dark-subtle min-vh-100">
        <div className="p-3 p-md-4" id="mainContent">

          {/* PAGE HEADER */}
          <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3 mb-4">
            <div>
              <h1 className="fw-bold">Sales / Stock Out</h1>
              <p className="mb-0">
                Record and manage products sold to customers.
              </p>
            </div>

            <div className="d-flex flex-wrap gap-2">
              <button
                type="button"
                className="btn btn-outline-dark d-flex align-items-center gap-2"
                onClick={() => {
                  setShowCalculator(true)
                  setShowHistory(false)
                }}
                style={{
                  minHeight: '42px',
                  borderRadius: '10px'
                }}
              >
                <span style={{ fontSize: '20px' }}>🖩</span>
                <b>Calculator</b>
              </button>

              <button
                type="button"
                className="btn btn-warning fw-bold"
                onClick={() => setShowAddSale(true)}
                style={{ minHeight: '42px' }}
              >
                + Add Sale
              </button>
            </div>
          </div>

          {/* SEARCH */}
          <div className="row g-2 mb-3">
            <div className="col-12 col-md-6">
              <input
                type="text"
                className="form-control"
                placeholder="Search product, date, note, or ID..."
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </div>

            <div className="col-12 col-md-6 d-flex align-items-center justify-content-md-end">
              <span className="text-muted">
                Showing {filteredSales.length} of {sales.length} records
              </span>
            </div>
          </div>

          {/* SALES TABLE */}
          <div className="bg-white p-3 rounded shadow-sm">
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Product</th>
                    <th className="text-end">Qty</th>
                    <th className="text-end">Amount</th>
                    <th>Note</th>
                    <th className="text-center">Action</th>
                  </tr>
                </thead>

                <tbody>
                  {filteredSales.length > 0 ? (
                    filteredSales.map((item, index) => (
                      <tr key={item.id ?? index}>
                        <td>{item.date || '-'}</td>
                        <td>{item.product || '-'}</td>

                        <td className="text-end">
                          {item.quantity}
                        </td>

                        <td className="text-end">
                          ₱{Number(item.amount || 0).toFixed(2)}
                        </td>

                        <td>{item.note || '-'}</td>

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
                        colSpan="6"
                        className="text-center py-4 text-muted"
                      >
                        {sales.length === 0
                          ? 'No sales records found.'
                          : 'No matching sales records found.'}
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
          ADD SALE MODAL
      ========================= */}
      {showAddSale && (
        <div
          className="d-flex align-items-center justify-content-center p-3"
          role="dialog"
          aria-modal="true"
          aria-labelledby="add-sale-title"
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
            background: 'rgba(2, 15, 29, 0.72)',
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
              <h5 id="add-sale-title" className="fw-bold mb-0">
                Add Sale
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
                  <label htmlFor="product" className="form-label fw-bold">
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

                <div className="row g-3">
                  <div className="col-12 col-sm-6">
                    <label htmlFor="quantity" className="form-label fw-bold">
                      Quantity Sold
                    </label>
                    <input
                      id="quantity"
                      type="number"
                      className="form-control"
                      min="1"
                      step="1"
                      placeholder="0"
                      value={quantity}
                      onChange={(event) => setQuantity(event.target.value)}
                      required
                    />
                  </div>

                  <div className="col-12 col-sm-6">
                    <label htmlFor="date" className="form-label fw-bold">
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
                </div>

                <div className="my-3">
                  <label htmlFor="amount" className="form-label fw-bold">
                    Amount
                  </label>
                  <input
                    id="amount"
                    type="number"
                    className="form-control"
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                    value={amount}
                    onChange={(event) => setAmount(event.target.value)}
                    required
                  />
                </div>

                <div className="mb-2">
                  <label htmlFor="note" className="form-label fw-bold">
                    Note
                  </label>
                  <input
                    id="note"
                    type="text"
                    className="form-control"
                    placeholder="Customer name / order reference"
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

                <button type="submit" className="btn btn-warning fw-bold">
                  Record Sale
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================
          EDIT SALE MODAL
      ========================= */}
      {isModalOpen && (
        <div
          className="d-flex align-items-center justify-content-center p-3"
          role="dialog"
          aria-modal="true"
          aria-labelledby="edit-sale-title"
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
            background: 'rgba(2, 15, 29, 0.72)',
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
              <h5 id="edit-sale-title" className="fw-bold mb-0">
                Edit Sale
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
                  <label htmlFor="editID" className="form-label fw-bold">
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
                  <label htmlFor="editProduct" className="form-label fw-bold">
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

                <div className="row g-3">
                  <div className="col-12 col-sm-6">
                    <label htmlFor="editQuantity" className="form-label fw-bold">
                      Quantity Sold
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

                  <div className="col-12 col-sm-6">
                    <label htmlFor="editDate" className="form-label fw-bold">
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
                </div>

                <div className="my-3">
                  <label htmlFor="editAmount" className="form-label fw-bold">
                    Amount
                  </label>
                  <input
                    id="editAmount"
                    type="number"
                    className="form-control"
                    min="0"
                    step="0.01"
                    value={editAmount}
                    onChange={(event) => setEditAmount(event.target.value)}
                    required
                  />
                </div>

                <div className="mb-2">
                  <label htmlFor="editNote" className="form-label fw-bold">
                    Note
                  </label>
                  <input
                    id="editNote"
                    type="text"
                    className="form-control"
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

                <button type="submit" className="btn btn-warning fw-bold">
                  Save Changes
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
            background: 'rgba(2, 15, 29, 0.82)',
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
                  color: confirmation.tone === 'delete'
                    ? '#fff'
                    : '#08263b',
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

      {/* =========================
          CALCULATOR MODAL
      ========================= */}
      {showCalculator && (
        <div
          className="d-flex align-items-center justify-content-center p-3"
          role="dialog"
          aria-modal="true"
          aria-label={showHistory ? 'Calculation History' : 'Calculator'}
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              closeCalculator()
            }
          }}
          onKeyDown={handleCalculatorKey}
          tabIndex={-1}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 2000,
            background: 'rgba(0, 0, 0, 0.72)',
            overflowY: 'auto'
          }}
        >
          <div
            className="w-100"
            style={{
              maxWidth: '360px',
              margin: 'auto',
              background: '#17212b',
              color: '#fff',
              borderRadius: '22px',
              border: '1px solid #344454',
              overflow: 'hidden',
              boxShadow: '0 24px 70px rgba(0,0,0,.4)'
            }}
          >
            <div
              className="d-flex justify-content-between align-items-center"
              style={{ padding: '18px 20px 8px' }}
            >
              <h5 className="fw-bold mb-0">
                {showHistory ? 'Calculation History' : 'Calculator'}
              </h5>

              <div className="d-flex gap-2">
                <button
                  type="button"
                  className="btn"
                  title="Calculation History"
                  aria-label="Toggle calculation history"
                  onClick={() => setShowHistory((value) => !value)}
                  style={{
                    color: '#ffc107',
                    fontSize: '23px',
                    border: 'none'
                  }}
                >
                  ◷
                </button>

                <button
                  type="button"
                  className="btn btn-sm btn-outline-light"
                  aria-label="Close calculator"
                  onClick={closeCalculator}
                >
                  ✕
                </button>
              </div>
            </div>

            <div className="p-3">
              {showHistory ? (
                <div>
                  <div className="d-flex justify-content-between align-items-center gap-2 mb-3">
                    <span style={{ color: '#aab8c5' }}>
                      Previous calculations
                    </span>

                    <button
                      type="button"
                      className="btn btn-sm btn-outline-warning"
                      onClick={() => setHistory([])}
                      disabled={history.length === 0}
                    >
                      Clear History
                    </button>
                  </div>

                  <div style={{ maxHeight: '390px', overflowY: 'auto' }}>
                    {history.length > 0 ? (
                      history.map((item) => (
                        <button
                          type="button"
                          key={item.id}
                          className="w-100 text-start mb-2 p-3"
                          onClick={() => {
                            setDisplay(item.result)
                            setFirstNumber(null)
                            setOperator(null)
                            setWaitingForNumber(true)
                            setShowHistory(false)
                          }}
                          style={{
                            background: '#24313e',
                            color: '#fff',
                            border: '1px solid #344454',
                            borderRadius: '12px'
                          }}
                        >
                          <div style={{ color: '#aab8c5', fontSize: '14px' }}>
                            {item.expression}
                          </div>

                          <div
                            className="text-end mt-1"
                            style={{
                              color: '#ffc107',
                              fontSize: '21px',
                              fontWeight: 'bold'
                            }}
                          >
                            = {item.result}
                          </div>
                        </button>
                      ))
                    ) : (
                      <div
                        className="text-center py-5"
                        style={{ color: '#aab8c5' }}
                      >
                        <div style={{ fontSize: '35px' }}>◷</div>
                        <p className="mb-0">
                          No calculation history yet.
                        </p>
                      </div>
                    )}
                  </div>

                  <button
                    type="button"
                    className="btn btn-outline-light w-100 mt-3"
                    onClick={() => setShowHistory(false)}
                  >
                    Back to Calculator
                  </button>
                </div>
              ) : (
                <>
                  <div
                    className="text-end mb-3 p-3"
                    style={{
                      background: '#24313e',
                      borderRadius: '14px',
                      minHeight: '105px',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'end',
                      overflow: 'hidden'
                    }}
                  >
                    {operator && firstNumber !== null && (
                      <div
                        style={{
                          color: '#aab8c5',
                          fontSize: '15px',
                          marginBottom: '5px'
                        }}
                      >
                        {formatNumber(firstNumber)} {operator}
                      </div>
                    )}

                    <div
                      style={{
                        fontSize: 'clamp(24px, 8vw, 36px)',
                        fontWeight: 'bold',
                        overflowWrap: 'anywhere',
                        lineHeight: 1.2
                      }}
                    >
                      {display}
                    </div>
                  </div>

                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
                      gap: '9px'
                    }}
                  >
                    {[
                      'C', '⌫', '÷', '×',
                      '7', '8', '9', '−',
                      '4', '5', '6', '+',
                      '1', '2', '3', '=',
                      '0', '.'
                    ].map((key) => {
                      const isOperator = [
                        'C', '⌫', '÷', '×', '−', '+'
                      ].includes(key)

                      return (
                        <button
                          type="button"
                          key={key}
                          onClick={() =>
                            calculatorInput(key === '−' ? '-' : key)
                          }
                          style={{
                            gridColumn: key === '0' ? 'span 2' : 'span 1',
                            height: 'clamp(44px, 12vw, 58px)',
                            borderRadius: '14px',
                            border: '1px solid #344454',
                            background: key === '='
                              ? '#ffc107'
                              : isOperator
                                ? '#37485a'
                                : '#24313e',
                            color: key === '='
                              ? '#17212b'
                              : isOperator
                                ? '#ffc107'
                                : '#fff',
                            fontSize: '21px',
                            fontWeight: 'bold',
                            cursor: 'pointer'
                          }}
                        >
                          {key}
                        </button>
                      )
                    })}
                  </div>

                  <div
                    className="text-center mt-3"
                    style={{ color: '#aab8c5', fontSize: '12px' }}
                  >
                    Click outside to close
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
