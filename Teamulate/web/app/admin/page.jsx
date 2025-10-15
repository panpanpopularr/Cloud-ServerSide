'use client';

import useSWR from 'swr';
import { useRouter } from 'next/navigation';
import { API, swrFetcher, apiPatch, apiDelete } from '@/lib/api';

const btn  = { background:'#1f3a5f', border:'1px solid #294766', color:'#e6edf3', padding:'8px 12px', borderRadius:10, cursor:'pointer' };
const inp  = { background:'#0b1320', border:'1px solid #1e2a3a', color:'#e6edf3', padding:'8px 10px', borderRadius:8 };

export default function AdminPage() {
  const router = useRouter();

  // โหลด me เพื่อ guard หน้า
  const { data: meResp, error: meErr } = useSWR(`${API}/auth/me`, swrFetcher);
  const me = meResp?.user || meResp;
  const isAdmin = (me?.role || '').toString().toUpperCase() === 'ADMIN';

  // ถ้าไม่ใช่ admin ให้เด้งกลับ workspace
  if (meResp && !isAdmin) {
    if (typeof window !== 'undefined') router.replace('/workspace');
    return <div style={{padding:20}}>Forbidden</div>;
  }

  // โหลด users
  const { data, mutate } = useSWR(`${API}/admin/users`, swrFetcher);
  const users = data?.items || [];

  const onChangeRole = async (id, role) => {
    await apiPatch(`/admin/users/${id}`, { role });
    mutate();
  };

  const onChangeName = async (id, name) => {
    await apiPatch(`/admin/users/${id}`, { name });
    mutate();
  };

  const onDelete = async (id) => {
    if (!confirm('ลบผู้ใช้นี้?')) return;
    await apiDelete(`/admin/users/${id}`);
    mutate();
  };

  return (
    <div style={{ padding: 16 }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
        <h2 style={{ margin:0 }}>Admin · Users</h2>
        <div style={{ display:'flex', gap:8 }}>
          <button onClick={()=>router.push('/workspace')} style={btn}>← Back</button>
        </div>
      </div>

      {!data ? (
        <div>Loading…</div>
      ) : (
        <table style={{ width:'100%', borderCollapse:'collapse' }}>
          <thead>
            <tr>
              <th style={th}>ID</th>
              <th style={th}>Email</th>
              <th style={th}>Name</th>
              <th style={th}>Role</th>
              <th style={th}></th>
            </tr>
          </thead>
          <tbody>
            {users.map(u=>(
              <tr key={u.id}>
                <td style={tdMono}>{u.id}</td>
                <td style={td}>{u.email}</td>
                <td style={td}>
                  <input
                    defaultValue={u.name || ''}
                    onBlur={(e)=> onChangeName(u.id, e.target.value)}
                    style={{...inp, width:'100%'}}
                  />
                </td>
                <td style={td}>
                  <select
                    defaultValue={(u.role || '').toUpperCase()}
                    onChange={(e)=> onChangeRole(u.id, e.target.value)}
                    style={inp}
                  >
                    <option value="USER">USER</option>
                    <option value="ADMIN">ADMIN</option>
                  </select>
                </td>
                <td style={tdRight}>
                  <button onClick={()=>onDelete(u.id)} style={{...btn, background:'#7f1d1d', border:'1px solid #b91c1c'}}>Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

const th = { textAlign:'left', borderBottom:'1px solid #1e293b', padding:'8px 6px', fontWeight:600 };
const td = { borderBottom:'1px solid #1e293b', padding:'8px 6px' };
const tdMono = { ...td, fontFamily:'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace', fontSize:12, opacity:.9 };
const tdRight = { ...td, textAlign:'right' };
