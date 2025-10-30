// api/tests/auth.test.js
import request from 'supertest';
import app from '../src/app.js';

describe('Auth flow', () => {
  it('register -> login -> me', async () => {
    const email = `u${Date.now()}@ex.com`;
    const name = 'Tester';
    const password = 'secret';

    const reg = await request(app).post('/auth/register').send({ name, email, password });
    expect(reg.status).toBe(200);
    expect(reg.body?.user?.email).toBe(email);
    const cookies = reg.headers['set-cookie'];

    const me = await request(app).get('/auth/me').set('Cookie', cookies);
    expect(me.status).toBe(200);
    expect(me.body?.user?.name).toBe(name);
  });
});
