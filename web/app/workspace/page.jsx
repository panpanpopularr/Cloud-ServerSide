'use client';
import { mutate as swrMutate, useSWRConfig } from 'swr';
import useSWR from 'swr';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import { API, apiPost, apiPatch, apiDelete, swrFetcher } from '../../lib/api';

const STATUS = [
  { code: 'ACTIVE', label: 'กำลังทำ' },
  { code: 'UNASSIGNED', label: 'ยังไม่มอบหมาย' },
  { code: 'CANCELED', label: 'ยกเลิก' },
  { code: 'REVIEW', label: 'กำลังตรวจ' },
  { code: 'DONE', label: 'เสร็จแล้ว' },
];
const DEFAULT_STATUS_CODE = 'UNASSIGNED';
const labelOf = (code) =>
  ({ ACTIVE: 'กำลังทำ', UNASSIGNED: 'ยังไม่มอบหมาย', CANCELED: 'ยกเลิก', REVIEW: 'กำลังตรวจ', DONE: 'เสร็จแล้ว' }[code]) || code;

function formatDateTime(ts) {
  const d = new Date(ts);
  return { time: d.toLocaleTimeString(), date: d.toLocaleDateString() };
}

const fileHref = (f) =>
  f?.url ||
  `${API}/uploads/${f.projectId}/${encodeURIComponent(f.filename || f.s3Key || '') || ''}`;

