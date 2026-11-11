// =====================================================================
//  LIBRARY MANAGEMENT SYSTEM  -  DATABASE LAYER  (database.js)
// =====================================================================
//
//  WHAT THIS FILE DOES
//  It connects the app to a database and gives server.js four simple tools:
//    run(sql, [values])  -> INSERT / UPDATE / DELETE        returns { id, changes }
//    get(sql, [values])  -> read ONE row                    returns the row or null
//    all(sql, [values])  -> read MANY rows                  returns a list
//    ready               -> a promise that finishes once all tables exist
//
//  WHICH DATABASE IS USED?
//    DATABASE_URL starts with "postgres"  -> PostgreSQL   (deployed on Render)
//    DATABASE_URL missing / anything else -> SQLite file  library.db  (quick local testing)
//  server.js does not need to know which one is active; it calls run / get / all the same way.
//
//  TABLES (created automatically on start-up)
//    students       one row per student (registration number, name, faculty, password...)
//    books          the catalogue (title, author, call number, accession number, available)
//    requests       every borrow request and its status (pending/approved/return_requested/returned)
//    library_cards  one library card per student
//    borrow_cards   the borrow cards issued to each student (3 or 5, depending on category)

const path = require('path');

// The PostgreSQL connection string from the environment (empty when not set).
const databaseUrl = process.env.DATABASE_URL || '';
// True when the address starts with "postgres" (this covers both postgres:// and postgresql://).
const usePostgres = databaseUrl.startsWith('postgres');

// These four variables are filled in below, by the PostgreSQL branch OR the SQLite branch.
// They are exported at the bottom so server.js can use them.
let db = null;
let run = null;
let get = null;
let all = null;
// Resolves once the tables exist. server.js waits for it before listening.
// Resolves once the tables exist. server.js waits for it before it starts listening for requests.
let ready = Promise.resolve();

// The app writes every query with "?" placeholders (SQLite style), e.g.  WHERE id = ?
// PostgreSQL needs numbered placeholders instead:  WHERE id = $1
// This converts one style to the other, so server.js can keep a single set of queries.
// Values are never pasted into the SQL text; they are sent separately, which protects against SQL injection.
const convertSqlitePlaceholders = (sql, params = []) => {
  let index = 0;
  const convertedSql = sql.replace(/\?/g, () => `$${++index}`);
  return { text: convertedSql, values: params };
};

