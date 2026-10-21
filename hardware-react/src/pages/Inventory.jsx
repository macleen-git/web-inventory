import { useState, useEffect } from 'react'
import Sidebar from '../components/Sidebar'

// =========================
// SMART SEARCH FUNCTION
// =========================
function getWordDistance(first, second) {
  const rows = second.length + 1
  const columns = first.length + 1

  const table = Array.from(
    { length: rows },
    () => Array(columns).fill(0)
  )

  for (let i = 0; i < rows; i++) {
    table[i][0] = i
  }

  for (let j = 0; j < columns; j++) {
    table[0][j] = j
  }

  for (let i = 1; i < rows; i++) {
    for (let j = 1; j < columns; j++) {
      const cost =
        second[i - 1] === first[j - 1] ? 0 : 1

      table[i][j] = Math.min(
        table[i - 1][j] + 1,
        table[i][j - 1] + 1,
        table[i - 1][j - 1] + cost
      )
    }
  }

  return table[rows - 1][columns - 1]
}

// =========================
// CHECK PRODUCT STATUS
// =========================
function getProductStatus(stock) {
  if (Number(stock) <= 0) {
    return 'Out of Stock'
  }

  if (Number(stock) <= 5) {
    return 'Low Stock'
  }

  return 'Available'
}

