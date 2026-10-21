import { useEffect, useRef, useState } from 'react'
import { NavLink } from 'react-router-dom'
import { onAuthStateChanged, signOut } from 'firebase/auth'
import { auth } from './firebase'

const USER_NAV_ITEMS = [
  { href: '/dashboard', label: 'Dashboard', icon: 'bi-speedometer2' },
  { href: '/inventory', label: 'Inventory', icon: 'bi-box-seam' },
  { href: '/stock-in', label: 'Stock In', icon: 'bi-box-arrow-in-down' },
  { href: '/sales', label: 'Sales / Stock Out', icon: 'bi-cart-check' },
  { href: '/damaged-items', label: 'Damaged Items', icon: 'bi-exclamation-triangle' },
  { href: '/reports', label: 'Reports', icon: 'bi-bar-chart-line' },
  { href: '/transactions', label: 'Transactions', icon: 'bi-arrow-left-right' },
  { href: '/settings', label: 'Settings', icon: 'bi-gear' },
]

const ADMIN_NAV_ITEMS = [
  { href: '/admin', label: 'Admin Dashboard', icon: 'bi-shield-lock' },
]

const MIN_WIDTH = 76
const MAX_WIDTH = 300
const DEFAULT_WIDTH = 252

function Sidebar({ active, onLogout, admin = false }) {
  const [open, setOpen] = useState(false)
  const [width, setWidth] = useState(() => {
    const saved = Number(window.localStorage.getItem('hardware-sidebar-width'))
    return Number.isFinite(saved) && saved >= MIN_WIDTH && saved <= MAX_WIDTH ? saved : DEFAULT_WIDTH
  })
  const [displayName, setDisplayName] = useState('User')
  const [email, setEmail] = useState('')
  const [isResizing, setIsResizing] = useState(false)
  const navRef = useRef(null)
  const items = admin ? ADMIN_NAV_ITEMS : USER_NAV_ITEMS
  const collapsed = width <= MIN_WIDTH + 2

  useEffect(() => onAuthStateChanged(auth, (user) => {
    setDisplayName(user?.displayName || user?.email?.split('@')[0] || 'User')
    setEmail(user?.email || '')
  }), [])

  useEffect(() => {
    setOpen(false)
  }, [active])

  useEffect(() => {
    if (!isResizing) return undefined
    const move = (event) => {
      const nextWidth = Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, event.clientX))
      setWidth(nextWidth)
    }
    const stop = () => setIsResizing(false)
    document.body.classList.add('sidebar-is-resizing')
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', stop)
    return () => {
      document.body.classList.remove('sidebar-is-resizing')
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', stop)
    }
  }, [isResizing])

  useEffect(() => {
    window.localStorage.setItem('hardware-sidebar-width', String(width))
  }, [width])

  useEffect(() => {
    if (!open) return undefined
    const outside = (event) => {
      if (navRef.current && !navRef.current.contains(event.target)) setOpen(false)
    }
    const escape = (event) => { if (event.key === 'Escape') setOpen(false) }
    document.addEventListener('click', outside, true)
    document.addEventListener('keydown', escape)
    return () => {
      document.removeEventListener('click', outside, true)
      document.removeEventListener('keydown', escape)
    }
  }, [open])

  const logout = async () => {
    setOpen(false)
    if (onLogout) await onLogout()
    else await signOut(auth)
  }

  const brand = (
    <span className="brand-mark app-brand-mark">
      <span className="brand-icon"><i className="bi bi-gear-fill" /></span>
      <span className="app-brand-copy"><strong>HARDWARE TOOLS</strong><small>{admin ? 'ADMIN' : 'INVENTORY'}</small></span>
    </span>
  )

  const links = (mode) => items.map((item) => (
    <NavLink
      key={item.href}
      to={item.href}
      title={collapsed || mode !== 'desktop' ? item.label : undefined}
      aria-label={item.label}
      className={({ isActive }) => `nav-link app-nav-link ${mode === 'mobile' ? 'app-mobile-icon-link' : ''}${isActive || item.href === active ? ' active' : ''}`}
      onClick={() => setOpen(false)}
    >
      <i className={`bi ${item.icon} nav-icon`} aria-hidden="true" />
      <b>{item.label}</b>
    </NavLink>
  ))

  const logoutButton = (mode) => (
    <button
      type="button"
      title={mode === 'desktop' && !collapsed ? undefined : 'Logout'}
      aria-label="Logout"
      className={`nav-link app-nav-link app-nav-logout ${mode === 'mobile' ? 'app-mobile-icon-link' : ''} text-start border-0 bg-transparent w-100`}
      onClick={logout}
    >
      <i className="bi bi-box-arrow-right nav-icon" aria-hidden="true" />
      <b>Logout</b>
    </button>
  )

  return (
    <>
      {/* Desktop: resizable left sidebar */}
      <aside className={`app-sidebar app-sidebar-desktop${collapsed ? ' is-collapsed' : ''}`} style={{ width: `${width}px`, flexBasis: `${width}px` }}>
        <div className="app-sidebar-brand">
          {brand}
          <button className="sidebar-collapse-button" type="button" title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'} aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'} onClick={() => setWidth(collapsed ? DEFAULT_WIDTH : MIN_WIDTH)}>
            <i className={`bi ${collapsed ? 'bi-layout-sidebar' : 'bi-layout-sidebar-inset'}`} />
          </button>
        </div>
        <nav className="app-sidebar-links" aria-label="Main navigation">{links('desktop')}</nav>
        <div className="app-sidebar-footer">
          <div className="app-user-row" title={displayName}>
            <span className="app-user-avatar"><i className="bi bi-person-fill" /></span>
            <span className="app-user-copy"><strong>{displayName}</strong><small>{email || (admin ? 'Administrator' : 'Signed in')}</small></span>
            {logoutButton('desktop')}
          </div>
        </div>
        <div className="app-sidebar-resize-handle" role="separator" aria-orientation="vertical" aria-label="Resize sidebar" title="Drag to resize sidebar" onPointerDown={(event) => { event.preventDefault(); setIsResizing(true) }} />
      </aside>

      {/* Phones: compact header without a burger menu */}
      <header className="app-phone-header">
        {brand}
        <div className="app-phone-user" title={displayName}>
          <span className="app-user-avatar"><i className="bi bi-person-fill" /></span>
          <span>{displayName}</span>
        </div>
      </header>

      {/* Phones: fixed bottom icon navigation */}
      <nav className="app-mobile-bottom-nav" aria-label="Mobile navigation">
        {links('mobile')}
        {logoutButton('mobile')}
      </nav>
    </>
  )
}

export default Sidebar
