import { useEffect, useRef, useState } from 'react'

const KEYS = [
  ['AC', 'clear'], ['⌫', 'back'], ['%', 'percent'], ['÷', '/'],
  ['7', '7'], ['8', '8'], ['9', '9'], ['×', '*'],
  ['4', '4'], ['5', '5'], ['6', '6'], ['−', '-'],
  ['1', '1'], ['2', '2'], ['3', '3'], ['+', '+'],
  ['±', 'sign'], ['0', '0'], ['.', '.'], ['=', 'equals'],
]

const OPERATOR_LABELS = { '+': '+', '-': '−', '*': '×', '/': '÷' }

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
  const [expression, setExpression] = useState('')
  const [stored, setStored] = useState(null)
  const [operator, setOperator] = useState(null)
  const [replace, setReplace] = useState(false)
  const [history, setHistory] = useState([])
  const [position, setPosition] = useState({ x: Math.max(12, window.innerWidth - 82), y: Math.max(12, window.innerHeight - 112) })
  const drag = useRef(null)
  const moved = useRef(false)
  const launcherRef = useRef(null)

  const format = (value) => {
    if (!Number.isFinite(value)) return 'Error'
    return String(Number.parseFloat(value.toPrecision(11))).slice(0, 16)
  }

  const press = (key) => {
    if (key === 'clear') {
      setDisplay('0')
      setExpression('')
      setStored(null)
      setOperator(null)
      setReplace(false)
      return
    }

    if (key === 'back') {
      if (replace || display === 'Error') {
        setDisplay('0')
        setReplace(false)
        return
      }
      setDisplay(value => value.length <= 1 || (value.length === 2 && value.startsWith('-')) ? '0' : value.slice(0, -1))
      return
    }

    if (key === 'sign') {
      if (display !== '0' && display !== 'Error') setDisplay(value => value.startsWith('-') ? value.slice(1) : `-${value}`)
      return
    }

    if (key === 'percent') {
      if (display !== 'Error') {
        const result = format(Number(display) / 100)
        setDisplay(result)
        setExpression(`${display}%`)
        setReplace(true)
      }
      return
    }

    if (key === '.') {
      if (replace || display === 'Error') {
        setDisplay('0.')
        setReplace(false)
      } else if (!display.includes('.')) {
        setDisplay(value => `${value}.`)
      }
      return
    }

    if (['+', '-', '*', '/'].includes(key)) {
      if (display === 'Error') return
      const current = Number(display)
      if (operator && stored !== null && !replace) {
        const result = calculate(stored, current, operator)
        const nextDisplay = format(result)
        setDisplay(nextDisplay)
        setStored(result)
        setExpression(`${nextDisplay} ${OPERATOR_LABELS[key]}`)
      } else {
        setStored(current)
        setExpression(`${display} ${OPERATOR_LABELS[key]}`)
      }
      setOperator(key)
      setReplace(true)
      return
    }

    if (key === 'equals') {
      if (operator && stored !== null && display !== 'Error') {
        const right = Number(display)
        const result = calculate(stored, right, operator)
        const resultText = format(result)
        const completedExpression = `${format(stored)} ${OPERATOR_LABELS[operator]} ${display}`
        setDisplay(resultText)
        setExpression(`${completedExpression} =`)
        if (resultText !== 'Error') {
          setHistory(items => [{ id: Date.now(), expression: completedExpression, result: resultText }, ...items].slice(0, 8))
        }
        setStored(null)
        setOperator(null)
        setReplace(true)
      }
      return
    }

    if (/^\d$/.test(key)) {
      setDisplay(value => replace || value === 'Error' ? key : value === '0' ? key : value.length >= 16 ? value : value + key)
      if (replace || display === 'Error') setExpression('')
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
  }, [open, display, expression, stored, operator, replace])

  useEffect(() => {
    const clamp = () => setPosition(pos => ({
      x: Math.max(8, Math.min(window.innerWidth - 62, pos.x)),
      y: Math.max(8, Math.min(window.innerHeight - 62, pos.y)),
    }))
    window.addEventListener('resize', clamp)
    return () => window.removeEventListener('resize', clamp)
  }, [])

  const startDrag = (event) => {
    moved.current = false
    drag.current = { pointerId: event.pointerId, x: event.clientX, y: event.clientY, startX: position.x, startY: position.y }
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  const moveDrag = (event) => {
    if (!drag.current || drag.current.pointerId !== event.pointerId) return
    const dx = event.clientX - drag.current.x
    const dy = event.clientY - drag.current.y
    if (Math.abs(dx) + Math.abs(dy) > 4) moved.current = true
    setPosition({
      x: Math.max(8, Math.min(window.innerWidth - 62, drag.current.startX + dx)),
      y: Math.max(8, Math.min(window.innerHeight - 62, drag.current.startY + dy)),
    })
  }

  const stopDrag = () => { drag.current = null }

  const useHistoryItem = (item) => {
    setDisplay(item.result)
    setExpression(`${item.expression} =`)
    setStored(null)
    setOperator(null)
    setReplace(true)
  }

  return (
    <div className="floating-calculator-root">
      <button
        ref={launcherRef}
        className="floating-calculator-chat-head"
        type="button"
        aria-label="Open calculator"
        title="Drag to move · Tap to open calculator"
        style={{ left: position.x, top: position.y }}
        onPointerDown={startDrag}
        onPointerMove={moveDrag}
        onPointerUp={stopDrag}
        onPointerCancel={stopDrag}
        onLostPointerCapture={stopDrag}
        onClick={() => { if (!moved.current) setOpen(true) }}
      >
        <i className="bi bi-calculator-fill" aria-hidden="true" />
      </button>

      {open && (
        <div className="floating-calculator-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setOpen(false) }}>
          <section className="floating-calculator-modal" role="dialog" aria-modal="true" aria-label="Calculator">
            <header className="floating-calculator-header">
              <span><i className="bi bi-calculator-fill me-2" />Calculator</span>
              <button type="button" aria-label="Close calculator" title="Close" onClick={() => setOpen(false)}><i className="bi bi-x-lg" /></button>
            </header>

            <div className="floating-calculator-display-wrap">
              <div className="floating-calculator-expression" aria-live="polite">{expression || ' '}</div>
              <div className="floating-calculator-display" aria-live="polite">{display}</div>
            </div>

            <div className="floating-calculator-keys">
              {KEYS.map(([label, key]) => (
                <button
                  key={key}
                  type="button"
                  className={['clear','back','percent','sign'].includes(key) ? 'utility' : ['+','-','*','/','equals'].includes(key) ? 'operator' : ''}
                  onClick={() => press(key)}
                >
                  {label}
                </button>
              ))}
            </div>

            <div className="floating-calculator-history">
              <div className="floating-calculator-history-heading">
                <span><i className="bi bi-clock-history me-2" />Recent</span>
                {history.length > 0 && <button type="button" onClick={() => setHistory([])}>Clear history</button>}
              </div>
              {history.length === 0 ? (
                <p className="floating-calculator-history-empty">Your recent calculations will appear here.</p>
              ) : (
                <div className="floating-calculator-history-list">
                  {history.map(item => (
                    <button className="floating-calculator-history-item" type="button" key={item.id} onClick={() => useHistoryItem(item)}>
                      <span>{item.expression}</span>
                      <strong>{item.result}</strong>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </section>
        </div>
      )}
    </div>
  )
}
