// web/lib/api.js
export const API = process.env.NEXT_PUBLIC_API || 'http://localhost:4000';

async function request(path, opts = {}) {
  const res = await fetch(`${API}${path}`, {
    // สำคัญที่สุด: ส่งคุ้กกี้ไปด้วยทุกครั้ง
    credentials: 'include',
    headers: {
      ...(opts.body && { 'Content-Type': 'application/json' }),
      ...(opts.headers || {}),
    },
    ...opts,
  });

  // แปลงผลลัพธ์
  const isJSON = res.headers.get('content-type')?.includes('application/json');
  const data = isJSON ? await res.json().catch(() => ({})) : await res.text();

  if (!res.ok) {
    const msg = (data && data.error) || res.statusText || `HTTP ${res.status}`;
    const err = new Error(msg);
    err.status = res.status;
    err.body = data;
    throw err;
  }
  return data;
}

// ใช้งานทั่วไป
export const apiGet    = (p)       => request(p, { method: 'GET' });
export const apiPost   = (p, body) => request(p, { method: 'POST',  body: JSON.stringify(body ?? {}) });
export const apiPatch  = (p, body) => request(p, { method: 'PATCH', body: JSON.stringify(body ?? {}) });
export const apiDelete = (p)       => request(p, { method: 'DELETE' });

// ใช้กับ SWR (ต้องส่งคุ้กกี้ด้วย)
export const swrFetcher = (url) =>
  fetch(url, { credentials: 'include', cache: 'no-store' })
    .then(r => {
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return r.json();
    });
