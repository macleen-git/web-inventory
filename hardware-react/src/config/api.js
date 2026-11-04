import { auth } from '../components/firebase'

const configuredApiUrl = import.meta.env.VITE_API_URL || "http://localhost:8080";
export const API_BASE_URL = configuredApiUrl.replace(/\/+$/, "");
export const API_URL = (path = "") => {
  const normalizedPath = String(path).replace(/^\/+/, "");
  return normalizedPath ? `${API_BASE_URL}/${normalizedPath}` : API_BASE_URL;
};

// Attach the current Firebase ID token to every protected API request.
export async function apiFetch(url, options = {}) {
  const currentUser = auth.currentUser
  if (!currentUser) {
    throw new Error('You must be signed in to access this resource.')
  }

  const token = await currentUser.getIdToken()
  const headers = new Headers(options.headers || {})
  headers.set('Authorization', `Bearer ${token}`)

  return fetch(url, {
    ...options,
    headers,
  })
}
