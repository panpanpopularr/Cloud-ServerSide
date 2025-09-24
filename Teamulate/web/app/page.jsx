'use client';

import useSWR from 'swr';
import { useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';

const API = 'http://localhost:4000';
const fetcher = (url) => fetch(url, { cache: 'no-store' }).then(r => r.json());

const STATUS = [
  { code: 'ACTIVE',     label: 'กำลังทำ' },
  { code: 'UNASSIGNED', label: 'ยังไม่มอบหมาย' },
  { code: 'CANCELED',   label: 'ยกเลิก' },
  { code: 'REVIEW',     label: 'กำลังตรวจ' },
  { code: 'DONE',       label: 'เสร็จแล้ว' },
];
const codeToLabel = (c) => STATUS.find(s => s.code === c)?.label ?? c ?? '—';
const DEFAULT_STATUS = 'UNASSIGNED';

export default function Page() {
  // projects
  const { data: projects, mutate: refetchProjects } = useSWR(`${API}/projects`, fetcher);
  const [pname, setPname] = useState(''); const [pdesc, setPdesc] = useState('');
  const [selected, setSelected] = useState(null);

  // tasks
  const { data: tasks = [], mutate: refetchTasks } =
    useSWR(() => selected ? `${API}/projects/${selected}/tasks` : null, fetcher);
  const [title, setTitle] = useState(''); const [deadline, setDeadline] = useState('');
  const [statusNew, setStatusNew] = useState(DEFAULT_STATUS);

  // files
  const { data: files = [], mutate: refetchFiles } =
    useSWR(() => selected ? `${API}/projects/${selected}/files` : null, fetcher);
  const fileRef = useRef();

  // activity
  const { data: activity, mutate: refetchActivity } =
    useSWR(() => selected ? `${API}/projects/${selected}/activity` : null, fetcher);

  // socket
  useEffect(() => {
    if (!selected) return;
    const socket = io(API);
    socket.emit('join', { projectId: selected });
    socket.on('activity:new', () => {
      refetchActivity(); refetchTasks(); refetchFiles();
    });
    return () => socket.disconnect();
  }, [selected]); // eslint-disable-line

  // actions
  const createProject = async () => {
    if (!pname.trim()) return;
    const r = await fetch(`${API}/projects`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ name:pname, description:pdesc }) });
    if (!r.ok) return alert('สร้างโปรเจกต์ไม่สำเร็จ');
    const proj = await r.json();
    setPname(''); setPdesc('');
    await refetchProjects();
    setSelected(proj.id);
  };

  const deleteProject = async (id) => {
    if (!confirm('ลบโปรเจกต์นี้?')) return;
    const r = await fetch(`${API}/projects/${id}`, { method:'DELETE' });
    if (!r.ok) return alert('ลบโปรเจกต์ไม่สำเร็จ');
    if (selected === id) setSelected(null);
    await refetchProjects();
  };

  const createTask = async () => {
    if (!selected || !title.trim()) return;
    const r = await fetch(`${API}/projects/${selected}/tasks`, {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ title, deadline, status: statusNew })
    });
    if (!r.ok) return alert('เพิ่มงานไม่สำเร็จ');
    setTitle(''); setDeadline(''); setStatusNew(DEFAULT_STATUS);
    await refetchTasks();
  };

  const changeTaskStatus = async (task, newCode) => {
    const r = await fetch(`${API}/tasks/${task.id}`, {
      method:'PATCH', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ status: newCode })
    });
    if (!r.ok) { alert('อัปเดตสถานะไม่สำเร็จ'); return; }
    await refetchTasks();
  };

  const deleteTask = async (id) => {
    if (!confirm('ลบงานนี้?')) return;
    const r = await fetch(`${API}/tasks/${id}`, { method:'DELETE' });
    if (!r.ok) return alert('ลบงานไม่สำเร็จ');
    await refetchTasks();
  };

  const uploadFile = async () => {
    if (!selected || !fileRef.current?.files?.[0]) return;
    const fd = new FormData();
    fd.append('file', fileRef.current.files[0]);
    const r = await fetch(`${API}/projects/${selected}/files/upload`, { method:'POST', body: fd });
    if (!r.ok) return alert('อัปโหลดไม่สำเร็จ');
    fileRef.current.value = '';
    await refetchFiles();
  };

  return (
    <div style={{ display:'grid', gridTemplateColumns:'300px 1fr 380px', gap:16 }}>
      {/* Projects */}
      <div style={card}>
        <h3 style={{ marginTop:0 }}>Projects</h3>
        <input placeholder="Name" value={pname} onChange={e=>setPname(e.target.value)} style={inp}/>
        <input placeholder="Description" value={pdesc} onChange={e=>setPdesc(e.target.value)} style={inp}/>
        <button onClick={createProject} style={btn}>Create</button>

        <ul style={{ listStyle:'none', padding:0, marginTop:12 }}>
          {projects?.length ? projects.map(p=>(
            <li key={p.id} style={{ display:'flex', gap:8, marginBottom:8 }}>
              <button style={{ ...btn, flex:1, background:selected===p.id?'#2563eb':'#122338' }} onClick={()=>setSelected(p.id)}>{p.name}</button>
              <button onClick={()=>deleteProject(p.id)} style={{...btn, background:'#7f1d1d'}}>ลบ</button>
            </li>
          )) : <div style={{ opacity:.7 }}>No projects.</div>}
        </ul>
      </div>

      {/* Center */}
      <div style={{ display:'grid', gap:16 }}>
        {/* Tasks */}
        <div style={card}>
          <h3 style={{ marginTop:0 }}>Tasks</h3>
          {!selected ? <div style={{ opacity:.7 }}>Select a project.</div> : (
            <>
              <div style={{ display:'flex', gap:8 }}>
                <input placeholder="Task title" value={title} onChange={e=>setTitle(e.target.value)} style={{...inp, flex:1}}/>
                <input type="date" value={deadline} onChange={e=>setDeadline(e.target.value)} style={inp}/>
                <select value={statusNew} onChange={e=>setStatusNew(e.target.value)} style={inp}>
                  {STATUS.map(s => <option key={s.code} value={s.code}>{s.label}</option>)}
                </select>
                <button onClick={createTask} style={{...btn, opacity:!title.trim()?0.6:1}} disabled={!title.trim()}>Add</button>
              </div>
              <ul style={{ listStyle:'none', padding:0, marginTop:12 }}>
                {tasks.length ? tasks.map(t=>(
                  <li key={t.id} style={{ padding:8, border:'1px solid #1f2a3a', borderRadius:10, marginBottom:8 }}>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', gap:8 }}>
                      <div>
                        <div style={{ fontWeight:600 }}>{t.title}</div>
                        <div style={{ fontSize:12, opacity:.7 }}>สถานะ: {codeToLabel(t.status)} · กำหนดส่ง {t.deadline || '—'}</div>
                      </div>
                      <div style={{ display:'flex', gap:8 }}>
                        <select value={t.status ?? DEFAULT_STATUS} onChange={(e)=>changeTaskStatus(t, e.target.value)} style={inp}>
                          {STATUS.map(s => <option key={s.code} value={s.code}>{s.label}</option>)}
                        </select>
                        <button onClick={()=>deleteTask(t.id)} style={{...btn, background:'#7f1d1d'}}>ลบ</button>
                      </div>
                    </div>
                  </li>
                )) : <div style={{ opacity:.7 }}>No tasks.</div>}
              </ul>
            </>
          )}
        </div>

        {/* Files */}
        <div style={card}>
          <h3 style={{ marginTop:0 }}>Files</h3>
          {!selected ? <div style={{ opacity:.7 }}>Select a project.</div> : (
            <>
              <div style={{ display:'flex', gap:8 }}>
                <input type="file" ref={fileRef} style={{ flex:1 }}/>
                <button onClick={uploadFile} style={btn}>Upload</button>
              </div>
              <ul style={{ listStyle:'none', padding:0, marginTop:12 }}>
                {files.length ? files.map(f=>(
                  <li key={f.id} style={{ padding:8, border:'1px solid #1f2a3a', borderRadius:10, marginBottom:8 }}>
                    <a href={`${API}/uploads/${f.projectId}/${f.filename}`} target="_blank" rel="noreferrer" style={{ color:'#93c5fd' }}>
                      {f.originalname}
                    </a>
                    <div style={{ fontSize:12, opacity:.7 }}>{(f.size/1024).toFixed(1)} KB</div>
                  </li>
                )) : <div style={{ opacity:.7 }}>No files.</div>}
              </ul>
            </>
          )}
        </div>
      </div>

      {/* Activity */}
      <div style={card}>
        <h3 style={{ marginTop:0 }}>Activity</h3>
        {!selected ? <div style={{ opacity:.7 }}>Select a project.</div> : (
          <ul style={{ listStyle:'none', padding:0 }}>
            {activity?.items?.map(a=>(
              <li key={a.id} style={{ padding:'6px 0', borderBottom:'1px solid #1f2a3a' }}>
                <div style={{ fontSize:14, fontWeight:600 }}>{a.type}</div>
                <pre style={{ margin:0, fontSize:12, opacity:.8, whiteSpace:'pre-wrap' }}>{JSON.stringify(a.payload, null, 2)}</pre>
                <div style={{ fontSize:11, opacity:.6 }}>{new Date(a.createdAt).toLocaleString()}</div>
              </li>
            )) || <div style={{ opacity:.7 }}>No activity.</div>}
          </ul>
        )}
      </div>
    </div>
  );
}

const card = { padding:12, background:'#0f1720', border:'1px solid #1e293b', borderRadius:12 };
const btn  = { background:'#1f3a5f', border:'1px solid #294766', color:'#e6edf3', padding:'8px 12px', borderRadius:10, cursor:'pointer' };
const inp  = { background:'#0b1320', border:'1px solid #1e2a3a', color:'#e6edf3', padding:'8px 10px', borderRadius:8 };