export default function Inventory() {
  const [products, setProducts] = useState([])

  const [product, setProduct] = useState('')
  const [category, setCategory] = useState('')
  const [buy, setBuy] = useState('')
  const [sell, setSell] = useState('')
  const [stock, setStock] = useState('')

  const [editID, setEditID] = useState('')
  const [editProduct, setEditProduct] = useState('')
  const [editCategory, setEditCategory] = useState('')
  const [editBuy, setEditBuy] = useState('')
  const [editSell, setEditSell] = useState('')
  const [editStock, setEditStock] = useState('')

  const [showAddProduct, setShowAddProduct] = useState(false)
  const [isModalOpen, setIsModalOpen] = useState(false)

  // CONFIRMATION MODAL STATES
  const [confirmation, setConfirmation] = useState(null)
  const [isConfirming, setIsConfirming] = useState(false)

  // SEARCH AND FILTER STATES
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('All Status')

  const api_url = 'http://localhost:8080/api/product'

  // =========================
  // GET PRODUCTS
  // =========================
  useEffect(() => {
    fetch(api_url)
      .then((response) => {
        if (!response.ok) {
          throw new Error('Failed to fetch products')
        }

        return response.json()
      })
      .then((data) => {
        setProducts(data)
      })
      .catch((err) => {
        console.log('Fetch error:', err)
      })
  }, [])

  // =========================
  // FILTER AND SMART SEARCH
  // =========================
  const filteredProducts = products.filter((item) => {
    const search = searchTerm.trim().toLowerCase()

    const productName = String(item.product || '').toLowerCase()
    const productCategory = String(item.category || '').toLowerCase()

    const status = getProductStatus(item.stock)

    let matchesSearch = true

    if (search !== '') {
      const searchableText = `${productName} ${productCategory}`

      matchesSearch = searchableText.includes(search)

      if (!matchesSearch) {
        const searchWords = search.split(/\s+/)

        const productWords = searchableText
          .split(/[\s,/-]+/)
          .filter(Boolean)

        matchesSearch = searchWords.every((searchWord) => {
          if (searchWord.length <= 3) {
            return productWords.some((word) =>
              word.includes(searchWord)
            )
          }

          const allowedDistance =
            searchWord.length >= 8 ? 2 : 1

          return productWords.some((word) => {
            if (word.includes(searchWord)) {
              return true
            }

            if (searchWord.includes(word) && word.length >= 4) {
              return true
            }

            if (
              Math.abs(word.length - searchWord.length) >
              allowedDistance
            ) {
              return false
            }

            return (
              getWordDistance(searchWord, word) <= allowedDistance
            )
          })
        })
      }
    }

    const matchesStatus =
      statusFilter === 'All Status' ||
      status === statusFilter

    return matchesSearch && matchesStatus
  })

  // =========================
  // ADD PRODUCT - POST
  // =========================
  async function formAddProduct(event) {
    event.preventDefault()

    try {
      const response = await fetch(api_url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          product,
          category,
          buy,
          sell,
          stock
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || 'Failed to add product')
      }

      setProducts((oldProducts) => [
        ...oldProducts,
        data
      ])

      setProduct('')
      setCategory('')
      setBuy('')
      setSell('')
      setStock('')

      setShowAddProduct(false)
    } catch (err) {
      console.log('Add product error:', err)
      alert(err.message || 'Failed to add product')
    }
  }

  // =========================
  // UPDATE PRODUCT - PUT
  // =========================

  // Show confirmation first.
  // The PUT request runs only after confirmation.
  function handleUpdate(event) {
    event.preventDefault()

    if (!editID) {
      alert('No product selected')
      return
    }

    setConfirmation({
      type: 'update',
      title: 'Save Changes?',
      message:
        'Are you sure you want to save these changes? Please review the updated product details before proceeding.',
      confirmLabel: 'Yes, Save Changes',
      tone: 'save'
    })
  }

  // Perform the actual update after confirmation.
  async function performUpdate() {
    if (!editID) {
      throw new Error('No product selected')
    }

    const response = await fetch(`${api_url}/${editID}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        product: editProduct,
        category: editCategory,
        buy: editBuy,
        sell: editSell,
        stock: editStock
      })
    })

    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.message || 'Failed to update product')
    }

    setProducts((prev) =>
      prev.map((item) =>
        Number(item.id) === Number(editID)
          ? data
          : item
      )
    )

    setIsModalOpen(false)
  }

  // =========================
  // DELETE PRODUCT - DELETE
  // =========================

  // Show confirmation first.
  // The DELETE request runs only after confirmation.
  function handleDelete(id) {
    const item = products.find(
      (product) => Number(product.id) === Number(id)
    )

    setConfirmation({
      type: 'delete',
      id,
      title: 'Delete Product?',
      message: `Are you sure you want to delete "${item?.product || 'this product'}"? This action cannot be undone.`,
      confirmLabel: 'Yes, Delete Product',
      tone: 'delete'
    })
  }

  // Perform the actual deletion after confirmation.
  async function performDelete(id) {
    const response = await fetch(`${api_url}/${id}`, {
      method: 'DELETE'
    })

    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.message || 'Failed to delete product')
    }

    setProducts((prev) =>
      prev.filter(
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
      console.error('Confirmation action error:', error)
      alert(error.message || 'The operation could not be completed.')
    } finally {
      setIsConfirming(false)
    }
  }

  // =========================
  // OPEN EDIT MODAL
  // =========================
  function openEditModal(item) {
    setEditID(item.id)
    setEditProduct(item.product)
    setEditCategory(item.category)
    setEditBuy(item.buy)
    setEditSell(item.sell)
    setEditStock(item.stock)

    setIsModalOpen(true)
  }

  // =========================
  // CLOSE EDIT MODAL
  // =========================
  function closeEditModal() {
    setIsModalOpen(false)

    setEditID('')
    setEditProduct('')
    setEditCategory('')
    setEditBuy('')
    setEditSell('')
    setEditStock('')
  }

  // =========================
  // CLOSE ADD MODAL
  // =========================
  function closeAddModal() {
    setShowAddProduct(false)
  }

  return (
    <div className="app-layout">
      <Sidebar active="/inventory" />

      <div className="app-main bg-dark-subtle min-vh-100">
        <div className="p-4" id="mainContent">
          <h1>
            <b>Inventory</b>
          </h1>

          <p>
            Displays all the products in your store
          </p>

          {/* SEARCH, STATUS FILTER, AND ADD BUTTON */}
          <div className="row g-2 mb-3 align-items-center">
            <div className="col-12 col-md-6">
              <input
                type="text"
                className="form-control"
                placeholder="Search product or category..."
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
              />
            </div>

            <div className="col-6 col-md-3">
              <select
                className="form-select"
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
              >
                <option value="All Status">All Status</option>
                <option value="Available">Available</option>
                <option value="Low Stock">Low Stock</option>
                <option value="Out of Stock">Out of Stock</option>
              </select>
            </div>

            <div className="col-6 col-md-3 text-md-end">
              <button
                type="button"
                className="btn btn-warning"
                onClick={() => setShowAddProduct(true)}
              >
                <b>+ Add Product</b>
              </button>
            </div>
          </div>

          {/* INVENTORY TABLE */}
          <div className="bg-white p-3 rounded shadow-sm">
            <div className="d-flex justify-content-between align-items-center mb-3">
              <span className="text-muted">
                Showing {filteredProducts.length} of {products.length} products
              </span>

              {(searchTerm || statusFilter !== 'All Status') && (
                <button
                  type="button"
                  className="btn btn-sm btn-outline-secondary"
                  onClick={() => {
                    setSearchTerm('')
                    setStatusFilter('All Status')
                  }}
                >
                  Clear Filters
                </button>
              )}
            </div>

            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0">
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>Category</th>
                    <th className="text-end">Buy Price</th>
                    <th className="text-end">Sell Price</th>
                    <th className="text-end">Stock</th>
                    <th>Status</th>
                    <th className="text-center">Action</th>
                  </tr>
                </thead>

                <tbody>
                  {filteredProducts.length > 0 ? (
                    filteredProducts.map((item, index) => {
                      const status = getProductStatus(item.stock)

                      return (
                        <tr key={item.id || index}>
                          <td>{item.product}</td>
                          <td>{item.category}</td>

                          <td className="text-end">
                            ₱{Number(item.buy || 0).toFixed(2)}
                          </td>

                          <td className="text-end">
                            ₱{Number(item.sell || 0).toFixed(2)}
                          </td>

                          <td className="text-end">
                            {item.stock}
                          </td>

                          <td>
                            <span
                              className={
                                status === 'Available'
                                  ? 'badge bg-success'
                                  : status === 'Low Stock'
                                    ? 'badge bg-warning text-dark'
                                    : 'badge bg-secondary'
                              }
                            >
                              {status}
                            </span>
                          </td>

                          <td className="text-center">
                            <button
                              type="button"
                              className="btn btn-outline-primary btn-sm me-2"
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
                          </td>
                        </tr>
                      )
                    })
                  ) : (
                    <tr>
                      <td
                        colSpan="7"
                        className="text-center py-4 text-muted"
                      >
                        {products.length === 0
                          ? 'No products available.'
                          : 'No matching products found.'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* EDIT PRODUCT MODAL */}
          {isModalOpen && (
            <div
              className="modal show d-flex"
              tabIndex="-1"
              role="dialog"
              aria-modal="true"
              style={{
                position: 'fixed',
                inset: 0,
                backgroundColor: 'rgba(0, 0, 0, 0.5)',
                zIndex: 1050,
                overflowY: 'auto'
              }}
              onMouseDown={(event) => {
                if (event.target === event.currentTarget) {
                  closeEditModal()
                }
              }}
            >
              <div
                className="modal-dialog modal-dialog-centered"
                style={{ maxWidth: '500px', width: '100%' }}
              >
                <div className="modal-content">
                  <div className="modal-header">
                    <h5 className="modal-title">
                      <b>Edit Product</b>
                    </h5>

                    <button
                      type="button"
                      className="btn-close"
                      aria-label="Close"
                      onClick={closeEditModal}
                    />
                  </div>

                  <form onSubmit={handleUpdate}>
                    <div className="modal-body">
                      <div className="mb-3">
                        <label htmlFor="editID" className="form-label">
                          ID
                        </label>

                        <input
                          type="text"
                          className="form-control"
                          id="editID"
                          value={editID}
                          readOnly
                        />
                      </div>

                      <div className="mb-3">
                        <label htmlFor="editProduct" className="form-label">
                          Product Name
                        </label>

                        <input
                          type="text"
                          className="form-control"
                          id="editProduct"
                          value={editProduct}
                          onChange={(event) => setEditProduct(event.target.value)}
                          required
                        />
                      </div>

                      <div className="mb-3">
                        <label htmlFor="editCategory" className="form-label">
                          Category
                        </label>

                        <input
                          type="text"
                          className="form-control"
                          id="editCategory"
                          value={editCategory}
                          onChange={(event) => setEditCategory(event.target.value)}
                          required
                        />
                      </div>

                      <div className="mb-3">
                        <label htmlFor="editBuy" className="form-label">
                          Buy Price
                        </label>

                        <input
                          type="number"
                          className="form-control"
                          id="editBuy"
                          min="0"
                          step="0.01"
                          value={editBuy}
                          onChange={(event) => setEditBuy(event.target.value)}
                          required
                        />
                      </div>

                      <div className="mb-3">
                        <label htmlFor="editSell" className="form-label">
                          Sell Price
                        </label>

                        <input
                          type="number"
                          className="form-control"
                          id="editSell"
                          min="0"
                          step="0.01"
                          value={editSell}
                          onChange={(event) => setEditSell(event.target.value)}
                          required
                        />
                      </div>

                      <div className="mb-3">
                        <label htmlFor="editStock" className="form-label">
                          Stock
                        </label>

                        <input
                          type="number"
                          className="form-control"
                          id="editStock"
                          min="0"
                          step="1"
                          value={editStock}
                          onChange={(event) => setEditStock(event.target.value)}
                          required
                        />
                      </div>
                    </div>

                    <div className="modal-footer">
                      <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={closeEditModal}
                      >
                        Cancel
                      </button>

                      <button
                        type="submit"
                        className="btn btn-primary"
                      >
                        Save Changes
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          )}

          {/* ADD PRODUCT MODAL */}
          {showAddProduct && (
            <div
              className="modal show d-flex"
              tabIndex="-1"
              role="dialog"
              aria-modal="true"
              style={{
                position: 'fixed',
                inset: 0,
                backgroundColor: 'rgba(0, 0, 0, 0.5)',
                zIndex: 1050,
                overflowY: 'auto'
              }}
              onMouseDown={(event) => {
                if (event.target === event.currentTarget) {
                  closeAddModal()
                }
              }}
            >
              <div
                className="modal-dialog modal-dialog-centered"
                style={{ maxWidth: '500px', width: '100%' }}
              >
                <div className="modal-content">
                  <div className="modal-header">
                    <h5 className="modal-title">
                      <b>Add Product</b>
                    </h5>

                    <button
                      type="button"
                      className="btn-close"
                      aria-label="Close"
                      onClick={closeAddModal}
                    />
                  </div>

                  <form onSubmit={formAddProduct}>
                    <div className="modal-body">
                      <div className="mb-3">
                        <label htmlFor="product" className="form-label">
                          Product
                        </label>

                        <input
                          type="text"
                          id="product"
                          className="form-control"
                          placeholder="Enter product name"
                          value={product}
                          onChange={(event) => setProduct(event.target.value)}
                          required
                        />
                      </div>

                      <div className="mb-3">
                        <label htmlFor="category" className="form-label">
                          Category
                        </label>

                        <input
                          type="text"
                          id="category"
                          className="form-control"
                          placeholder="Enter category"
                          value={category}
                          onChange={(event) => setCategory(event.target.value)}
                          required
                        />
                      </div>

                      <div className="mb-3">
                        <label htmlFor="buy" className="form-label">
                          Buy Price
                        </label>

                        <input
                          type="number"
                          id="buy"
                          className="form-control"
                          min="0"
                          step="0.01"
                          placeholder="0.00"
                          value={buy}
                          onChange={(event) => setBuy(event.target.value)}
                          required
                        />
                      </div>

                      <div className="mb-3">
                        <label htmlFor="sell" className="form-label">
                          Sell Price
                        </label>

                        <input
                          type="number"
                          id="sell"
                          className="form-control"
                          min="0"
                          step="0.01"
                          placeholder="0.00"
                          value={sell}
                          onChange={(event) => setSell(event.target.value)}
                          required
                        />
                      </div>

                      <div className="mb-3">
                        <label htmlFor="stock" className="form-label">
                          Stock
                        </label>

                        <input
                          type="number"
                          id="stock"
                          className="form-control"
                          min="0"
                          step="1"
                          placeholder="0"
                          value={stock}
                          onChange={(event) => setStock(event.target.value)}
                          required
                        />
                      </div>
                    </div>

                    <div className="modal-footer">
                      <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={closeAddModal}
                      >
                        Cancel
                      </button>

                      <button
                        type="submit"
                        className="btn btn-warning"
                      >
                        <b>Add Product</b>
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          )}

          {/* CUSTOM CONFIRMATION MODAL */}
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
                background: 'rgba(2, 15, 29, 0.78)',
                backdropFilter: 'blur(5px)',
                overflowY: 'auto'
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
                      background: '#ffc107',
                      color: '#08263b',
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
                    onClick={() => setConfirmation(null)}
                    disabled={isConfirming}
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
                    onClick={confirmPendingAction}
                    disabled={isConfirming}
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