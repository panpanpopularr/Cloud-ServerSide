// web/lib/api.js
export const API = process.env.NEXT_PUBLIC_API || 'http://localhost:4000';

/** แปลง response -> json/text และแนบข้อความผิดพลาดใน e.body */
async function handle(res) {
  // 204 หรือไม่มีเนื้อหาเลย
  const noContent = res.status === 204 || res.headers.get('content-length') === '0';
  if (!res.ok) {
    let message = `HTTP ${res.status}`;
    try {
      if (!noContent) {
        const j = await res.json();
        if (j && typeof j === 'object' && j.error) message = j.error;
        const e = new Error(message);
        e.body = j;             // <- แนบ body ไว้ดูรายละเอียด
        throw e;
      }
    } catch {
      // ถ้า parse json ไม่ได้
    }
    const e = new Error(message);
    e.body = { error: message };
    throw e;
  }

  if (noContent) return null;

  const ctype = (res.headers.get('content-type') || '').toLowerCase();
  if (ctype.includes('application/json')) return res.json();
  return res.text();
}

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
    body: body ? JSON.stringify(body) : undefined,
  }).then(handle);
}

export function apiPatch(path, body) {
  return fetch(`${API}${path}`, {
    method: 'PATCH',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  }).then(handle);
}

export function apiPut(path, body) {
  return fetch(`${API}${path}`, {
    method: 'PUT',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  }).then(handle);
}

export function apiDelete(path) {
  return fetch(`${API}${path}`, {
    method: 'DELETE',
    credentials: 'include',
  }).then(handle);
}

/** ใช้กับ useSWR: useSWR(() => `${API}/...`, swrFetcher) */
export const swrFetcher = (url) =>
  fetch(url, { credentials: 'include' }).then(handle);

/** อัปโหลดไฟล์แบบ FormData (ถ้าต้องใช้) */
export function apiUpload(path, formData) {
  return fetch(`${API}${path}`, {
    method: 'POST',
    credentials: 'include',
    body: formData, // อย่าตั้ง header Content-Type เอง ให้ browser ใส่ boundary ให้
  }).then(handle);
}

export default {
  API,
  apiGet,
  apiPost,
  apiPatch,
  apiPut,
  apiDelete,
  apiUpload,
  swrFetcher,
};
