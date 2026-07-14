/**
 * Backend API base URL.
 *
 * - Production: set VITE_API_URL to the backend Cloud Run URL
 *   e.g. "https://llmsecurity-api-xxxxx.asia-southeast1.run.app"
 * - Local dev:  leave unset — Vite proxy in vite.config.js forwards to localhost:8000
 */
export const API_BASE = import.meta.env.VITE_API_URL || '';

/**
 * Build a full API URL from a path like "/parse" or "/auth/login".
 */
export function apiUrl(path) {
  return `${API_BASE}${path}`;
}
