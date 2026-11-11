// =====================================================================
//  LIBRARY MANAGEMENT SYSTEM  -  BACKEND  (server.js)
// =====================================================================
//
//  WHAT THIS FILE IS
//  This is the Express web server (the "API") that the React frontend
//  talks to. The frontend sends it requests such as "log me in" or
//  "approve this book request". This file checks the request, reads or
//  changes the database (through database.js) and replies with JSON.
//
//  HOW ONE REQUEST TRAVELS THROUGH THIS FILE
//
//    Browser (React app on Vercel)
//         |   fetch(`${API_URL}/books`)
//         v
//    1. CORS check          -> is this website allowed to call us?
//    2. express.json()      -> turns the JSON body into req.body
//    3. Route handler       -> app.get / app.post / app.patch below
//         |                       |
//         |                       v
//         |              get / all / run   (database.js -> SQLite or PostgreSQL)
//         v                       |
//    JSON response  <-------------+
//
//  SETTINGS READ FROM ENVIRONMENT VARIABLES (Render dashboard, or a local .env file)
//    DATABASE_URL  PostgreSQL address. If it is missing, SQLite (library.db) is used.
//    CORS_ORIGIN   Comma-separated list of websites allowed to call this API.
//    NODE_ENV      Set to "production" on Render. This hides the /api/testing routes.
//    PORT          Port to listen on. Render sets this for you; locally it is 5000.
//
//  MAP OF THIS FILE (search for the banner names to jump around)
//    1. Setup               imports, port, CORS list, database reset helper
//    2. Middleware          CORS rules and JSON body parsing
//    3. Helpers             validation, lookups, card numbers, due dates
//    4. Utility + testing   /api/health and the test-only /api/testing routes
//    5. Student endpoints   list, login, register, activate
//    6. Book endpoints      list and add books
//    7. Request endpoints   borrow -> approve -> return -> approve return
//    8. Server start        wait for the database, then listen
//
//  BORROWING LIFE CYCLE (the status stored in the requests table)
//    pending -> approved -> return_requested -> returned
//    (student asks) (librarian OKs) (student brings it back) (librarian confirms)

require('dotenv').config();

// -----------------------------------------------------------
//  1. SETUP
// -----------------------------------------------------------
// express = the web framework. cors = lets the frontend's website address call this API.
const express = require('express');
const cors = require('cors');
// Database helpers from database.js (they work the same on SQLite and PostgreSQL):
//   get(sql, [values])  -> returns ONE row (or null)
//   all(sql, [values])  -> returns a list of rows
//   run(sql, [values])  -> runs INSERT / UPDATE / DELETE and returns { id, changes }
//   ready               -> a promise that finishes once all tables exist (used at the bottom)
const { db, get, all, run, ready } = require('./database');

// Create the Express application. Every route below is attached to this `app` object.
const app = express();
// Port the server listens on. Render supplies PORT automatically; 5000 is used on your own computer.
const PORT = process.env.PORT || 5000;
// True when DATABASE_URL points to PostgreSQL (the deployed setup).
// It is only needed by resetDatabaseTables() below, because Postgres and SQLite empty tables differently.
const usePostgres = !!(process.env.DATABASE_URL && process.env.DATABASE_URL.startsWith('postgres'));
// Websites that are allowed to call this API (CORS).
// CORS_ORIGIN is a comma-separated list, for example:
//   http://localhost:5173,https://librarymgt.vercel.app
// Each entry must match the website address exactly: no trailing slash, no path.
// If CORS_ORIGIN is not set, only the local development servers are allowed.
const allowedOrigins = (process.env.CORS_ORIGIN || 'http://localhost:5173,http://127.0.0.1:5173')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

// Empties every table. Used ONLY by the test routes (/api/testing/reset and /api/testing/seed).
//   PostgreSQL: one TRUNCATE ... RESTART IDENTITY CASCADE (also restarts the id counters).
//   SQLite:     DELETE every table, then reset the id counters stored in sqlite_sequence.
// WARNING: this deletes ALL data. It must never be reachable on the live site (see the guard further down).
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

