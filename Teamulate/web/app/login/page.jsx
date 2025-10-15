'use client';
import { useEffect, useState } from 'react';
import { API, apiGet, apiPost } from '@/lib/api';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [email,setEmail] = useState('');
  const [password,setPassword] = useState('');
  const [err,setErr] = useState('');

  useEffect(() => {
    apiGet('/auth/me')
      .then(r => {
        if (r.user?.role === 'ADMIN') router.replace('/admin');
        else if (r.user) router.replace('/workspace');
      })
      .catch(()=>{})
      .finally(()=>setLoading(false));
  }, [router]);

  const submit = async (e) => {
    e.preventDefault();
    setErr('');
    try {
      const r = await apiPost('/auth/login', { email, password });
      if (r.user?.role === 'ADMIN') router.replace('/admin');
      else router.replace('/workspace');
    } catch {
      setErr('Login failed');
    }
  };

  if (loading) return null;

  return (
    <div style={wrap}>
      <div style={card}>
        <h1 style={{ marginBottom: 12 }}>Login</h1>
        <p style={{ opacity: .8, marginBottom: 18 }}>Login to continue to MyApp</p>

        <a href={`${API}/auth/google`} style={gbtn}>
          <span style={{fontWeight:600}}>Sign in with Google</span>
        </a>

        <div style={{textAlign:'center', opacity:.7, margin:'12px 0'}}>OR</div>

        <form onSubmit={submit} style={{display:'grid', gap:10}}>
          <input placeholder="Email" value={email} onChange={e=>setEmail(e.target.value)} style={inp}/>
          <input placeholder="Password" type="password" value={password} onChange={e=>setPassword(e.target.value)} style={inp}/>
          <button type="submit" style={btn}>Login</button>
        </form>

        {err && <div style={{marginTop:10, color:'#fca5a5'}}>{err}</div>}

        <div style={{ marginTop: 14, fontSize: 12, opacity: .8 }}>
          Don&apos;t have an account? <a href="/register" style={{ color: '#93c5fd' }}>Register</a>
        </div>
      </div>
    </div>
  );
}

const wrap = { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #7289da, #99aab5)' };
const card = { width: 360, background: '#2f3136', color: '#fff', padding: 32, borderRadius: 12, boxShadow: '0 10px 25px rgba(0,0,0,.5)', textAlign: 'center' };
const gbtn = { display:'flex', alignItems:'center', justifyContent:'center', gap:10, background:'#fff', color:'#000', padding:'10px 14px', borderRadius:8, textDecoration:'none', fontWeight:600 };
const btn = { background:'#1f3a5f', border:'1px solid #294766', color:'#e6edf3', padding:'10px 12px', borderRadius:10, cursor:'pointer' };
const inp = { background:'#0b1320', border:'1px solid #1e2a3a', color:'#e6edf3', padding:'10px 12px', borderRadius:8 };
