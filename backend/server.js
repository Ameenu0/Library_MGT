require('dotenv').config();

const express = require('express');
const cors = require('cors');
const { db, get, all, run, ready } = require('./database');

const app = express();
const PORT = process.env.PORT || 5000;
const usePostgres = !!(process.env.DATABASE_URL && process.env.DATABASE_URL.startsWith('postgres'));
const allowedOrigins = (process.env.CORS_ORIGIN || 'http://localhost:5173,http://127.0.0.1:5173')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

const resetDatabaseTables = async () => {
  if (usePostgres) {
    await run('TRUNCATE TABLE requests, books, borrow_cards, library_cards, students RESTART IDENTITY CASCADE');
    return;
  }

  await run('DELETE FROM requests');
  await run('DELETE FROM books');
  await run('DELETE FROM borrow_cards');
  await run('DELETE FROM library_cards');
  await run('DELETE FROM students');
  await run('DELETE FROM sqlite_sequence WHERE name IN (\'students\', \'books\', \'requests\', \'borrow_cards\', \'library_cards\')');
};

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
      return;
    }

    callback(new Error(`Origin ${origin} is not allowed by CORS`));
  },
  credentials: true,
}));
app.use(express.json());

const REGISTRATION_NUMBER_PATTERN = /^[A-Z]{2,10}\/\d{2}\/[A-Z]{2,10}\/\d{5}$/;
const DEFAULT_LIBRARIAN = {
  email: 'librarian@library.com',
  password: 'librarian12',
};

const DEFAULT_ADMIN = {
  email: 'admin@library.com',
  password: 'admin123',
};

const isEmailIdentifier = (value = '') => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value).trim());

// Normalises student identifiers so the app accepts values with spaces or lowercase letters.
const normaliseRegistrationNumber = (value) => {
  if (value === undefined || value === null) {
    return '';
  }

  return String(value).trim().replace(/\s+/g, '').toUpperCase();
};

const isValidRegistrationNumber = (value) => REGISTRATION_NUMBER_PATTERN.test(normaliseRegistrationNumber(value));

const getStudentByIdentifier = async (studentIdentifier) => {
  if (!studentIdentifier) return null;

  const value = String(studentIdentifier);

  const student = await get(
    `SELECT * FROM students WHERE CAST(id AS TEXT) = ? OR registrationNumber = ? LIMIT 1`,
    [value, value]
  );

  return student || null;
};

const getBookByIdentifier = async (bookIdentifier) => {
  if (!bookIdentifier) return null;

  const value = String(bookIdentifier);

  const book = await get(
    `SELECT * FROM books WHERE CAST(id AS TEXT) = ? OR accessionNumber = ? LIMIT 1`,
    [value, value]
  );

  return book || null;
};

// Borrow limits are based on the student category.
const getStudentBorrowLimit = (student) => {
  const normalizedStatus = String(student?.status || 'undergraduate').toLowerCase();
  return normalizedStatus === 'postgraduate' ? 5 : 3;
};

