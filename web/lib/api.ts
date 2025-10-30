// web/lib/api.ts
export const API_BASE = process.env.NEXT_PUBLIC_API_URL; // เช่น https://teamulate-env.eba-xxxx.us-east-1.elasticbeanstalk.com

export async function apiFetch(path: string, init?: RequestInit) {
  const res = await fetch(`${API_BASE}${path}`, {
    credentials: 'include', // ถ้า login ด้วย cookie
    headers: { 'Content-Type': 'application/json' },
    ...init,
  });
  return res;
}