// -----------------------------------------------------------
//  2. MIDDLEWARE (code that runs before every route)
// -----------------------------------------------------------
// CORS: browsers block a website from calling a different website's API unless the API says it is allowed.
// Every browser request carries an "Origin" header (the address of the website making the call).
//   - No Origin header (Postman, curl, Render health checks)  -> allowed
//   - Origin is in allowedOrigins                              -> allowed
//   - Anything else                                            -> rejected with an error, and the browser shows a CORS error
// `credentials: true` lets the browser send cookies / auth headers (not used yet, but needed if you add login tokens later).
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
// Reads the JSON body of POST / PATCH requests and puts it in `req.body` (every route below relies on this).
app.use(express.json());

// -----------------------------------------------------------
//  3. CONSTANTS AND HELPER FUNCTIONS
// -----------------------------------------------------------
// Allowed format of a student registration number: FACULTY/YY/DEPARTMENT/NUMBER
// Example: CST/23/SWE/01137  (2-10 letters, 2 digits, 2-10 letters, 5 digits).
const REGISTRATION_NUMBER_PATTERN = /^[A-Z]{2,10}\/\d{2}\/[A-Z]{2,10}\/\d{5}$/;
// Built-in staff accounts. They are checked in code and are NOT stored in the database.
// NOTE (security): hard-coded passwords are fine for a demo, but before real use move them
// to environment variables, or to a users table with hashed passwords.
const DEFAULT_LIBRARIAN = {
  email: 'librarian@library.com',
  password: 'librarian12',
};

const DEFAULT_ADMIN = {
  email: 'admin@library.com',
  password: 'admin123',
};

// Returns true when the text looks like an email address (something@something.tld).
// Login uses this to decide: email -> staff (librarian/admin), anything else -> student registration number.
const isEmailIdentifier = (value = '') => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value).trim());

// Normalises student identifiers so the app accepts values with spaces or lowercase letters.
// Example: "  cst/23/swe/01137 " becomes "CST/23/SWE/01137".
const normaliseRegistrationNumber = (value) => {
  if (value === undefined || value === null) {
    return '';
  }

  return String(value).trim().replace(/\s+/g, '').toUpperCase();
};

// True when the registration number (after cleaning) matches the required format above.
const isValidRegistrationNumber = (value) => REGISTRATION_NUMBER_PATTERN.test(normaliseRegistrationNumber(value));

// Finds ONE student by either their database id (e.g. 3) or their registration number (e.g. CST/23/SWE/01137).
// Many tables store the student as text that can be either form, so the app looks up both ways.
// CAST(id AS TEXT) makes the numeric id comparable with text on both SQLite and PostgreSQL.
// Returns the student row, or null when nobody matches.
const getStudentByIdentifier = async (studentIdentifier) => {
  if (!studentIdentifier) return null;

  const value = String(studentIdentifier);

  const student = await get(
    `SELECT * FROM students WHERE CAST(id AS TEXT) = ? OR registrationNumber = ? LIMIT 1`,
    [value, value]
  );

  return student || null;
};

// Finds ONE book by either its database id or its accession number (the library's unique book code).
// Returns the book row, or null when nothing matches.
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
// How many books a student may hold at once.
//   postgraduate -> 5 books      everything else (undergraduate) -> 3 books
const getStudentBorrowLimit = (student) => {
  const normalizedStatus = String(student?.status || 'undergraduate').toLowerCase();
  return normalizedStatus === 'postgraduate' ? 5 : 3;
};

