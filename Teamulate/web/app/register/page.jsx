'use client';
import { useEffect, useRef, useState } from 'react';
import { API, apiGet, apiPost } from '@/lib/api';
import { useRouter } from 'next/navigation';

export default function RegisterPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;
    apiGet('/auth/me')
      .then(r => { if (r.user) router.replace('/workspace'); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [router]);

  async function onSubmit(e) {
    e.preventDefault();
    const name = e.currentTarget.name.value.trim();
    const email = e.currentTarget.email.value.trim();
    const password = e.currentTarget.password.value.trim();
    if (!name || !email || !password) return;
    try {
      await apiPost('/auth/register', { name, email, password });
      router.replace('/workspace');
    } catch {
      alert('register failed');
    }
  }

  if (loading) return null;

  return (
    <div style={wrap}>
      <div style={card}>
        <h1 style={{marginBottom:12}}>Create Account</h1>
        <p style={{opacity:.8, marginBottom:18}}>Register to start using MyApp</p>

        <a href={`${API}/auth/google`} style={gbtn}>
          <img src="/google.svg" alt="" width={20} height={20} />
          <span>Register with Google</span>
        </a>

        <div style={{ margin: '12px 0', opacity: .7 }}>OR</div>

        <form onSubmit={onSubmit}>
          <input name="name" placeholder="Name" style={inp} />
          <input name="email" placeholder="Email" style={inp} />
          <input name="password" placeholder="Password" type="password" style={inp} />
          <button type="submit" style={btn}>Register</button>
        </form>

        <div style={{marginTop:14, fontSize:12, opacity:.8}}>
          Already have an account? <a href="/login" style={{color:'#93c5fd'}}>Login</a>
        </div>
      </div>
    </div>
  );
}

const wrap = { minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'linear-gradient(135deg, #7289da, #99aab5)' };
const card = { width:360, background:'#2f3136', color:'#fff', padding:32, borderRadius:12, boxShadow:'0 10px 25px rgba(0,0,0,.5)', textAlign:'center' };
const gbtn = { display:'flex', gap:10, alignItems:'center', justifyContent:'center', background:'#fff', color:'#000', padding:'10px 14px', borderRadius:8, textDecoration:'none', fontWeight:600 };
const inp = { width:'100%', padding:'10px 12px', borderRadius:8, border:'none', outline:'none', marginBottom:10, background:'#0b1320', color:'#fff' };
const btn = { width:'100%', background:'#1f3a5f', border:'1px solid #294766', color:'#e6edf3', padding:'10px 12px', borderRadius:8, cursor:'pointer' };
