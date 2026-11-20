import { auth } from './firebase'

export async function apiFetch(input, options = {}) {
  const currentUser = auth.currentUser
  if (!currentUser) {
    throw new Error('You must be signed in to access your inventory.')
  }

  const token = await currentUser.getIdToken()
  const headers = new Headers(options.headers || {})
  headers.set('Authorization', `Bearer ${token}`)

  return fetch(input, {
    ...options,
    headers,
  })
}
