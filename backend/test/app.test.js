const request = require('supertest');
const app = require('../server');

describe('Library API', () => {
  it('GET /api/health returns service status', async () => {
    const res = await request(app).get('/api/health');
    expect(res.statusCode).toBe(200);
    expect(res.body.status).toBe('ok');
  });

  it('GET /api/requests returns a list response', async () => {
    const res = await request(app).get('/api/requests');
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('POST /api/requests creates a pending request', async () => {
    const res = await request(app).post('/api/requests').send({
      studentId: 'STD-002',
      bookId: 'BK-002',
    });

    expect(res.statusCode).toBe(201);
    expect(res.body.status).toBe('pending');
    expect(res.body.studentId).toBe('STD-002');
  });

  it('PATCH /api/requests/:id/approve updates the request status', async () => {
    const createRes = await request(app).post('/api/requests').send({
      studentId: 'STD-003',
      bookId: 'BK-003',
    });

    const res = await request(app).patch(`/api/requests/${createRes.body.id}/approve`);

    expect(res.statusCode).toBe(200);
    expect(res.body.status).toBe('approved');
  });
});
