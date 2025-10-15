export const API = process.env.NEXT_PUBLIC_API || 'http://localhost:4000';

async function parse(r) {
  const text = await r.text();
  try { return JSON.parse(text); } catch { return { error: text || `HTTP ${r.status}` }; }
}

export async function apiGet(path) {
  const r = await fetch(`${API}${path}`, { credentials: 'include' });
  if (!r.ok) throw new Error((await parse(r)).error || `HTTP ${r.status}`);
  return parse(r);
}

export async function apiPost(path, body) {
  const r = await fetch(`${API}${path}`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body || {}),
  });
  if (!r.ok) throw new Error((await parse(r)).error || `HTTP ${r.status}`);
  return parse(r);
}
