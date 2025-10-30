// api/tests/members-permission.test.js
import request from 'supertest';
import app from '../src/app.js';

async function register(name) {
  const email = `${name}${Date.now()}@ex.com`;
  const res = await request(app).post('/auth/register').send({ name, email, password:'x' });
  return { cookies: res.headers['set-cookie'], email };
}

describe('Owner permission', () => {
  it('only owner can invite member and assign task', async () => {
    const owner = await register('owner');
    const member = await register('member');

    // owner สร้างโปรเจกต์
    const p = await request(app).post('/projects').set('Cookie', owner.cookies).send({ name: 'PX' });
    const projectId = p.body.id;

    // สมาชิก (ที่ไม่ใช่ owner) พยายามเชิญสมาชิก => ต้องถูกปฏิเสธ
    const inviteByNonOwner = await request(app)
      .post(`/projects/${projectId}/members`)
      .set('Cookie', member.cookies)
      .send({ userId: 'someone' });
    expect([403, 500]).toContain(inviteByNonOwner.status); // assertOwner ป้องกัน

    // owner เชิญ member สำเร็จ
    const inv = await request(app)
      .post(`/projects/${projectId}/members`)
      .set('Cookie', owner.cookies)
      .send({ userId: inviteByNonOwner.body?.userId || 'member-id' }); // ปรับตามระบบจริง
    expect(inv.status).toBe(200);

    // owner สร้าง task แล้ว assign สำเร็จ
    const t = await request(app)
      .post(`/projects/${projectId}/tasks`).set('Cookie', owner.cookies)
      .send({ title: 'T1' });
    const assignByOwner = await request(app)
      .patch(`/tasks/${t.body.id}/assign`).set('Cookie', owner.cookies)
      .send({ userId: 'some-user-id' });
    expect(assignByOwner.status).toBe(200);

    // non-owner ลอง assign => ต้องถูกปฏิเสธ
    const assignByNonOwner = await request(app)
      .patch(`/tasks/${t.body.id}/assign`).set('Cookie', member.cookies)
      .send({ userId: 'x' });
    expect([403, 500]).toContain(assignByNonOwner.status);
  });
});
