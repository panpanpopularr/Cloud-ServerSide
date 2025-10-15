// web/lib/api.js
export const API = process.env.NEXT_PUBLIC_API || 'http://localhost:4000';

async function coreFetch(path, { method = 'GET', headers = {}, body, plain = false } = {}) {
  const r = await fetch(`${API}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', ...headers },
    body: body ? JSON.stringify(body) : undefined,
    credentials: 'include', // สำคัญ! เพื่อส่ง cookie ไป-กลับระหว่าง domain/port
    cache: 'no-store',
  });
  if (!plain) {
    const data = await r.json().catch(() => ({}));
    if (!r.ok) throw Object.assign(new Error(data?.error || `HTTP ${r.status}`), { status: r.status, data });
    return data;
  } else {
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return r;
  }
}

export const apiGet  = (path)           => coreFetch(path);
export const apiPost = (path, body)     => coreFetch(path, { method:'POST', body });
export const apiPatch= (path, body)     => coreFetch(path, { method:'PATCH', body });
export const apiDel  = (path)           => coreFetch(path, { method:'DELETE' });
