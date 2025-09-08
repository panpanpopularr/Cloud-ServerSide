
'use client';

import useSWR from 'swr';
import { useEffect, useMemo, useRef, useState } from 'react';
import { io } from 'socket.io-client';

const API = 'http://localhost:4000';
const fetcher = (url) => fetch(url).then(r=>r.json());

export default function Page() {
  // Projects
  const { data: projects, mutate: refetchProjects } = useSWR(`${API}/projects`, fetcher);
  const [pname, setPname] = useState('');
  const [pdesc, setPdesc] = useState('');
  const [selected, setSelected] = useState(null);

  // Tasks
  const { data: tasks, mutate: refetchTasks } = useSWR(() => selected ? `${API}/projects/${selected}/tasks` : null, fetcher);
  const [title, setTitle] = useState('');
  const [deadline, setDeadline] = useState('');

  // Files
  const { data: files, mutate: refetchFiles } = useSWR(() => selected ? `${API}/projects/${selected}/files` : null, fetcher);
  const fileRef = useRef();

  // Activity
  const { data: activity, mutate: refetchActivity } = useSWR(() => selected ? `${API}/projects/${selected}/activity` : null, fetcher);

  // Socket
  useEffect(()=>{
    if (!selected) return;
    const socket = io(API);
    socket.emit('join', { projectId: selected });
    socket.on('activity:new', () => {
      refetchActivity();
      refetchTasks();
      refetchFiles();
    });
    return () => socket.disconnect();
  }, [selected]);

  const createProject = async () => {
    if (!pname.trim()) return;
    await fetch(`${API}/projects`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ name: pname, description: pdesc })});
    setPname(''); setPdesc('');
    await refetchProjects();
  };

  const createTask = async () => {
    if (!selected || !title.trim()) return;
    await fetch(`${API}/projects/${selected}/tasks`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ title, deadline })});
    setTitle(''); setDeadline('');
    await refetchTasks();
  };

  const uploadFile = async () => {
    if (!selected || !fileRef.current?.files?.[0]) return;
    const fd = new FormData();
    fd.append('file', fileRef.current.files[0]);
    await fetch(`${API}/projects/${selected}/files/upload`, { method:'POST', body: fd });
    fileRef.current.value = '';
    await refetchFiles();
  };

  return (
    <div style={{ display:'grid', gridTemplateColumns:'260px 1fr 320px', gap:16 }}>
      {/* Projects sidebar */}
      <div>
        <div style={{ padding:12, background:'#0f1720', border:'1px solid #1e293b', borderRadius:12 }}>
          <h3 style={{ marginTop:0 }}>Projects</h3>
          <div>
            <input placeholder="Name" value={pname} onChange={e=>setPname(e.target.value)} style={inp} />
            <input placeholder="Description" value={pdesc} onChange={e=>setPdesc(e.target.value)} style={inp} />
            <button onClick={createProject} style={btn}>Create</button>
          </div>
          <ul style={{ listStyle:'none', padding:0, marginTop:12 }}>
            {projects?.map(p=>(
              <li key={p.id}>
                <button style={{ ...btn, width:'100%', background:selected===p.id?'#2563eb':'#122338' }} onClick={()=>setSelected(p.id)}>
                  {p.name}
                </button>
              </li>
            )) || <div style={{ opacity:.7 }}>No projects.</div>}
          </ul>
        </div>
      </div>

      {/* Center: Tasks & Files */}
      <div style={{ display:'grid', gap:16 }}>
        {/* Tasks */}
        <div style={card}>
          <h3 style={{ marginTop:0 }}>Tasks</h3>
          {!selected && <div style={{ opacity:.7 }}>Select a project.</div>}
          {selected && (
            <>
              <div style={{ display:'flex', gap:8 }}>
                <input placeholder="Task title" value={title} onChange={e=>setTitle(e.target.value)} style={{...inp, flex:1}} />
                <input type="date" value={deadline} onChange={e=>setDeadline(e.target.value)} style={inp} />
                <button onClick={createTask} style={btn}>Add</button>
              </div>
              <ul style={{ listStyle:'none', padding:0, marginTop:12 }}>
                {tasks?.map(t=>(
                  <li key={t.id} style={{ padding:8, border:'1px solid #1f2a3a', borderRadius:10, marginBottom:8 }}>
                    <div style={{ fontWeight:600 }}>{t.title}</div>
                    <div style={{ fontSize:12, opacity:.7 }}>{t.status} · {t.deadline || '—'}</div>
                  </li>
                )) || <div style={{ opacity:.7 }}>No tasks.</div>}
              </ul>
            </>
          )}
        </div>

        {/* Files */}
        <div style={card}>
          <h3 style={{ marginTop:0 }}>Files</h3>
          {!selected && <div style={{ opacity:.7 }}>Select a project.</div>}
          {selected && (
            <>
              <div style={{ display:'flex', gap:8 }}>
                <input type="file" ref={fileRef} style={{ flex:1 }} />
                <button onClick={uploadFile} style={btn}>Upload</button>
              </div>
              <ul style={{ listStyle:'none', padding:0, marginTop:12 }}>
                {files?.map(f=>(
                  <li key={f.id} style={{ padding:8, border:'1px solid #1f2a3a', borderRadius:10, marginBottom:8 }}>
                    <a href={`${API}/uploads/${f.projectId}/${f.filename || ''}`} target="_blank" rel="noreferrer" style={{ color:'#93c5fd' }}>
                      {f.originalname || 'file'}
                    </a>
                    <div style={{ fontSize:12, opacity:.7 }}>{(f.size/1024).toFixed(1)} KB</div>
                  </li>
                )) || <div style={{ opacity:.7 }}>No files.</div>}
              </ul>
            </>
          )}
        </div>
      </div>

      {/* Activity */}
      <div style={card}>
        <h3 style={{ marginTop:0 }}>Activity</h3>
        {!selected && <div style={{ opacity:.7 }}>Select a project.</div>}
        {selected && (
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
