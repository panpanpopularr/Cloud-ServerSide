'use client';
import { useEffect, useState } from 'react';
import { API, apiGet, apiPost } from '@/lib/api';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [email,setEmail] = useState('');
  const [password,setPassword] = useState('');
  const [err, setErr] = useState('');

  // ถ้า login อยู่แล้ว -> ไป workspace
  useEffect(() => {
    apiGet('/auth/me')
      .then(r => { if (r.user) router.replace('/workspace'); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [router]);

  if (loading) return null;

  const submit = async (e) => {
    e.preventDefault();
    setErr('');
    try {
      await apiPost('/auth/login', { email, password });
      router.replace('/workspace');
    } catch (ex) {
      setErr('อีเมลหรือรหัสผ่านไม่ถูกต้อง');
    }
  };

  return (
    <div style={wrap}>
      <div style={card}>
        <h1 style={{ marginBottom: 12 }}>Login</h1>
        <p style={{ opacity: .8, marginBottom: 18 }}>Login to continue to MyApp</p>

        <a href={`${API}/auth/google`} style={gbtn}>
          <img src="https://upload.wikimedia.org/wikipedia/commons/5/53/Google_%22G%22_Logo.svg" alt="" style={{width:20,height:20}}/>
          <span>Sign in with Google</span>
        </a>

        <div style={divider}><span>OR</span></div>

        <form onSubmit={submit} style={{ textAlign:'left' }}>
          <input
            value={email}
            onChange={e=>setEmail(e.target.value)}
            placeholder="Email"
            type="email"
            required
            style={inp}
          />
          <input
            value={password}
            onChange={e=>setPassword(e.target.value)}
            placeholder="Password"
            type="password"
            required
            style={inp}
          />
          {err && <div style={{ color:'#fecaca', fontSize:12, marginBottom:8 }}>{err}</div>}
          <button type="submit" style={btn}>Login</button>
        </form>

        <div style={{ marginTop: 14, fontSize: 12, opacity: .8 }}>
          Don&apos;t have an account? <a href="/register" style={{ color: '#93c5fd' }}>Register</a>
        </div>
      </div>
    </div>
  );
}

const wrap = { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #7289da, #99aab5)' };
const card = { width: 360, background: '#2f3136', color: '#fff', padding: 32, borderRadius: 12, boxShadow: '0 10px 25px rgba(0,0,0,.5)', textAlign: 'center' };
const gbtn = { display: 'flex', gap: 10, alignItems: 'center', justifyContent: 'center', background: '#fff', color: '#000', padding: '10px 14px', borderRadius: 8, textDecoration: 'none', fontWeight: 600 };
const divider = { display:'flex', alignItems:'center', gap:10, color:'#b9bbbe', fontSize:12, margin:'18px 0', justifyContent:'center' };
const inp = { width:'100%', padding:'10px', marginBottom:12, borderRadius:6, border:'none', outline:'none' };
const btn = { width:'100%', padding:'10px', borderRadius:6, border:'none', background:'#7289da', color:'#fff', fontWeight:600, cursor:'pointer' };
