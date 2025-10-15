// web/lib/api.js
export const API = process.env.NEXT_PUBLIC_API ?? 'http://localhost:4000';

// ---- ช่วย parse response + โยน error ให้เข้าใจง่าย ----
async function handle(res) {
  if (!res.ok) {
    let msg = `HTTP ${res.status}`;
    try {
      const j = await res.json();
      if (j?.error) msg = j.error;
    } catch {
      /* ignore parse error */
    }
    throw new Error(msg);
  }
  const ctype = res.headers.get('content-type') || '';
  if (ctype.includes('application/json')) return res.json();
  return res.text();
}

// ---- fetcher สำหรับ SWR (มี credentials เสมอ) ----
export const swrFetcher = (url) =>
  fetch(url, { credentials: 'include' }).then(async (r) => {
    if (!r.ok) {
      let msg = `HTTP ${r.status}`;
      try {
        const j = await r.json();
        if (j?.error) msg = j.error;
      } catch { /* ignore */ }
      throw new Error(msg);
    }
    return r.json();
  });

// ---- helpers มาตรฐาน (มี credentials เสมอ) ----
export function apiGet(path, init = {}) {
  return fetch(`${API}${path}`, {
    method: 'GET',
    credentials: 'include',
    ...init,
  }).then(handle);
}

export function apiPost(path, body, init = {}) {
  return fetch(`${API}${path}`, {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(init.headers || {}),
    },
    body: JSON.stringify(body ?? {}),
    ...init,
  }).then(handle);
}

export function apiPatch(path, body, init = {}) {
  return fetch(`${API}${path}`, {
    method: 'PATCH',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(init.headers || {}),
    },
    body: JSON.stringify(body ?? {}),
    ...init,
  }).then(handle);
}

export function apiPut(path, body, init = {}) {
  return fetch(`${API}${path}`, {
    method: 'PUT',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(init.headers || {}),
    },
    body: JSON.stringify(body ?? {}),
    ...init,
  }).then(handle);
}

export function apiDelete(path, init = {}) {
  return fetch(`${API}${path}`, {
    method: 'DELETE',
    credentials: 'include',
    ...init,
  }).then(handle);
}
