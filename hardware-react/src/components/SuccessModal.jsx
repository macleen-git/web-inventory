import { useEffect } from 'react'

export default function SuccessModal({
  title = 'Operation Completed Successfully!',
  details = [],
  message = 'Your changes have been saved successfully.',
  onClose
}) {
  useEffect(() => {
    function handleKeyDown(event) {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  return (
    <div
      className="hw-success-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="hw-success-title"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <section className="hw-success-modal">
        <header className="hw-success-header">
          <h2>Confirmation</h2>
          <button type="button" className="hw-success-close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </header>

        <div className="hw-success-content">
          <div className="hw-success-check-wrap" aria-hidden="true">
            <div className="hw-success-check">
              <svg viewBox="0 0 48 48" role="presentation">
                <path d="M10 25.5 20 35 39 14" />
              </svg>
            </div>
          </div>

          <h3 id="hw-success-title" className="hw-success-title">{title}</h3>

          {details.length > 0 && (
            <div className="hw-success-details">
              {details.map((detail) => (
                <div className="hw-success-detail" key={detail.label}>
                  <span>{detail.label}</span>
                  <strong>{detail.value}</strong>
                </div>
              ))}
            </div>
          )}

          <p className="hw-success-message">{message}</p>

          <button type="button" className="btn btn-warning fw-bold hw-success-ok" onClick={onClose}>
            <span aria-hidden="true">✓</span> OK
          </button>
        </div>
      </section>
    </div>
  )
}
