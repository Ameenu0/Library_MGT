const request = require('supertest');
const app = require('../server');

describe('Library API', () => {
  beforeEach(async () => {
    await request(app).delete('/api/testing/reset');
  });

  it('validates student registration numbers in FAC/YY/DEPT/NNNNN format', async () => {
    const validRes = await request(app).post('/api/students').send({
      registrationNumber: 'CST/23/SWE/01137',
      fullName: 'Format Student',
      faculty: 'Science',
      department: 'Software Engineering',
      status: 'undergraduate',
      password: 'studentPass123',
    });

    expect(validRes.statusCode).toBe(201);
    expect(validRes.body.registrationNumber).toBe('CST/23/SWE/01137');

    const loginRes = await request(app).post('/api/students/login').send({
      registrationNumber: 'CST/23/SWE/01137',
      password: 'studentPass123',
    });

    expect(loginRes.statusCode).toBe(200);
    expect(loginRes.body.student.registrationNumber).toBe('CST/23/SWE/01137');

    const invalidRes = await request(app).post('/api/students').send({
      registrationNumber: 'STD-INVALID-001',
      fullName: 'Wrong Format Student',
      faculty: 'Science',
      department: 'Computer Science',
      status: 'undergraduate',
      password: 'studentPassInvalid',
    });

    expect(invalidRes.statusCode).toBe(400);
    expect(invalidRes.body.message).toMatch(/FAC\/YY\/DEPT\/NNNNN|format/i);
  });

  it('POST /api/auth/login redirects users by identifier type and role', async () => {
    const studentRes = await request(app).post('/api/students').send({
      registrationNumber: 'CST/23/SWE/01155',
      fullName: 'Unified Login Student',
      faculty: 'Science',
      department: 'Computer Science',
      status: 'undergraduate',
      password: 'studentPass456',
    });

    const studentLogin = await request(app).post('/api/auth/login').send({
      identifier: 'CST/23/SWE/01155',
      password: 'studentPass456',
    });

    expect(studentLogin.statusCode).toBe(200);
    expect(studentLogin.body.role).toBe('student');
    expect(studentLogin.body.student.registrationNumber).toBe('CST/23/SWE/01155');

    const librarianLogin = await request(app).post('/api/auth/login').send({
      identifier: 'librarian@library.com',
      password: 'librarian12',
    });

    expect(librarianLogin.statusCode).toBe(200);
    expect(librarianLogin.body.role).toBe('librarian');

    const adminLogin = await request(app).post('/api/auth/login').send({
      identifier: 'admin@library.com',
      password: 'admin123',
    });

    expect(adminLogin.statusCode).toBe(200);
    expect(adminLogin.body.role).toBe('admin');
  });

  it('POST /api/students/activate sets a student password for first-time account activation', async () => {
    await request(app).post('/api/students').send({
      registrationNumber: 'CST/23/SWE/01180',
      fullName: 'Activation Student',
      faculty: 'Science',
      department: 'Computer Science',
      status: 'undergraduate',
      password: 'initialPass123',
    });

    const activationRes = await request(app).post('/api/students/activate').send({
      registrationNumber: 'CST/23/SWE/01180',
      password: 'newStudentPassword',
    });

    expect(activationRes.statusCode).toBe(200);
    expect(activationRes.body.message).toMatch(/activated|password/i);

    const loginRes = await request(app).post('/api/students/login').send({
      registrationNumber: 'CST/23/SWE/01180',
      password: 'newStudentPassword',
    });

    expect(loginRes.statusCode).toBe(200);
    expect(loginRes.body.student.registrationNumber).toBe('CST/23/SWE/01180');
  });

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

  it('POST /api/students/login authenticates a registered student using the registered password', async () => {
    const registrationNumber = 'CST/23/SWE/01145';
    const studentPassword = 'studentLoginPass';

    const registerRes = await request(app).post('/api/students').send({
      registrationNumber,
      fullName: 'Student Login User',
      faculty: 'Science',
      department: 'Computer Science',
      status: 'undergraduate',
      password: studentPassword,
    });

    expect(registerRes.statusCode).toBe(201);
    expect(registerRes.body.password).toBe(studentPassword);

    const res = await request(app).post('/api/students/login').send({
      registrationNumber,
      password: studentPassword,
    });

    expect(res.statusCode).toBe(200);
    expect(res.body.student.registrationNumber).toBe(registrationNumber);
    expect(res.body.student.fullName).toBe('Student Login User');
    expect(Array.isArray(res.body.history)).toBe(true);
  });

  it('POST /api/students issues a library card and borrow cards on registration', async () => {
    const res = await request(app).post('/api/students').send({
      registrationNumber: 'CST/23/CSD/01138',
      fullName: 'Library Card Student',
      faculty: 'Science',
      department: 'Computer Science',
      status: 'undergraduate',
      password: 'libraryCardPass',
    });

    expect(res.statusCode).toBe(201);
    expect(res.body.libraryCardNumber).toMatch(/LC-/i);
    expect(res.body.borrowCardCount).toBe(3);
    expect(Array.isArray(res.body.borrowCards)).toBe(true);
    expect(res.body.borrowCards.length).toBe(3);
  });

  it('POST /api/requests creates a pending request', async () => {
    const res = await request(app).post('/api/requests').send({
      studentId: 'CST/23/SWE/01137',
      bookId: 'BK-002',
    });

    expect(res.statusCode).toBe(201);
    expect(res.body.status).toBe('pending');
    expect(res.body.studentId).toBe('CST/23/SWE/01137');
  });

  it('GET /api/books marks requested books as unavailable and shows the pending request status', async () => {
    await request(app).post('/api/students').send({
      registrationNumber: 'CST/23/SWE/01139',
      fullName: 'Request Status Student',
      faculty: 'Science',
      department: 'Computer Science',
      status: 'undergraduate',
      password: 'requestStatusPass',
    });

    const bookRes = await request(app).post('/api/books').send({
      title: 'Requested Status Book',
      author: 'Tester',
      callNumber: 'QA-900',
      accessionNumber: 'ACC-REQ-STATUS-001',
    });

    await request(app).post('/api/requests').send({
      studentId: 'CST/23/SWE/01139',
      bookId: bookRes.body.accessionNumber,
    });

    const res = await request(app).get('/api/books');

    expect(res.statusCode).toBe(200);
    const createdBook = res.body.find((book) => book.accessionNumber === 'ACC-REQ-STATUS-001');
    expect(createdBook).toBeTruthy();
    expect(createdBook.available).toBe(false);
    expect(createdBook.requestStatus).toBe('pending');
  });

  it('POST /api/requests marks a book as unavailable when it is already borrowed or requested by another student', async () => {
    await request(app).post('/api/students').send({
      registrationNumber: 'CST/23/SWE/01139',
      fullName: 'Student One',
      faculty: 'Science',
      department: 'Computer Science',
      status: 'undergraduate',
      password: 'studentOnePass',
    });

    await request(app).post('/api/students').send({
      registrationNumber: 'CST/23/SWE/01142',
      fullName: 'Student Two',
      faculty: 'Science',
      department: 'Computer Science',
      status: 'undergraduate',
      password: 'studentTwoPass',
    });

    const bookRes = await request(app).post('/api/books').send({
      title: 'Shared Copy Book',
      author: 'Tester',
      callNumber: 'QA-901',
      accessionNumber: 'ACC-UNAVAILABLE-001',
    });

    const firstRequest = await request(app).post('/api/requests').send({
      studentId: 'CST/23/SWE/01139',
      bookId: bookRes.body.accessionNumber,
    });

    await request(app).patch(`/api/requests/${firstRequest.body.id}/approve`);

    const secondRequest = await request(app).post('/api/requests').send({
      studentId: 'CST/23/SWE/01142',
      bookId: bookRes.body.accessionNumber,
    });

    expect(secondRequest.statusCode).toBe(400);
    expect(secondRequest.body.message).toMatch(/not available|borrowed|another student/i);

    const booksRes = await request(app).get('/api/books');
    const createdBook = booksRes.body.find((book) => book.accessionNumber === 'ACC-UNAVAILABLE-001');
    expect(createdBook).toBeTruthy();
    expect(createdBook.available).toBe(false);
    expect(createdBook.requestStatus).toBe('approved');
  });

  it('PATCH /api/requests/:id/approve updates the request status', async () => {
    const createRes = await request(app).post('/api/requests').send({
      studentId: 'CST/23/SWE/01146',
      bookId: 'BK-003',
    });

    const res = await request(app).patch(`/api/requests/${createRes.body.id}/approve`);

    expect(res.statusCode).toBe(200);
    expect(res.body.status).toBe('approved');
  });

  it('POST /api/requests rejects duplicate active requests for the same student and book', async () => {
    const registrationNumber = 'CST/23/SWE/01147';

    await request(app).post('/api/students').send({
      registrationNumber,
      fullName: 'Duplicate Student',
      faculty: 'Science',
      department: 'Computer Science',
      status: 'undergraduate',
      password: 'duplicateStudentPass',
    });

    await request(app).post('/api/books').send({
      title: 'Duplicate Guard Book',
      author: 'Tester',
      callNumber: 'QA-100',
      accessionNumber: 'ACC-DUP-001',
    });

    const firstRes = await request(app).post('/api/requests').send({
      studentId: registrationNumber,
      bookId: 'ACC-DUP-001',
    });

    expect(firstRes.statusCode).toBe(201);

    const secondRes = await request(app).post('/api/requests').send({
      studentId: registrationNumber,
      bookId: 'ACC-DUP-001',
    });

    expect(secondRes.statusCode).toBe(409);
    expect(secondRes.body.message).toMatch(/already/i);
  });

  it('POST /api/requests rejects a new request when an undergraduate already has the maximum active books', async () => {
    const studentId = 'CST/23/SWE/01140';

    await request(app).post('/api/students').send({
      registrationNumber: studentId,
      fullName: 'Borrow Limit Request Student',
      faculty: 'Science',
      department: 'Computer Science',
      status: 'undergraduate',
      password: 'borrowLimitPass',
    });

    for (let i = 1; i <= 3; i += 1) {
      const bookId = `BK-LIMIT-REQ-${i}`;
      await request(app).post('/api/books').send({
        title: `Request Limit Book ${i}`,
        author: 'Tester',
        callNumber: `QA-${250 + i}`,
        accessionNumber: bookId,
      });

      const requestRes = await request(app).post('/api/requests').send({
        studentId,
        bookId,
      });

      await request(app).patch(`/api/requests/${requestRes.body.id}/approve`);
    }

    const extraBookRes = await request(app).post('/api/books').send({
      title: 'Fourth Request Book',
      author: 'Tester',
      callNumber: 'QA-260',
      accessionNumber: 'BK-LIMIT-REQ-EXTRA',
    });

    const rejectionRes = await request(app).post('/api/requests').send({
      studentId,
      bookId: extraBookRes.body.accessionNumber,
    });

    expect(rejectionRes.statusCode).toBe(400);
    expect(rejectionRes.body.message).toMatch(/limit|maximum|active books/i);
  });

  it('POST /api/requests rejects a new request when an undergraduate reaches the borrow limit', async () => {
    const studentId = 'CST/23/SWE/01141';

    await request(app).post('/api/students').send({
      registrationNumber: studentId,
      fullName: 'Borrow Limit Student',
      faculty: 'Engineering',
      department: 'Civil Engineering',
      status: 'undergraduate',
      password: 'borrowLimitPass2',
    });

    for (let i = 1; i <= 3; i += 1) {
      const bookId = `BK-LIMIT-${i}`;
      await request(app).post('/api/books').send({
        title: `Limit Book ${i}`,
        author: 'Tester',
        callNumber: `QA-${200 + i}`,
        accessionNumber: bookId,
      });

      const requestRes = await request(app).post('/api/requests').send({
        studentId,
        bookId,
      });

      await request(app).patch(`/api/requests/${requestRes.body.id}/approve`);
    }

    const extraBookRes = await request(app).post('/api/books').send({
      title: 'Extra Limit Book',
      author: 'Tester',
      callNumber: 'QA-205',
      accessionNumber: 'BK-LIMIT-EXTRA',
    });

    const denialRes = await request(app).post('/api/requests').send({
      studentId,
      bookId: extraBookRes.body.accessionNumber,
    });

    expect(denialRes.statusCode).toBe(400);
    expect(denialRes.body.message).toMatch(/limit|maximum|active books/i);
  });

  it('PATCH /api/requests/:id/return requests a return and PATCH /api/requests/:id/approve-return finalizes it', async () => {
    await request(app).post('/api/students').send({
      registrationNumber: 'CST/23/SWE/01142',
      fullName: 'Return Student',
      faculty: 'Arts',
      department: 'History',
      status: 'undergraduate',
      password: 'returnStudentPass',
    });

    const bookRes = await request(app).post('/api/books').send({
      title: 'Return Test Book',
      author: 'Tester',
      callNumber: 'QA-300',
      accessionNumber: 'ACC-RETURN-001',
    });

    const requestRes = await request(app).post('/api/requests').send({
      studentId: 'CST/23/SWE/01142',
      bookId: bookRes.body.accessionNumber,
    });

    await request(app).patch(`/api/requests/${requestRes.body.id}/approve`);

    const returnRequestRes = await request(app).patch(`/api/requests/${requestRes.body.id}/return`);
    expect(returnRequestRes.statusCode).toBe(200);
    expect(returnRequestRes.body.status).toBe('return_requested');

    const approveReturnRes = await request(app).patch(`/api/requests/${requestRes.body.id}/approve-return`);
    expect(approveReturnRes.statusCode).toBe(200);
    expect(approveReturnRes.body.status).toBe('returned');
    expect(approveReturnRes.body.returnedAt).toBeTruthy();
  });

  it('PATCH /api/requests/:id/approve assigns a due date based on student category', async () => {
    await request(app).post('/api/students').send({
      registrationNumber: 'CST/23/SWE/01143',
      fullName: 'Due Date Student',
      faculty: 'Science',
      department: 'Computer Science',
      status: 'postgraduate',
      password: 'dueDatePass',
    });

    const bookRes = await request(app).post('/api/books').send({
      title: 'Due Date Book',
      author: 'Tester',
      callNumber: 'QA-400',
      accessionNumber: 'ACC-DUE-001',
    });

    const requestRes = await request(app).post('/api/requests').send({
      studentId: 'CST/23/SWE/01143',
      bookId: bookRes.body.accessionNumber,
    });

    const approveRes = await request(app).patch(`/api/requests/${requestRes.body.id}/approve`);

    expect(approveRes.statusCode).toBe(200);
    expect(approveRes.body.dueDate).toBeTruthy();
  });

  it('GET /api/requests/history returns all borrowing history for a student and GET /api/requests/overdue returns overdue items', async () => {
    await request(app).post('/api/students').send({
      registrationNumber: 'CST/23/SWE/01144',
      fullName: 'History Student',
      faculty: 'Arts',
      department: 'History',
      status: 'undergraduate',
    });

    const book1 = await request(app).post('/api/books').send({
      title: 'History Book 1',
      author: 'Tester',
      callNumber: 'QA-500',
      accessionNumber: 'ACC-HISTORY-001',
    });

    const book2 = await request(app).post('/api/books').send({
      title: 'History Book 2',
      author: 'Tester',
      callNumber: 'QA-501',
      accessionNumber: 'ACC-HISTORY-002',
    });

    const request1 = await request(app).post('/api/requests').send({
      studentId: 'CST/23/SWE/01148',
      bookId: book1.body.accessionNumber,
    });

    const request2 = await request(app).post('/api/requests').send({
      studentId: 'CST/23/SWE/01148',
      bookId: book2.body.accessionNumber,
    });

    await request(app).patch(`/api/requests/${request1.body.id}/approve`);
    await request(app).patch(`/api/requests/${request2.body.id}/approve`);

    const historyRes = await request(app).get('/api/requests/history').query({ studentId: 'CST/23/SWE/01148' });
    const overdueRes = await request(app).get('/api/requests/overdue');

    expect(historyRes.statusCode).toBe(200);
    expect(Array.isArray(historyRes.body)).toBe(true);
    expect(historyRes.body.length).toBeGreaterThanOrEqual(2);
    expect(Array.isArray(overdueRes.body)).toBe(true);
  });
});