// Creates a unique library card number such as "LC-1731330000000-A1B2C3" (time stamp + 6 random characters).
const generateLibraryCardNumber = () => `LC-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;

// Creates a borrow card number such as "BC-0007-02-1731330000000":
//   student id (4 digits) - card position (2 digits) - time stamp.
const generateBorrowCardNumber = (studentId, index) => `BC-${String(studentId).padStart(4, '0')}-${String(index + 1).padStart(2, '0')}-${Date.now()}`;

// Collects a student's cards so they can be shown on the dashboard:
//   libraryCardNumber -> the newest library card (or null)
//   borrowCardCount   -> how many borrow cards the student has
//   borrowCards       -> the list of those cards with their status and dates
// The result is spread into the student object returned by several endpoints.
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

// Loan period in days: postgraduate students get 30 days, everyone else gets 14 days.
const getBorrowDays = (student) => {
  const normalizedStatus = String(student?.status || 'undergraduate').toLowerCase();
  return normalizedStatus === 'postgraduate' ? 30 : 14;
};

// Due date = approval date + the student's loan period (see getBorrowDays).
// Returns an ISO date string such as "2026-11-25T10:00:00.000Z".
const calculateDueDate = (student, approvedAt = new Date()) => {
  const dueDate = new Date(approvedAt);
  dueDate.setDate(dueDate.getDate() + getBorrowDays(student));
  return dueDate.toISOString();
};

// Turns a row from the requests table into the plain object we send to the frontend.
// It lists the fields explicitly so only the intended data is exposed.
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

// Works out a book's current state from its request history. Returns one of:
//   'available' | 'pending' | 'approved' | 'return_requested' | 'returned'
// Requests may store the book as its id OR its accession number, so all forms are matched.
const getBookRequestStatus = async (book) => {
  const bookId = book?.id;
  const accessionNumber = book?.accessionNumber;

  const rows = await all(
    `SELECT * FROM requests WHERE CAST(bookId AS TEXT) = ? OR bookId = ? OR bookId = ? ORDER BY id DESC`,
    [String(bookId), String(bookId), String(accessionNumber)]
  );

  // A book nobody has ever requested is available.
  if (!rows.length) {
    return 'available';
  }

  // Rows are sorted newest first, so rows[0] is the latest request and decides the book's current state.
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

// GET /api/health  ->  200 { status: 'ok', ... }.  Open it in a browser to check the server is awake.
// Health endpoint used to confirm the backend is running.
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    message: 'Library Management API is running',
    timestamp: new Date().toISOString(),
  });
});

// -----------------------------------------------------------
//  4. UTILITY AND TEST-ONLY ENDPOINTS
// -----------------------------------------------------------

// Test-only routes: hidden in production so nobody can wipe the live database.
app.use('/api/testing', (req, res, next) => {
  if (process.env.NODE_ENV === 'production') {
    return res.status(404).json({ message: 'Not found' });
  }
  return next();
});

// DELETE /api/testing/reset  ->  empties every table (test use only; blocked in production).
// Response: 200 { message } or 500 on failure.
app.delete('/api/testing/reset', async (req, res) => {
  try {
    await resetDatabaseTables();
    return res.status(200).json({ message: 'Database reset for testing.' });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to reset database', error: error.message });
  }
});

// POST /api/testing/seed  ->  empties the database, then inserts demo data (test use only; blocked in production):
//   2 students (one undergraduate, one postgraduate), 2 books, and 2 already-approved borrow requests.
// Response: 201 { message, students: [ids], books: [ids], requests: [ids] }
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

// -----------------------------------------------------------
//  5. STUDENT ENDPOINTS
// -----------------------------------------------------------
//
// GET /api/students  ->  200 [ list of all students, newest first ]
// Each student also carries their card summary (library card number and borrow cards).
// Used by the librarian and admin dashboards.
// NOTE (security): `...student` includes the password column, so passwords are sent to the browser here.
// Before real use, remove the password from this response (as the login routes already do).
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
// POST /api/auth/login   (this is the login the frontend uses for everyone)
// Body:    { identifier, password }   identifier = an email (staff) OR a registration number (student)
// Success: 200 { role: 'librarian' | 'admin' | 'student', redirect, ... }
//          students also get { student, history }; the frontend uses `role` to choose which dashboard to open.
// Errors:  400 missing/badly formatted input, 401 wrong password, 404 student not found
app.post('/api/auth/login', async (req, res) => {
  try {
    const identifier = String(req.body.identifier || '').trim();
    const password = String(req.body.password || '').trim();

    if (!identifier || !password) {
      return res.status(400).json({ message: 'Registration Number / email and password are required.' });
    }

    // CASE 1: the identifier is an email -> staff login. Only the two built-in accounts exist.
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

    // CASE 2: not an email -> treat it as a student registration number.
    const registrationNumber = normaliseRegistrationNumber(identifier);

    if (!isValidRegistrationNumber(registrationNumber)) {
      return res.status(400).json({
        message: 'Registration number must use the format FAC/YY/DEPT/NNNNN, for example CST/23/SWE/01137.',
      });
    }

    // Look the student up by registration number (the column is unique, so at most one match).
    const student = await get(
      'SELECT * FROM students WHERE registrationNumber = ? LIMIT 1',
      [registrationNumber]
    );

    if (!student) {
      return res.status(404).json({ message: 'Student not found. Please register first or check your registration number.' });
    }

    // NOTE (security): passwords are stored and compared as plain text. Hash them (for example with bcrypt) before real use.
    if (password !== student.password) {
      return res.status(401).json({ message: 'Incorrect password.' });
    }

    // Load the student's borrowing history so the dashboard can show it straight after login. Requests may hold the student's id OR registration number, so both are matched.
    const history = await all(
      'SELECT * FROM requests WHERE studentId = ? OR studentId = ? ORDER BY requestedAt DESC, id DESC',
      [String(student.id), String(student.registrationNumber)]
    );

    const cardSummary = await getStudentCardSummary(student.id);

    // `password: undefined` removes the password from the JSON that is sent back to the browser.
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

// Older student-only login. The frontend now uses POST /api/auth/login instead, but this route is kept in case other code calls it.
// Body: { registrationNumber, password }   Success: 200 { student, history }   Errors: 400 / 401 / 404
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
// POST /api/students   (used by the librarian's "Register Student" form)
// Body:    { registrationNumber, fullName?, faculty?, department?, status?, password? }
//          Missing optional fields get defaults (status defaults to 'undergraduate').
//          If no password is given, the account is created without one and the student must activate it later.
// Success: 201 { the new student, libraryCardNumber, borrowCards }
// Errors:  400 bad registration number format, 409 registration number already exists
app.post('/api/students', async (req, res) => {
  try {
    const registrationNumber = normaliseRegistrationNumber(req.body.registrationNumber);
    const fullName = req.body.fullName || 'New Student';
    const faculty = req.body.faculty || 'Science';
    const department = req.body.department || 'Computer Science';
    const status = req.body.status || 'undergraduate';
    const password = String(req.body.password || '').trim();

    // Step 1: reject registration numbers that do not match the FACULTY/YY/DEPT/NNNNN format.
    if (!isValidRegistrationNumber(registrationNumber)) {
      return res.status(400).json({
        message: 'Registration number must use the format FAC/YY/DEPT/NNNNN, for example CST/23/SWE/01137.',
      });
    }

    // Step 2: registration numbers must be unique.
    const existing = await get('SELECT * FROM students WHERE registrationNumber = ? LIMIT 1', [registrationNumber]);
    if (existing) {
      return res.status(409).json({ message: 'Student with this registration number already exists.' });
    }

    // Step 3: save the student. RETURNING id gives back the new row's id.
    const result = await run(
      `INSERT INTO students (registrationNumber, fullName, faculty, department, status, password) VALUES (?, ?, ?, ?, ?, ?) RETURNING id`,
      [registrationNumber, fullName, faculty, department, status, password || null]
    );

    // Read the saved row back so we have everything the database filled in (id, createdAt, defaults).
    const student = await get('SELECT * FROM students WHERE id = ?', [result.id]);
    // Step 4: issue the library card and one borrow card for each book the student may hold (3 or 5).
    const libraryCardNumber = generateLibraryCardNumber();
    const borrowLimit = getStudentBorrowLimit(student);
    const borrowCards = [];

    // Safety clean-up: remove any old cards for this student id before issuing fresh ones.
    await run('DELETE FROM borrow_cards WHERE studentId = ?', [student.id]);
    await run('DELETE FROM library_cards WHERE studentId = ?', [student.id]);

    await run(
      `INSERT INTO library_cards (studentId, libraryCardNumber, registrationNumber, faculty, department) VALUES (?, ?, ?, ?, ?) RETURNING id`,
      [student.id, libraryCardNumber, registrationNumber, faculty, department]
    );

    // One borrow card per allowed book: 3 for undergraduates, 5 for postgraduates.
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

    // The response includes the password that was set, so the librarian who created the account can see it.
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

// POST /api/students/activate   (the "Activate your account" form on the login page)
// Body:    { registrationNumber, password }  -> sets the student's password.
// Success: 200 { message, registrationNumber }     Errors: 400 / 404
// NOTE (security): this route does not check whether the account already has a password, so anyone who knows a
// registration number could change that student's password. Before real use, only allow it when the password is still empty.
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
//  6. BOOK ENDPOINTS
// -----------------------------------------------------------
// GET /api/books  ->  200 [ list of all books, newest first ]
// Each book also carries:
//   requestStatus -> its current state worked out from the request history ('available', 'pending', 'approved', ...)
//   available     -> true only when the book is 'available' or 'returned'
app.get('/api/books', async (req, res) => {
  try {
    const books = await all('SELECT * FROM books ORDER BY id DESC');

    const enrichedBooks = await Promise.all(books.map(async (book) => {
      // Availability is calculated from the request history, so the list always reflects what is really happening to the book.
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
// POST /api/books   (the librarian's "Add Book" form)
// Body:    { title?, author?, callNumber?, accessionNumber? }  (missing fields get defaults; accession number defaults to ACC-<time>)
// Success: 201 { the new book }      Errors: 409 accession number already exists
app.post('/api/books', async (req, res) => {
  try {
    const title = req.body.title || 'New Book';
    const author = req.body.author || 'Unknown Author';
    const callNumber = req.body.callNumber || 'QA-001';
    const accessionNumber = req.body.accessionNumber || `ACC-${Date.now()}`;

    // Accession numbers identify a physical copy, so they must be unique.
    const existing = await get('SELECT * FROM books WHERE accessionNumber = ? LIMIT 1', [accessionNumber]);
    if (existing) {
      return res.status(409).json({ message: 'Book with this accession number already exists.' });
    }

    // New books start as available (available = 1).
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
//  7. REQUEST AND BORROWING WORKFLOW ENDPOINTS
// -----------------------------------------------------------
// How a loan moves through the system (the `status` column of the requests table):
//
//   1. POST  /api/requests                    student asks for a book        -> 'pending'
//   2. PATCH /api/requests/:id/approve        librarian approves             -> 'approved'  (book becomes unavailable, due date set)
//   3. PATCH /api/requests/:id/return         student says they returned it  -> 'return_requested'
//   4. PATCH /api/requests/:id/approve-return librarian confirms             -> 'returned'  (book becomes available again)
// GET /api/requests  ->  200 [ every request, newest first ]  (used by the dashboards to show pending / active / returned loans).
app.get('/api/requests', async (req, res) => {
  try {
    const rows = await all('SELECT * FROM requests ORDER BY id DESC');
    res.status(200).json(rows.map(serialiseRequestRow));
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch requests', error: error.message });
  }
});

// GET /api/requests/history?studentId=...  ->  200 [ that student's requests, newest first ]
// Error: 400 if studentId is missing.  (The frontend does not call this yet.)
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

// GET /api/requests/overdue  ->  200 [ approved, not-yet-returned requests whose due date has passed ]
// First loads approved loans that have a due date, then keeps only those due before "now". (The frontend does not call this yet.)
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

// POST /api/requests   (a student requests a book)
// Body:    { studentId, bookId }   each may be the database id OR the registration number / accession number.
// Success: 201 { the new request, status 'pending' }
// Rules checked in order; the first one broken stops the request:
//   1. The student must be under their borrow limit (3 undergraduate / 5 postgraduate active requests)  -> 400
//   2. The student must not already have an active request for this same book                         -> 409
//   3. Nobody else may have an active request for this book                                           -> 400
//   4. The book must not be marked unavailable                                                         -> 400
app.post('/api/requests', async (req, res) => {
  try {
    const studentId = req.body.studentId;
    const bookId = req.body.bookId;

    if (!studentId || !bookId) {
      return res.status(400).json({ message: 'studentId and bookId are required.' });
    }

    // Look up the student and the book (ids, registration numbers and accession numbers are all accepted).
    const student = await getStudentByIdentifier(studentId);
    const book = await getBookByIdentifier(bookId);

    // RULE 1: borrow limit. 'Active' means pending, approved or waiting for return confirmation.
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

    // RULE 2: stop a student from requesting the same book twice while the first request is still active.
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

    // RULE 3: if a DIFFERENT student already has an active request on this book, it is not available.
    const activeBookRequest = await get(
      `SELECT * FROM requests WHERE (CAST(bookId AS TEXT) = ? OR bookId = ?) AND status IN ('pending', 'approved', 'return_requested') ORDER BY id DESC LIMIT 1`,
      [String(bookId), String(bookId)]
    );

    if (activeBookRequest && String(activeBookRequest.studentId) !== String(studentId)) {
      return res.status(400).json({
        message: 'Book is not available. It has already been borrowed or requested by another student.',
      });
    }

    // RULE 4: the book itself is flagged unavailable (for example it is currently on loan).
    if (book && (book.available === 0 || book.available === false)) {
      return res.status(400).json({ message: 'Book is not available. It has already been borrowed or requested by another student.' });
    }

    // All rules passed: save the request with status 'pending'. The librarian approves it later.
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

// PATCH /api/requests/:id/approve   (librarian approves a pending request)
// Effects: status -> 'approved', approval time and due date saved, the book is marked unavailable.
// Success: 200 { the updated request }      Errors: 400 student is at their borrow limit, 404 request not found
app.patch('/api/requests/:id/approve', async (req, res) => {
  try {
    const requestRow = await get('SELECT * FROM requests WHERE id = ?', [req.params.id]);

    if (!requestRow) {
      return res.status(404).json({ message: 'Request not found' });
    }

    // Already approved: just return it unchanged, so pressing the button twice does no harm.
    if (String(requestRow.status).toLowerCase() === 'approved') {
      return res.status(200).json(serialiseRequestRow(requestRow));
    }

    // Re-check the borrow limit, this time counting loans that are already approved.
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

    // Due date = today + 14 days (undergraduate) or 30 days (postgraduate).
    const approvedAt = new Date().toISOString();
    const dueDate = calculateDueDate(student, approvedAt);

    await run(
      `UPDATE requests SET status = 'approved', approvedAt = ?, dueDate = ? WHERE id = ?`,
      [approvedAt, dueDate, req.params.id]
    );

    const updatedRequest = await get('SELECT * FROM requests WHERE id = ?', [req.params.id]);

    // Mark the book as unavailable (available = 0) so nobody else can borrow it.
    const book = await getBookByIdentifier(updatedRequest.bookId);
    if (book) {
      await run('UPDATE books SET available = 0 WHERE id = ?', [book.id]);
    }

    return res.status(200).json(serialiseRequestRow(updatedRequest));
  } catch (error) {
    return res.status(500).json({ message: 'Failed to approve request', error: error.message });
  }
});

// PATCH /api/requests/:id/return   (student says they are returning a book)
// Effects: status -> 'return_requested'. The book stays unavailable until the librarian confirms.
// Success: 200 { the updated request }      Errors: 404 request not found
app.patch('/api/requests/:id/return', async (req, res) => {
  try {
    const requestRow = await get('SELECT * FROM requests WHERE id = ?', [req.params.id]);

    if (!requestRow) {
      return res.status(404).json({ message: 'Request not found' });
    }

    // Already returned or already waiting for confirmation: return it unchanged (safe to press twice).
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

// PATCH /api/requests/:id/approve-return   (librarian confirms the book is back)
// Effects: status -> 'returned', returned time saved, the book becomes available again.
// Success: 200 { the updated request }
// Errors:  400 the student has not asked to return it yet, 404 request not found
app.patch('/api/requests/:id/approve-return', async (req, res) => {
  try {
    const requestRow = await get('SELECT * FROM requests WHERE id = ?', [req.params.id]);

    if (!requestRow) {
      return res.status(404).json({ message: 'Request not found' });
    }

    if (String(requestRow.status).toLowerCase() === 'returned') {
      return res.status(200).json(serialiseRequestRow(requestRow));
    }

    // Only a request that is waiting for return confirmation can be approved here.
    if (String(requestRow.status).toLowerCase() !== 'return_requested') {
      return res.status(400).json({ message: 'This request has not been marked for return yet.' });
    }

    await run(
      `UPDATE requests SET status = 'returned', returnedAt = ? WHERE id = ?`,
      [new Date().toISOString(), req.params.id]
    );

    const updatedRequest = await get('SELECT * FROM requests WHERE id = ?', [req.params.id]);
    // Put the book back on the shelf (available = 1).
    const book = await getBookByIdentifier(updatedRequest.bookId);
    if (book) {
      await run('UPDATE books SET available = 1 WHERE id = ?', [book.id]);
    }

    return res.status(200).json(serialiseRequestRow(updatedRequest));
  } catch (error) {
    return res.status(500).json({ message: 'Failed to approve return', error: error.message });
  }
});

// GET /  ->  a plain-text message. Handy to see in a browser that the backend is up.
app.get('/', (req, res) => {
  res.send('Library Management System backend is running.');
});

// -----------------------------------------------------------
//  8. SERVER START
// -----------------------------------------------------------
// `require.main === module` is true only when the file is started directly (`node server.js` / `npm start`).
// When the tests import this file, the server is NOT started, so tests can call `app` without opening a port.
if (require.main === module) {
  // If the database cannot be set up (wrong DATABASE_URL, SSL problem, ...), the process exits with a clear message
  // in the logs instead of running half-broken. Check the Render logs for "Database initialisation failed".
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

// Export the app so tests (jest + supertest) can use it without starting the server.
module.exports = app;