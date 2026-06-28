/**
 * HTTP client boundary.
 *
 * Everything network-shaped goes through here so the swap from mock → real
 * Go backend is a single-file change. In dev, Vite/Start proxies `/api` to the
 * Express "brain" (and later the Go gateway). Flip `USE_MOCK` to false once the
 * real endpoints exist.
 */

export const USE_MOCK = true

const API_BASE = '/api'

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'content-type': 'application/json', ...(init?.headers ?? {}) },
    ...init,
  })
  if (!res.ok) {
    const message = await res.text().catch(() => res.statusText)
    throw new Error(message || `Request failed: ${res.status}`)
  }
  return (await res.json()) as T
}
