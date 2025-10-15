'use client';

import { useEffect, useState } from 'react';
import { API, apiGet, apiPost } from '@/lib/api';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function RegisterPage() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [name, setName] = useState('');
  const [email,setEmail] = useState('');
  const [password,setPassword] = useState('');
  const [err,setErr] = useState('');

  useEffect(() => {
    apiGet('/auth/me')
      .then(r => { if (r.user) router.replace('/workspace'); })
      .catch(()=>{})
      .finally(()=> setChecking(false));
  }, [router]);

  const onSubmit = async (e) => {
    e.preventDefault();
    setErr('');
    try {
      await apiPost('/auth/register', { name, email, password });
      // login auto หรือจะให้ user ใส่ใหม่ก็ได้ — ที่นี่ login auto
      await apiPost('/auth/login', { email, password });
      router.replace('/workspace');
      setTimeout(()=>{ window.location.href='/workspace'; }, 50);
    } catch (e) {
      setErr(e?.data?.error || 'Register failed');
    }
  };

  if (checking) return null;

  return (
    <div style={wrap}>
      <div style={card}>
        <h1 style={{marginBottom:12}}>Create Account</h1>
        <p style={{opacity:.8, marginBottom:18}}>Register to start using MyApp</p>

        <a href={`${API}/auth/google`} style={gbtn}>
          <img src="https://upload.wikimedia.org/wikipedia/commons/5/53/Google_%22G%22_Logo.svg" alt="" style={{width:20,height:20}}/>
          <span>Register with Google</span>
        </a>

        <div style={{ margin: '12px 0', opacity:.6 }}>OR</div>

        <form onSubmit={onSubmit} style={{ display:'grid', gap:10 }}>
          <input value={name} onChange={e=>setName(e.target.value)} placeholder="Full name" style={inp}/>
          <input value={email} onChange={e=>setEmail(e.target.value)} placeholder="Email" type="email" style={inp}/>
          <input value={password} onChange={e=>setPassword(e.target.value)} placeholder="Password" type="password" style={inp}/>
          <button type="submit" style={btn}>Register</button>
        </form>

        {err && <div style={{marginTop:10, color:'#fecaca'}}>{err}</div>}

        <div style={{marginTop:14, fontSize:12, opacity:.8}}>
          Already have an account? <Link href="/login" style={{color:'#93c5fd'}}>Login</Link>
        </div>
      </div>
    </div>
  );
}

const wrap = { minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'linear-gradient(135deg, #7289da, #99aab5)' };
const card = { width:360, background:'#2f3136', color:'#fff', padding:32, borderRadius:12, boxShadow:'0 10px 25px rgba(0,0,0,.5)', textAlign:'center' };
const gbtn = { display:'flex', gap:10, alignItems:'center', justifyContent:'center', background:'#fff', color:'#000', padding:'10px 14px', borderRadius:8, textDecoration:'none', fontWeight:600 };
const btn  = { background:'#1f3a5f', border:'1px solid #294766', color:'#e6edf3', padding:'8px 12px', borderRadius:10, cursor:'pointer' };
const inp  = { background:'#0b1320', border:'1px solid #1e2a3a', color:'#e6edf3', padding:'10px 12px', borderRadius:8 };
