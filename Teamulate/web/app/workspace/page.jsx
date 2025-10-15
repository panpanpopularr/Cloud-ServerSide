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

  // -------- me (ใช้เป็น guard) --------
  const { data: meResp, isLoading: meLoading } = useSWR(`${API}/auth/me`, swrFetcher);
  const me = meResp?.user || meResp;
  const isAdmin = (me?.role || '').toString().toUpperCase() === 'ADMIN';

  // ถ้าเป็น ADMIN => รีไดเรกต์ออกจากหน้า workspace
  useEffect(() => {
    if (!meLoading && isAdmin) router.replace('/admin');
  }, [meLoading, isAdmin, router]);

  // ให้หน้าไม่ฟลิกระหว่างรอเช็คสิทธิ์/ระหว่างรีไดเรกต์
  if (meLoading || isAdmin) {
    return (
      <div style={{ padding: 16 }}>
        {meLoading ? 'Loading…' : 'Redirecting to Admin…'}
      </div>
    );
  }

  // -------- projects / selected --------
  const { data: projects, mutate: refetchProjects } =
    useSWR(() => (isAdmin ? null : `${API}/projects`), swrFetcher);

  const [pname, setPname] = useState('');
  const [pdesc, setPdesc] = useState('');
  const [selected, setSelected] = useState(null);

  // project detail (หา ownerId)
  const { data: selectedProject } = useSWR(
    () => (!isAdmin && selected ? `${API}/projects/${selected}` : null),
    swrFetcher
  );
  const ownerId =
    selectedProject?.ownerId ||
    (projects?.find?.((p) => p.id === selected)?.ownerId) ||
    null;
  const isOwner = me?.id && ownerId && me.id === ownerId;

  // -------- tasks / files / activity / members (เรียกเฉพาะไม่ใช่ admin) --------
  const { data: tasksRaw, mutate: refetchTasks } =
    useSWR(() => (!isAdmin && selected ? `${API}/projects/${selected}/tasks` : null), swrFetcher);
  const tasks = Array.isArray(tasksRaw) ? tasksRaw :
    (tasksRaw && Array.isArray(tasksRaw.items) ? tasksRaw.items : []);

  const { data: files, mutate: refetchFiles } =
    useSWR(() => (!isAdmin && selected ? `${API}/projects/${selected}/files` : null), swrFetcher);

  const { data: activity, mutate: refetchActivity } =
    useSWR(() => (!isAdmin && selected ? `${API}/projects/${selected}/activity` : null), swrFetcher);

  const { data: members, mutate: refetchMembers } =
    useSWR(() => (!isAdmin && selected ? `${API}/projects/${selected}/members` : null), swrFetcher);

  const fileRef = useRef();
  const [inviteText, setInviteText] = useState('');
  const [savingId, setSavingId] = useState(null);
  const [msg, setMsg] = useState('');

  // socket (เฉพาะไม่ใช่ admin)
  useEffect(() => {
    if (isAdmin || !selected) return;
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

  // -------- Activity renderer --------
  const renderActivity = (a) => {
    const { time, date } = formatDateTime(a.createdAt);
    const p = a.payload || {};
    const by = p.byName || p.by || p.byEmail || p.byId || 'system';

    const Row = ({ title, children }) => (
      <>
        <div style={{fontWeight:700}}>{title}</div>
        {children}
        <div style={{fontSize:12, opacity:.7}}>โดย {by} · {date} {time}</div>
      </>
    );

    if (a.type === 'TASK_STATUS_CHANGED')
      return <Row title="Edit Task">
        <div>ชื่อ: {p.title || taskTitleById(p.taskId)}</div>
        <div>สถานะ: {labelOf(p.from)} → {labelOf(p.to)}</div>
      </Row>;

    if (a.type === 'TASK_CREATED')
      return <Row title="Create task"><div>ชื่อ: {p.title ?? taskTitleById(p.taskId)}</div></Row>;

    if (a.type === 'TASK_DELETED')
      return <Row title="Delete task"><div>ชื่อ/ID: {taskTitleById(p.taskId)}</div></Row>;

    if (a.type === 'TASK_ASSIGNED')
      return <Row title="Assign task"><div>ชื่อ: {p.title || taskTitleById(p.taskId)}</div><div>ผู้รับผิดชอบ: {p.to || '—'}</div></Row>;

    if (a.type === 'TASK_COMMENTED')
      return <Row title="Comment task"><div>ชื่อ: {p.title || taskTitleById(p.taskId)}</div><div>ข้อความ: {p.comment}</div></Row>;

    if (a.type === 'FILE_UPLOADED')
      return <Row title="Upload file"><div>ชื่อ: {p.name ?? '(unknown)'}</div></Row>;

    if (a.type === 'FILE_DELETED')
      return <Row title="Delete file"><div>ชื่อ: {p.name ?? '(unknown)'}</div></Row>;

    if (a.type === 'PROJECT_CREATED')
      return <Row title="Create project"><div>ชื่อ: {p.name ?? '(no-name)'}</div></Row>;

    if (a.type === 'MEMBER_ADDED')
      return <Row title="Add member"><div>userId: {p.userId}</div></Row>;

    if (a.type === 'MEMBER_REMOVED')
      return <Row title="Remove member"><div>userId: {p.userId}</div></Row>;

    return <Row title={a.type}>
      <pre style={{margin:0,fontSize:12,opacity:.85,whiteSpace:'pre-wrap'}}>{JSON.stringify(a.payload,null,2)}</pre>
    </Row>;
  };

  // -------- actions --------
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

  const assignTask = async (taskId, userId) => {
    try {
      setSavingId(taskId);
      await apiPatch(`/tasks/${taskId}/assign`, { userId: userId || null });
      await refetchTasks();
    } catch (e) { alert('มอบหมายงานไม่สำเร็จ: ' + e.message); }
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
          <span style={{ opacity:.8 }}>{me ? `${me.name || 'User'} · ${me.id}` : '—'}</span>
          <Link href="/profile" style={{ ...btn, textDecoration:'none' }}>Profile</Link>
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
                {(me?.id === p.ownerId) && (
                  <button onClick={() => deleteProject(p.id)} style={{ ...btn, background:'#7f1d1d', border:'1px solid #b91c1c', padding:'8px 10px' }}>✕</button>
                )}
              </div>
            </li>
          )) || <div style={{ opacity:.7 }}>No projects.</div>}
        </ul>

        {/* Members */}
        {selected && (
          <div style={{ marginTop:16 }}>
            <h4 style={{ margin:'16px 0 8px' }}>Members</h4>

            {isOwner ? (
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
                const removable = (isOwner) && uid !== ownerId;
                return (
                  <li key={uid || '(no id)'} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:8, padding:'6px 8px', border:'1px solid #1f2a3a', borderRadius:10, marginBottom:6 }}>
                    <div>
                      <div style={{ fontWeight:600 }}>
                        {uname} <span style={{opacity:.6, fontSize:12}}>· {uid}</span>
                        {uid === ownerId && <span style={{marginLeft:6, fontSize:12, opacity:.8}}>(owner)</span>}
                      </div>
                      <div style={{ opacity:.7, fontSize:12 }}>{uemail}</div>
                    </div>
                    {removable ? (
                      <button onClick={()=>removeMember(uid)} style={{ ...btn, background:'#7f1d1d', border:'1px solid #b91c1c', padding:'6px 10px' }}>Remove</button>
                    ) : <div style={{ fontSize:12, opacity:.5 }} />}
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
                        <div style={{ fontWeight:600 }}>
                          <Link href={`/tasks/${t.id}`} style={{ color:'#93c5fd', textDecoration:'none' }}>{t.title}</Link>
                        </div>
                        <div style={{ fontSize:12, opacity:.7 }}>
                          สถานะ: {labelOf(t.status)} · กำหนดส่ง {t.deadline || '—'} · ผู้รับผิดชอบ: {t.assignee?.name || t.assignee?.email || '—'}
                        </div>
                      </div>

                      <div style={{ display:'flex', gap:8, alignItems:'center' }}>
                        {/* มอบหมายงาน: เฉพาะ owner */}
                        {isOwner && (
                          <select
                            value={t.assigneeId || ''}
                            onChange={e=>assignTask(t.id, e.target.value || null)}
                            disabled={savingId === t.id}
                            style={{ ...inp, minWidth:180, opacity: savingId === t.id ? 0.6 : 1 }}
                          >
                            <option value="">— ไม่มอบหมาย —</option>
                            {(members ?? []).map(m => (
                              <option key={m.user?.id || m.userId} value={m.user?.id || m.userId}>
                                {m.user?.name || m.user?.email || m.userId}
                              </option>
                            ))}
                          </select>
                        )}

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

      {/* Activity (เลื่อนแยก) */}
      <div style={{ ...card, maxHeight: 'calc(100vh - 140px)' }}>
        <h3 style={{ marginTop:0 }}>Activity</h3>
        {!selected && <div style={{ opacity:.7 }}>Select a project.</div>}
        {selected && (
          <div style={{ overflowY:'auto', maxHeight:'calc(100vh - 180px)' }}>
            <ul style={{ listStyle:'none', padding:0 }}>
              {activity?.items?.map(a=>(
                <li key={a.id} style={{ padding:'6px 0', borderBottom:'1px solid #1f2a3a' }}>
                  {renderActivity(a)}
                </li>
              )) || <div style={{ opacity:.7 }}>No activity.</div>}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}

const card = { padding:12, background:'#0f1720', border:'1px solid #1e293b', borderRadius:12 };
const btn  = { background:'#1f3a5f', border:'1px solid #294766', color:'#e6edf3', padding:'8px 12px', borderRadius:10, cursor:'pointer' };
const inp  = { background:'#0b1320', border:'1px solid #1e2a3a', color:'#e6edf3', padding:'8px 10px', borderRadius:8 };
