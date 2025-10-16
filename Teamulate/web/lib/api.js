export const API =
  (process.env.NEXT_PUBLIC_API_URL?.replace(/\/+$/, '')) || 'http://localhost:4000';

const norm = (p) => (p?.startsWith('/') ? p : `/${p || ''}`);

async function parseResponse(r) {
  if (r.status === 204) return null;
  const text = await r.text();
  if (!text) return null;
  try { return JSON.parse(text); } catch { return { raw: text }; }
}

async function request(method, path, body) {
  const url = `${API}${norm(path)}`;
  const init = {
    method,
    credentials: 'include',
    headers: {},
    cache: 'no-store',       // ⬅️ กัน cache
  };
  if (body !== undefined) {
    init.headers['Content-Type'] = 'application/json';
    init.body = JSON.stringify(body ?? {});
  }
  const r = await fetch(url, init);
  const data = await parseResponse(r);
  if (!r.ok) throw new Error(data?.error || data?.raw || `HTTP ${r.status}`);
  return data;
}

export async function apiGet(path)     { return request('GET',    path); }
export async function apiPost(path, b) { return request('POST',   path, b); }
export async function apiPatch(path,b) { return request('PATCH',  path, b); }
export async function apiPut(path,  b) { return request('PUT',    path, b); }
export async function apiDelete(path)  { return request('DELETE', path); }

// SWR fetcher (ปิด cache)
export const swrFetcher = (url) =>
  fetch(url, { credentials: 'include', cache: 'no-store' })
    .then(async (r) => {
      const data = await parseResponse(r);
      if (!r.ok) throw new Error(data?.error || data?.raw || `HTTP ${r.status}`);
      return data;
    });

export function googleLoginUrl() { return `${API}/auth/google`; }

import { mutate as swrMutate } from 'swr';
export async function apiLogoutAndClear() {
  try { await request('POST', '/auth/logout'); } catch {}
  // เคลียร์ cache /auth/me ให้แน่ใจว่า header เปลี่ยนทันที
  await swrMutate(`${API}/auth/me`, { user: null }, { revalidate: false });
  // กันคีย์อื่นที่ลงท้าย /auth/me
  await swrMutate((key) => typeof key === 'string' && key.endsWith('/auth/me'), { user: null }, { revalidate: false });
}
