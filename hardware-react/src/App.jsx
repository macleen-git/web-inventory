
import { useEffect, useState } from 'react'
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useNavigate,
  useLocation
} from 'react-router-dom'

import {
  onAuthStateChanged,
  signOut,
  signInWithPopup
} from 'firebase/auth'

import { auth, googleProvider } from './components/firebase'

import Landing from './pages/Landing'
import Login from './pages/Login'
import Signup from './pages/Signup'
import Dashboard from './pages/Dashboard'
import Inventory from './pages/Inventory'
import StockIn from './pages/Stock-in'
import Sales from './pages/Sales'
import Damaged from './pages/Damaged'
import Reports from './pages/Reports'
import Transactions from './pages/Transaction'
import Settings from './pages/Settings'
import Admin from './pages/Admin'
import FloatingCalculator from './components/FloatingCalculator'
import { API_URL } from './config/api'

import './App.css'


function isAdminRole(role) {
  return role === 'admin' || role === 'superadmin'
}

// Wake the Render service with a health request and wait for every required dependency.
async function waitForBackendReady(setMessage) {
  const maxWaitMs = 5 * 60 * 1000
  const startedAt = Date.now()
  let attempt = 0
  let lastError = 'The API is still starting.'

  while (Date.now() - startedAt < maxWaitMs) {
    attempt += 1
    const remainingMs = maxWaitMs - (Date.now() - startedAt)
    const controller = new AbortController()
    const timeoutId = window.setTimeout(
      () => controller.abort(),
      Math.min(15000, remainingMs)
    )

    setMessage?.('Waking up the backend and checking its database...')

    try {
      const response = await fetch(API_URL('/api/health'), {
        method: 'GET',
        cache: 'no-store',
        signal: controller.signal,
      })
      const data = await response.json().catch(() => ({}))

      if (
        response.ok &&
        data.status === 'ok' &&
        data.database === 'connected' &&
        data.firebaseAdmin === 'configured'
      ) {
        setMessage?.('Backend is ready. Loading your account...')
        return data
      }

      lastError = data.database === 'unavailable'
        ? 'Waiting for the database to connect...'
        : data.firebaseAdmin === 'not_configured'
          ? 'Waiting for Firebase Admin configuration...'
          : 'The backend is starting...'
    } catch (error) {
      lastError = error?.name === 'AbortError'
        ? 'The backend is taking longer than expected to respond...'
        : 'The backend is waking up. Retrying connection...'
    } finally {
      window.clearTimeout(timeoutId)
    }

    const elapsedSeconds = Math.floor((Date.now() - startedAt) / 1000)
    setMessage?.(lastError + ' (Attempt ' + attempt + ', ' + elapsedSeconds + 's elapsed)')
    const delay = Math.min(5000, Math.max(0, maxWaitMs - (Date.now() - startedAt)))
    if (delay > 0) {
      await new Promise(resolve => window.setTimeout(resolve, delay))
    }
  }

  throw new Error('The backend did not become ready within 5 minutes. ' + lastError + ' Please try again.')
}

// Prevent account verification from leaving the app on an endless loading screen.
async function syncAccountWithBackend(currentUser, forceRefresh = false) {
  const controller = new AbortController()
  const timeoutId = window.setTimeout(() => controller.abort(), 15000)

  try {
    const token = await currentUser.getIdToken(forceRefresh)
    const response = await fetch(API_URL('/api/auth/sync'), {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      signal: controller.signal,
    })
    const data = await response.json().catch(() => ({}))

    if (!response.ok) {
      throw new Error(data.message || `Account verification failed (HTTP ${response.status}).`)
    }

    return data
  } catch (error) {
    if (error?.name === 'AbortError') {
      throw new Error('The backend did not respond within 15 seconds. Check that the API server and database are running.')
    }

    if (error instanceof TypeError) {
      console.error('Account sync network error. API endpoint:', API_URL('/api/auth/sync'), error)
      throw new Error(`Cannot reach the backend at ${API_URL('/api/auth/sync')}. Start the backend and check VITE_API_URL in hardware-react/.env.`)
    }

    throw error
  } finally {
    window.clearTimeout(timeoutId)
  }
}

