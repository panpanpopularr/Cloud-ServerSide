// api/tests/tasks.test.js
import request from 'supertest';
import app from '../src/app.js';

async function loginAndGetCookie() {
  const email = `t${Date.now()}@ex.com`;
  await request(app).post('/auth/register').send({ name: 'A', email, password: 'x' });
  const res = await request(app).post('/auth/login').send({ email, password: 'x' });
  return res.headers['set-cookie'];
}

describe('Tasks basic', () => {
  it('cannot create task without title', async () => {
    const cookies = await loginAndGetCookie();
    const p = await request(app).post('/projects').set('Cookie', cookies).send({ name:'P1' });
    const res = await request(app)
      .post(`/projects/${p.body.id}/tasks`).set('Cookie', cookies).send({ title:'' });
    expect(res.status).toBe(400);
  });

  it('create task then update status', async () => {
    const cookies = await loginAndGetCookie();
    const p = await request(app).post('/projects').set('Cookie', cookies).send({ name:'P2' });
    const t = await request(app)
      .post(`/projects/${p.body.id}/tasks`).set('Cookie', cookies)
      .send({ title:'T1', status:'UNASSIGNED' });
    expect(t.status).toBe(200);

    const up = await request(app)
      .patch(`/tasks/${t.body.id}`).set('Cookie', cookies)
      .send({ status:'ACTIVE' });
    expect(up.status).toBe(200);
    expect(up.body.status).toBe('ACTIVE');
  });
});
