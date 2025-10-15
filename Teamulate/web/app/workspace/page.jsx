'use client';

import useSWR from 'swr';
import { useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import { API, apiGet, apiPost, apiPatch, apiDelete, swrFetcher } from '@/lib/api';

const STATUS = [
  { code: 'ACTIVE',     label: 'กำลังทำ' },
  { code: 'UNASSIGNED', label: 'ยังไม่มอบหมาย' },
  { code: 'CANCELED',   label: 'ยกเลิก' },
  { code: 'REVIEW',     label: 'กำลังตรวจ' },
  { code: 'DONE',       label: 'เสร็จแล้ว' },
];
const DEFAULT_STATUS_CODE = 'UNASSIGNED';

// fetcher ที่แนบคุกกี้เสมอ
const swrFetcher = (url) =>
  fetch(url, { credentials: 'include' }).then(async (r) => {
    if (!r.ok) {
      let msg = 'request failed';
      try { const j = await r.json(); msg = j?.error || msg; } catch {}
      throw new Error(msg);
    }
    return r.json();
  });

function formatDateTime(ts) {
  const d = new Date(ts);
  return { time: d.toLocaleTimeString(), date: d.toLocaleDateString() };
}
function renderActivity(a) {
  const { time, date } = formatDateTime(a.createdAt);
  const p = a.payload || {};
  switch (a.type) {
    case 'FILE_UPLOADED':
      return (<><div style={{fontWeight:600}}>Upload file</div><div>ชื่อ: {p.name ?? '(unknown)'}</div><div>เวลา {time} วันที่ {date}</div></>);
    case 'FILE_DELETED':
      return (<><div style={{fontWeight:600}}>Delete file</div><div>ชื่อ: {p.name ?? '(unknown)'}</div><div>เวลา {time} วันที่ {date}</div></>);
    case 'TASK_CREATED':
      return (<><div style={{fontWeight:600}}>Create task</div><div>ชื่อ: {p.title ?? '(untitled)'}</div><div>เวลา {time} วันที่ {date}</div></>);
    case 'PROJECT_CREATED':
      return (<><div style={{fontWeight:600}}>Create project</div><div>ชื่อ: {p.name ?? '(no-name)'}</div><div>เวลา {time} วันที่ {date}</div></>);
    default:
      return (<><div style={{fontWeight:600}}>{a.type}</div><pre style={{margin:0,fontSize:12,opacity:.85,whiteSpace:'pre-wrap'}}>{JSON.stringify(a.payload,null,2)}</pre><div style={{fontSize:11,opacity:.6}}>{date} {time}</div></>);
  }
}

export default function Page() {
  // Projects
  const { data: projects, mutate: refetchProjects } = useSWR(`${API}/projects`, swrFetcher);
  const [pname, setPname] = useState('');
  const [pdesc, setPdesc] = useState('');
  const [selected, setSelected] = useState(null); // projectId

  // Tasks
  const { data: tasks = [], mutate: refetchTasks } =
    useSWR(() => selected ? `${API}/projects/${selected}/tasks` : null, swrFetcher);

  // Files
  const { data: files = [], mutate: refetchFiles } =
    useSWR(() => selected ? `${API}/projects/${selected}/files` : null, swrFetcher);
  const fileRef = useRef();

  // Activity
  const { data: activity = { items: [] }, mutate: refetchActivity } =
    useSWR(() => selected ? `${API}/projects/${selected}/activity` : null, swrFetcher);

  const [savingId, setSavingId] = useState(null);
  const [msg, setMsg] = useState('');

  // socket
  useEffect(() => {
    if (!selected) return;
    const socket = io(API, {
      path: '/socket.io',
      transports: ['websocket'],
      withCredentials: true,
    });
    socket.emit('join', { projectId: selected });
    socket.on('activity:new', () => {
      refetchActivity();
      refetchTasks();
      refetchFiles();
    });
    return () => socket.disconnect();
  }, [selected, refetchActivity, refetchTasks, refetchFiles]);

  // actions
  const createProject = async () => {
    if (!pname.trim()) return;
    try {
      const proj = await apiPost('/projects', { name: pname, description: pdesc });
      setPname(''); setPdesc('');
      await refetchProjects();          // โหลดใหม่จากเซิร์ฟเวอร์
      setSelected(proj.id);
    } catch (e) {
      alert('สร้างโปรเจ็กต์ไม่สำเร็จ: ' + (e.message || ''));
    }
  };

  const deleteProject = async (id) => {
    if (!confirm('ยืนยันลบโปรเจกต์นี้? งาน ไฟล์ และกิจกรรมที่เกี่ยวข้องจะถูกลบถาวร')) return;
    const prev = projects ?? [];
    // optimistic update
    await refetchProjects(prev.filter(p => p.id !== id), { revalidate: false });
    try {
      await apiDelete(`/projects/${id}`);
      if (selected === id) setSelected(null);
      await Promise.all([refetchProjects(), refetchTasks(), refetchFiles(), refetchActivity()]);
    } catch (e) {
      await refetchProjects(prev, { revalidate:false });
      alert('ลบโปรเจ็กต์ไม่สำเร็จ: ' + (e.message || ''));
    }
  };

  const createTask = async () => {
    if (!selected) return;
    const title = (document.getElementById('taskTitle')?.value || '').trim();
    const deadline = document.getElementById('taskDeadline')?.value || '';
    const status = document.getElementById('taskStatus')?.value || DEFAULT_STATUS_CODE;
    if (!title) return;
    try {
      await apiPost(`/projects/${selected}/tasks`, { title, deadline, status });
      document.getElementById('taskTitle').value = '';
      document.getElementById('taskDeadline').value = '';
      await refetchTasks();
      await refetchActivity();
    } catch (e) {
      alert('เพิ่มงานไม่สำเร็จ: ' + (e.message || ''));
    }
  };

  const changeTaskStatus = async (taskId, newCode) => {
    try {
      setSavingId(taskId);
      await apiPatch(`/tasks/${taskId}`, { status: newCode });
      await refetchTasks();
      setMsg(`อัปเดตสถานะเรียบร้อย`);
      setTimeout(() => setMsg(''), 1500);
    } catch (e) {
      alert('อัปเดตสถานะไม่สำเร็จ: ' + (e.message || ''));
    } finally {
      setSavingId(null);
    }
  };

  const uploadFile = async () => {
    if (!selected || !fileRef.current?.files?.[0]) return;
    const fd = new FormData();
    fd.append('file', fileRef.current.files[0]);
    try {
      const res = await fetch(`${API}/projects/${selected}/files/upload`, {
        method:'POST',
        credentials: 'include',       // แนบคุกกี้
        body: fd
      });
      if (!res.ok) throw new Error((await res.json()).error || `HTTP ${res.status}`);
      fileRef.current.value = '';
      await refetchFiles();
      await refetchActivity();
    } catch (e) {
      alert('อัปโหลดไม่สำเร็จ: ' + (e.message || ''));
    }
  };

  const deleteFile = async (fileId) => {
    if (!confirm('ลบไฟล์นี้ใช่ไหม?')) return;
    try {
      await apiDelete(`/files/${fileId}`);
      await refetchFiles();
      await refetchActivity();
    } catch (e) {
      alert('ลบไฟล์ไม่สำเร็จ: ' + (e.message || ''));
    }
  };

  // UI
  return (
    <div style={{ display:'grid', gridTemplateColumns:'300px 1fr 380px', gap:16 }}>
      {/* Projects */}
      <div style={card}>
        <h3 style={{ marginTop:0 }}>Projects</h3>
        <div>
          <input placeholder="Name" value={pname} onChange={e=>setPname(e.target.value)} style={inp} />
          <input placeholder="Description" value={pdesc} onChange={e=>setPdesc(e.target.value)} style={inp} />
          <button onClick={createProject} style={btn}>Create</button>
        </div>
        <ul style={{ listStyle:'none', padding:0, marginTop:12 }}>
          {projects?.map(p=>(
            <li key={p.id} style={{ marginBottom:8 }}>
              <div style={{ display:'flex', gap:8 }}>
                <button
                  style={{ ...btn, flex:1, background:selected===p.id?'#2563eb':'#122338' }}
                  onClick={()=>setSelected(p.id)}
                  title="เลือกโปรเจกต์"
                >
                  {p.name}
                </button>
                <button
                  onClick={() => deleteProject(p.id)}
                  style={{ ...btn, background:'#7f1d1d', border:'1px solid #b91c1c', padding:'8px 10px' }}
                  title="ลบโปรเจกต์นี้"
                >
                  ✕
                </button>
              </div>
            </li>
          )) || <div style={{ opacity:.7 }}>No projects.</div>}
        </ul>
      </div>

      {/* Tasks */}
      <div style={{ display:'grid', gap:16 }}>
        <div style={card}>
          <h3 style={{ marginTop:0 }}>Tasks</h3>
          {!selected && <div style={{ opacity:.7 }}>Select a project.</div>}
          {selected && (
            <>
              <div style={{ display:'flex', gap:8 }}>
                <input id="taskTitle" placeholder="Task title" style={{...inp, flex:1}} />
                <input id="taskDeadline" type="date" style={inp} />
                <select id="taskStatus" defaultValue="UNASSIGNED" style={inp}>
                  {STATUS.map(s => <option key={s.code} value={s.code}>{s.label}</option>)}
                </select>
                <button onClick={createTask} style={btn}>Add</button>
              </div>

              {msg && <div style={{ marginTop:8, fontSize:12, opacity:.8 }}>{msg}</div>}

              <ul style={{ listStyle:'none', padding:0, marginTop:12 }}>
                {tasks.length > 0 ? tasks.map(t=>(
                  <li key={t.id} style={{ padding:8, border:'1px solid #1f2a3a', borderRadius:10, marginBottom:8 }}>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', gap:8 }}>
                      <div>
                        <div style={{ fontWeight:600 }}>{t.title}</div>
                        <div style={{ fontSize:12, opacity:.7 }}>
                          สถานะ: {STATUS.find(s=>s.code===t.status)?.label ?? t.status} · กำหนดส่ง {t.deadline || '—'}
                        </div>
                      </div>
                      <select
                        value={t.status}
                        onChange={(e)=> changeTaskStatus(t.id, e.target.value)}
                        disabled={savingId === t.id}
                        style={{ ...inp, opacity: savingId === t.id ? 0.6 : 1 }}
                      >
                        {STATUS.map(s => <option key={s.code} value={s.code}>{s.label}</option>)}
                      </select>
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
          {!selected && <div style={{ opacity:.7 }}>Select a project.</div>}
          {selected && (
            <>
              <div style={{ display:'flex', gap:8 }}>
                <input type="file" ref={fileRef} style={{ flex:1 }} />
                <button onClick={uploadFile} style={btn}>Upload</button>
              </div>
              <ul style={{ listStyle:'none', padding:0, marginTop:12 }}>
                {files?.map(f=>(
                  <li key={f.id} style={{ padding:8, border: "1px solid #1f2a3a", borderRadius:10, marginBottom:8, display:'flex', justifyContent:'space-between', alignItems:'center', gap:12 }}>
                    <div>
                      <a
                        href={`${API}/uploads/${f.projectId}/${f.filename || f.s3Key || ''}`}
                        target="_blank" rel="noreferrer" style={{ color:'#93c5fd' }}
                      >
                        {f.originalname || f.name || 'file'}
                      </a>
                      <div style={{ fontSize:12, opacity:.7 }}>{(f.size/1024).toFixed(1)} KB</div>
                    </div>
                    <button
                      onClick={()=>deleteFile(f.id)}
                      title="Delete"
                      style={{ ...btn, background:'#7f1d1d', border:'1px solid #b91c1c', padding:'8px 10px' }}
                    >
                      🗑
                    </button>
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
                {renderActivity(a)}
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
