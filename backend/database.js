const path = require('path');

const databaseUrl = process.env.DATABASE_URL || '';
const usePostgres = databaseUrl.startsWith('postgres');

let db = null;
let run = null;
let get = null;
let all = null;
// Resolves once the tables exist. server.js waits for it before listening.
let ready = Promise.resolve();

const convertSqlitePlaceholders = (sql, params = []) => {
  let index = 0;
  const convertedSql = sql.replace(/\?/g, () => `$${++index}`);
  return { text: convertedSql, values: params };
};

if (usePostgres) {
  const { Pool } = require('pg');

  // Hosted Postgres (Render, Neon, Supabase...) needs SSL. A local one usually does not.
  // Set PGSSL=false to turn SSL off explicitly.
  const getSslConfig = () => {
    if (process.env.PGSSL === 'false') return false;
    if (/@(localhost|127\.0\.0\.1)(:|\/)/.test(databaseUrl)) return false;
    return { rejectUnauthorized: false };
  };

  const pool = new Pool({ connectionString: databaseUrl, ssl: getSslConfig() });
  pool.on('error', (error) => {
    console.error('Unexpected PostgreSQL pool error:', error.message);
  });
  db = pool;

  // Postgres folds unquoted column names to lowercase (registrationNumber -> registrationnumber).
  // The rest of the app expects camelCase, so map the keys back on every row.
  const COLUMN_NAMES = [
    'registrationNumber', 'fullName', 'createdAt', 'studentId', 'bookId',
    'requestedAt', 'approvedAt', 'dueDate', 'returnedAt', 'callNumber',
    'accessionNumber', 'libraryCardNumber', 'borrowCardNumber', 'issuedAt', 'usedAt',
  ];
  const camelByLowercase = Object.fromEntries(COLUMN_NAMES.map((name) => [name.toLowerCase(), name]));

  const normaliseRow = (row) => {
    if (!row) return row;
    const output = {};
    for (const [key, value] of Object.entries(row)) {
      output[camelByLowercase[key] || key] = value;
    }
    return output;
  };

  run = async (sql, params = []) => {
    const { text, values } = convertSqlitePlaceholders(sql, params);
    const result = await pool.query(text, values);
    const firstRow = result.rows?.[0];
    const id = firstRow && Object.prototype.hasOwnProperty.call(firstRow, 'id')
      ? firstRow.id
      : null;

    return {
      id,
      changes: result.rowCount ?? 0,
      rows: (result.rows || []).map(normaliseRow),
    };
  };

  get = async (sql, params = []) => {
    const { text, values } = convertSqlitePlaceholders(sql, params);
    const result = await pool.query(text, values);
    return normaliseRow(result.rows[0]) || null;
  };

  all = async (sql, params = []) => {
    const { text, values } = convertSqlitePlaceholders(sql, params);
    const result = await pool.query(text, values);
    return (result.rows || []).map(normaliseRow);
  };

  const ensureColumnExists = async (tableName, columnName, columnType, defaultValue = null) => {
    const result = await pool.query(
      `SELECT EXISTS (
         SELECT 1 FROM information_schema.columns
         WHERE table_name = $1 AND column_name = $2
       ) AS found`,
      [tableName.toLowerCase(), columnName.toLowerCase()]
    );
    if (result.rows[0]?.found) return;

    const defaultClause = defaultValue === null ? '' : ` DEFAULT ${defaultValue}`;
    await pool.query(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${columnType}${defaultClause};`);
  };

  const initPostgres = async () => {
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

    // available is INTEGER (1/0), not BOOLEAN, because server.js writes 1 and 0.
    await pool.query(`
      CREATE TABLE IF NOT EXISTS books (
        id SERIAL PRIMARY KEY,
        title TEXT,
        author TEXT,
        callNumber TEXT,
        accessionNumber TEXT UNIQUE,
        available INTEGER DEFAULT 1,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Migrate a books table created earlier with a BOOLEAN column.
    const availableColumn = await pool.query(
      `SELECT data_type FROM information_schema.columns
       WHERE table_name = 'books' AND column_name = 'available'`
    );
    if (availableColumn.rows[0]?.data_type === 'boolean') {
      await pool.query('ALTER TABLE books ALTER COLUMN available DROP DEFAULT');
      await pool.query('ALTER TABLE books ALTER COLUMN available TYPE INTEGER USING available::int');
      await pool.query('ALTER TABLE books ALTER COLUMN available SET DEFAULT 1');
    }

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

  ready = initPostgres();
  // Mark as handled so importing this file never causes an unhandled rejection;
  // server.js still receives the rejection and reports it.
  ready.catch(() => {});
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

  const initSqlite = () => {
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

  initSqlite();
}

module.exports = {
  db,
  run,
  get,
  all,
  ready,
  initializeDatabase: () => ready,
};