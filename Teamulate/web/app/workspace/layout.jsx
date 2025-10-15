'use client';
import { useEffect, useState } from 'react';
import { apiGet, apiPost } from '@/lib/api';
import Link from 'next/link';

export default function WorkspaceLayout({ children }) {
  const [me, setMe] = useState(null);

  useEffect(() => { apiGet('/auth/me').then(r => setMe(r.user)).catch(()=>{}); }, []);

  const onLogout = async () => {
    try { await apiPost('/auth/logout'); window.location.href = '/login'; } catch {}
  };

  return (
    <div>
      <div style={bar}>
        <div><Link href="/workspace" style={{color:'#e5e7eb', textDecoration:'none'}}>Teamulate</Link></div>
        <div style={{display:'flex', alignItems:'center', gap:12}}>
          {me?.role === 'ADMIN' && <Link href="/admin" style={btnLink}>Admin</Link>}
          <span style={{opacity:.9}}>{me?.name || me?.email || ''}</span>
          <button onClick={onLogout} style={btn}>Logout</button>
        </div>
      </div>
      <div>{children}</div>
    </div>
  );
}
const bar = { display:'flex', justifyContent:'space-between', alignItems:'center', padding:'10px 14px', background:'#0b1320', borderBottom:'1px solid #1e293b', color:'#fff' };
const btn  = { background:'#1f3a5f', border:'1px solid #294766', color:'#e6edf3', padding:'6px 10px', borderRadius:8, textDecoration:'none', cursor:'pointer' };
const btnLink = { ...btn, textDecoration:'none' };