function AppRoutes({ user, role, handleLogin, handleLogout }) {
  const navigate = useNavigate()
  const location = useLocation()
  const [pageLoading, setPageLoading] = useState(false)

  useEffect(() => {
    setPageLoading(true)
    const timer = window.setTimeout(() => setPageLoading(false), 360)
    return () => window.clearTimeout(timer)
  }, [location.pathname])

  useEffect(() => {
    if (!user) return undefined
    let active = true
    const sendHeartbeat = async () => {
      try {
        const token = await auth.currentUser?.getIdToken()
        if (!token || !active) return
        await fetch(API_URL('/api/activity/heartbeat'), {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        })
      } catch (error) {
        console.warn('User activity heartbeat unavailable:', error)
      }
    }
    sendHeartbeat()
    const interval = window.setInterval(sendHeartbeat, 60000)
    return () => { active = false; window.clearInterval(interval) }
  }, [user])

  const goToLogin = () => navigate('/login')
  const goToSignup = () => navigate('/signup')
  const goHome = () => navigate('/')

  return (
    <>
    {pageLoading && (
      <div className="route-loading-overlay" role="status" aria-live="polite">
        <div className="route-loading-card">
          <span className="route-loading-mark"><i className="bi bi-gear-fill" aria-hidden="true" /></span>
          <span className="route-loading-spinner" aria-hidden="true" />
          <strong>HARDWARE TOOLS</strong>
          <small>Loading your page...</small>
        </div>
      </div>
    )}
    <Routes>
      {/* LANDING PAGE */}
      <Route
        path="/"
        element={
          user ? (
            isAdminRole(role)
              ? <Navigate to="/admin" replace />
              : <Navigate to="/dashboard" replace />
          ) : (
            <Landing
              onLogin={goToLogin}
              onSignUp={goToSignup}
            />
          )
        }
      />

      {/* LOGIN */}
      <Route
        path="/login"
        element={
          user ? (
            isAdminRole(role)
              ? <Navigate to="/admin" replace />
              : <Navigate to="/dashboard" replace />
          ) : (
            <Login
              onLogin={handleLogin}
              onSignUp={goToSignup}
              onBack={goHome}
            />
          )
        }
      />

      {/* SIGN UP */}
      <Route
        path="/signup"
        element={
          user ? (
            isAdminRole(role)
              ? <Navigate to="/admin" replace />
              : <Navigate to="/dashboard" replace />
          ) : (
            <Signup />
          )
        }
      />

      {/* USER DASHBOARD */}
      <Route
        path="/dashboard"
        element={
          user && role === 'user'
            ? <Dashboard />
            : user && isAdminRole(role)
              ? <Navigate to="/admin" replace />
              : <Navigate to="/login" replace />
        }
      />

      {/* INVENTORY */}
      <Route
        path="/inventory"
        element={
          user && role === 'user'
            ? <Inventory />
            : user && isAdminRole(role)
              ? <Navigate to="/admin" replace />
              : <Navigate to="/login" replace />
        }
      />

      {/* STOCK IN */}
      <Route
        path="/stock-in"
        element={
          user && role === 'user'
            ? <StockIn />
            : user && isAdminRole(role)
              ? <Navigate to="/admin" replace />
              : <Navigate to="/login" replace />
        }
      />

      {/* SALES */}
      <Route
        path="/sales"
        element={
          user && role === 'user'
            ? <Sales />
            : user && isAdminRole(role)
              ? <Navigate to="/admin" replace />
              : <Navigate to="/login" replace />
        }
      />

      {/* DAMAGED ITEMS */}
      <Route
        path="/damaged-items"
        element={
          user && role === 'user'
            ? <Damaged />
            : user && isAdminRole(role)
              ? <Navigate to="/admin" replace />
              : <Navigate to="/login" replace />
        }
      />

      {/* REPORTS */}
      <Route
        path="/reports"
        element={
          user && role === 'user'
            ? <Reports />
            : user && isAdminRole(role)
              ? <Navigate to="/admin" replace />
              : <Navigate to="/login" replace />
        }
      />

      {/* TRANSACTIONS */}
      <Route
        path="/transactions"
        element={
          user && role === 'user'
            ? <Transactions />
            : user && isAdminRole(role)
              ? <Navigate to="/admin" replace />
              : <Navigate to="/login" replace />
        }
      />

      {/* SETTINGS */}
      <Route
        path="/settings"
        element={
          user && role === 'user'
            ? <Settings />
            : user && isAdminRole(role)
              ? <Navigate to="/admin" replace />
              : <Navigate to="/login" replace />
        }
      />

      {/* ADMIN */}
      <Route
        path="/admin"
        element={
          user && isAdminRole(role)
            ? <Admin user={user} onLogout={handleLogout} />
            : user && role === 'user'
              ? <Navigate to="/dashboard" replace />
              : <Navigate to="/login" replace />
        }
      />

      {/* UNKNOWN ROUTES */}
      <Route
        path="*"
        element={
          <Navigate
            to={
              user
                ? isAdminRole(role)
                  ? '/admin'
                  : '/dashboard'
                : '/'
            }
            replace
          />
        }
      />
    </Routes>
    {user && role === 'user' && ['/dashboard','/inventory','/stock-in','/sales','/damaged-items','/reports','/transactions','/settings'].includes(location.pathname) && <FloatingCalculator />}
    </>
  )
}


