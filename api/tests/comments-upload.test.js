// api/tests/comments-upload.test.js
import path from 'path';
import request from 'supertest';
import app from '../src/app.js';

async function cookie() {
  const email = `f${Date.now()}@ex.com`;
  await request(app).post('/auth/register').send({ name:'U', email, password:'x' });
  const res = await request(app).post('/auth/login').send({ email, password:'x' });
  return res.headers['set-cookie'];
}

describe('Task comments with file', () => {
  it('can upload file with empty body', async () => {
    const cookies = await cookie();
    const p = await request(app).post('/projects').set('Cookie', cookies).send({ name:'PF' });
    const t = await request(app).post(`/projects/${p.body.id}/tasks`).set('Cookie', cookies).send({ title:'TT' });

    const res = await request(app)
      .post(`/tasks/${t.body.id}/comments`).set('Cookie', cookies)
      .attach('file', path.resolve(__dirname, 'fixtures/sample.png'));
    expect(res.status).toBe(200);
    expect(res.body?.comment?.fileUrl).toBeTruthy();
  });
});
