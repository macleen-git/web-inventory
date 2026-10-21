
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

import {
  doc,
  getDoc,
  serverTimestamp,
  setDoc
} from 'firebase/firestore'

import { auth, db, googleProvider } from './components/firebase'

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

import './App.css'


function AppRoutes({ user, role, handleLogin }) {
  const navigate = useNavigate()
  const location = useLocation()
  const [pageLoading, setPageLoading] = useState(false)

  useEffect(() => {
    setPageLoading(true)
    const timer = window.setTimeout(() => setPageLoading(false), 360)
    return () => window.clearTimeout(timer)
  }, [location.pathname])

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
            role === 'admin'
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
            role === 'admin'
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
            role === 'admin'
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
            : user && role === 'admin'
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
            : user && role === 'admin'
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
            : user && role === 'admin'
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
            : user && role === 'admin'
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
            : user && role === 'admin'
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
            : user && role === 'admin'
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
            : user && role === 'admin'
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
            : user && role === 'admin'
              ? <Navigate to="/admin" replace />
              : <Navigate to="/login" replace />
        }
      />

      {/* ADMIN */}
      <Route
        path="/admin"
        element={
          user && role === 'admin'
            ? <Admin />
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
                ? role === 'admin'
                  ? '/admin'
                  : '/dashboard'
                : '/'
            }
            replace
          />
        }
      />
    </Routes>
    </>
  )
}


function App() {
  const [user, setUser] = useState(null)
  const [role, setRole] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(
      auth,
      async (currentUser) => {
        try {
          if (currentUser) {
            setUser(currentUser)

            const userRef = doc(db, 'users', currentUser.uid)
            const userSnap = await getDoc(userRef)

            if (userSnap.exists()) {
              const userData = userSnap.data()
              setRole(userData.role || 'user')
            } else {
              const defaultRole = 'user'

              await setDoc(userRef, {
                displayName: currentUser.displayName,
                email: currentUser.email,
                photoURL: currentUser.photoURL,
                role: defaultRole,
                createdAt: serverTimestamp()
              })

              setRole(defaultRole)
            }
          } else {
            setUser(null)
            setRole(null)
          }
        } catch (error) {
          console.error(
            'Unable to load application state:',
            error
          )

          setRole((currentRole) =>
            currentRole || (currentUser ? 'user' : null)
          )
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
            Preparing your inventory workspace...
          </p>
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
      />
    </BrowserRouter>
  )
}

export default App
