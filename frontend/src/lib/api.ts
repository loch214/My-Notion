export const API_BASE = (import.meta.env.VITE_API_URL ?? '').replace(/\/$/, '');

// If VITE_API_URL isn't set, empty string will cause fetch to use root-relative paths
// e.g. `${API_BASE}/api/chat/global` -> `/api/chat/global`
