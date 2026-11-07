const path = require('path');
const sqlite3 = require('sqlite3').verbose();

const dbPath = path.join(__dirname, 'library.db');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Failed to connect to SQLite database:', err.message);
  }
});

const run = (sql, params = []) => new Promise((resolve, reject) => {
  db.run(sql, params, function onRun(err) {
    if (err) {
      reject(err);
      return;
    }

    resolve({ id: this.lastID, changes: this.changes });
  });
});

const get = (sql, params = []) => new Promise((resolve, reject) => {
  db.get(sql, params, (err, row) => {
    if (err) {
      reject(err);
      return;
    }

    resolve(row || null);
  });
});

const all = (sql, params = []) => new Promise((resolve, reject) => {
  db.all(sql, params, (err, rows) => {
    if (err) {
      reject(err);
      return;
    }

    resolve(rows || []);
  });
});

const initializeDatabase = () => {
  db.serialize(() => {
    db.run(`
      CREATE TABLE IF NOT EXISTS students (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        registrationNumber TEXT UNIQUE,
        fullName TEXT,
        faculty TEXT,
        department TEXT,
        status TEXT DEFAULT 'undergraduate',
        password TEXT,
        createdAt TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `);

    db.all('PRAGMA table_info(students)', (error, columns) => {
      if (error) {
        console.error('Failed to inspect students schema:', error.message);
        return;
      }

      const hasPassword = columns.some((column) => column.name === 'password');
      if (!hasPassword) {
        db.run('ALTER TABLE students ADD COLUMN password TEXT');
      }
    });

    db.run(`
      CREATE TABLE IF NOT EXISTS books (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT,
        author TEXT,
        callNumber TEXT,
        accessionNumber TEXT UNIQUE,
        available INTEGER DEFAULT 1,
        createdAt TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `);

    db.run(`
      CREATE TABLE IF NOT EXISTS requests (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        studentId TEXT,
        bookId TEXT,
        status TEXT DEFAULT 'pending',
        requestedAt TEXT DEFAULT CURRENT_TIMESTAMP,
        approvedAt TEXT,
        dueDate TEXT,
        returnedAt TEXT
      )
    `);

    db.all('PRAGMA table_info(requests)', (error, columns) => {
      if (error) {
        console.error('Failed to inspect requests schema:', error.message);
        return;
      }

      const hasDueDate = columns.some((column) => column.name === 'dueDate');
      if (!hasDueDate) {
        db.run('ALTER TABLE requests ADD COLUMN dueDate TEXT');
      }
    });

    db.run(`
      CREATE TABLE IF NOT EXISTS library_cards (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        studentId INTEGER,
        libraryCardNumber TEXT UNIQUE,
        registrationNumber TEXT,
        faculty TEXT,
        department TEXT,
        issuedAt TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `);

    db.run(`
      CREATE TABLE IF NOT EXISTS borrow_cards (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        studentId INTEGER,
        borrowCardNumber TEXT UNIQUE,
        status TEXT DEFAULT 'issued',
        issuedAt TEXT DEFAULT CURRENT_TIMESTAMP,
        usedAt TEXT,
        returnedAt TEXT
      )
    `);
  });
};

initializeDatabase();

module.exports = {
  db,
  run,
  get,
  all,
  initializeDatabase,
};
