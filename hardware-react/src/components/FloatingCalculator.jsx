import { useEffect, useRef, useState } from 'react'

const KEYS = [
  ['C', 'clear'], ['⌫', 'back'], ['%', '%'], ['÷', '/'],
  ['7', '7'], ['8', '8'], ['9', '9'], ['×', '*'],
  ['4', '4'], ['5', '5'], ['6', '6'], ['−', '-'],
  ['1', '1'], ['2', '2'], ['3', '3'], ['+', '+'],
  ['±', 'sign'], ['0', '0'], ['.', '.'], ['=', 'equals'],
]

const pretty = value => value.replace(/\*/g, '×').replace(/\//g, '÷').replace(/-/g, '−')

function evaluateExpression(source) {
  const tokens = source.match(/(?:\d+\.?\d*|\.\d+)|[+*/()%\-]/g) || []
  if (!tokens.length) return null
  let index = 0
  const parsePrimary = () => {
    let value
    if (tokens[index] === '+' || tokens[index] === '-') {
      const sign = tokens[index++] === '-' ? -1 : 1
      value = sign * parsePrimary()
    } else if (tokens[index] === '(') {
      index++
      value = parseAddSub()
      if (tokens[index++] !== ')') throw new Error('Incomplete')
    } else {
      const token = tokens[index++]
      if (!token || !/^(?:\d+\.?\d*|\.\d+)$/.test(token)) throw new Error('Incomplete')
      value = Number(token)
    }
    while (tokens[index] === '%') {
      value /= 100
      index++
    }
    return value
  }
  const parseMulDiv = () => {
    let value = parsePrimary()
    while (tokens[index] === '*' || tokens[index] === '/') {
      const op = tokens[index++]
      const right = parsePrimary()
      value = op === '*' ? value * right : value / right
    }
    return value
  }
  const parseAddSub = () => {
    let value = parseMulDiv()
    while (tokens[index] === '+' || tokens[index] === '-') {
      const op = tokens[index++]
      const right = parseMulDiv()
      value = op === '+' ? value + right : value - right
    }
    return value
  }
  try {
    const value = parseAddSub()
    if (index !== tokens.length || !Number.isFinite(value)) return null
    return value
  } catch {
    return null
  }
}

const format = value => {
  if (!Number.isFinite(value)) return 'Error'
  return String(Number.parseFloat(value.toPrecision(11))).slice(0, 16)
}

export default function FloatingCalculator() {
  const [open, setOpen] = useState(false)
  const [expression, setExpression] = useState('0')
  const [result, setResult] = useState('0')
  const [history, setHistory] = useState([])
  const [recentOpen, setRecentOpen] = useState(false)
  const [justEvaluated, setJustEvaluated] = useState(false)
  const [position, setPosition] = useState({ x: Math.max(12, window.innerWidth - 82), y: Math.max(12, window.innerHeight - 112) })
  const drag = useRef(null)
  const moved = useRef(false)

  const updateExpression = value => {
    setExpression(value || '0')
    const preview = evaluateExpression(value)
    setResult(preview === null ? '' : format(preview))
  }

  const press = key => {
    if (key === 'clear') {
      setExpression('0')
      setResult('0')
      setJustEvaluated(false)
      return
    }
    if (key === 'equals') {
      const value = evaluateExpression(expression)
      if (value === null) return
      const answer = format(value)
      setHistory(items => [{ id: Date.now(), expression: pretty(expression), result: answer }, ...items].slice(0, 10))
      setExpression(answer)
      setResult(answer)
      setJustEvaluated(true)
      return
    }
    if (key === 'back') {
      const next = justEvaluated ? '0' : expression.length <= 1 ? '0' : expression.slice(0, -1)
      setJustEvaluated(false)
      updateExpression(next)
      return
    }
    if (key === 'sign') {
      const match = expression.match(/(\d*\.?\d+)$/
      )
      if (!match) return
      const start = match.index
      const before = expression.slice(0, start)
      const number = match[0]
      const next = before.endsWith('-') && (before.length === 1 || '+-*/('.includes(before.at(-2)))
        ? before.slice(0, -1) + number
        : before + '-' + number
      setJustEvaluated(false)
      updateExpression(next)
      return
    }
    if (key === '%') {
      if (/[\d)]$/.test(expression)) {
        setJustEvaluated(false)
        updateExpression(expression + '%')
      }
      return
    }
    if (/^[+*/-]$/.test(key)) {
      const base = justEvaluated ? expression : expression
      const next = /[+*/-]$/.test(base) ? base.slice(0, -1) + key : base + key
      setJustEvaluated(false)
      updateExpression(next)
      return
    }
    if (key === '.') {
      const currentNumber = expression.split(/[+*/-]/).at(-1)
      if (currentNumber.includes('.')) return
      const next = justEvaluated ? '0.' : /[+*/-]$/.test(expression) ? expression + '0.' : expression + '.'
      setJustEvaluated(false)
      updateExpression(next)
      return
    }
    if (/^\d$/.test(key)) {
      const next = justEvaluated || expression === '0' ? key : expression + key
      setJustEvaluated(false)
      updateExpression(next)
    }
  }

  useEffect(() => {
    const onKey = event => {
      if (!open || /INPUT|TEXTAREA|SELECT/.test(event.target?.tagName)) return
      if (/^\d$/.test(event.key)) { event.preventDefault(); press(event.key) }
      else if (['+', '-', '*', '/'].includes(event.key)) { event.preventDefault(); press(event.key) }
      else if (event.key === '.') { event.preventDefault(); press('.') }
      else if (event.key === '%') { event.preventDefault(); press('%') }
      else if (event.key === 'Enter' || event.key === '=') { event.preventDefault(); press('equals') }
      else if (event.key === 'Backspace') { event.preventDefault(); press('back') }
      else if (event.key === 'Escape') { setOpen(false); setRecentOpen(false) }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, expression, justEvaluated])

  useEffect(() => {
    const clamp = () => setPosition(pos => ({
      x: Math.max(8, Math.min(window.innerWidth - 62, pos.x)),
      y: Math.max(8, Math.min(window.innerHeight - 62, pos.y)),
    }))
    window.addEventListener('resize', clamp)
    return () => window.removeEventListener('resize', clamp)
  }, [])

  const startDrag = event => {
    moved.current = false
    drag.current = { pointerId: event.pointerId, x: event.clientX, y: event.clientY, startX: position.x, startY: position.y }
    event.currentTarget.setPointerCapture(event.pointerId)
  }
  const moveDrag = event => {
    if (!drag.current || drag.current.pointerId !== event.pointerId) return
    const dx = event.clientX - drag.current.x
    const dy = event.clientY - drag.current.y
    if (Math.abs(dx) + Math.abs(dy) > 4) moved.current = true
    setPosition({
      x: Math.max(8, Math.min(window.innerWidth - 62, drag.current.startX + dx)),
      y: Math.max(8, Math.min(window.innerHeight - 62, drag.current.startY + dy)),
    })
  }
  const useHistoryItem = item => {
    setExpression(item.expression.replace(/×/g, '*').replace(/÷/g, '/').replace(/−/g, '-'))
    setResult(item.result)
    setJustEvaluated(true)
    setRecentOpen(false)
  }

  return (
    <div className="floating-calculator-root">
      <button
        className="floating-calculator-chat-head"
        type="button"
        aria-label="Open calculator"
        title="Drag to move · Tap to open calculator"
        style={{ left: position.x, top: position.y }}
        onPointerDown={startDrag}
        onPointerMove={moveDrag}
        onPointerUp={() => { drag.current = null }}
        onPointerCancel={() => { drag.current = null }}
        onLostPointerCapture={() => { drag.current = null }}
        onClick={() => { if (!moved.current) setOpen(true) }}
      >
        <i className="bi bi-calculator-fill" aria-hidden="true" />
      </button>

      {open && (
        <div className="floating-calculator-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) setOpen(false) }}>
          <section className="floating-calculator-modal" role="dialog" aria-modal="true" aria-label="Calculator">
            <header className="floating-calculator-header">
              <button className="floating-calculator-recent-toggle" type="button" aria-label="Recent calculations" title="Recent calculations" onClick={() => setRecentOpen(value => !value)}>
                <i className="bi bi-clock-history" />
              </button>
              <button type="button" aria-label="Close calculator" title="Close" onClick={() => setOpen(false)}><i className="bi bi-x-lg" /></button>
            </header>

            <div className="floating-calculator-screen">
              <div className="floating-calculator-expression" aria-live="polite">{pretty(expression)}</div>
              <div className="floating-calculator-display" aria-live="polite">{result || ' '}</div>
              {recentOpen && (
                <div className="floating-calculator-recent-dropdown">
                  <div className="floating-calculator-recent-top">
                    <strong>Recent</strong>
                    {history.length > 0 && <button type="button" onClick={() => setHistory([])}>Clear</button>}
                  </div>
                  {history.length === 0 ? <p>No recent calculations</p> : history.map(item => (
                    <button className="floating-calculator-history-item" type="button" key={item.id} onClick={() => useHistoryItem(item)}>
                      <span>{item.expression}</span><strong>{item.result}</strong>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="floating-calculator-keys">
              {KEYS.map(([label, key]) => (
                <button key={key} type="button"
                  className={['clear','back','%'].includes(key) ? 'utility' : ['+','-','*','/','equals'].includes(key) ? 'operator' : ''}
                  onClick={() => press(key)}
                >{label}</button>
              ))}
            </div>
          </section>
        </div>
      )}
    </div>
  )
}