export default function Page() {
  const { mutate } = useSWRConfig();

  useEffect(() => { mutate(`${API}/auth/me`); }, [mutate]);
  useEffect(() => {
    const onFocus = () => mutate(`${API}/auth/me`);
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onFocus);
    return () => {
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onFocus);
    };
  }, [mutate]);

  // me
  const { data: meResp, isLoading: meLoading } = useSWR(`${API}/auth/me`, swrFetcher);
  const me = meResp?.user || meResp;

  // projects
  const { data: projectsRaw, mutate: refetchProjects } = useSWR(`${API}/projects`, swrFetcher);
  const projects = Array.isArray(projectsRaw) ? projectsRaw : (projectsRaw?.items ?? []);

  const [pname, setPname] = useState('');
  const [pdesc, setPdesc] = useState('');
  const [selected, setSelected] = useState(null);

  // project detail
  const { data: selectedProject } = useSWR(() => (selected ? `${API}/projects/${selected}` : null), swrFetcher);
  const ownerId =
    selectedProject?.ownerId ||
    (projects.find?.((p) => p.id === selected)?.ownerId) ||
    null;
  const isOwner = me?.id && ownerId && me.id === ownerId;

  const onLogout = async () => {
    try { await fetch(`${API}/auth/logout`, { method: 'POST', credentials: 'include' }); } catch { }
    await swrMutate(`${API}/auth/me`, { user: null }, { revalidate: false });
    window.location.replace('/login');
  };

  // tasks
  const { data: tasksRaw, mutate: refetchTasks } =
    useSWR(() => (selected ? `${API}/projects/${selected}/tasks` : null), swrFetcher);
  const tasks = Array.isArray(tasksRaw) ? tasksRaw :
    (tasksRaw && Array.isArray(tasksRaw.items) ? tasksRaw.items : []);

  // files
  const { data: filesRaw, mutate: refetchFiles } =
    useSWR(() => (selected ? `${API}/projects/${selected}/files` : null), swrFetcher);
  const files = Array.isArray(filesRaw) ? filesRaw : (filesRaw?.items ?? []);

  // activity
  const { data: activity, mutate: refetchActivity } =
    useSWR(() => (selected ? `${API}/projects/${selected}/activity` : null), swrFetcher);

  // members
  const { data: membersRaw, mutate: refetchMembers } =
    useSWR(() => (selected ? `${API}/projects/${selected}/members` : null), swrFetcher);
  const members = Array.isArray(membersRaw) ? membersRaw : (membersRaw?.items ?? []);

  // ------ Manager (ย้ายมาไว้หลัง members) ------
  const ownerObj =
    selectedProject?.owner ||
    projects.find?.(p => p.id === selected)?.owner ||
    null;

  const managerInfo = (() => {
    // 1) owner object มากับ API
    if (ownerObj) {
      return {
        id: ownerObj.id || ownerId,
        name: ownerObj.name || ownerObj.email || '(no name)',
        email: ownerObj.email || '',
      };
    }
    // 2) หาใน members
    const m = members.find(x => (x.user?.id || x.userId) === ownerId);
    if (m?.user) {
      return {
        id: ownerId,
        name: m.user.name || m.user.email || '(no name)',
        email: m.user.email || '',
      };
    }
    // 3) ไม่เจอจริง ๆ
    return ownerId ? { id: ownerId, name: '(unknown)', email: '' } : null;
  })();
  // ---------------------------------------------

  // ===== Chat =====
  const [chatInput, setChatInput] = useState('');
  const chatBoxRef = useRef(null);
  const { data: chatRaw, mutate: refetchChat } =
    useSWR(() => (selected ? `${API}/projects/${selected}/chat` : null), swrFetcher);
  const chat = Array.isArray(chatRaw?.items) ? chatRaw.items : [];

  useEffect(() => {
    if (!selected) return;
    const socket = io(API, { path: '/socket.io', transports: ['websocket'], withCredentials: true });
    socket.emit('join', { projectId: selected });
    socket.on('activity:new', () => { refetchActivity(); refetchTasks(); refetchFiles(); refetchMembers(); });
    socket.on('chat:new', (msg) => {
      refetchChat((curr) => {
        const list = Array.isArray(curr?.items) ? curr.items : [];
        return { items: [...list, msg] };
      }, { revalidate: false });
      requestAnimationFrame(() => {
        chatBoxRef.current?.scrollTo({ top: chatBoxRef.current.scrollHeight, behavior: 'smooth' });
      });
    });
    return () => socket.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected]);

  const sendChat = async () => {
    const text = chatInput.trim();
    if (!text || !selected) return;
    setChatInput('');
    await fetch(`${API}/projects/${selected}/chat`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    }).catch(() => { });
  };

  useEffect(() => {
    if (chatBoxRef.current) chatBoxRef.current.scrollTop = chatBoxRef.current.scrollHeight;
  }, [selected, chatRaw]);

  const taskTitleById = (id) => {
    const t = (Array.isArray(tasks) ? tasks : []).find(x => x.id === id);
    return t?.title || id;
  };

  const renderActivity = (a) => {
    const { time, date } = formatDateTime(a.createdAt);
    const p = a.payload || {};
    const by = p.byName || p.by || p.byEmail || p.byId || 'system';
    const Row = ({ title, children }) => (
      <>
        <div style={{ fontWeight: 700, overflowWrap: 'anywhere' }}>{title}</div>
        <div style={{ overflowWrap: 'anywhere' }}>{children}</div>
        <div style={{ fontSize: 12, opacity: .7 }}>โดย {by} · {date} {time}</div>
      </>
    );
    if (a.type === 'TASK_STATUS_CHANGED')
      return <Row title="Edit Task"><div>ชื่อ: {p.title || taskTitleById(p.taskId)}</div><div>สถานะ: {labelOf(p.from)} → {labelOf(p.to)}</div></Row>;
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
    return <Row title={a.type}><pre style={{ margin: 0, fontSize: 12, opacity: .85, whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{JSON.stringify(a.payload, null, 2)}</pre></Row>;
  };

  // ===== actions (เหมือนเดิม) =====
  const createProject = async () => {
    if (!pname.trim()) return;
    try {
      const proj = await apiPost('/projects', { name: pname, description: pdesc });
      setPname(''); setPdesc('');
      await refetchProjects((curr) => {
        const list = Array.isArray(curr) ? curr : (curr?.items ?? []);
        return [proj, ...list];
      }, { revalidate: false });
      setSelected(proj.id);
      await refetchProjects();
    } catch (e) { alert('สร้างโปรเจ็กต์ไม่สำเร็จ: ' + e.message); }
  };
  const deleteProject = async (id) => {
    if (!confirm('ยืนยันลบโปรเจกต์นี้? งาน ไฟล์ และกิจกรรมที่เกี่ยวข้องจะถูกลบถาวร')) return;
    const prev = projects ?? [];
    await refetchProjects(prev.filter(p => p.id !== id), { revalidate: false });
    try {
      await apiDelete(`/projects/${id}`);
      if (selected === id) setSelected(null);
      await Promise.all([refetchProjects(), refetchTasks(), refetchFiles(), refetchActivity(), refetchMembers()]);
    } catch (e) {
      await refetchProjects(prev, { revalidate: false });
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
  const [savingId, setSavingId] = useState(null);
  const [msg, setMsg] = useState('');
  const changeTaskStatus = async (taskId, newCode) => {
    try {
      setSavingId(taskId);
      await apiPatch(`/tasks/${taskId}`, { status: newCode });
      await refetchTasks();
      setMsg('อัปเดตสถานะเรียบร้อย');
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
    try { await apiDelete(`/tasks/${taskId}`); await refetchTasks(); await refetchActivity(); }
    catch (e) { alert('ลบงานไม่สำเร็จ: ' + e.message); }
  };
  const fileRef = useRef();
  const uploadFile = async () => {
    if (!selected || !fileRef.current?.files?.[0]) return;
    const file = fileRef.current.files[0];

    try {
      // 1) ขอ presign
      const psRes = await fetch(`${API}/projects/${selected}/files/presign`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename: file.name, contentType: file.type || 'application/octet-stream' }),
      });
      if (!psRes.ok) throw new Error('presign_failed');
      const { url, fields, key } = await psRes.json();

      // 2) อัปโหลดตรงเข้า S3
      const fd = new FormData();
      Object.entries(fields).forEach(([k, v]) => fd.append(k, v));
      fd.append('file', file);
      const s3Res = await fetch(url, { method: 'POST', body: fd });
      if (!s3Res.ok) throw new Error('s3_upload_failed');

      // 3) แจ้ง API ให้สร้างเรคอร์ด/แอคทิวิตี้
      const commitRes = await fetch(`${API}/projects/${selected}/files/commit`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          key,
          filename: file.name,       // เก็บชื่อเดิม (ไทย)
          size: file.size,
          mimetype: file.type || 'application/octet-stream',
        }),
      });
      if (!commitRes.ok) throw new Error('commit_failed');

      fileRef.current.value = '';
      await refetchFiles();
      await refetchActivity();
    } catch (e) {
      // ❗ ถ้า direct พลาด ให้ fallback ไปเส้นทาง API เดิม
      try {
        const fd = new FormData();
        fd.append('file', fileRef.current.files[0]);
        const res = await fetch(`${API}/projects/${selected}/files/upload`, { method: 'POST', credentials: 'include', body: fd });
        if (!res.ok) throw new Error((await res.json()).error || `HTTP ${res.status}`);
        fileRef.current.value = '';
        await refetchFiles(); await refetchActivity();
      } catch (err) {
        alert('อัปโหลดไม่สำเร็จ: ' + (err?.message || e?.message));
      }
    }
  };

  const deleteFile = async (fileId) => {
    if (!confirm('ลบไฟล์นี้ใช่ไหม?')) return;
    try { await apiDelete(`/files/${fileId}`); await refetchFiles(); await refetchActivity(); }
    catch (e) { alert('ลบไฟล์ไม่สำเร็จ: ' + e.message); }
  };
  const [inviteText, setInviteText] = useState('');
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

  if (meLoading) return <div style={{ padding: 16 }}>Loading…</div>;

  return (
    <div style={{ display: 'grid', gridTemplateRows: 'auto 1fr', height: '100vh', gap: 16 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ fontWeight: 600 }}>Teamulate</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ opacity: .8 }}>{me ? `${me.name || 'User'} · ${me.id}` : '—'}</span>
          <Link href="/profile" style={{ ...btn, textDecoration: 'none' }}>Profile</Link>
          <button onClick={onLogout} style={btn}>Logout</button>
        </div>
      </div>

      {/* Main: 3 columns */}
      <div style={{ display: 'grid', gridTemplateColumns: '340px 1fr 420px', gap: 16, minHeight: 0 }}>
        {/* LEFT column */}
        <div style={{ display: 'grid', gridAutoRows: 'min-content', minHeight: 0, overflow: 'hidden' }}>
          <div style={cardFlex}>
            <div style={sticky}><h3 style={h3}>Projects</h3></div>
            <div>
              <input placeholder="Name" value={pname} onChange={e => setPname(e.target.value)} style={inp} />
              <input placeholder="Description" value={pdesc} onChange={e => setPdesc(e.target.value)} style={inp} />
              <button onClick={createProject} style={btn}>Create</button>
            </div>
            <ul style={{ listStyle: 'none', padding: 0, marginTop: 12 }}>
              {projects.map(p => (
                <li key={p.id} style={{ marginBottom: 8 }}>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      style={{ ...btn, flex: 1, background: selected === p.id ? '#2563eb' : '#122338' }}
                      onClick={() => setSelected(p.id)}
                    >{p.name}</button>
                    {(me?.id === p.ownerId) &&
                      <button onClick={() => deleteProject(p.id)} style={{ ...btn, background: '#7f1d1d', border: '1px solid #b91c1c', padding: '8px 10px' }}>✕</button>}
                  </div>
                </li>
              ))}
              {projects.length === 0 && <div style={{ opacity: .7 }}>No projects.</div>}
            </ul>

            {selected && (
              <div style={{ marginTop: 16 }}>
                <div style={{ fontWeight: 700, margin: '16px 0 8px' }}>Manager</div>
                {managerInfo ? (
                  <div style={{ padding: '8px', border: '1px solid #1f2a3a', borderRadius: 10, marginBottom: 12 }}>
                    <div style={{ fontWeight: 600 }}>
                      {managerInfo.name} <span style={{ opacity: .6, fontSize: 12 }}>· {managerInfo.id}</span>
                    </div>
                    {managerInfo.email && <div style={{ opacity: .7, fontSize: 12 }}>{managerInfo.email}</div>}
                  </div>
                ) : <div style={{ opacity: .7 }}>—</div>}

                <div style={subheader}>Members</div>
                {isOwner ? (
                  <div style={{ display: 'flex', gap: 8 }}>
                    <input placeholder="เชิญด้วย userId" value={inviteText} onChange={e => setInviteText(e.target.value)} style={{ ...inp, flex: 1 }} />
                    <button onClick={inviteMember} style={btn}>Invite</button>
                  </div>
                ) : <div style={{ fontSize: 12, opacity: .7, marginBottom: 8 }}>คุณเป็นสมาชิกของโปรเจกต์นี้ (สิทธิ์อ่านรายชื่อเท่านั้น)</div>}
                <ul style={{ listStyle: 'none', padding: 0, marginTop: 12 }}>
                  {members.length > 0 ? members.map(m => {
                    const uid = m.user?.id || m.userId;
                    const uname = m.user?.name || '(no name)';
                    const uemail = m.user?.email || '';
                    const removable = (isOwner) && uid !== ownerId;
                    return (
                      <li key={uid || '(no id)'} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, padding: '6px 8px', border: '1px solid #1f2a3a', borderRadius: 10, marginBottom: 6 }}>
                        <div>
                          <div style={{ fontWeight: 600, overflowWrap: 'anywhere' }}>
                            {uname} <span style={{ opacity: .6, fontSize: 12 }}>· {uid}</span>
                            {uid === ownerId && <span style={{ marginLeft: 6, fontSize: 12, opacity: .8 }}>(owner)</span>}
                          </div>
                          <div style={{ opacity: .7, fontSize: 12, overflowWrap: 'anywhere' }}>{uemail}</div>
                        </div>
                        {removable ? (
                          <button onClick={() => removeMember(uid)} style={{ ...btn, background: '#7f1d1d', border: '1px solid #b91c1c', padding: '6px 10px' }}>Remove</button>
                        ) : <div style={{ fontSize: 12, opacity: .5 }} />}
                      </li>
                    );
                  }) : <div style={{ opacity: .7 }}>No members.</div>}
                </ul>
              </div>)}
          </div>
        </div>

        {/* CENTER column (Tasks → Chat → Files) */}
        <div style={{ display: 'grid', gridTemplateRows: '1fr 320px 1fr', gap: 16, minHeight: 0 }}>
          {/* Tasks */}
          <div style={cardFlex}>
            <div style={sticky}><h3 style={h3}>Tasks</h3></div>
            {!selected && <div style={{ opacity: .7 }}>Select a project.</div>}
            {selected && (
              <>
                <div style={stickySub}>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <input id="taskTitle" placeholder="Task title" style={{ ...inp, flex: 1 }} />
                    <input id="taskDeadline" type="date" style={inp} />
                    <select id="taskStatus" defaultValue="UNASSIGNED" style={inp}>
                      {STATUS.map(s => <option key={s.code} value={s.code}>{s.label}</option>)}
                    </select>
                    <button onClick={createTask} style={btn}>Add</button>
                  </div>
                </div>
                {msg && <div style={{ marginTop: 8, fontSize: 12, opacity: .8 }}>{msg}</div>}
                <div style={scrollBody}>
                  <ul style={{ listStyle: 'none', padding: 0, marginTop: 12 }}>
                    {tasks.length > 0 ? tasks.map(t => (
                      <li key={t.id} style={{ padding: 8, border: '1px solid #1f2a3a', borderRadius: 10, marginBottom: 8 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                          <div>
                            <div style={{ fontWeight: 600, overflowWrap: 'anywhere' }}>
                              <Link href={`/tasks/${t.id}`} style={{ color: '#93c5fd', textDecoration: 'none' }}>
                                {t.title}
                              </Link>
                            </div>
                            <div style={{ fontSize: 12, opacity: .7, overflowWrap: 'anywhere' }}>
                              สถานะ: {labelOf(t.status)} · กำหนดส่ง {t.deadline || '—'} · ผู้รับผิดชอบ: {t.assignee?.name || t.assignee?.email || '—'}
                            </div>
                          </div>
                          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                            {isOwner && (
                              <select
                                value={t.assigneeId || ''}
                                onChange={e => assignTask(t.id, e.target.value || null)}
                                disabled={savingId === t.id}
                                style={{ ...inp, minWidth: 180, opacity: savingId === t.id ? 0.6 : 1 }}
                              >
                                <option value="">— ไม่มอบหมาย —</option>
                                {members.map(m => (
                                  <option key={m.user?.id || m.userId} value={m.user?.id || m.userId}>
                                    {m.user?.name || m.user?.email || m.userId}
                                  </option>
                                ))}
                              </select>
                            )}
                            <select value={t.status} onChange={(e) => changeTaskStatus(t.id, e.target.value)} disabled={savingId === t.id} style={{ ...inp, opacity: savingId === t.id ? 0.6 : 1 }}>
                              {STATUS.map(s => <option key={s.code} value={s.code}>{s.label}</option>)}
                            </select>
                            <button onClick={() => deleteTask(t.id)} style={{ ...btn, background: '#7f1d1d', border: '1px solid #b91c1c', padding: '6px 10px' }}>🗑</button>
                          </div>
                        </div>
                      </li>
                    )) : <div style={{ opacity: .7 }}>No tasks.</div>}
                  </ul>
                </div>
              </>
            )}
          </div>

          {/* ===== Chat (อยู่คอลัมน์กลาง) ===== */}
          <div style={{ ...cardFlex, display: 'grid', gridTemplateRows: 'auto 1fr auto', minHeight: 0 }}>
            <h3 style={{ marginTop: 0 }}>Chat</h3>

            {/* กล่องข้อความที่เลื่อน */}
            <div
              ref={chatBoxRef}
              style={{ overflowY: 'auto', minHeight: 0, border: '1px solid #1f2a3a', borderRadius: 10, padding: 8 }}
            >
              {chat.length === 0 && <div style={{ opacity: .7 }}>No messages.</div>}
              {chat.map((m) => (
                <div key={m.id} style={{ marginBottom: 8 }}>
                  <div style={{ fontSize: 12, opacity: .7 }}>
                    {new Date(m.createdAt).toLocaleString()} · <b>{m.userId === me?.id ? 'คุณ' : m.userId}</b>
                  </div>
                  <div style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{m.text}</div>
                </div>
              ))}
            </div>

            {/* แถบพิมพ์ – ล่างสุด */}
            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
              <input
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') sendChat(); }}
                placeholder="พิมพ์ข้อความ…"
                style={{ ...inp, flex: 1 }}
              />
              <button onClick={sendChat} style={btn}>Send</button>
            </div>
          </div>

          {/* Files */}
          <div style={cardFlex}>
            <div style={sticky}><h3 style={h3}>Files</h3></div>
            {!selected && <div style={{ opacity: .7 }}>Select a project.</div>}
            {selected && (
              <>
                <div style={stickySub}>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <input type="file" ref={fileRef} style={{ flex: 1 }} />
                    <button onClick={uploadFile} style={btn}>Upload</button>
                  </div>
                </div>
                <div style={scrollBody}>
                  <ul style={{ listStyle: 'none', padding: 0, marginTop: 12 }}>
                    {files.map(f => {
                      const href = fileHref(f);
                      return (
                        <li key={f.id} style={{ padding: 8, border: '1px solid #1f2a3a', borderRadius: 10, marginBottom: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
                          <div>
                            <a href={href || '#'} target="_blank" rel="noreferrer" style={{ color: '#93c5fd', overflowWrap: 'anywhere' }}>
                              {f.originalname || f.name || 'file'}
                            </a>
                            <div style={{ fontSize: 12, opacity: .7 }}>{(f.size / 1024).toFixed(1)} KB</div>
                          </div>
                          <div style={{ display: 'flex', gap: 8 }}>
                            {/* ✅ ปุ่ม Download แยก */}
                            {/* <a
                              href={`${API}/files/${f.id}/download`}
                              style={{ ...btn, textDecoration: 'none', padding: '8px 10px' }}
                            >
                              Download
                            </a> */}
                            <button onClick={() => deleteFile(f.id)} style={{ ...btn, background: '#7f1d1d', border: '1px solid #b91c1c', padding: '8px 10px' }}>
                              🗑
                            </button>
                          </div>
                        </li>
                      );
                    })}
                    {files.length === 0 && <div style={{ opacity: .7 }}>No files.</div>}
                  </ul>
                </div>
              </>
            )}
          </div>
        </div>

        {/* RIGHT column (Activity) */}
        <div style={cardFlex}>
          <div style={sticky}><h3 style={h3}>Activity</h3></div>
          {!selected && <div style={{ opacity: .7 }}>Select a project.</div>}
          {selected && (
            <div style={scrollBody}>
              <ul style={{ listStyle: 'none', padding: 0 }}>
                {(activity?.items ?? []).map(a => (
                  <li key={a.id} style={{ padding: '6px 0', borderBottom: '1px solid #1f2a3a' }}>
                    {renderActivity(a)}
                  </li>
                ))}
                {!activity?.items?.length && <div style={{ opacity: .7 }}>No activity.</div>}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ---- Styles ---- */
const h3 = { margin: 0 };
const sticky = {
  position: 'sticky',
  top: 0,
  zIndex: 5,
  background: '#0f1720',
  borderBottom: '1px solid #1e293b',
  padding: '10px 0'
};
const stickySub = {
  position: 'sticky',
  top: 44,
  zIndex: 4,
  background: '#0f1720',
  padding: '8px 0 6px',
  borderBottom: '1px solid #1e293b'
};
const stickyBottom = {
  position: 'sticky',
  bottom: 0,
  zIndex: 4,
  background: '#0f1720',
  padding: '8px 0 0',
  borderTop: '1px solid #1e293b'
};
const cardFlex = {
  background: '#0f1720',
  border: '1px solid #1e293b',
  borderRadius: 12,
  padding: 12,
  display: 'flex',
  flexDirection: 'column',
  minHeight: 0,
  overflow: 'hidden'
};
const scrollBody = { overflowY: 'auto', minHeight: 0, paddingBottom: 12 };
const subheader = { fontWeight: 700, margin: '16px 0 8px' };
const btn = { background: '#1f3a5f', border: '1px solid #294766', color: '#e6edf3', padding: '8px 12px', borderRadius: 10, cursor: 'pointer' };
const inp = { background: '#0b1320', border: '1px solid #1e2a3a', color: '#e6edf3', padding: '8px 10px', borderRadius: 8 };
