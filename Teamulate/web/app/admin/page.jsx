'use client';

import useSWR from 'swr';
import { apiGet, apiPatch, apiDelete } from '@/lib/api';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

const fetcher = (url) => apiGet(url.replace(/^.*(?=\/admin)/,'')); // for SWR key

export default function AdminPage() {
  const router = useRouter();
  const { data, mutate } = useSWR('/admin/users', fetcher);
  const [me, setMe] = useState(null);

  useEffect(() => {
    apiGet('/auth/me').then(r=>{
      setMe(r.user);
      if (r.user?.role !== 'ADMIN') router.replace('/workspace');
    }).catch(()=> router.replace('/login'));
  }, [router]);

  if (!me) return null;

  const onNameChange = async (id, name) => {
    await apiPatch(`/admin/users/${id}`, { name });
    await mutate();
  };
  const onRoleChange = async (id, role) => {
    await apiPatch(`/admin/users/${id}`, { role });
    await mutate();
  };
  const onDelete = async (id) => {
    if (!confirm('Delete this user?')) return;
    await apiDelete(`/admin/users/${id}`);
    await mutate();
  };

  return (
    <div style={{padding:16}}>
      <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12}}>
        <div style={{fontWeight:700}}>Admin · User Management</div>
        <a href="/workspace" style={link}>Back to Workspace</a>
      </div>

      <div style={{border:'1px solid #1e293b', borderRadius:10}}>
        <table style={{width:'100%', borderCollapse:'collapse'}}>
          <thead>
            <tr style={trHead}>
              <th style={th}>ID</th>
              <th style={th}>Email</th>
              <th style={th}>Name</th>
              <th style={th}>Role</th>
              <th style={th}>Created</th>
              <th style={th}></th>
            </tr>
          </thead>
          <tbody>
            {data?.items?.map(u=>(
              <tr key={u.id} style={trBody}>
                <td style={tdMono}>{u.id}</td>
                <td style={td}>{u.email}</td>
                <td style={td}>
                  <input
                    defaultValue={u.name || ''}
                    onBlur={e=> onNameChange(u.id, e.target.value)}
                    style={inp}
                  />
                </td>
                <td style={td}>
                  <select defaultValue={u.role} onChange={e=> onRoleChange(u.id, e.target.value)} style={inp}>
                    <option value="USER">USER</option>
                    <option value="ADMIN">ADMIN</option>
                  </select>
                </td>
                <td style={td}>{new Date(u.createdAt).toLocaleString()}</td>
                <td style={td}>
                  <button onClick={()=>onDelete(u.id)} style={btnDanger}>Delete</button>
                </td>
              </tr>
            )) || null}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const link = { color:'#93c5fd', textDecoration:'none' };
const trHead = { background:'#0f172a' };
const trBody = { borderTop:'1px solid #1f2a3a' };
const th = { textAlign:'left', padding:'10px 12px', fontWeight:700 };
const td = { padding:'8px 12px' };
const tdMono = { padding:'8px 12px', fontFamily:'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace', fontSize:12 };
const inp = { background:'#0b1320', border:'1px solid #1e2a3a', color:'#e6edf3', padding:'6px 8px', borderRadius:8 };
const btnDanger = { background:'#7f1d1d', border:'1px solid #b91c1c', color:'#fff', padding:'6px 10px', borderRadius:8, cursor:'pointer' };
