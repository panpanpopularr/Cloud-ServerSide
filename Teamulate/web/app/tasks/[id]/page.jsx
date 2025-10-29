'use client';

import useSWR from 'swr';
import Link from 'next/link';
import { useState, useRef } from 'react';
import { useParams } from 'next/navigation';
import { API, swrFetcher } from '../../../lib/api';

export default function TaskDetailPage() {
  const params = useParams();
  const id = params?.id;

  const { data: task } = useSWR(id ? `${API}/tasks/${id}` : null, swrFetcher);
  const { data: comments, mutate } = useSWR(id ? `${API}/tasks/${id}/comments` : null, swrFetcher);

  const [text, setText] = useState('');
  const fileRef = useRef(null);
  const [posting, setPosting] = useState(false);

  const onPost = async () => {
    const body = text.trim();
    const file = fileRef.current?.files?.[0];

    if (!body && !file) return; // ต้องมีอย่างน้อยอย่างใดอย่างหนึ่ง
    setPosting(true);
    try {
      const fd = new FormData();
      if (body) fd.append('body', body);
      if (file) fd.append('file', file);

      const res = await fetch(`${API}/tasks/${id}/comments`, {
        method: 'POST',
        credentials: 'include',
        body: fd, // ← multipart/form-data อัตโนมัติ
      });
      if (!res.ok) throw new Error('post_failed');
      setText('');
      if (fileRef.current) fileRef.current.value = '';
      await mutate();
    } catch (e) {
      alert('ส่งคอมเมนต์ไม่สำเร็จ: ' + (e.message || ''));
    } finally {
      setPosting(false);
    }
  };

  return (
    <div style={{ padding: 16, maxWidth: 900, margin: '0 auto' }}>
      <div style={{ marginBottom: 12 }}>
        <Link href="/workspace" style={{ color:'#93c5fd', textDecoration:'none'}}>← กลับ Workspace</Link>
      </div>

      {!task ? <div>กำลังโหลด...</div> : (
        <>
          <h2 style={{ margin:'0 0 8px' }}>{task.title}</h2>
          <div style={{ opacity:.8, marginBottom:12 }}>
            สถานะ: {task.status} · เส้นตาย: {task.deadline || '—'}
          </div>
          <div style={{ opacity:.8, marginBottom:24 }}>
            ผู้สร้าง: {task.creator?.name || task.creator?.email || '—'} · ผู้รับผิดชอบ: {task.assignee?.name || task.assignee?.email || '—'}
          </div>

          <h3 style={{ margin:'0 0 8px' }}>Comments</h3>
          <div style={{ display:'flex', gap:8, marginBottom:12 }}>
            <input
              value={text}
              onChange={e=>setText(e.target.value)}
              placeholder="พิมพ์คอมเมนต์..."
              style={{ flex:1, background:'#0b1320', border:'1px solid #1e2a3a', color:'#e6edf3', padding:'8px 10px', borderRadius:8 }}
            />
            <input type="file" ref={fileRef} />
            <button disabled={posting} onClick={onPost} style={{ background:'#1f3a5f', border:'1px solid #294766', color:'#e6edf3', padding:'8px 12px', borderRadius:10, cursor:'pointer' }}>
              {posting ? 'กำลังส่ง...' : 'ส่ง'}
            </button>
          </div>

          <ul style={{ listStyle:'none', padding:0, margin:0 }}>
            {(comments?.items || []).map(c => (
              <li key={c.id} style={{ padding:'10px 0', borderBottom:'1px solid #1f2a3a' }}>
                <div style={{ fontWeight:600 }}>{c.author?.name || c.author?.email || '—'}</div>
                <div style={{ whiteSpace:'pre-wrap' }}>{c.body}</div>
                {c.fileUrl && (
                  <div style={{ marginTop:6 }}>
                    {/* ถ้าเป็นรูป แสดงภาพ, อย่างอื่นโชว์ลิงก์ดาวน์โหลด */}
                    {/^image\//.test(c.mimeType || '') ? (
                      <img src={`${API}${c.fileUrl}`} alt={c.fileName || 'file'} style={{ maxWidth: '100%', borderRadius: 8 }} />
                    ) : (
                      <a href={`${API}${c.fileUrl}`} target="_blank" rel="noreferrer" style={{ color:'#93c5fd' }}>
                        ดาวน์โหลดไฟล์: {c.fileName || 'file'}
                      </a>
                    )}
                  </div>
                )}
                <div style={{ fontSize:12, opacity:.6, marginTop:4 }}>{new Date(c.createdAt).toLocaleString()}</div>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