// =====================================================================
//  BRANCH A: PostgreSQL  (used on Render)
// =====================================================================
if (usePostgres) {
  const { Pool } = require('pg');

  // Hosted Postgres (Render, Neon, Supabase...) needs SSL. A local one usually does not.
  // Set PGSSL=false to turn SSL off explicitly.
  // Hosted PostgreSQL (Render, Neon, Supabase...) normally requires an encrypted (SSL) connection.
  //   PGSSL=false in the environment -> SSL off      localhost address -> SSL off      anything else -> SSL on
  // `rejectUnauthorized: false` accepts the provider's certificate without extra setup.
  const getSslConfig = () => {
    if (process.env.PGSSL === 'false') return false;
    if (/@(localhost|127\.0\.0\.1)(:|\/)/.test(databaseUrl)) return false;
    return { rejectUnauthorized: false };
  };

  // The pool keeps a few database connections open and reuses them, which is faster than reconnecting for every query.
  const pool = new Pool({ connectionString: databaseUrl, ssl: getSslConfig() });
  // An idle connection can be dropped by the server; log it instead of letting the whole app crash.
  pool.on('error', (error) => {
    console.error('Unexpected PostgreSQL pool error:', error.message);
  });
  db = pool;

  // Postgres folds unquoted column names to lowercase (registrationNumber -> registrationnumber).
  // The rest of the app expects camelCase, so map the keys back on every row.
  // PostgreSQL turns unquoted column names into lowercase (registrationNumber -> registrationnumber),
  // but the rest of the app expects camelCase. This list is used to map the names back on every row.
  // If you add a new camelCase column to a table, add its name here too.
  const COLUMN_NAMES = [
    'registrationNumber', 'fullName', 'createdAt', 'studentId', 'bookId',
    'requestedAt', 'approvedAt', 'dueDate', 'returnedAt', 'callNumber',
    'accessionNumber', 'libraryCardNumber', 'borrowCardNumber', 'issuedAt', 'usedAt',
  ];
  const camelByLowercase = Object.fromEntries(COLUMN_NAMES.map((name) => [name.toLowerCase(), name]));

  // Renames the keys of one row from lowercase back to camelCase (unknown keys such as id, title, status are left alone).
  const normaliseRow = (row) => {
    if (!row) return row;
    const output = {};
    for (const [key, value] of Object.entries(row)) {
      output[camelByLowercase[key] || key] = value;
    }
    return output;
  };

  // run(): executes INSERT / UPDATE / DELETE.
  //   id      -> the new row's id when the query ends with "RETURNING id" (otherwise null)
  //   changes -> how many rows were affected
  //   rows    -> any rows the query returned
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

  // get(): returns the first matching row (with camelCase keys), or null when nothing matches.
  get = async (sql, params = []) => {
    const { text, values } = convertSqlitePlaceholders(sql, params);
    const result = await pool.query(text, values);
    return normaliseRow(result.rows[0]) || null;
  };

  // all(): returns every matching row (with camelCase keys) as a list; an empty list when nothing matches.
  all = async (sql, params = []) => {
    const { text, values } = convertSqlitePlaceholders(sql, params);
    const result = await pool.query(text, values);
    return (result.rows || []).map(normaliseRow);
  };

  // Adds a column to an existing table only if it is not there yet. Used to upgrade databases created by older versions.
  // Names are lower-cased for the lookup because PostgreSQL stores them in lowercase.
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

  // Creates every table if it does not exist yet ("CREATE TABLE IF NOT EXISTS"), so it is safe to run on every start.
  // It never deletes data. It runs in order and stops at the first failure; server.js then reports the error and exits.
  const initPostgres = async () => {
    // TABLE students: one row per student. `password` is NULL until the student activates their account.
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

    // TABLE books: the library catalogue. `available` is 1 (on the shelf) or 0 (on loan).
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

    // TABLE requests: one row per borrow request.
    //   status: pending -> approved -> return_requested -> returned
    //   studentId / bookId are TEXT because they may hold the numeric id OR the registration / accession number.
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

    // TABLE library_cards: each student gets one library card number when registered.
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

    // TABLE borrow_cards: the borrow cards issued to a student (3 for undergraduates, 5 for postgraduates).
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

  // Start creating the tables as soon as this file is loaded.
  ready = initPostgres();
  // Mark as handled so importing this file never causes an unhandled rejection;
  // server.js still receives the rejection and reports it.
  ready.catch(() => {});
// =====================================================================
//  BRANCH B: SQLite  (local fallback when DATABASE_URL is not set)
// =====================================================================
// NOTE: on hosts such as Render the disk is temporary, so a SQLite file is erased on every restart.
// Use PostgreSQL for the deployed site.
} else {
  // sqlite3 is only loaded in this branch, so a PostgreSQL deployment never needs it.
  const sqlite3 = require('sqlite3').verbose();
  // The database is the file library.db next to this script; SQLite creates it automatically if it is missing.
  const dbPath = path.join(__dirname, 'library.db');
  db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
      console.error('Failed to connect to SQLite database:', err.message);
    }
  });

  // run(), get() and all() below do the same jobs as in the PostgreSQL branch, wrapped in promises so they can be used with await.
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

  // Creates the same tables as the PostgreSQL branch ("IF NOT EXISTS", so existing data is kept).
  // db.serialize() makes the statements run one after another, in order.
  const initSqlite = () => {
    db.serialize(() => {
      // TABLE students (see the PostgreSQL branch for what each table holds).
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

      // Upgrade for older databases: add the `password` column if it is missing.
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

      // Upgrade for older databases: add the `dueDate` column if it is missing.
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

// What server.js imports:
//   db                  the raw connection (rarely needed)
//   run / get / all     the query helpers
//   ready               resolves when the tables exist
//   initializeDatabase  returns `ready` (kept so older code calling it still works)
module.exports = {
  db,
  run,
  get,
  all,
  ready,
  initializeDatabase: () => ready,
};