
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  signInWithEmailAndPassword,
  signInWithPopup
} from 'firebase/auth'
import { auth, googleProvider } from '../components/firebase'

function friendlyError(code) {
  switch (code) {
    case 'auth/invalid-email':
      return 'That email address looks invalid.'

    case 'auth/user-not-found':
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
      return 'Incorrect email or password.'

    case 'auth/too-many-requests':
      return 'Too many attempts. Please wait a moment and try again.'

    case 'auth/network-request-failed':
      return 'Network error. Check your internet connection.'

    case 'auth/popup-closed-by-user':
      return 'Google sign-in was closed before finishing.'

    case 'auth/popup-blocked':
      return 'Your browser blocked the Google sign-in popup.'

    default:
      return 'Something went wrong. Please try again.'
  }
}

function Login({ onLogin, onSignUp, onBack }) {
  const navigate = useNavigate()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)

  async function handleSubmit(event) {
    event.preventDefault()

    if (loading || googleLoading) return

    setError('')
    setLoading(true)

    try {
      await signInWithEmailAndPassword(
        auth,
        email.trim(),
        password
      )

      onLogin?.()
    } catch (err) {
      setError(friendlyError(err.code))
    } finally {
      setLoading(false)
    }
  }

  async function handleGoogleLogin() {
    if (loading || googleLoading) return

    setError('')
    setGoogleLoading(true)

    try {
      await signInWithPopup(auth, googleProvider)
      onLogin?.()
    } catch (err) {
      setError(friendlyError(err.code))
    } finally {
      setGoogleLoading(false)
    }
  }

  function handleBack() {
    if (onBack) {
      onBack()
    } else {
      navigate('/')
    }
  }

  function handleSignUp() {
    if (onSignUp) {
      onSignUp()
    } else {
      navigate('/signup')
    }
  }

  return (
    <main className="auth-page login-page-uniform">
      <div
        className="auth-decoration auth-decoration-one"
        aria-hidden="true"
      >
        <i className="bi bi-gear-wide-connected" />
      </div>

      <div
        className="auth-decoration auth-decoration-two"
        aria-hidden="true"
      >
        <i className="bi bi-tools" />
      </div>

      <div className="login-shell">
        <section
          className="login-card-uniform"
          aria-labelledby="login-heading"
        >
          <button
            type="button"
            className="login-back-button"
            onClick={handleBack}
          >
            <i className="bi bi-arrow-left" aria-hidden="true" />
            <span>Back to home</span>
          </button>

          <header className="login-brand">
            <div className="login-brand-logo" aria-hidden="true">
              <i className="bi bi-gear-fill" />
            </div>

            <div className="login-brand-name">
              <strong>HARDWARE TOOLS</strong>
              <span>INVENTORY</span>
            </div>
          </header>

          <div className="login-heading">
            <h1 id="login-heading">Welcome back</h1>
            <p>Sign in to manage your inventory.</p>
          </div>

          {error && (
            <div
              className="login-error"
              role="alert"
              aria-live="polite"
            >
              <i
                className="bi bi-exclamation-circle-fill"
                aria-hidden="true"
              />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="login-field">
              <label htmlFor="login-email">Email address</label>

              <div className="login-input-wrap">
                <i
                  className="bi bi-envelope"
                  aria-hidden="true"
                />

                <input
                  id="login-email"
                  type="email"
                  placeholder="Enter your email"
                  autoComplete="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  disabled={loading || googleLoading}
                  required
                />
              </div>
            </div>

            <div className="login-field">
              <label htmlFor="login-password">Password</label>

              <div className="login-input-wrap">
                <i
                  className="bi bi-lock"
                  aria-hidden="true"
                />

                <input
                  id="login-password"
                  type="password"
                  placeholder="Enter your password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  disabled={loading || googleLoading}
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              className="login-submit-button"
              disabled={loading || googleLoading}
            >
              {loading ? (
                <>
                  <span
                    className="login-button-spinner"
                    aria-hidden="true"
                  />
                  Signing in...
                </>
              ) : (
                <>
                  <span>LOG IN</span>
                  <i
                    className="bi bi-arrow-right"
                    aria-hidden="true"
                  />
                </>
              )}
            </button>
          </form>

          <div className="login-divider">
            <span />
            <small>OR CONTINUE WITH</small>
            <span />
          </div>

          <button
            type="button"
            className="login-google-button"
            onClick={handleGoogleLogin}
            disabled={loading || googleLoading}
          >
            {googleLoading ? (
              <>
                <span
                  className="login-button-spinner login-spinner-dark"
                  aria-hidden="true"
                />
                Connecting to Google...
              </>
            ) : (
              <>
                <img
                  src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg"
                  alt=""
                  width="18"
                  height="18"
                />
                <span>Continue with Google</span>
              </>
            )}
          </button>

          <p className="login-signup-prompt">
            Don't have an account?
            {' '}
            <button type="button" onClick={handleSignUp}>
              Sign up
            </button>
          </p>

          <footer className="login-footer">
            <span className="login-footer-line" />
            <p>BETTER INVENTORY. SMOOTHER OPERATIONS.</p>
          </footer>
        </section>
      </div>
    </main>
  )
}

export default Login
