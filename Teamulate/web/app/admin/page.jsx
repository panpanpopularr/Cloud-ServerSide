// web/app/admin/page.jsx
'use client';

import useSWR from 'swr';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo } from 'react';
import { API, swrFetcher, apiPatch, apiDelete } from '@/lib/api';

export default function AdminPage() {
  const router = useRouter();

    const onLogout = async () => {
    try { await fetch(`${API}/auth/logout`, { method: 'POST', credentials: 'include' }); } catch {}
    router.replace('/login');
  };

  // 1) โหลดข้อมูลตัวเองเสมอ (อย่ามี if ครอบ hook)
  const { data: meResp } = useSWR(`${API}/auth/me`, swrFetcher, {
    shouldRetryOnError: false,
  });
  const me = meResp?.user || meResp;
  const isAdmin = (me?.role || '').toString().toUpperCase() === 'ADMIN';

  // 2) โหลด users แบบมีสิทธิ์เท่านั้น โดยให้ key = null ถ้าไม่ใช่แอดมิน
  const { data, error, mutate } = useSWR(
    () => (isAdmin ? `${API}/admin/users` : null),
    swrFetcher,
    { shouldRetryOnError: false }
  );

  // 3) ถ้าโหลด me แล้วและไม่ใช่ admin -> เด้งกลับ
  useEffect(() => {
    if (me && !isAdmin) router.replace('/workspace'); // หรือ '/'
  }, [me, isAdmin, router]);

  const users = useMemo(() => data?.items || [], [data]);

  const onChangeRole = async (id, role) => {
    await apiPatch(`/admin/users/${id}`, { role });
    mutate();
  };

  const onDelete = async (id) => {
    if (!confirm('ลบผู้ใช้นี้?')) return;
    await apiDelete(`/admin/users/${id}`);
    mutate();
  };

  // Loading / guard UI
  if (!me) {
    return <div style={wrap}>กำลังโหลด...</div>;
  }
  if (!isAdmin) {
    // ระหว่างกำลังเด้งกลับ ให้โชว์ข้อความสั้น ๆ
    return <div style={wrap}>ต้องเป็นผู้ดูแลระบบเท่านั้น</div>;
  }

  // Error กรณี API /admin/users ตอบ 401/403/500
  if (error) {
    return (
      <div style={wrap}>
        <h2>Admin</h2>
        <div style={{opacity:.8}}>ดึงรายการผู้ใช้ไม่สำเร็จ: {error.message || 'error'}</div>
        <div style={{marginTop:12}}>
          <Link href="/workspace" style={btnLink}>← กลับ Workspace</Link>
        </div>
      </div>
    );
  }

  return (
    <div style={wrap}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center', marginBottom:16}}>
        <h2 style={{margin:0}}>Admin · Users</h2>
        <button onClick={onLogout} style={btn}>Logout</button>
      </div>

      <table style={table}>
        <thead>
          <tr>
            <th style={th}>ID</th>
            <th style={th}>Email</th>
            <th style={th}>Name</th>
            <th style={th}>Role</th>
            <th style={th}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {users.map(u => (
            <tr key={u.id}>
              <td style={tdMono}>{u.id}</td>
              <td style={td}>{u.email}</td>
              <td style={td}>{u.name || '-'}</td>
              <td style={td}>
                <select
                  value={(u.role || 'USER').toUpperCase()}
                  onChange={(e)=>onChangeRole(u.id, e.target.value)}
                  style={inp}
                  disabled={u.id === me.id} // กันเผลอเปลี่ยน role ตัวเอง
                >
                  <option value="USER">USER</option>
                  <option value="ADMIN">ADMIN</option>
                </select>
              </td>
              <td style={td}>
                <button
                  onClick={()=>onDelete(u.id)}
                  style={btnDanger}
                  disabled={u.id === me.id} // กันลบตัวเอง
                >
                  ลบ
                </button>
              </td>
            </tr>
          ))}
          {users.length === 0 && (
            <tr><td colSpan={5} style={{...td, opacity:.7}}>ไม่มีผู้ใช้</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

/* styles (เล็กๆพอใช้งาน) */
const wrap = { padding:16 };
const table = { width:'100%', borderCollapse:'collapse', background:'#0f1720', border:'1px solid #1e293b', borderRadius:8, overflow:'hidden' };
const th = { textAlign:'left', padding:'10px 12px', borderBottom:'1px solid #1e293b', color:'#cbd5e1' };
const td = { padding:'10px 12px', borderBottom:'1px solid #1e293b' };
const tdMono = { ...td, fontFamily:'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace', fontSize:12 };
const inp = { background:'#0b1320', border:'1px solid #1e2a3a', color:'#e6edf3', padding:'6px 8px', borderRadius:6 };
const btnLink = { padding:'8px 12px', border:'1px solid #294766', borderRadius:8, textDecoration:'none', color:'#e6edf3', background:'#1f3a5f' };
const btnDanger = { padding:'6px 10px', border:'1px solid #b91c1c', borderRadius:8, color:'#fee2e2', background:'#7f1d1d' };
const btn  = { background:'#1f3a5f', border:'1px solid #294766', color:'#e6edf3', padding:'8px 12px', borderRadius:10, cursor:'pointer' };