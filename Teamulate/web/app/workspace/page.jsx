// web/app/workspace/page.jsx
'use client';

import useSWR from 'swr';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import { API, apiPost, apiPatch, apiDelete, swrFetcher } from '@/lib/api';

const STATUS = [
  { code: 'ACTIVE',     label: 'กำลังทำ' },
  { code: 'UNASSIGNED', label: 'ยังไม่มอบหมาย' },
  { code: 'CANCELED',   label: 'ยกเลิก' },
  { code: 'REVIEW',     label: 'กำลังตรวจ' },
  { code: 'DONE',       label: 'เสร็จแล้ว' },
];
const DEFAULT_STATUS_CODE = 'UNASSIGNED';
const labelOf = (code) =>
  ({ ACTIVE:'กำลังทำ', UNASSIGNED:'ยังไม่มอบหมาย', CANCELED:'ยกเลิก', REVIEW:'กำลังตรวจ', DONE:'เสร็จแล้ว' }[code]) || code;

function formatDateTime(ts) {
  const d = new Date(ts);
  return { time: d.toLocaleTimeString(), date: d.toLocaleDateString() };
}

export default function Page() {
  const router = useRouter();

  // me (รองรับทั้ง {user:{...}} และ {...})
  const { data: meResp } = useSWR(`${API}/auth/me`, swrFetcher);
  const me = meResp?.user || meResp;
  const isAdmin = (me?.role || '').toString().toUpperCase() === 'ADMIN';

  // projects
  const { data: projects, mutate: refetchProjects } = useSWR(`${API}/projects`, swrFetcher);
  const [pname, setPname] = useState('');
  const [pdesc, setPdesc] = useState('');
  const [selected, setSelected] = useState(null);

  // project detail (เพื่อรู้ ownerId)
  const { data: selectedProject } = useSWR(
    () => (selected ? `${API}/projects/${selected}` : null),
    swrFetcher
  );
  const ownerId =
    selectedProject?.ownerId ||
    (projects?.find?.((p) => p.id === selected)?.ownerId) ||
    null;
  const isOwner = me?.id && ownerId && me.id === ownerId;

  // tasks
  const { data: tasksRaw, mutate: refetchTasks } =
    useSWR(() => selected ? `${API}/projects/${selected}/tasks` : null, swrFetcher);
  const tasks = Array.isArray(tasksRaw) ? tasksRaw :
    (tasksRaw && Array.isArray(tasksRaw.items) ? tasksRaw.items : []);

  // files
  const { data: files, mutate: refetchFiles } =
    useSWR(() => selected ? `${API}/projects/${selected}/files` : null, swrFetcher);
  const fileRef = useRef();

  // activity
  const { data: activity, mutate: refetchActivity } =
    useSWR(() => selected ? `${API}/projects/${selected}/activity` : null, swrFetcher);

  // members
  const { data: members, mutate: refetchMembers } =
    useSWR(() => selected ? `${API}/projects/${selected}/members` : null, swrFetcher);
  const [inviteText, setInviteText] = useState('');

  const [savingId, setSavingId] = useState(null);
  const [msg, setMsg] = useState('');

  // socket
  useEffect(() => {
    if (!selected) return;
    const socket = io(API, { path: '/socket.io', transports: ['websocket'], withCredentials: true });
    socket.emit('join', { projectId: selected });
    socket.on('activity:new', () => {
      refetchActivity();
      refetchTasks();
      refetchFiles();
      refetchMembers();
    });
    return () => socket.disconnect();
  }, [selected]); // eslint-disable-line

  const taskTitleById = (id) => {
    const t = (Array.isArray(tasks) ? tasks : []).find(x => x.id === id);
    return t?.title || id;
  };

  const renderActivity = (a) => {
    const { time, date } = formatDateTime(a.createdAt);
    const p = a.payload || {};
    if (a.type === 'TASK_STATUS_CHANGED') {
      return (
        <>
          <div style={{fontWeight:700}}>Edit Task</div>
          <div>ชื่อ: {p.title || taskTitleById(p.taskId)}</div>
          <div>สถานะ: {labelOf(p.from)} → {labelOf(p.to)}</div>
          <div style={{fontSize:12, opacity:.7}}>โดย {p.by ?? 'system'} · {date} {time}</div>
        </>
      );
    }
    if (a.type === 'TASK_CREATED') {
      return (<><div style={{fontWeight:700}}>Create task</div><div>ชื่อ: {p.title ?? taskTitleById(p.taskId)}</div><div style={{fontSize:12, opacity:.7}}>{date} {time}</div></>);
    }
    if (a.type === 'TASK_DELETED') {
      return (<><div style={{fontWeight:700, color:'#fca5a5'}}>Delete task</div><div>ชื่อ/ID: {taskTitleById(p.taskId)}</div><div style={{fontSize:12, opacity:.7}}>โดย {p.by ?? 'system'} · {date} {time}</div></>);
    }
    if (a.type === 'FILE_UPLOADED') return (<><div style={{fontWeight:600}}>Upload file</div><div>ชื่อ: {p.name ?? '(unknown)'}</div><div>เวลา {time} วันที่ {date}</div></>);
    if (a.type === 'FILE_DELETED') return (<><div style={{fontWeight:600}}>Delete file</div><div>ชื่อ: {p.name ?? '(unknown)'}</div><div>เวลา {time} วันที่ {date}</div></>);
    if (a.type === 'PROJECT_CREATED') return (<><div style={{fontWeight:600}}>Create project</div><div>ชื่อ: {p.name ?? '(no-name)'}</div><div>เวลา {time} วันที่ {date}</div></>);
    if (a.type === 'MEMBER_ADDED') return (<><div style={{fontWeight:600}}>Add member</div><div>userId: {p.userId}</div><div>{date} {time}</div></>);
    if (a.type === 'MEMBER_REMOVED') return (<><div style={{fontWeight:600}}>Remove member</div><div>userId: {p.userId}</div><div>{date} {time}</div></>);
    return (<><div style={{fontWeight:600}}>{a.type}</div><pre style={{margin:0,fontSize:12,opacity:.85,whiteSpace:'pre-wrap'}}>{JSON.stringify(a.payload,null,2)}</pre><div style={{fontSize:11,opacity:.6}}>{date} {time}</div></>);
  };

  // actions
  const createProject = async () => {
    if (!pname.trim()) return;
    try {
      const proj = await apiPost('/projects', { name: pname, description: pdesc });
      setPname(''); setPdesc('');
      await refetchProjects(prev => [proj, ...(prev ?? [])], { revalidate: false });
      setSelected(proj.id);
      await refetchProjects();
    } catch (e) { alert('สร้างโปรเจ็กต์ไม่สำเร็จ: ' + e.message); }
  };

  const deleteProject = async (id) => {
    if (!confirm('ยืนยันลบโปรเจกต์นี้? งาน ไฟล์ และกิจกรรมที่เกี่ยวข้องจะถูกลบถาวร')) return;
    const prev = projects ?? [];
    await refetchProjects(prev.filter(p => p.id !== id), { revalidate:false });
    try {
      await apiDelete(`/projects/${id}`);
      if (selected === id) setSelected(null);
      await Promise.all([refetchProjects(), refetchTasks(), refetchFiles(), refetchActivity(), refetchMembers()]);
    } catch (e) {
      await refetchProjects(prev, { revalidate:false });
      alert('ลบโปรเจกต์ไม่สำเร็จ: ' + e.message);
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
    } catch (e) { alert('เพิ่มงานไม่สำเร็จ: ' + e.message); }
  };

  const changeTaskStatus = async (taskId, newCode) => {
    try {
      setSavingId(taskId);
      await apiPatch(`/tasks/${taskId}`, { status: newCode });
      await refetchTasks();
      setMsg(`อัปเดตสถานะเรียบร้อย`);
      setTimeout(() => setMsg(''), 1500);
    } catch (e) { alert('อัปเดตสถานะไม่สำเร็จ: ' + e.message); }
    finally { setSavingId(null); }
  };

  const deleteTask = async (taskId) => {
    if (!confirm('ลบงานนี้ใช่ไหม?')) return;
    try {
      await apiDelete(`/tasks/${taskId}`);
      await refetchTasks();
      await refetchActivity();
    } catch (e) { alert('ลบงานไม่สำเร็จ: ' + e.message); }
  };

  const uploadFile = async () => {
    if (!selected || !fileRef.current?.files?.[0]) return;
    const fd = new FormData(); fd.append('file', fileRef.current.files[0]);
    try {
      const res = await fetch(`${API}/projects/${selected}/files/upload`, { method:'POST', credentials:'include', body: fd });
      if (!res.ok) throw new Error((await res.json()).error || `HTTP ${res.status}`);
      fileRef.current.value = '';
      await refetchFiles(); await refetchActivity();
    } catch (e) { alert('อัปโหลดไม่สำเร็จ: ' + e.message); }
  };

  const deleteFile = async (fileId) => {
    if (!confirm('ลบไฟล์นี้ใช่ไหม?')) return;
    try { await apiDelete(`/files/${fileId}`); await refetchFiles(); await refetchActivity(); }
    catch (e) { alert('ลบไฟล์ไม่สำเร็จ: ' + e.message); }
  };

  // members
  const inviteMember = async () => {
    if (!selected) return;
    const userId = inviteText.trim();
    if (!userId) return alert('กรอก userId ก่อนครับ');
    try { await apiPost(`/projects/${selected}/members`, { userId }); setInviteText(''); await refetchMembers(); await refetchActivity(); }
    catch (e) { alert('เชิญไม่สำเร็จ: ' + e.message); }
  };

  const removeMember = async (userId) => {
    if (!selected) return;
    if (!confirm('เอาสมาชิกคนนี้ออกจากโปรเจกต์?')) return;
    try { await apiDelete(`/projects/${selected}/members/${userId}`); await refetchMembers(); await refetchActivity(); }
    catch (e) { alert('ลบสมาชิกไม่สำเร็จ: ' + e.message); }
  };

  // logout
  const onLogout = async () => {
    try { await fetch(`${API}/auth/logout`, { method: 'POST', credentials: 'include' }); } catch {}
    router.replace('/login');
  };

  return (
    <div style={{ display:'grid', gridTemplateColumns:'340px 1fr 380px', gap:16 }}>
      {/* Header */}
      <div style={{ gridColumn:'1 / -1', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
        <div style={{ fontWeight:600 }}>Teamulate</div>
        <div style={{ display:'flex', alignItems:'center', gap:12 }}>
          {isAdmin && <Link href="/admin" style={{ ...btn, textDecoration:'none' }}>Admin</Link>}
          <span style={{ opacity:.8 }}>{me ? `${me.name || 'User'} · ${me.id}` : '—'}</span>
          <button onClick={onLogout} style={btn}>Logout</button>
        </div>
      </div>

      {/* Projects + Members */}
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
                >
                  {p.name}
                </button>
                {/* ให้ลบโปรเจ็กต์เฉพาะ owner (หรือ admin) */}
                {(me?.id === p.ownerId || isAdmin) && (
                  <button
                    onClick={() => deleteProject(p.id)}
                    style={{ ...btn, background:'#7f1d1d', border:'1px solid #b91c1c', padding:'8px 10px' }}
                    title="ลบโปรเจกต์นี้"
                  >
                    ✕
                  </button>
                )}
              </div>
            </li>
          )) || <div style={{ opacity:.7 }}>No projects.</div>}
        </ul>

        {/* Members (กลับมาแล้ว) */}
        {selected && (
          <div style={{ marginTop:16 }}>
            <h4 style={{ margin:'16px 0 8px' }}>Members</h4>

            {/* เชิญสมาชิก: เฉพาะเจ้าของโปรเจกต์/แอดมิน */}
            {(isOwner) ? (
              <div style={{ display:'flex', gap:8 }}>
                <input
                  placeholder="เชิญด้วย userId"
                  value={inviteText}
                  onChange={e=>setInviteText(e.target.value)}
                  style={{...inp, flex:1}}
                />
                <button onClick={inviteMember} style={btn}>Invite</button>
              </div>
            ) : (
              <div style={{ fontSize:12, opacity:.7, marginBottom:8 }}>
                คุณเป็นสมาชิกของโปรเจกต์นี้ (สิทธิ์อ่านรายชื่อเท่านั้น)
              </div>
            )}

            <ul style={{ listStyle:'none', padding:0, marginTop:12 }}>
              {(members ?? []).length > 0 ? (members ?? []).map(m => {
                const uid = m.user?.id || m.userId;
                const uname = m.user?.name || '(no name)';
                const uemail = m.user?.email || '';
                const removable = (isOwner) && uid !== ownerId; // กันไม่ให้ลบเจ้าของเอง
                return (
                  <li
                    key={uid || '(no id)'}
                    style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:8, padding:'6px 8px', border:'1px solid #1f2a3a', borderRadius:10, marginBottom:6 }}
                  >
                    <div>
                      <div style={{ fontWeight:600 }}>
                        {uname} <span style={{opacity:.6, fontSize:12}}>· {uid}</span>
                        {uid === ownerId && <span style={{marginLeft:6, fontSize:12, opacity:.8}}>(owner)</span>}
                      </div>
                      <div style={{ opacity:.7, fontSize:12 }}>{uemail}</div>
                    </div>

                    {/* ปุ่ม Remove เฉพาะ owner / admin */}
                    {removable ? (
                      <button
                        onClick={()=>removeMember(uid)}
                        style={{ ...btn, background:'#7f1d1d', border:'1px solid #b91c1c', padding:'6px 10px' }}
                        title="ลบออกจากโปรเจกต์"
                      >
                        Remove
                      </button>
                    ) : (
                      <div style={{ fontSize:12, opacity:.5 }} />
                    )}
                  </li>
                );
              }) : <div style={{ opacity:.7 }}>No members.</div>}
            </ul>
          </div>
        )}
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
                        <div style={{ fontSize:12, opacity:.7 }}>สถานะ: {labelOf(t.status)} · กำหนดส่ง {t.deadline || '—'}</div>
                      </div>
                      <div style={{ display:'flex', gap:8, alignItems:'center' }}>
                        <select value={t.status} onChange={(e)=> changeTaskStatus(t.id, e.target.value)} disabled={savingId === t.id} style={{ ...inp, opacity: savingId === t.id ? 0.6 : 1 }}>
                          {STATUS.map(s => <option key={s.code} value={s.code}>{s.label}</option>)}
                        </select>
                        <button onClick={()=>deleteTask(t.id)} title="ลบงานนี้" style={{ ...btn, background:'#7f1d1d', border:'1px solid #b91c1c', padding:'6px 10px' }}>🗑</button>
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
                      <a href={`${API}/uploads/${f.projectId}/${f.filename || f.s3Key || ''}`} target="_blank" rel="noreferrer" style={{ color:'#93c5fd' }}>
                        {f.originalname || f.name || 'file'}
                      </a>
                      <div style={{ fontSize:12, opacity:.7 }}>{(f.size/1024).toFixed(1)} KB</div>
                    </div>
                    <button onClick={()=>deleteFile(f.id)} title="Delete" style={{ ...btn, background:'#7f1d1d', border:'1px solid #b91c1c', padding:'8px 10px' }}>🗑</button>
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