function App() {
  const [user, setUser] = useState(null)
  const [role, setRole] = useState(null)
  const [authError, setAuthError] = useState('')
  const [loadingMessage, setLoadingMessage] = useState('Connecting to the backend...')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(
      auth,
      async (currentUser) => {
        try {
          setAuthError('')
          setLoadingMessage('Connecting to the backend...')
          await waitForBackendReady(setLoadingMessage)
          if (currentUser) {
            setUser(currentUser)
            setRole(null)

            // MySQL is the source of truth for roles. Firebase is used only for authentication.
            const syncData = await syncAccountWithBackend(currentUser)
            setRole(['user', 'admin', 'superadmin'].includes(syncData.role) ? syncData.role : 'user')
          } else {
            setUser(null)
            setRole(null)
            setAuthError('')
          }
        } catch (error) {
          console.error(
            'Unable to load application state:',
            error
          )

          setRole(null)
          setAuthError(error?.message || 'The backend is not ready. Please try again.')
        } finally {
          setLoading(false)
        }
      }
    )

    return () => unsubscribe()
  }, [])

  const handleLogin = async () => {
    // The Login component handles email and Google authentication.
    // Firebase's auth-state listener handles the resulting navigation.
  }

  const handleLogout = async () => {
    try {
      await signOut(auth)
      setUser(null)
      setRole(null)
    } catch (error) {
      console.error('Logout failed:', error)
    }
  }

  // Retain this handler if your existing app uses it elsewhere.
  const handleGoogleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider)
    } catch (error) {
      console.error('Google login failed:', error)
    }
  }

  const retryAccountSync = async () => {
    setLoading(true)
    setAuthError('')
    try {
      await waitForBackendReady(setLoadingMessage)
      const currentUser = auth.currentUser
      if (currentUser) {
        const data = await syncAccountWithBackend(currentUser, true)
        setUser(currentUser)
        setRole(['user', 'admin', 'superadmin'].includes(data.role) ? data.role : 'user')
      }
      setAuthError('')
    } catch (error) {
      setRole(null)
      setAuthError(error?.message || 'Account verification failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <main
        className="app-loading-screen"
        role="status"
        aria-live="polite"
      >
        <div className="app-loading-content">
          <div className="app-loading-logo" aria-hidden="true">
            <i className="bi bi-gear-fill" />
          </div>

          <div className="app-loading-brand">
            <h1>HARDWARE TOOLS</h1>
            <p>INVENTORY</p>
          </div>

          <div className="app-loading-spinner" aria-hidden="true" />

          <h2>Please Wait</h2>

          <p className="app-loading-message">
            {loadingMessage}
          </p>
        </div>
      </main>
    )
  }

  if (authError) {
    return (
      <main className="app-loading-screen" role="alert">
        <div className="app-loading-content">
          <div className="app-loading-logo" aria-hidden="true">
            <i className="bi bi-exclamation-triangle-fill" />
          </div>
          <div className="app-loading-brand">
            <h1>ACCOUNT VERIFICATION</h1>
            <p>HARDWARE TOOLS INVENTORY</p>
          </div>
          <h2>We couldn't verify your account</h2>
          <p className="app-loading-message">{authError}</p>
          <div className="d-flex flex-column flex-sm-row justify-content-center gap-2 mt-3">
            <button className="btn btn-primary" type="button" onClick={retryAccountSync}>
              Try Again
            </button>
            {user && (
              <button className="btn btn-outline-secondary" type="button" onClick={handleLogout}>
                Sign Out
              </button>
            )}
          </div>
        </div>
      </main>
    )
  }

  return (
    <BrowserRouter>
      <AppRoutes
        user={user}
        role={role}
        handleLogin={handleLogin}
        handleLogout={handleLogout}
      />
    </BrowserRouter>
  )
}

export default App