const generateLibraryCardNumber = () => `LC-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;

const generateBorrowCardNumber = (studentId, index) => `BC-${String(studentId).padStart(4, '0')}-${String(index + 1).padStart(2, '0')}-${Date.now()}`;

const getStudentCardSummary = async (studentId) => {
  const libraryCard = await get(
    'SELECT * FROM library_cards WHERE studentId = ? ORDER BY id DESC LIMIT 1',
    [studentId]
  );

  const borrowCards = await all(
    'SELECT * FROM borrow_cards WHERE studentId = ? ORDER BY id ASC',
    [studentId]
  );

  return {
    libraryCardNumber: libraryCard ? libraryCard.libraryCardNumber : null,
    borrowCardCount: borrowCards.length,
    borrowCards: borrowCards.map((card) => ({
      id: card.id,
      borrowCardNumber: card.borrowCardNumber,
      status: card.status,
      issuedAt: card.issuedAt,
      usedAt: card.usedAt,
      returnedAt: card.returnedAt,
    })),
  };
};

const getBorrowDays = (student) => {
  const normalizedStatus = String(student?.status || 'undergraduate').toLowerCase();
  return normalizedStatus === 'postgraduate' ? 30 : 14;
};

const calculateDueDate = (student, approvedAt = new Date()) => {
  const dueDate = new Date(approvedAt);
  dueDate.setDate(dueDate.getDate() + getBorrowDays(student));
  return dueDate.toISOString();
};

const serialiseRequestRow = (row) => ({
  id: row.id,
  studentId: row.studentId,
  bookId: row.bookId,
  status: row.status,
  requestedAt: row.requestedAt,
  approvedAt: row.approvedAt,
  dueDate: row.dueDate,
  returnedAt: row.returnedAt,
});

const getBookRequestStatus = async (book) => {
  const bookId = book?.id;
  const accessionNumber = book?.accessionNumber;

  const rows = await all(
    `SELECT * FROM requests WHERE CAST(bookId AS TEXT) = ? OR bookId = ? OR bookId = ? ORDER BY id DESC`,
    [String(bookId), String(bookId), String(accessionNumber)]
  );

  if (!rows.length) {
    return 'available';
  }

  const latest = rows[0];

  if (String(latest.status).toLowerCase() === 'pending') {
    return 'pending';
  }

  if (String(latest.status).toLowerCase() === 'approved') {
    return 'approved';
  }

  if (String(latest.status).toLowerCase() === 'return_requested') {
    return 'return_requested';
  }

  if (String(latest.status).toLowerCase() === 'returned') {
    return 'returned';
  }

  return 'available';
};

// Health endpoint used to confirm the backend is running.
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    message: 'Library Management API is running',
    timestamp: new Date().toISOString(),
  });
});

// -----------------------------------------------------------
// Student endpoints
// -----------------------------------------------------------

// Test-only routes: hidden in production so nobody can wipe the live database.
app.use('/api/testing', (req, res, next) => {
  if (process.env.NODE_ENV === 'production') {
    return res.status(404).json({ message: 'Not found' });
  }
  return next();
});

app.delete('/api/testing/reset', async (req, res) => {
  try {
    await resetDatabaseTables();
    return res.status(200).json({ message: 'Database reset for testing.' });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to reset database', error: error.message });
  }
});

app.post('/api/testing/seed', async (req, res) => {
  try {
    await resetDatabaseTables();

    const student1 = await run(
      `INSERT INTO students (registrationNumber, fullName, faculty, department, status) VALUES (?, ?, ?, ?, ?) RETURNING id`,
      ['CST/23/SWE/01149', 'Ada Seed', 'Science', 'Computer Science', 'undergraduate']
    );

    const student2 = await run(
      `INSERT INTO students (registrationNumber, fullName, faculty, department, status) VALUES (?, ?, ?, ?, ?) RETURNING id`,
      ['ENG/23/MEE/01150', 'Grace Seed', 'Engineering', 'Mechanical Engineering', 'postgraduate']
    );

    const book1 = await run(
      `INSERT INTO books (title, author, callNumber, accessionNumber, available) VALUES (?, ?, ?, ?, ?) RETURNING id`,
      ['Data Structures', 'Jane Author', 'QA-100', 'ACC-SEED-001', 1]
    );

    const book2 = await run(
      `INSERT INTO books (title, author, callNumber, accessionNumber, available) VALUES (?, ?, ?, ?, ?) RETURNING id`,
      ['Research Methods', 'John Scholar', 'QA-200', 'ACC-SEED-002', 1]
    );

    const request1 = await run(
      `INSERT INTO requests (studentId, bookId, status, requestedAt, approvedAt, dueDate) VALUES (?, ?, ?, ?, ?, ?) RETURNING id`,
      [String(student1.id), String(book1.id), 'approved', new Date().toISOString(), new Date().toISOString(), calculateDueDate({ status: 'undergraduate' }, new Date().toISOString())]
    );

    const request2 = await run(
      `INSERT INTO requests (studentId, bookId, status, requestedAt, approvedAt, dueDate) VALUES (?, ?, ?, ?, ?, ?) RETURNING id`,
      [String(student2.id), String(book2.id), 'approved', new Date().toISOString(), new Date().toISOString(), calculateDueDate({ status: 'postgraduate' }, new Date().toISOString())]
    );

    return res.status(201).json({
      message: 'Seed data loaded successfully.',
      students: [student1.id, student2.id],
      books: [book1.id, book2.id],
      requests: [request1.id, request2.id],
    });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to seed database', error: error.message });
  }
});

app.get('/api/students', async (req, res) => {
  try {
    const students = await all('SELECT * FROM students ORDER BY id DESC');
    const enrichedStudents = await Promise.all(students.map(async (student) => ({
      ...student,
      ...(await getStudentCardSummary(student.id)),
    })));

    res.status(200).json(enrichedStudents);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch students', error: error.message });
  }
});

// Unified login endpoint: identifies the user by either email or registration number and returns the correct role.
app.post('/api/auth/login', async (req, res) => {
  try {
    const identifier = String(req.body.identifier || '').trim();
    const password = String(req.body.password || '').trim();

    if (!identifier || !password) {
      return res.status(400).json({ message: 'Registration Number / email and password are required.' });
    }

    if (isEmailIdentifier(identifier)) {
      if (identifier === DEFAULT_LIBRARIAN.email && password === DEFAULT_LIBRARIAN.password) {
        return res.status(200).json({
          role: 'librarian',
          redirect: '/dashboard',
          message: 'Librarian login successful.',
        });
      }

      if (identifier === DEFAULT_ADMIN.email && password === DEFAULT_ADMIN.password) {
        return res.status(200).json({
          role: 'admin',
          redirect: '/admin-dashboard',
          message: 'Administrator login successful.',
        });
      }

      return res.status(401).json({ message: 'Invalid email or password.' });
    }

    const registrationNumber = normaliseRegistrationNumber(identifier);

    if (!isValidRegistrationNumber(registrationNumber)) {
      return res.status(400).json({
        message: 'Registration number must use the format FAC/YY/DEPT/NNNNN, for example CST/23/SWE/01137.',
      });
    }

    const student = await get(
      'SELECT * FROM students WHERE registrationNumber = ? LIMIT 1',
      [registrationNumber]
    );

    if (!student) {
      return res.status(404).json({ message: 'Student not found. Please register first or check your registration number.' });
    }

    if (password !== student.password) {
      return res.status(401).json({ message: 'Incorrect password.' });
    }

    const history = await all(
      'SELECT * FROM requests WHERE studentId = ? OR studentId = ? ORDER BY requestedAt DESC, id DESC',
      [String(student.id), String(student.registrationNumber)]
    );

    const cardSummary = await getStudentCardSummary(student.id);

    return res.status(200).json({
      role: 'student',
      redirect: '/student-dashboard',
      student: { ...student, password: undefined, ...cardSummary },
      history: history.map(serialiseRequestRow),
    });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to login', error: error.message });
  }
});

// Student login endpoint: verifies the registration number and password before returning the student's record.
app.post('/api/students/login', async (req, res) => {
  try {
    const registrationNumber = normaliseRegistrationNumber(req.body.registrationNumber);
    const password = String(req.body.password || '').trim();

    if (!registrationNumber || !password) {
      return res.status(400).json({ message: 'Registration number and password are required for student login.' });
    }

    if (!isValidRegistrationNumber(registrationNumber)) {
      return res.status(400).json({
        message: 'Registration number must use the format FAC/YY/DEPT/NNNNN, for example CST/23/SWE/01137.',
      });
    }

    const student = await get(
      'SELECT * FROM students WHERE registrationNumber = ? LIMIT 1',
      [registrationNumber]
    );

    if (!student) {
      return res.status(404).json({ message: 'Student not found. Please register first or check your registration number.' });
    }

    if (password !== student.password) {
      return res.status(401).json({ message: 'Incorrect password.' });
    }

    const history = await all(
      'SELECT * FROM requests WHERE studentId = ? OR studentId = ? ORDER BY requestedAt DESC, id DESC',
      [String(student.id), String(student.registrationNumber)]
    );

    const cardSummary = await getStudentCardSummary(student.id);

    return res.status(200).json({
      student: { ...student, password: undefined, ...cardSummary },
      history: history.map(serialiseRequestRow),
    });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to login student', error: error.message });
  }
});

// Create a new student account and issue the library card plus borrow cards.
app.post('/api/students', async (req, res) => {
  try {
    const registrationNumber = normaliseRegistrationNumber(req.body.registrationNumber);
    const fullName = req.body.fullName || 'New Student';
    const faculty = req.body.faculty || 'Science';
    const department = req.body.department || 'Computer Science';
    const status = req.body.status || 'undergraduate';
    const password = String(req.body.password || '').trim();

    if (!isValidRegistrationNumber(registrationNumber)) {
      return res.status(400).json({
        message: 'Registration number must use the format FAC/YY/DEPT/NNNNN, for example CST/23/SWE/01137.',
      });
    }

    const existing = await get('SELECT * FROM students WHERE registrationNumber = ? LIMIT 1', [registrationNumber]);
    if (existing) {
      return res.status(409).json({ message: 'Student with this registration number already exists.' });
    }

    const result = await run(
      `INSERT INTO students (registrationNumber, fullName, faculty, department, status, password) VALUES (?, ?, ?, ?, ?, ?) RETURNING id`,
      [registrationNumber, fullName, faculty, department, status, password || null]
    );

    const student = await get('SELECT * FROM students WHERE id = ?', [result.id]);
    const libraryCardNumber = generateLibraryCardNumber();
    const borrowLimit = getStudentBorrowLimit(student);
    const borrowCards = [];

    await run('DELETE FROM borrow_cards WHERE studentId = ?', [student.id]);
    await run('DELETE FROM library_cards WHERE studentId = ?', [student.id]);

    await run(
      `INSERT INTO library_cards (studentId, libraryCardNumber, registrationNumber, faculty, department) VALUES (?, ?, ?, ?, ?) RETURNING id`,
      [student.id, libraryCardNumber, registrationNumber, faculty, department]
    );

    for (let i = 0; i < borrowLimit; i += 1) {
      const borrowCardNumber = generateBorrowCardNumber(student.id, i);
      const cardResult = await run(
        `INSERT INTO borrow_cards (studentId, borrowCardNumber, status) VALUES (?, ?, 'issued') RETURNING id`,
        [student.id, borrowCardNumber]
      );

      borrowCards.push({
        id: cardResult.id,
        borrowCardNumber,
        status: 'issued',
      });
    }

    return res.status(201).json({
      ...student,
      password: student.password,
      libraryCardNumber,
      borrowCardCount: borrowCards.length,
      borrowCards,
    });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to create student', error: error.message });
  }
});

app.post('/api/students/activate', async (req, res) => {
  try {
    const registrationNumber = normaliseRegistrationNumber(req.body.registrationNumber);
    const password = String(req.body.password || '').trim();

    if (!isValidRegistrationNumber(registrationNumber)) {
      return res.status(400).json({
        message: 'Registration number must use the format FAC/YY/DEPT/NNNNN, for example CST/23/SWE/01137.',
      });
    }

    if (!password) {
      return res.status(400).json({ message: 'Please choose a password to activate your account.' });
    }

    const student = await get(
      'SELECT * FROM students WHERE registrationNumber = ? LIMIT 1',
      [registrationNumber]
    );

    if (!student) {
      return res.status(404).json({ message: 'Student not found. Please contact the library administrator.' });
    }

    await run(
      'UPDATE students SET password = ? WHERE id = ?',
      [password, student.id]
    );

    return res.status(200).json({
      message: 'Student account activated successfully.',
      registrationNumber,
    });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to activate student account', error: error.message });
  }
});

// -----------------------------------------------------------
// Book endpoints
// -----------------------------------------------------------
app.get('/api/books', async (req, res) => {
  try {
    const books = await all('SELECT * FROM books ORDER BY id DESC');

    const enrichedBooks = await Promise.all(books.map(async (book) => {
      const requestStatus = await getBookRequestStatus(book);
      const available = requestStatus === 'available' || requestStatus === 'returned';

      return {
        ...book,
        available: Boolean(available),
        requestStatus,
      };
    }));

    res.status(200).json(enrichedBooks);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch books', error: error.message });
  }
});

// Add a new book to the catalog with validation to prevent duplicate accession numbers.
app.post('/api/books', async (req, res) => {
  try {
    const title = req.body.title || 'New Book';
    const author = req.body.author || 'Unknown Author';
    const callNumber = req.body.callNumber || 'QA-001';
    const accessionNumber = req.body.accessionNumber || `ACC-${Date.now()}`;

    const existing = await get('SELECT * FROM books WHERE accessionNumber = ? LIMIT 1', [accessionNumber]);
    if (existing) {
      return res.status(409).json({ message: 'Book with this accession number already exists.' });
    }

    const result = await run(
      `INSERT INTO books (title, author, callNumber, accessionNumber, available) VALUES (?, ?, ?, ?, 1) RETURNING id`,
      [title, author, callNumber, accessionNumber]
    );

    const book = await get('SELECT * FROM books WHERE id = ?', [result.id]);
    return res.status(201).json({ ...book, available: Boolean(book.available) });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to create book', error: error.message });
  }
});

// -----------------------------------------------------------
// Request and borrowing workflow endpoints
// -----------------------------------------------------------
app.get('/api/requests', async (req, res) => {
  try {
    const rows = await all('SELECT * FROM requests ORDER BY id DESC');
    res.status(200).json(rows.map(serialiseRequestRow));
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch requests', error: error.message });
  }
});

app.get('/api/requests/history', async (req, res) => {
  try {
    const studentId = req.query.studentId;

    if (!studentId) {
      return res.status(400).json({ message: 'studentId query parameter is required.' });
    }

    const rows = await all(
      'SELECT * FROM requests WHERE studentId = ? ORDER BY requestedAt DESC, id DESC',
      [String(studentId)]
    );

    return res.status(200).json(rows.map(serialiseRequestRow));
  } catch (error) {
    return res.status(500).json({ message: 'Failed to fetch request history', error: error.message });
  }
});

app.get('/api/requests/overdue', async (req, res) => {
  try {
    const rows = await all(
      "SELECT * FROM requests WHERE status = 'approved' AND dueDate IS NOT NULL AND returnedAt IS NULL ORDER BY dueDate ASC"
    );

    const overdue = rows.filter((row) => {
      if (!row.dueDate) return false;
      return new Date(row.dueDate) < new Date();
    });

    return res.status(200).json(overdue.map(serialiseRequestRow));
  } catch (error) {
    return res.status(500).json({ message: 'Failed to fetch overdue requests', error: error.message });
  }
});

app.post('/api/requests', async (req, res) => {
  try {
    const studentId = req.body.studentId;
    const bookId = req.body.bookId;

    if (!studentId || !bookId) {
      return res.status(400).json({ message: 'studentId and bookId are required.' });
    }

    const student = await getStudentByIdentifier(studentId);
    const book = await getBookByIdentifier(bookId);

    if (student) {
      const activeRequests = await all(
        `SELECT * FROM requests WHERE studentId = ? AND status IN ('pending', 'approved', 'return_requested')`,
        [String(studentId)]
      );

      const borrowLimit = getStudentBorrowLimit(student);
      if (activeRequests.length >= borrowLimit) {
        return res.status(400).json({
          message: `You have already reached your borrow limit of ${borrowLimit} books. Please return a book before requesting another one.`,
        });
      }
    }

    if (student || book) {
      const existing = await get(
        `SELECT * FROM requests WHERE studentId = ? AND bookId = ? AND status IN ('pending', 'approved', 'return_requested') LIMIT 1`,
        [String(studentId), String(bookId)]
      );

      if (existing) {
        return res.status(409).json({
          message: 'A request for this book is already active for the student.',
          request: serialiseRequestRow(existing),
        });
      }
    }

    const activeBookRequest = await get(
      `SELECT * FROM requests WHERE (CAST(bookId AS TEXT) = ? OR bookId = ?) AND status IN ('pending', 'approved', 'return_requested') ORDER BY id DESC LIMIT 1`,
      [String(bookId), String(bookId)]
    );

    if (activeBookRequest && String(activeBookRequest.studentId) !== String(studentId)) {
      return res.status(400).json({
        message: 'Book is not available. It has already been borrowed or requested by another student.',
      });
    }

    if (book && (book.available === 0 || book.available === false)) {
      return res.status(400).json({ message: 'Book is not available. It has already been borrowed or requested by another student.' });
    }

    const result = await run(
      `INSERT INTO requests (studentId, bookId, status, requestedAt) VALUES (?, ?, 'pending', ?) RETURNING id`,
      [String(studentId), String(bookId), new Date().toISOString()]
    );

    const request = await get('SELECT * FROM requests WHERE id = ?', [result.id]);
    return res.status(201).json(serialiseRequestRow(request));
  } catch (error) {
    return res.status(500).json({ message: 'Failed to create request', error: error.message });
  }
});

app.patch('/api/requests/:id/approve', async (req, res) => {
  try {
    const requestRow = await get('SELECT * FROM requests WHERE id = ?', [req.params.id]);

    if (!requestRow) {
      return res.status(404).json({ message: 'Request not found' });
    }

    if (String(requestRow.status).toLowerCase() === 'approved') {
      return res.status(200).json(serialiseRequestRow(requestRow));
    }

    const student = await getStudentByIdentifier(requestRow.studentId);
    if (student) {
      const activeApproved = await all(
        `SELECT * FROM requests WHERE studentId = ? AND status = 'approved'`,
        [String(requestRow.studentId)]
      );

      const borrowLimit = getStudentBorrowLimit(student);
      if (activeApproved.length >= borrowLimit) {
        return res.status(400).json({
          message: `Student has reached the borrow limit of ${borrowLimit} books.`,
        });
      }
    }

    const approvedAt = new Date().toISOString();
    const dueDate = calculateDueDate(student, approvedAt);

    await run(
      `UPDATE requests SET status = 'approved', approvedAt = ?, dueDate = ? WHERE id = ?`,
      [approvedAt, dueDate, req.params.id]
    );

    const updatedRequest = await get('SELECT * FROM requests WHERE id = ?', [req.params.id]);

    const book = await getBookByIdentifier(updatedRequest.bookId);
    if (book) {
      await run('UPDATE books SET available = 0 WHERE id = ?', [book.id]);
    }

    return res.status(200).json(serialiseRequestRow(updatedRequest));
  } catch (error) {
    return res.status(500).json({ message: 'Failed to approve request', error: error.message });
  }
});

app.patch('/api/requests/:id/return', async (req, res) => {
  try {
    const requestRow = await get('SELECT * FROM requests WHERE id = ?', [req.params.id]);

    if (!requestRow) {
      return res.status(404).json({ message: 'Request not found' });
    }

    if (String(requestRow.status).toLowerCase() === 'returned') {
      return res.status(200).json(serialiseRequestRow(requestRow));
    }

    if (String(requestRow.status).toLowerCase() === 'return_requested') {
      return res.status(200).json(serialiseRequestRow(requestRow));
    }

    await run(
      `UPDATE requests SET status = 'return_requested', returnedAt = NULL WHERE id = ?`,
      [req.params.id]
    );

    const updatedRequest = await get('SELECT * FROM requests WHERE id = ?', [req.params.id]);
    return res.status(200).json(serialiseRequestRow(updatedRequest));
  } catch (error) {
    return res.status(500).json({ message: 'Failed to request return', error: error.message });
  }
});

app.patch('/api/requests/:id/approve-return', async (req, res) => {
  try {
    const requestRow = await get('SELECT * FROM requests WHERE id = ?', [req.params.id]);

    if (!requestRow) {
      return res.status(404).json({ message: 'Request not found' });
    }

    if (String(requestRow.status).toLowerCase() === 'returned') {
      return res.status(200).json(serialiseRequestRow(requestRow));
    }

    if (String(requestRow.status).toLowerCase() !== 'return_requested') {
      return res.status(400).json({ message: 'This request has not been marked for return yet.' });
    }

    await run(
      `UPDATE requests SET status = 'returned', returnedAt = ? WHERE id = ?`,
      [new Date().toISOString(), req.params.id]
    );

    const updatedRequest = await get('SELECT * FROM requests WHERE id = ?', [req.params.id]);
    const book = await getBookByIdentifier(updatedRequest.bookId);
    if (book) {
      await run('UPDATE books SET available = 1 WHERE id = ?', [book.id]);
    }

    return res.status(200).json(serialiseRequestRow(updatedRequest));
  } catch (error) {
    return res.status(500).json({ message: 'Failed to approve return', error: error.message });
  }
});

app.get('/', (req, res) => {
  res.send('Library Management System backend is running.');
});

if (require.main === module) {
  // Wait for the tables to exist before accepting requests.
  ready
    .then(() => {
      app.listen(PORT, () => {
        console.log(`Library backend running on port ${PORT}`);
      });
    })
    .catch((error) => {
      console.error('Database initialisation failed:', error.message);
      process.exit(1);
    });
}

module.exports = app;