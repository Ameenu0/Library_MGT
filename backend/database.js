const path = require('path');
const usePostgres = !!(process.env.DATABASE_URL && process.env.DATABASE_URL.startsWith('postgres'));

let db = null;
let run = null;
let get = null;
let all = null;
let initializeDatabase = () => {};

const convertSqlitePlaceholders = (sql, params = []) => {
  let index = 0;
  const convertedSql = sql.replace(/\?/g, () => `$${++index}`);
  return { text: convertedSql, values: params };
};

if (usePostgres) {
  const { Pool } = require('pg');
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  db = pool;

  run = async (sql, params = []) => {
    const { text, values } = convertSqlitePlaceholders(sql, params);
    const result = await pool.query(text, values);
    return {
      id: result.rows[0]?.id ?? null,
      changes: result.rowCount ?? 0,
    };
  };

  get = async (sql, params = []) => {
    const { text, values } = convertSqlitePlaceholders(sql, params);
    const result = await pool.query(text, values);
    return result.rows[0] || null;
  };

  all = async (sql, params = []) => {
    const { text, values } = convertSqlitePlaceholders(sql, params);
    const result = await pool.query(text, values);
    return result.rows || [];
  };

  const ensureColumnExists = async (tableName, columnName, columnType, defaultValue = null) => {
    const query = `
      SELECT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = $1 AND column_name = $2
      ) AS exists;
    `;

    const result = await pool.query(query, [tableName, columnName]);
    if (result.rows[0]?.exists) {
      return;
    }

    const defaultClause = defaultValue === null ? '' : ` DEFAULT ${defaultValue}`;
    await pool.query(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${columnType}${defaultClause};`);
  };

  const initializeDatabase = async () => {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS students (
        id SERIAL PRIMARY KEY,
        registrationNumber TEXT UNIQUE,
        fullName TEXT,
        faculty TEXT,
        department TEXT,
        status TEXT DEFAULT 'undergraduate',
        password TEXT,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await ensureColumnExists('students', 'password', 'TEXT');

    await pool.query(`
      CREATE TABLE IF NOT EXISTS books (
        id SERIAL PRIMARY KEY,
        title TEXT,
        author TEXT,
        callNumber TEXT,
        accessionNumber TEXT UNIQUE,
        available BOOLEAN DEFAULT TRUE,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS requests (
        id SERIAL PRIMARY KEY,
        studentId TEXT,
        bookId TEXT,
        status TEXT DEFAULT 'pending',
        requestedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        approvedAt TIMESTAMP,
        dueDate TIMESTAMP,
        returnedAt TIMESTAMP
      );
    `);

    await ensureColumnExists('requests', 'dueDate', 'TIMESTAMP');

    await pool.query(`
      CREATE TABLE IF NOT EXISTS library_cards (
        id SERIAL PRIMARY KEY,
        studentId INTEGER,
        libraryCardNumber TEXT UNIQUE,
        registrationNumber TEXT,
        faculty TEXT,
        department TEXT,
        issuedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS borrow_cards (
        id SERIAL PRIMARY KEY,
        studentId INTEGER,
        borrowCardNumber TEXT UNIQUE,
        status TEXT DEFAULT 'issued',
        issuedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        usedAt TIMESTAMP,
        returnedAt TIMESTAMP
      );
    `);
  };

  initializeDatabase().catch((error) => {
    console.error('Failed to initialize PostgreSQL database:', error.message);
  });
} else {
  const sqlite3 = require('sqlite3').verbose();
  const dbPath = path.join(__dirname, 'library.db');
  db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
      console.error('Failed to connect to SQLite database:', err.message);
    }
  });

  run = (sql, params = []) => new Promise((resolve, reject) => {
    db.run(sql, params, function onRun(err) {
      if (err) {
        reject(err);
        return;
      }

      resolve({ id: this.lastID, changes: this.changes });
    });
  });

  get = (sql, params = []) => new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) {
        reject(err);
        return;
      }

      resolve(row || null);
    });
  });

  all = (sql, params = []) => new Promise((resolve, reject) => {
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
}

module.exports = {
  db,
  run,
  get,
  all,
  initializeDatabase,
};
