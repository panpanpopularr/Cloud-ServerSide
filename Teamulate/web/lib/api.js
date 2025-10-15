// web/lib/api.js
export const API = process.env.NEXT_PUBLIC_API || 'http://localhost:4000';

async function handle(res) {
  if (!res.ok) {
    let msg = 'request failed';
    try { const j = await res.json(); msg = j?.error || msg; } catch {}
    throw new Error(msg);
  }
  const ctype = res.headers.get('content-type') || '';
  if (ctype.includes('application/json')) return res.json();
  return res.text();
}

export const swrFetcher = (url) =>
  fetch(url, { credentials: 'include' }).then(async (r) => {
    if (!r.ok) {
      let msg = 'request failed';
      try { const j = await r.json(); msg = j?.error || msg; } catch {}
      throw new Error(msg);
    }
    return r.json();
  });

export function apiGet(path) {
  return fetch(`${API}${path}`, {
    method: 'GET',
    credentials: 'include',
  }).then(handle);
}

export function apiPost(path, body) {
  return fetch(`${API}${path}`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body ?? {}),
  }).then(handle);
}

export function apiPatch(path, body) {
  return fetch(`${API}${path}`, {
    method: 'PATCH',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body ?? {}),
  }).then(handle);
}

export function apiPut(path, body) {
  return fetch(`${API}${path}`, {
    method: 'PUT',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body ?? {}),
  }).then(handle);
}

export function apiDelete(path) {
  return fetch(`${API}${path}`, {
    method: 'DELETE',
    credentials: 'include',
  }).then(handle);
}
