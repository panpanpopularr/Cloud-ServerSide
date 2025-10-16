// web/app/profile/page.jsx
'use client';

import { useEffect, useState } from 'react';
import { mutate as swrMutate } from 'swr';
import { useRouter } from 'next/navigation';
import { API } from '@/lib/api';

export default function ProfilePage() {
  const [user, setUser] = useState({ name: '', email: '' });
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const router = useRouter();

  // โหลดข้อมูลผู้ใช้
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${API}/users/me`, { credentials: 'include' });
        if (!res.ok) throw new Error('failed');
        const me = await res.json();
        setUser({
          name: me.name || '',
          email: me.email || '',
        });
      } catch {
        setMessage('ไม่สามารถโหลดข้อมูลผู้ใช้ได้');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // บันทึกชื่อผู้ใช้
  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');

    try {
      const res = await fetch(`${API}/users/me`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: user.name }),
      });

      if (res.ok) {
        const j = await res.json().catch(() => ({}));
        if (j?.user) setUser((u) => ({ ...u, name: j.user.name ?? u.name }));
        setMessage('อัปเดตข้อมูลเรียบร้อยแล้ว!');

        // ✅ 1) Optimistic update ของ /auth/me เพื่อให้ header เปลี่ยนทันที
        await swrMutate(
          `${API}/auth/me`,
          (prev) => {
            // รองรับทั้งรูปแบบ {user:{...}} หรือเป็น user object ตรงๆ
            if (!prev) return { user: { name: user.name } };
            if (prev.user) return { ...prev, user: { ...prev.user, name: user.name } };
            return { ...prev, name: user.name };
          },
          { revalidate: false }
        );

        // ✅ 2) เคลียร์/รีเฟรช cache ที่เกี่ยวข้องทั้งหมด
        await Promise.all([
          swrMutate(`${API}/auth/me`, undefined, { revalidate: true }),
          swrMutate(`${API}/users/me`, undefined, { revalidate: false }),
          // เผื่อมีจุดไหนใช้คีย์ /auth/me แบบอื่น
          swrMutate((key) => typeof key === 'string' && key.endsWith('/auth/me'), undefined, { revalidate: true }),
        ]);
      } else {
        const err = await res.json().catch(() => ({}));
        setMessage(`เกิดข้อผิดพลาด: ${err?.error || 'ไม่สามารถอัปเดตได้'}`);
      }
    } catch {
      setMessage('เกิดข้อผิดพลาดในการเชื่อมต่อ');
    }
  };

  const goBack = async () => {
    // เผื่อ cache ยังไม่รีเฟรช ให้สั่งอีกที แล้วค่อยกลับ
    await swrMutate(`${API}/auth/me`);
    router.push('/workspace');
  };

  if (loading) {
    return (
      <div style={{ ...center, height: '100vh' }}>
        <p>กำลังโหลดข้อมูล...</p>
      </div>
    );
  }

  return (
    <div style={{ ...center, minHeight: '100vh', background: '#0d1117', padding: 24 }}>
      <div style={card}>
        <h2 style={{ fontSize: 24, fontWeight: 600, marginBottom: 4 }}>โปรไฟล์ของฉัน</h2>
        <p style={{ fontSize: 14, opacity: 0.7, marginBottom: 16 }}>แก้ไขชื่อของคุณ</p>

        <form onSubmit={handleSubmit} style={{ display: 'grid', gap: 12 }}>
          <div>
            <label style={label}>ชื่อ</label>
            <input
              value={user.name}
              onChange={(e) => setUser((prev) => ({ ...prev, name: e.target.value }))}
              style={inp}
            />
          </div>

          <div>
            <label style={label}>อีเมล</label>
            <input
              value={user.email}
              disabled
              style={{ ...inp, opacity: 0.6, cursor: 'not-allowed' }}
            />
          </div>

          {message && (
            <div
              style={{
                padding: 10,
                background: message.startsWith('เกิดข้อผิดพลาด') ? '#7f1d1d' : '#14532d',
                color: '#fff',
                borderRadius: 8,
                fontSize: 14,
                textAlign: 'center',
              }}
            >
              {message}
            </div>
          )}

          <div style={{ display: 'flex', gap: 12 }}>
            <button type="submit" style={{ ...btn, flex: 1, background: '#2563eb' }}>
              บันทึกข้อมูล
            </button>
            <button type="button" onClick={goBack} style={{ ...btn, flex: 1 }}>
              กลับ
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ---- Styles ---- */
const center = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
};

const card = {
  background: '#0f1720',
  color: '#e6edf3',
  padding: 24,
  border: '1px solid #1e293b',
  borderRadius: 12,
  width: '100%',
  maxWidth: 480,
};

const inp = {
  width: '100%',
  padding: '8px 10px',
  background: '#0b1320',
  border: '1px solid #1e2a3a',
  borderRadius: 8,
  color: '#e6edf3',
};

const btn = {
  background: '#1f3a5f',
  border: '1px solid #294766',
  color: '#e6edf3',
  padding: '10px 12px',
  borderRadius: 10,
  cursor: 'pointer',
};

const label = {
  display: 'block',
  marginBottom: 4,
  fontSize: 14,
  fontWeight: 500,
};
