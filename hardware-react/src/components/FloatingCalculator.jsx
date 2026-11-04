import { useEffect, useRef, useState } from 'react'

const KEYS = [
  ['C', 'clear'], ['⌫', 'back'], ['%', 'percent'], ['÷', '/'],
  ['7', '7'], ['8', '8'], ['9', '9'], ['×', '*'],
  ['4', '4'], ['5', '5'], ['6', '6'], ['−', '-'],
  ['1', '1'], ['2', '2'], ['3', '3'], ['+', '+'],
  ['±', 'sign'], ['0', '0'], ['.', '.'], ['=', 'equals'],
]

function calculate(a, b, operator) {
  if (operator === '+') return a + b
  if (operator === '-') return a - b
  if (operator === '*') return a * b
  if (operator === '/') return b === 0 ? NaN : a / b
  return b
}

export default function FloatingCalculator() {
  const [open, setOpen] = useState(false)
  const [display, setDisplay] = useState('0')
  const [stored, setStored] = useState(null)
  const [operator, setOperator] = useState(null)
  const [replace, setReplace] = useState(false)
  const [position, setPosition] = useState({ right: 24, bottom: 24 })
  const drag = useRef(null)
  const panelRef = useRef(null)

  const format = (value) => {
    if (!Number.isFinite(value)) return 'Error'
    const rounded = Number.parseFloat(value.toPrecision(11))
    return String(rounded).slice(0, 16)
  }

  const press = (key) => {
    if (key === 'clear') {
      setDisplay('0'); setStored(null); setOperator(null); setReplace(false); return
    }
    if (key === 'back') {
      if (replace || display === 'Error') { setDisplay('0'); setReplace(false); return }
      setDisplay(value => value.length <= 1 || (value.length === 2 && value.startsWith('-')) ? '0' : value.slice(0, -1))
      return
    }
    if (key === 'sign') {
      if (display !== '0' && display !== 'Error') setDisplay(value => value.startsWith('-') ? value.slice(1) : `-${value}`)
      return
    }
    if (key === 'percent') {
      if (display !== 'Error') setDisplay(value => format(Number(value) / 100))
      setReplace(true); return
    }
    if (key === '.') {
      if (replace || display === 'Error') { setDisplay('0.'); setReplace(false) }
      else if (!display.includes('.')) setDisplay(value => `${value}.`)
      return
    }
    if (['+', '-', '*', '/'].includes(key)) {
      if (display === 'Error') return
      const current = Number(display)
      if (operator && stored !== null && !replace) {
        const result = calculate(stored, current, operator)
        setDisplay(format(result)); setStored(result)
      } else setStored(current)
      setOperator(key); setReplace(true); return
    }
    if (key === 'equals') {
      if (operator && stored !== null && display !== 'Error') {
        const result = calculate(stored, Number(display), operator)
        setDisplay(format(result)); setStored(null); setOperator(null); setReplace(true)
      }
      return
    }
    if (/^\d$/.test(key)) {
      setDisplay(value => replace || value === 'Error' ? key : value === '0' ? key : value.length >= 16 ? value : value + key)
      setReplace(false)
    }
  }

  useEffect(() => {
    const onKey = (event) => {
      if (!open || /INPUT|TEXTAREA|SELECT/.test(event.target?.tagName)) return
      if (/^\d$/.test(event.key)) { event.preventDefault(); press(event.key) }
      else if (event.key === '.') { event.preventDefault(); press('.') }
      else if (['+', '-', '*', '/'].includes(event.key)) { event.preventDefault(); press(event.key) }
      else if (event.key === 'Enter' || event.key === '=') { event.preventDefault(); press('equals') }
      else if (event.key === 'Backspace') { event.preventDefault(); press('back') }
      else if (event.key === 'Escape') setOpen(false)
      else if (event.key === '%') press('percent')
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, display, stored, operator, replace])

  const startDrag = (event) => {
    if (event.target.closest('button')) return
    const rect = panelRef.current?.getBoundingClientRect()
    if (!rect) return
    drag.current = { x: event.clientX, y: event.clientY, left: rect.left, top: rect.top }
    event.currentTarget.setPointerCapture?.(event.pointerId)
  }
  const moveDrag = (event) => {
    if (!drag.current) return
    const left = Math.max(8, Math.min(window.innerWidth - 230, drag.current.left + event.clientX - drag.current.x))
    const top = Math.max(8, Math.min(window.innerHeight - 340, drag.current.top + event.clientY - drag.current.y))
    setPosition({ left, top })
  }
  const stopDrag = () => { drag.current = null }

  return (
    <div className="floating-calculator-root">
      {!open ? (
        <button className="floating-calculator-launcher" type="button" aria-label="Open calculator" title="Calculator" onClick={() => setOpen(true)}>
          <i className="bi bi-calculator-fill" aria-hidden="true" />
        </button>
      ) : (
        <section
          ref={panelRef}
          className="floating-calculator-panel"
          style={position.left !== undefined ? { left: position.left, top: position.top } : { right: position.right, bottom: position.bottom }}
          aria-label="Floating calculator"
        >
          <header className="floating-calculator-header" onPointerDown={startDrag} onPointerMove={moveDrag} onPointerUp={stopDrag} onPointerCancel={stopDrag}>
            <span><i className="bi bi-calculator-fill me-2" />Calculator</span>
            <div className="d-flex gap-1">
              <button type="button" aria-label="Minimize calculator" title="Minimize" onClick={() => setOpen(false)}><i className="bi bi-dash-lg" /></button>
              <button type="button" aria-label="Close calculator" title="Close" onClick={() => { setOpen(false); setDisplay('0'); setStored(null); setOperator(null); setReplace(false) }}><i className="bi bi-x-lg" /></button>
            </div>
          </header>
          <div className="floating-calculator-display" aria-live="polite">{display}</div>
          <div className="floating-calculator-keys">
            {KEYS.map(([label, key]) => (
              <button key={key} type="button" className={['clear','back','percent','sign'].includes(key) ? 'utility' : ['+','-','*','/','equals'].includes(key) ? 'operator' : ''} onClick={() => press(key)}>{label}</button>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
