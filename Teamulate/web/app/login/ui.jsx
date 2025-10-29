'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { apiGet, apiPost, API, googleLoginUrl } from '@/lib/api';
import { mutate as swrMutate } from 'swr';

export default function LoginPage() {
  const router = useRouter();
  const sp = useSearchParams();

  const [checking, setChecking] = useState(true);
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr]           = useState('');
  const [info, setInfo]         = useState('');

  const didFinalize = useRef(false);

  // อ่าน query
  const inbound = useMemo(() => {
    const auth  = sp?.get('auth');
    const token = sp?.get('token');
    return { auth, token };
  }, [sp]);

  /** ส่งไปตาม role */
  function goByRole(roleLike) {
    const role = String(roleLike ?? '').trim().toLowerCase();
    const isAdmin =
      role === 'admin' || role === 'administrator' ||
      role === 'superadmin' || role === 'root' || role === 'owner';
    router.replace(isAdmin ? '/admin' : '/workspace');
  }

  /** กรณี refresh ถ้ามี session อยู่แล้วให้เด้งเลย */
  useEffect(() => {
    (async () => {
      try {
        const r = await apiGet('/auth/me');
        const role = r?.user?.role ?? r?.role;
        if (role) {
          goByRole(role);
          return;
        }
      } catch {/* ignore */}
      finally { setChecking(false); }
    })();
  }, []); // eslint-disable-line

  /** ✅ รับ token จาก Google -> finalize -> redirect */
  useEffect(() => {
    (async () => {
      if (didFinalize.current) return;
      if (!inbound?.token) {
        // โชว์ข้อความกรณีมีแค่ ?auth=google
        if (inbound?.auth === 'google') setInfo('Signed in with Google successfully.');
        if (inbound?.auth === 'failed') setErr('Google sign-in failed. Please try again.');
        if (inbound?.auth === 'error')  setErr('An error occurred during Google sign-in.');
        return;
      }

      try {
        didFinalize.current = true; // กันยิงซ้ำ
        setInfo('Finalizing sign-in…');

        const res = await fetch(`${API}/auth/finalize`, {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token: inbound.token }),
        });
        if (!res.ok) {
          const j = await res.json().catch(()=>({}));
          throw new Error(j?.error || 'finalize_failed');
        }

        // refresh cache /auth/me เพื่อให้ header/หน้าถัดไปเห็นชื่อทันที
        await swrMutate(`${API}/auth/me`, undefined, { revalidate: true });

        // อ่าน role แล้วเด้ง
        const me = await apiGet('/auth/me').catch(() => ({}));
        goByRole(me?.user?.role ?? me?.role);
      } catch (e) {
        setErr(e?.message || 'Google finalize failed');
      }
    })();
  }, [inbound]); // eslint-disable-line

  async function onSubmit(e) {
    e.preventDefault();
    setErr('');
    try {
      const r = await apiPost('/auth/login', { email, password });
      const user = r?.user ?? r ?? {};
      const role = user.role;

      // อัปเดต /auth/me cache เผื่อ header ใช้
      await swrMutate(`${API}/auth/me`, { user }, { revalidate: false });

      if (role) goByRole(role);
      else {
        const me = await apiGet('/auth/me').catch(() => ({}));
        goByRole(me?.user?.role ?? me?.role);
      }
    } catch (e) {
      setErr(e?.message || 'login failed');
    }
  }

  function onGoogle() {
    const url = (typeof googleLoginUrl === 'function')
      ? googleLoginUrl()
      : `${API}/auth/google`;
    window.location.href = url;
  }

  if (checking) return <div style={wrap}>Checking session…</div>;

  return (
    <div style={wrap}>
      <div style={card}>
        <h2 style={{marginBottom: 6}}>Welcome back</h2>
        <p style={{opacity:.8, marginBottom: 16}}>Sign in to continue</p>

        {info && <div style={bannerInfo}>{info}</div>}
        {err  && <div style={bannerErr}>{err}</div>}

        <form onSubmit={onSubmit} style={{display:'grid', gap:10}}>
          <input style={inp} value={email} onChange={e=>setEmail(e.target.value)} placeholder="Email" type="email" autoComplete="email" />
          <input style={inp} value={password} onChange={e=>setPassword(e.target.value)} placeholder="Password" type="password" autoComplete="current-password" />
          <button style={btnPrimary} type="submit">Login</button>
        </form>

        <div style={{margin: '12px 0', display:'grid', gridTemplateColumns:'1fr 1fr', gap:10}}>
          <button style={btnGhost} onClick={onGoogle}>
            <span style={{display:'inline-flex', gap:8, alignItems:'center'}}>
              <GoogleIcon/> Sign in with Google
            </span>
          </button>
          <a href="/register" style={{...btnGhost, textAlign:'center', lineHeight:'38px', textDecoration:'none'}}>Create account</a>
        </div>
      </div>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48">
      <path d="M44.5 20H24v8.5h11.8C34.9 33.7 30.1 37 24 37c-7.2 0-13-5.8-13-13S16.8 11 24 11c3.1 0 5.9 1.1 8.1 2.9l6-6C34.5 4.6 29.5 3 24 3 12.3 3 3 12.3 3 24s9.3 21 21 21c10.5 0 19.5-7.6 21-17.5V20z"></path>
    </svg>
  );
}

/* ---- styles ---- */
const wrap = { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent:'center', background: 'linear-gradient(135deg, #7289da, #99aab5)' };
const card = { width: 380, background: '#2f3136', color: '#fff', padding: 22, borderRadius: 14, boxShadow: '0 10px 25px rgba(0,0,0,.5)', textAlign: 'center' };
const btnPrimary = { background:'#1f3a5f', border:'1px solid #294766', color:'#e6edf3', padding:'10px 12px', borderRadius:10, cursor:'pointer' };
const btnGhost = { background:'transparent', border:'1px solid #334155', color:'#e6edf3', padding:'8px 10px', borderRadius:10, cursor:'pointer' };
const inp = { background:'#0b1320', border:'1px solid #1e2a3a', color:'#e6edf3', padding:'10px 12px', borderRadius:8 };
const bannerErr  = { background: '#ef444422', color: '#fecaca', padding: '8px 10px', borderRadius: 8, marginBottom: 10, border: '1px solid #ef4444' };
const bannerInfo = { background: '#22c55e22', color: '#bbf7d0', padding: '8px 10px', borderRadius: 8, marginBottom: 10, border: '1px solid #22c55e' };
