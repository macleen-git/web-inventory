
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  createUserWithEmailAndPassword,
  updateProfile
} from 'firebase/auth'
import {
  doc,
  setDoc,
  serverTimestamp
} from 'firebase/firestore'
import { auth, db } from '../components/firebase'

function friendlyError(code) {
  switch (code) {
    case 'auth/email-already-in-use':
      return 'An account with that email already exists.'

    case 'auth/invalid-email':
      return 'That email address looks invalid.'

    case 'auth/weak-password':
      return 'Password should be at least 6 characters.'

    case 'auth/network-request-failed':
      return 'Network error. Check your internet connection.'

    case 'auth/operation-not-allowed':
      return 'Email and password registration is not enabled.'

    case 'auth/too-many-requests':
      return 'Too many attempts. Please wait and try again.'

    default:
      return 'Unable to create your account. Please try again.'
  }
}

function Signup({ onLogin, onBack }) {
  const navigate = useNavigate()

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')

    if (loading) return

    const cleanName = name.trim()
    const cleanEmail = email.trim()

    if (!cleanName) {
      setError('Please enter your full name.')
      return
    }

    if (password.length < 6) {
      setError('Password should be at least 6 characters.')
      return
    }

    if (password !== confirmPassword) {
      setError('Your passwords do not match.')
      return
    }

    setLoading(true)

    try {
      const credential = await createUserWithEmailAndPassword(
        auth,
        cleanEmail,
        password
      )

      await updateProfile(credential.user, {
        displayName: cleanName
      })

      await setDoc(doc(db, 'users', credential.user.uid), {
        name: cleanName,
        displayName: cleanName,
        email: cleanEmail,
        photoURL: credential.user.photoURL || '',
        role: 'user',
        createdAt: serverTimestamp()
      })

      setSuccess(true)
    } catch (err) {
      console.error('Registration failed:', err)

      if (err.code === 'auth/email-already-in-use' ||
          err.code === 'auth/invalid-email' ||
          err.code === 'auth/weak-password' ||
          err.code === 'auth/network-request-failed' ||
          err.code === 'auth/operation-not-allowed' ||
          err.code === 'auth/too-many-requests') {
        setError(friendlyError(err.code))
      } else if (err.code?.startsWith('auth/')) {
        setError(friendlyError(err.code))
      } else {
        setError(
          'Your account may have been created, but saving your profile failed. Please try logging in before registering again.'
        )
      }
    } finally {
      setLoading(false)
    }
  }

  function handleBack() {
    if (onBack) {
      onBack()
    } else {
      navigate('/')
    }
  }

  function handleLogin() {
    if (onLogin) {
      onLogin()
    } else {
      navigate('/login')
    }
  }

  return (
    <main className="auth-page login-page-uniform signup-page-uniform">
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
          className="login-card-uniform signup-card-uniform"
          aria-labelledby="signup-heading"
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
            <h1 id="signup-heading">
              {success ? 'You’re all set!' : 'Create your account'}
            </h1>

            <p>
              {success
                ? 'Your registration has been completed.'
                : 'Join us to manage your hardware inventory.'}
            </p>
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

          {success ? (
            <div className="signup-success">
              <div className="signup-success-icon">
                <i className="bi bi-check-lg" aria-hidden="true" />
              </div>

              <h2>Account created successfully</h2>

              <p>
                Your account is ready. Continue to the login page to
                access your inventory workspace.
              </p>

              <button
                type="button"
                className="login-submit-button"
                onClick={handleLogin}
              >
                <span>GO TO LOG IN</span>
                <i className="bi bi-arrow-right" aria-hidden="true" />
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              <div className="login-field">
                <label htmlFor="signup-name">Full name</label>

                <div className="login-input-wrap">
                  <i
                    className="bi bi-person"
                    aria-hidden="true"
                  />

                  <input
                    id="signup-name"
                    type="text"
                    placeholder="Enter your full name"
                    autoComplete="name"
                    maxLength={100}
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    disabled={loading}
                    required
                  />
                </div>
              </div>

              <div className="login-field">
                <label htmlFor="signup-email">Email address</label>

                <div className="login-input-wrap">
                  <i
                    className="bi bi-envelope"
                    aria-hidden="true"
                  />

                  <input
                    id="signup-email"
                    type="email"
                    placeholder="Enter your email"
                    autoComplete="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    disabled={loading}
                    required
                  />
                </div>
              </div>

              <div className="login-field">
                <label htmlFor="signup-password">Password</label>

                <div className="login-input-wrap">
                  <i
                    className="bi bi-lock"
                    aria-hidden="true"
                  />

                  <input
                    id="signup-password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Create a password"
                    autoComplete="new-password"
                    minLength={6}
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    disabled={loading}
                    required
                  />

                  <button
                    type="button"
                    className="signup-password-toggle"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    onClick={() => setShowPassword((value) => !value)}
                    disabled={loading}
                  >
                    <i
                      className={`bi ${showPassword ? 'bi-eye-slash' : 'bi-eye'}`}
                      aria-hidden="true"
                    />
                  </button>
                </div>
              </div>

              <div className="login-field">
                <label htmlFor="signup-confirm-password">
                  Confirm password
                </label>

                <div className="login-input-wrap">
                  <i
                    className="bi bi-shield-lock"
                    aria-hidden="true"
                  />

                  <input
                    id="signup-confirm-password"
                    type={showConfirmPassword ? 'text' : 'password'}
                    placeholder="Confirm your password"
                    autoComplete="new-password"
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    disabled={loading}
                    required
                  />

                  <button
                    type="button"
                    className="signup-password-toggle"
                    aria-label={
                      showConfirmPassword
                        ? 'Hide confirm password'
                        : 'Show confirm password'
                    }
                    onClick={() =>
                      setShowConfirmPassword((value) => !value)
                    }
                    disabled={loading}
                  >
                    <i
                      className={`bi ${showConfirmPassword ? 'bi-eye-slash' : 'bi-eye'}`}
                      aria-hidden="true"
                    />
                  </button>
                </div>
              </div>

              <button
                type="submit"
                className="login-submit-button signup-submit-button"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <span
                      className="login-button-spinner"
                      aria-hidden="true"
                    />
                    Creating account...
                  </>
                ) : (
                  <>
                    <span>CREATE ACCOUNT</span>
                    <i
                      className="bi bi-arrow-right"
                      aria-hidden="true"
                    />
                  </>
                )}
              </button>
            </form>
          )}

          {!success && (
            <p className="login-signup-prompt">
              Already have an account?
              {' '}
              <button
                type="button"
                onClick={handleLogin}
                disabled={loading}
              >
                Log in
              </button>
            </p>
          )}

          <footer className="login-footer">
            <span className="login-footer-line" />
            <p>BETTER INVENTORY. SMOOTHER OPERATIONS.</p>
          </footer>
        </section>
      </div>
    </main>
  )
}

export default Signup
