import { BrowserRouter, NavLink, Navigate, Route, Routes, useNavigate } from 'react-router-dom'
import { useEffect, useMemo, useRef, useState } from 'react'
import './App.css'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

const EMPTY_STUDENT_FORM = {
  registrationNumber: '',
  fullName: '',
  faculty: '',
  department: '',
  status: 'undergraduate',
  password: '',
}

const EMPTY_BOOK_FORM = {
  title: '',
  author: '',
  callNumber: '',
  accessionNumber: '',
}

const EMPTY_LOGIN_FORM = {
  email: '',
  password: '',
}

const REGISTRATION_NUMBER_PATTERN = /^[A-Z]{2,10}\/\d{2}\/[A-Z]{2,10}\/\d{5}$/

const normalizeRegistrationNumber = (value = '') => String(value).trim().replace(/\s+/g, '').toUpperCase()
const isValidRegistrationNumber = (value = '') => REGISTRATION_NUMBER_PATTERN.test(normalizeRegistrationNumber(value))

const DEFAULT_LIBRARIAN = {
  email: 'librarian@library.com',
  password: 'librarian12',
}

const DEFAULT_ADMIN = {
  email: 'admin@library.com',
  password: 'admin123',
}

const AUTH_STORAGE_KEY = 'library_auth_state'
const NOTICE_STORAGE_KEY = 'library_notice_state'

const readStoredAuth = () => {
  try {
    const rawValue = localStorage.getItem(AUTH_STORAGE_KEY)
    if (!rawValue) {
      return { isLoggedIn: false, userRole: null, activeStudent: null }
    }

    return JSON.parse(rawValue)
  } catch (error) {
    return { isLoggedIn: false, userRole: null, activeStudent: null }
  }
}

const readStoredNotice = () => {
  try {
    const rawValue = sessionStorage.getItem(NOTICE_STORAGE_KEY)
    if (!rawValue) {
      return { message: '', tone: 'success' }
    }

    return JSON.parse(rawValue)
  } catch (error) {
    return { message: '', tone: 'success' }
  }
}

function StatCard({ label, value, accent }) {
  return (
    <div className="stat-card" data-accent={accent}>
      <span className="stat-label">{label}</span>
      <strong>{value}</strong>
    </div>
  )
}

function SectionHeader({ title, subtitle }) {
  return (
    <div className="section-header">
      <div>
        <h2>{title}</h2>
      </div>
      {subtitle && <span className="section-subtitle">{subtitle}</span>}
    </div>
  )
}

// Shared layout used by all user roles. It renders the top navigation bar and the page content area.
function AppShell({ children, isLoggedIn, onLogout, showNav = true, role = 'librarian', requests = [] }) {
  const pendingBorrowRequestCount = requests.filter((request) => request.status === 'pending').length
  const pendingReturnRequestCount = requests.filter((request) => request.status === 'return_requested').length

  const navLinks = role === 'student'
    ? (
      <>
        <NavLink to="/student-dashboard" className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>Dashboard</NavLink>
        <NavLink to="/student-borrow" className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>Borrow Books</NavLink>
      </>
    ) : role === 'admin' ? (
      <>
        <NavLink to="/admin-dashboard" className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>Admin Dashboard</NavLink>
        <NavLink to="/admin-books" className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>Library Inventory</NavLink>
        <NavLink to="/admin-borrow-records" className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>
          Transaction History
          {pendingBorrowRequestCount > 0 && <span className="nav-badge">{pendingBorrowRequestCount}</span>}
        </NavLink>
        <NavLink to="/admin-overdue" className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>
          Overdue Books
          {pendingReturnRequestCount > 0 && <span className="nav-badge">{pendingReturnRequestCount}</span>}
        </NavLink>
      </>
    ) : (
      <>
        <NavLink to="/dashboard" className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>Dashboard</NavLink>
        <NavLink to="/students" className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>Students</NavLink>
        <NavLink to="/books" className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>Books</NavLink>
        <NavLink to="/borrow-records" className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>
          Borrow Records
          {pendingBorrowRequestCount > 0 && <span className="nav-badge">{pendingBorrowRequestCount}</span>}
        </NavLink>
        <NavLink to="/returns" className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>
          Returns
          {pendingReturnRequestCount > 0 && <span className="nav-badge">{pendingReturnRequestCount}</span>}
        </NavLink>
      </>
    )

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand-block">
          <div className="brand-inline">
            <img src="/logo.svg" alt="Bayero University Kano logo" className="brand-logo" />
            <div>
              <p className="eyebrow">Bayero University, Kano</p>
              <h1>Library Management System</h1>
            </div>
          </div>
        </div>

        {showNav && (
          <nav className="top-nav" aria-label="Main navigation">
            {navLinks}

            {isLoggedIn ? (
              <button type="button" className="ghost-button" onClick={onLogout}>Logout</button>
            ) : (
              <NavLink to="/login" className="ghost-button">Login</NavLink>
            )}
          </nav>
        )}
      </header>

      <main className="main-layout">{children}</main>
    </div>
  )
}

function LoginPage({ onLogin, onStudentLogin, onAdminLogin }) {
  const navigate = useNavigate()
  const [form, setForm] = useState({ identifier: '', password: '' })
  const [activationForm, setActivationForm] = useState({ registrationNumber: '', newPassword: '', confirmPassword: '' })
  const [loginError, setLoginError] = useState('')
  const [activationError, setActivationError] = useState('')
  const [activationSuccess, setActivationSuccess] = useState('')
  const [showActivation, setShowActivation] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  useEffect(() => {
    resetLoginState()
    resetActivationState()
    setShowActivation(false)
  }, [])

  const handleChange = (event) => {
    const { name, value } = event.target
    setForm((current) => ({ ...current, [name]: value }))
  }

  const handleActivationChange = (event) => {
    const { name, value } = event.target
    setActivationForm((current) => ({
      ...current,
      [name]: name === 'registrationNumber' ? normalizeRegistrationNumber(value) : value,
    }))
  }

  const resetActivationState = () => {
    setActivationError('')
    setActivationSuccess('')
    setActivationForm({ registrationNumber: '', newPassword: '', confirmPassword: '' })
    setShowNewPassword(false)
    setShowConfirmPassword(false)
  }

  const resetLoginState = () => {
    setLoginError('')
    setForm({ identifier: '', password: '' })
  }

  const validateActivationForm = () => {
    const registrationNumber = normalizeRegistrationNumber(activationForm.registrationNumber)
    const newPassword = activationForm.newPassword.trim()
    const confirmPassword = activationForm.confirmPassword.trim()

    if (!isValidRegistrationNumber(registrationNumber)) {
      return 'Registration number must use the format FAC/YY/DEPT/NNNNN, for example CST/23/SWE/01137.'
    }

    if (newPassword.length < 8) {
      return 'New password must be at least 8 characters long.'
    }

    if (newPassword !== confirmPassword) {
      return 'Passwords do not match.'
    }

    return ''
  }

  const handleSubmit = async (event) => {
    event.preventDefault()

    const identifier = form.identifier.trim()
    const password = form.password.trim()

    if (!identifier || !password) {
      setLoginError('Please enter your Registration Number / email and password.')
      return
    }

    try {
      const response = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier, password }),
      })

      const data = await response.json()
      if (!response.ok) throw new Error(data.message || 'Login failed.')

      setLoginError('')

      if (data.role === 'student') {
        onStudentLogin(data.student)
        navigate('/student-dashboard')
        return
      }

      if (data.role === 'librarian') {
        onLogin()
        navigate('/dashboard')
        return
      }

      if (data.role === 'admin') {
        onAdminLogin()
        navigate('/admin-dashboard')
        return
      }

      throw new Error('Unknown user role.')
    } catch (error) {
      setLoginError(error.message)
    }
  }

  const handleActivateAccount = async (event) => {
    event.preventDefault()

    const validationError = validateActivationForm()
    if (validationError) {
      setActivationError(validationError)
      setActivationSuccess('')
      return
    }

    const registrationNumber = normalizeRegistrationNumber(activationForm.registrationNumber)
    const password = activationForm.newPassword.trim()

    try {
      const response = await fetch(`${API_URL}/students/activate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ registrationNumber, password }),
      })

      const data = await response.json()
      if (!response.ok) throw new Error(data.message || 'Account activation failed.')

      setActivationError('')
      setActivationSuccess(data.message || 'Account activated successfully.')
      setActivationForm({ registrationNumber: '', newPassword: '', confirmPassword: '' })
      setShowNewPassword(false)
      setShowConfirmPassword(false)
      setShowActivation(false)
      setForm({ identifier: '', password: '' })
    } catch (error) {
      setActivationError(error.message)
      setActivationSuccess('')
    }
  }

  return (
    <AppShell isLoggedIn={false} onLogout={() => {}} showNav={false}>
      <section className="panel auth-panel">
        <div className="auth-copy">
          <h2>Library Login</h2>
        </div>

        {showActivation ? (
          <form className="stack-form" onSubmit={handleActivateAccount} noValidate>
            <label>
              Registration Number
              <input
                type="text"
                name="registrationNumber"
                value={activationForm.registrationNumber}
                onChange={handleActivationChange}
                placeholder="CST/23/SWE/01137"
                autoComplete="off"
              />
            </label>

            <label>
              New Password
              <div className="password-field">
                <input
                  type={showNewPassword ? 'text' : 'password'}
                  name="newPassword"
                  value={activationForm.newPassword}
                  onChange={handleActivationChange}
                  placeholder="Create a new password"
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowNewPassword((value) => !value)}
                  aria-label={showNewPassword ? 'Hide password' : 'Show password'}
                >
                  {showNewPassword ? 'Hide' : 'Show'}
                </button>
              </div>
            </label>

            <label>
              Confirm Password
              <div className="password-field">
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  name="confirmPassword"
                  value={activationForm.confirmPassword}
                  onChange={handleActivationChange}
                  placeholder="Confirm your password"
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowConfirmPassword((value) => !value)}
                  aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                >
                  {showConfirmPassword ? 'Hide' : 'Show'}
                </button>
              </div>
            </label>

            {activationError && <div className="status-banner error">{activationError}</div>}
            {activationSuccess && <div className="status-banner success">{activationSuccess}</div>}

            <div className="activation-actions">
              <button type="submit" className="primary-button">Activate Account</button>
              <button
                type="button"
                className="ghost-button"
                onClick={() => {
                  resetActivationState()
                  setShowActivation(false)
                  resetLoginState()
                }}
              >
                Back to login
              </button>
            </div>
          </form>
        ) : (
          <form className="stack-form" onSubmit={handleSubmit} noValidate>
            <label>
              Registration Number / email
              <input
                type="text"
                name="identifier"
                value={form.identifier}
                onChange={handleChange}
                placeholder="CST/23/SWE/01137"
                autoComplete="username"
              />
            </label>

            <label>
              Password
              <input
                type="password"
                name="password"
                value={form.password}
                onChange={handleChange}
                placeholder="Enter your password"
                autoComplete="current-password"
              />
            </label>

            {loginError && <div className="status-banner error">{loginError}</div>}

            <button type="submit" className="primary-button">Login</button>

            <button
              type="button"
              className="text-link-button"
              onClick={() => {
                resetActivationState()
                resetLoginState()
                setShowActivation(true)
              }}
            >
              First time here? Activate your account.
            </button>
          </form>
        )}
      </section>
    </AppShell>
  )
}

// High-level admin screen for searching students and checking system activity.
function AdminDashboardPage({ students, books, requests, onLogout, notice, noticeTone }) {
  const [studentSearchTerm, setStudentSearchTerm] = useState('')

  const pendingRequests = requests.filter((request) => request.status === 'pending').length
  const approvedLoans = requests.filter((request) => request.status === 'approved').length
  const overdueCount = requests.filter((request) => request.status === 'approved' && request.dueDate && new Date(request.dueDate) < new Date()).length
  const availableBooks = books.filter((book) => book.available).length

  const filteredStudents = useMemo(() => {
    const query = studentSearchTerm.trim().toLowerCase()
    if (!query) return []

    return students.filter((student) => {
      const registrationNumber = String(student.registrationNumber || '').toLowerCase()
      const fullName = String(student.fullName || '').toLowerCase()
      return registrationNumber.includes(query) || fullName.includes(query)
    })
  }, [students, studentSearchTerm])

  const getStudentRecords = (student) => {
    const studentRequests = requests.filter((request) => {
      const requestStudentId = String(request.studentId || '')
      return requestStudentId === String(student.id) || requestStudentId === String(student.registrationNumber)
    })

    const activeUnreturned = studentRequests.filter((request) => {
      const status = String(request.status || '').toLowerCase()
      return status === 'approved' || status === 'return_requested'
    })

    const overdueLoans = activeUnreturned.filter((request) => {
      if (!request.dueDate) return false
      return new Date(request.dueDate) < new Date()
    })

    return { activeUnreturned, overdueLoans }
  }

  return (
    <AppShell isLoggedIn={true} onLogout={onLogout} role="admin" requests={requests}>
      <section className="hero-panel panel">
        <div className="hero-copy">
          <p className="section-kicker">Administration</p>
          <h2>Library Administration Panel</h2>
          <p>Monitor student activity, borrowing records, and library status across the system.</p>
        </div>

        <div className="stats-grid">
          <StatCard label="Students" value={students.length} accent="blue" />
          <StatCard label="Books" value={books.length} accent="green" />
          <StatCard label="Pending Requests" value={pendingRequests} accent="orange" />
          <StatCard label="Active Loans" value={approvedLoans} accent="purple" />
        </div>
      </section>

      <section className="panel">
        <SectionHeader title="Library Summary" />

        {notice && <div className={`status-banner ${noticeTone}`}>{notice}</div>}

        <div className="request-panels">
          <div className="mini-panel">
            <h3>System Status</h3>
            <div className="mini-stats">
              <div>
                <span>Available Books</span>
                <strong>{availableBooks}</strong>
              </div>
              <div>
                <span>Overdue Loans</span>
                <strong>{overdueCount}</strong>
              </div>
              <div>
                <span>Staff View</span>
                <strong>Admin</strong>
              </div>
            </div>
          </div>

          <div className="mini-panel">
            <h3>Administrative Controls</h3>
            <div className="request-list">
              <div className="request-row">
                <div>
                  <strong>Manage Library Inventory</strong>
                  <p>Review and maintain the library catalog and item availability.</p>
                </div>
              </div>
              <div className="request-row">
                <div>
                  <strong>View Transaction History</strong>
                  <p>Track borrowing and return records across the system.</p>
                </div>
              </div>
              <div className="request-row">
                <div>
                  <strong>View Overdue Books</strong>
                  <p>Monitor books that are overdue and require follow-up.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="panel">
        <SectionHeader title="Search Student" />

        <div className="catalog-toolbar">
          <label className="search-box">
            <span>Search by registration number or name</span>
            <input
              type="text"
              value={studentSearchTerm}
              onChange={(event) => setStudentSearchTerm(event.target.value)}
              placeholder="Enter student registration number or full name"
            />
          </label>
        </div>

        <div className="catalog-list">
          {!studentSearchTerm.trim() ? (
            <div className="empty-list">Type a registration number or student name to search.</div>
          ) : filteredStudents.length === 0 ? (
            <div className="empty-list">No student matches your search.</div>
          ) : (
            filteredStudents.map((student) => {
              const { activeUnreturned, overdueLoans } = getStudentRecords(student)

              const activeLoanSummary = activeUnreturned.length
                ? activeUnreturned.map((request) => {
                    const matchedBook = books.find((book) => String(book.id) === String(request.bookId))
                    return matchedBook ? `${matchedBook.title} by ${matchedBook.author}` : `Book #${request.bookId}`
                  }).join(', ')
                : 'The student has none of this.'

              const overdueSummary = overdueLoans.length
                ? overdueLoans.map((request) => {
                    const matchedBook = books.find((book) => String(book.id) === String(request.bookId))
                    return matchedBook ? `${matchedBook.title} by ${matchedBook.author}` : `Book #${request.bookId}`
                  }).join(', ')
                : 'The student has none of this.'

              return (
                <article className="book-item" key={student.id}>
                  <div>
                    <h3>{student.fullName}</h3>
                    <p>{student.registrationNumber}</p>
                  </div>

                  <dl>
                    <div>
                      <dt>Faculty</dt>
                      <dd>{student.faculty}</dd>
                    </div>
                    <div>
                      <dt>Department</dt>
                      <dd>{student.department}</dd>
                    </div>
                    <div>
                      <dt>Status</dt>
                      <dd>{student.status}</dd>
                    </div>
                  </dl>

                  <div className="student-issue-summary">
                    <p><strong>Books borrowed but not returned:</strong> {activeLoanSummary}</p>
                    <p><strong>Overdue loans:</strong> {overdueSummary}</p>
                  </div>
                </article>
              )
            })
          )}
        </div>
      </section>
    </AppShell>
  )
}

function DashboardPage({ students, books, requests, notice, noticeTone, studentId, setStudentId, bookId, setBookId, handleRequestBook, handleApprove, handleReturn, onLogout }) {
  const pendingRequests = requests.filter((request) => request.status === 'pending')
  const approvedRequests = requests.filter((request) => request.status === 'approved')
  const returnedRequests = requests.filter((request) => request.status === 'returned')

  const bookStats = {
    total: books.length,
    available: books.filter((book) => book.available).length,
    borrowed: books.filter((book) => !book.available).length,
  }

  return (
    <AppShell isLoggedIn={true} onLogout={onLogout} requests={requests}>
      <section className="hero-panel panel">
        <div className="hero-copy">
          <h2>Library Management Dashboard</h2>
          <p>
            Manage student records, monitor book availability, and track borrowing activity across the library.
          </p>
        </div>

        <div className="stats-grid">
          <StatCard label="Students" value={students.length} accent="blue" />
          <StatCard label="Books" value={bookStats.total} accent="green" />
          <StatCard label="Available" value={bookStats.available} accent="purple" />
          <StatCard label="Borrowed" value={bookStats.borrowed} accent="orange" />
        </div>
      </section>

      <section className="panel librarian-panel">
        <SectionHeader title="Librarian Dashboard" />

        <div className="dashboard-grid single-stat-grid">
          <div className="mini-panel">
            <h3>Quick Stats</h3>
            <div className="mini-stats">
              <div>
                <span>Pending</span>
                <strong>{pendingRequests.length}</strong>
              </div>
              <div>
                <span>Approved</span>
                <strong>{approvedRequests.length}</strong>
              </div>
              <div>
                <span>Returned</span>
                <strong>{returnedRequests.length}</strong>
              </div>
            </div>
          </div>
        </div>

        <div className="request-panels">
          <div className="mini-panel">
            <h3>Pending Requests</h3>
            <div className="request-list">
              {pendingRequests.length === 0 ? (
                <p className="empty-list compact">No pending requests.</p>
              ) : (
                pendingRequests.map((request) => (
                  <div className="request-row" key={request.id}>
                    <div>
                      <strong>Request #{request.id}</strong>
                      <p>Student: {request.studentId}</p>
                      <p>Book: {request.bookId}</p>
                    </div>
                    <button type="button" className="action-button approve" onClick={() => handleApprove(request.id)}>
                      Approve
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </section>
    </AppShell>
  )
}

function StudentBorrowPage({ students, books, studentId, setStudentId, bookId, setBookId, handleRequestBook, onLogout, notice, noticeTone }) {
  return (
    <AppShell isLoggedIn={true} onLogout={onLogout}>
      <section className="panel form-panel">
        <SectionHeader title="Student Borrow Request" />

        {notice && <div className={`status-banner ${noticeTone}`}>{notice}</div>}

        <form className="stack-form" onSubmit={handleRequestBook}>
          <label>
            Student ID or Registration Number
            <input
              type="text"
              value={studentId}
              onChange={(event) => setStudentId(normalizeRegistrationNumber(event.target.value))}
              placeholder="CST/23/SWE/01137"
            />
          </label>

          <label>
            Book ID or Accession Number
            <input
              type="text"
              value={bookId}
              onChange={(event) => setBookId(event.target.value)}
              placeholder="ACC-001 or book id"
            />
          </label>

          <div className="login-hint">
            The student submits the request, and the librarian verifies the student record and approves the borrow before issue.
          </div>

          <button type="submit" className="primary-button">Request Book</button>
        </form>
      </section>

      <section className="panel">
        <SectionHeader title="Borrowing Information" />
        <div className="request-panels">
          <div className="mini-panel">
            <h3>Students</h3>
            <div className="request-list">
              {students.length === 0 ? (
                <p className="empty-list compact">No registered students.</p>
              ) : (
                students.slice(0, 5).map((student) => (
                  <div className="request-row" key={student.id}>
                    <div>
                      <strong>{student.fullName}</strong>
                      <p>{student.registrationNumber}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="mini-panel">
            <h3>Available Books</h3>
            <div className="request-list">
              {books.filter((book) => book.available).length === 0 ? (
                <p className="empty-list compact">No books available for borrowing.</p>
              ) : (
                books.filter((book) => book.available).slice(0, 5).map((book) => (
                  <div className="request-row" key={book.id}>
                    <div>
                      <strong>{book.title}</strong>
                      <p>{book.accessionNumber}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </section>
    </AppShell>
  )
}

// Student dashboard showing personal student record, borrowed books, and return request status.
// The student dashboard shows their personal borrowing activity and allows return requests.
function StudentDashboardPage({ student, requests, onLogout, notice, noticeTone, handleReturnRequest }) {
  const studentRequests = requests.filter((request) => {
    const requestStudentId = String(request.studentId)
    return requestStudentId === String(student.id) || requestStudentId === String(student.registrationNumber)
  })

  const activeLoans = studentRequests.filter((request) => request.status === 'approved')
  const returnedLoans = studentRequests.filter((request) => request.status === 'returned')

  return (
    <AppShell isLoggedIn={true} onLogout={onLogout} role="student">
      <section className="panel hero-panel">
        <div className="hero-copy">
          <p className="section-kicker">Student Portal</p>
          <h2>Welcome, {student.fullName}</h2>
          <p>Your borrow record, return due dates, and outstanding library activities are shown here.</p>
        </div>

        <div className="stats-grid">
          <StatCard label="Books Borrowed" value={studentRequests.length} accent="blue" />
          <StatCard label="Active Loans" value={activeLoans.length} accent="green" />
          <StatCard label="Returned" value={returnedLoans.length} accent="purple" />
        </div>
      </section>

      <section className="panel">
        <SectionHeader title="My Information" />
        <div className="catalog-list">
          <article className="book-item">
            <div>
              <h3>{student.fullName}</h3>
              <p>{student.registrationNumber}</p>
            </div>

            <dl>
              <div>
                <dt>Faculty</dt>
                <dd>{student.faculty}</dd>
              </div>
              <div>
                <dt>Department</dt>
                <dd>{student.department}</dd>
              </div>
              <div>
                <dt>Status</dt>
                <dd>{student.status}</dd>
              </div>
              <div>
                <dt>Library Card</dt>
                <dd>{student.libraryCardNumber || 'Not issued yet'}</dd>
              </div>
              <div>
                <dt>Borrow Cards</dt>
                <dd>{student.borrowCardCount ?? 0}</dd>
              </div>
            </dl>
          </article>
        </div>
      </section>

      <section className="panel">
        <SectionHeader title="My Borrow Records" />
        <div className="request-list">
          {studentRequests.length === 0 ? (
            <p className="empty-list compact">No borrowing records yet.</p>
          ) : (
            studentRequests.map((request) => (
              <div className="request-row" key={request.id}>
                <div>
                  <strong>{request.status.toUpperCase()} #{request.id}</strong>
                  <p>Book: {request.bookId}</p>
                  <p>Due: {request.dueDate ? new Date(request.dueDate).toLocaleDateString() : 'Pending approval'}</p>
                </div>

                {request.status === 'approved' ? (
                  <button type="button" className="action-button return" onClick={() => handleReturnRequest(request.id)}>
                    Return
                  </button>
                ) : request.status === 'return_requested' ? (
                  <span className="status-pill returned">Return requested</span>
                ) : (
                  <span className={`status-pill ${request.status === 'returned' ? 'returned' : ''}`}>
                    {request.status}
                  </span>
                )}
              </div>
            ))
          )}
        </div>
      </section>
    </AppShell>
  )
}

function StudentRequestPage({ books, onLogout, notice, noticeTone, bookId, setBookId, handleRequestBook }) {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedBookId, setSelectedBookId] = useState('')

  useEffect(() => {
    return () => {
      setSelectedBookId('')
      setBookId('')
    }
  }, [setBookId])

  const filteredBooks = useMemo(() => {
    const query = searchTerm.trim().toLowerCase()

    if (!query) {
      return []
    }

    return books.filter((book) => {
      const haystack = `${book.title} ${book.author}`.toLowerCase()
      return haystack.includes(query)
    })
  }, [books, searchTerm])

  const selectedBook = books.find((book) => {
    return String(book.id) === String(selectedBookId || '') || String(book.accessionNumber) === String(selectedBookId || '')
  })

  useEffect(() => {
    if (!searchTerm.trim()) {
      setSelectedBookId('')
    }
  }, [searchTerm])

  const visibleBooks = filteredBooks

  return (
    <AppShell isLoggedIn={true} onLogout={onLogout} role="student">
      <section className="panel form-panel">
        <SectionHeader title="Request a Book" />

        <div className="catalog-toolbar">
          <label className="search-box">
            <span>Search books</span>
            <input
              type="text"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Enter book title or author"
            />
          </label>
        </div>

        <form
          className="stack-form"
          onSubmit={(event) => {
            handleRequestBook(event, selectedBookId)
            setSelectedBookId('')
            setBookId('')
          }}
        >
          <div className="request-list">
            {!searchTerm.trim() ? (
              <p className="empty-list compact">Search for a book title or author to see matches.</p>
            ) : visibleBooks.length === 0 ? (
              <p className="empty-list compact">No books match your search.</p>
            ) : (
              visibleBooks.map((book) => {
                const requestStatus = book.requestStatus || (book.available ? 'available' : 'borrowed');
                const isSelectable = ['available', 'returned'].includes(requestStatus)
                const statusLabel = requestStatus === 'pending'
                  ? 'Not available'
                  : requestStatus === 'approved'
                    ? 'Not available'
                    : requestStatus === 'return_requested'
                      ? 'Not available'
                      : 'Available';
                const isSelected = String(selectedBookId || '') === String(book.id)

                return (
                  <button
                    key={book.id}
                    type="button"
                    className={`request-row${isSelected ? ' selected' : ''}`}
                    aria-pressed={isSelected}
                    style={isSelected ? { borderColor: '#2d6cdf', background: '#eef4ff', boxShadow: '0 0 0 2px rgba(45, 108, 223, 0.15)' } : undefined}
                    onClick={() => {
                      const nextValue = String(book.id)
                      setSelectedBookId(nextValue)
                      setBookId(nextValue)
                    }}
                    disabled={!isSelectable}
                  >
                    <div>
                      <strong>{book.title}</strong>
                      <p>Author: {book.author}</p>
                      <p>Accession: {book.accessionNumber}</p>
                    </div>
                    <span className={`status-pill ${requestStatus === 'pending' || requestStatus === 'approved' || requestStatus === 'return_requested' ? 'borrowed' : book.available ? 'available' : 'borrowed'}`}>
                      {statusLabel}
                    </span>
                  </button>
                )
              })
            )}
          </div>

          <button type="submit" className="primary-button" disabled={!selectedBook || !selectedBook.available}>
            Request Book
          </button>
        </form>
      </section>
    </AppShell>
  )
}

function StudentsPage({ students, books, requests, studentForm, handleStudentChange, handleStudentSubmit, onLogout, notice, noticeTone }) {
  const [studentSearchTerm, setStudentSearchTerm] = useState('')

  const filteredStudents = useMemo(() => {
    const query = studentSearchTerm.trim().toLowerCase()
    if (!query) return students

    return students.filter((student) => {
      const registrationNumber = String(student.registrationNumber || '').toLowerCase()
      return registrationNumber.includes(query)
    })
  }, [students, studentSearchTerm])

  const getStudentRecords = (student) => {
    const studentRequests = requests.filter((request) => {
      const requestStudentId = String(request.studentId || '')
      return requestStudentId === String(student.id) || requestStudentId === String(student.registrationNumber)
    })

    const activeUnreturned = studentRequests.filter((request) => {
      const status = String(request.status || '').toLowerCase()
      return status === 'approved' || status === 'return_requested'
    })

    const overdueLoans = activeUnreturned.filter((request) => {
      if (!request.dueDate) return false
      return new Date(request.dueDate) < new Date()
    })

    return { activeUnreturned, overdueLoans }
  }

  return (
    <AppShell isLoggedIn={true} onLogout={onLogout}>
      <section className="panel form-panel">
        <SectionHeader title="Student Registration" />

        {notice && <div className={`status-banner ${noticeTone}`}>{notice}</div>}

        <form className="stack-form" onSubmit={handleStudentSubmit} noValidate>
          <div className="form-row two-up">
            <label>
              Registration Number
              <input
                type="text"
                name="registrationNumber"
                value={studentForm.registrationNumber}
                onChange={handleStudentChange}
                placeholder="CST/23/SWE/01137"
              />
            </label>

            <label>
              Full Name
              <input
                type="text"
                name="fullName"
                value={studentForm.fullName}
                onChange={handleStudentChange}
                placeholder="Jane Doe"
              />
            </label>
          </div>

          <div className="form-row two-up">
            <label>
              Faculty
              <input
                type="text"
                name="faculty"
                value={studentForm.faculty}
                onChange={handleStudentChange}
                placeholder="Science"
              />
            </label>

            <label>
              Department
              <input
                type="text"
                name="department"
                value={studentForm.department}
                onChange={handleStudentChange}
                placeholder="Computer Science"
              />
            </label>
          </div>

          <label>
            Student Category
            <select name="status" value={studentForm.status} onChange={handleStudentChange}>
              <option value="undergraduate">Undergraduate</option>
              <option value="postgraduate">Postgraduate</option>
            </select>
          </label>

          <button type="submit" className="primary-button">Register Student</button>
        </form>
      </section>

      <section className="panel">
        <SectionHeader title="Registered Students" />

        <div className="catalog-toolbar">
          <label className="search-box">
            <span>Search by registration number</span>
            <input
              type="text"
              value={studentSearchTerm}
              onChange={(event) => setStudentSearchTerm(event.target.value)}
              placeholder="CST/23/SWE/01137"
            />
          </label>
        </div>

        <div className="catalog-list">
          {!studentSearchTerm.trim() ? (
            <div className="empty-list">Search by registration number to display matching students.</div>
          ) : filteredStudents.length === 0 ? (
            <div className="empty-list">No students match this registration number.</div>
          ) : (
            filteredStudents.map((student) => {
              const { activeUnreturned, overdueLoans } = getStudentRecords(student)

              const activeLoanSummary = activeUnreturned.length
                ? activeUnreturned.map((request) => {
                    const matchedBook = books.find((book) => String(book.id) === String(request.bookId))
                    return matchedBook ? `${matchedBook.title} by ${matchedBook.author}` : `Book #${request.bookId}`
                  }).join(', ')
                : 'The student has none of this.'

              const overdueSummary = overdueLoans.length
                ? overdueLoans.map((request) => {
                    const matchedBook = books.find((book) => String(book.id) === String(request.bookId))
                    return matchedBook ? `${matchedBook.title} by ${matchedBook.author}` : `Book #${request.bookId}`
                  }).join(', ')
                : 'The student has none of this.'

              return (
                <article className="book-item" key={student.id}>
                  <div>
                    <h3>{student.fullName}</h3>
                    <p>{student.registrationNumber}</p>
                  </div>

                  <dl>
                    <div>
                      <dt>Faculty</dt>
                      <dd>{student.faculty}</dd>
                    </div>
                    <div>
                      <dt>Department</dt>
                      <dd>{student.department}</dd>
                    </div>
                    <div>
                      <dt>Status</dt>
                      <dd>{student.status}</dd>
                    </div>
                  </dl>

                  <div className="student-issue-summary">
                    <p><strong>Books borrowed but not returned:</strong> {activeLoanSummary}</p>
                    <p><strong>Overdue loans:</strong> {overdueSummary}</p>
                  </div>
                </article>
              )
            })
          )}
        </div>
      </section>
    </AppShell>
  )
}

function AdminInventoryPage({ books, bookForm, searchTerm, setSearchTerm, handleBookChange, handleBookSubmit, onLogout, notice, noticeTone }) {
  const filteredBooks = useMemo(() => {
    const query = searchTerm.trim().toLowerCase()
    if (!query) return books

    return books.filter((book) => {
      const text = `${book.title} ${book.author} ${book.callNumber} ${book.accessionNumber}`.toLowerCase()
      return text.includes(query)
    })
  }, [books, searchTerm])

  return (
    <AppShell isLoggedIn={true} onLogout={onLogout} role="admin">
      <section className="panel catalog-panel">
        <SectionHeader title="Library Inventory" />

        {notice && <div className={`status-banner ${noticeTone}`}>{notice}</div>}

        <div className="catalog-toolbar">
          <label className="search-box">
            <span>Search books</span>
            <input
              type="text"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search by title, author, or call number"
            />
          </label>
        </div>

        <form className="stack-form small-gap" onSubmit={handleBookSubmit}>
          <div className="form-row two-up">
            <label>
              Title
              <input
                type="text"
                name="title"
                value={bookForm.title}
                onChange={handleBookChange}
                placeholder="Introduction to Algorithms"
              />
            </label>

            <label>
              Author
              <input
                type="text"
                name="author"
                value={bookForm.author}
                onChange={handleBookChange}
                placeholder="Author name"
              />
            </label>
          </div>

          <div className="form-row two-up">
            <label>
              Call Number
              <input
                type="text"
                name="callNumber"
                value={bookForm.callNumber}
                onChange={handleBookChange}
                placeholder="QA-101"
              />
            </label>

            <label>
              Accession Number
              <input
                type="text"
                name="accessionNumber"
                value={bookForm.accessionNumber}
                onChange={handleBookChange}
                placeholder="ACC-001"
              />
            </label>
          </div>

          <button type="submit" className="primary-button">Add Book</button>
        </form>

        <div className="catalog-list">
          {!searchTerm.trim() ? (
            <div className="empty-list">Search books to display catalog entries.</div>
          ) : filteredBooks.length === 0 ? (
            <div className="empty-list">No books match your search.</div>
          ) : (
            filteredBooks.map((book) => (
              <article className="book-item" key={book.id}>
                <div>
                  <div className="book-meta">
                    <span className={`status-pill ${book.available ? 'available' : 'borrowed'}`}>
                      {book.available ? 'Available' : 'Not available'}
                    </span>
                  </div>
                  <h3>{book.title}</h3>
                  <p>{book.author}</p>
                </div>

                <dl>
                  <div>
                    <dt>Call No.</dt>
                    <dd>{book.callNumber}</dd>
                  </div>
                  <div>
                    <dt>Accession</dt>
                    <dd>{book.accessionNumber}</dd>
                  </div>
                </dl>
              </article>
            ))
          )}
        </div>
      </section>
    </AppShell>
  )
}

function BooksPage({ books, bookForm, searchTerm, setSearchTerm, handleBookChange, handleBookSubmit, onLogout, notice, noticeTone }) {
  const filteredBooks = useMemo(() => {
    const query = searchTerm.trim().toLowerCase()
    if (!query) return books

    return books.filter((book) => {
      const text = `${book.title} ${book.author} ${book.callNumber} ${book.accessionNumber}`.toLowerCase()
      return text.includes(query)
    })
  }, [books, searchTerm])

  return (
    <AppShell isLoggedIn={true} onLogout={onLogout}>
      <section className="panel catalog-panel">
        <SectionHeader title="Book Catalog" />

        {notice && <div className={`status-banner ${noticeTone}`}>{notice}</div>}

        <div className="catalog-toolbar">
          <label className="search-box">
            <span>Search books</span>
            <input
              type="text"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search by title, author, or call number"
            />
          </label>
        </div>

        <form className="stack-form small-gap" onSubmit={handleBookSubmit}>
          <div className="form-row two-up">
            <label>
              Title
              <input
                type="text"
                name="title"
                value={bookForm.title}
                onChange={handleBookChange}
                placeholder="Introduction to Algorithms"
              />
            </label>

            <label>
              Author
              <input
                type="text"
                name="author"
                value={bookForm.author}
                onChange={handleBookChange}
                placeholder="Author name"
              />
            </label>
          </div>

          <div className="form-row two-up">
            <label>
              Call Number
              <input
                type="text"
                name="callNumber"
                value={bookForm.callNumber}
                onChange={handleBookChange}
                placeholder="QA-101"
              />
            </label>

            <label>
              Accession Number
              <input
                type="text"
                name="accessionNumber"
                value={bookForm.accessionNumber}
                onChange={handleBookChange}
                placeholder="ACC-001"
              />
            </label>
          </div>

          <button type="submit" className="primary-button">Add Book</button>
        </form>

        <div className="catalog-list">
          {!searchTerm.trim() ? (
            <div className="empty-list">Search books to display catalog entries.</div>
          ) : filteredBooks.length === 0 ? (
            <div className="empty-list">No books match your search.</div>
          ) : (
            filteredBooks.map((book) => (
              <article className="book-item" key={book.id}>
                <div>
                  <div className="book-meta">
                    <span className={`status-pill ${book.available ? 'available' : 'borrowed'}`}>
                      {book.available ? 'Available' : 'Borrowed'}
                    </span>
                  </div>
                  <h3>{book.title}</h3>
                  <p>{book.author}</p>
                </div>

                <dl>
                  <div>
                    <dt>Call No.</dt>
                    <dd>{book.callNumber}</dd>
                  </div>
                  <div>
                    <dt>Accession</dt>
                    <dd>{book.accessionNumber}</dd>
                  </div>
                </dl>
              </article>
            ))
          )}
        </div>
      </section>
    </AppShell>
  )
}

function AdminBorrowRecordsPage({ requests, onLogout }) {
  return (
    <AppShell isLoggedIn={true} onLogout={onLogout} role="admin" requests={requests}>
      <section className="panel">
        <SectionHeader title="Transaction History" />
        <div className="request-list">
          {requests.length === 0 ? (
            <p className="empty-list compact">No request records available.</p>
          ) : (
            requests.map((request) => (
              <div className="request-row" key={request.id}>
                <div>
                  <strong>{request.status.toUpperCase()} #{request.id}</strong>
                  <p>Student: {request.studentId}</p>
                  <p>Book: {request.bookId}</p>
                  <p>Due: {request.dueDate ? new Date(request.dueDate).toLocaleDateString() : 'Not set'}</p>
                </div>

                {request.status === 'pending' ? (
                  <span className="status-pill requested">Pending</span>
                ) : request.status === 'approved' ? (
                  <span className="status-pill available">Approved</span>
                ) : request.status === 'return_requested' ? (
                  <span className="status-pill returned">Return Requested</span>
                ) : (
                  <span className="status-pill returned">Returned</span>
                )}
              </div>
            ))
          )}
        </div>
      </section>
    </AppShell>
  )
}

function BorrowRecordsPage({ requests, handleApprove, handleReturnRequest, handleApproveReturn, onLogout }) {
  return (
    <AppShell isLoggedIn={true} onLogout={onLogout} requests={requests}>
      <section className="panel">
        <SectionHeader title="Borrow Requests" />
        <div className="request-list">
          {requests.length === 0 ? (
            <p className="empty-list compact">No request records available.</p>
          ) : (
            requests.map((request) => (
              <div className="request-row" key={request.id}>
                <div>
                  <strong>{request.status.toUpperCase()} #{request.id}</strong>
                  <p>Student: {request.studentId}</p>
                  <p>Book: {request.bookId}</p>
                  <p>Due: {request.dueDate ? new Date(request.dueDate).toLocaleDateString() : 'Not set'}</p>
                </div>

                {request.status === 'pending' ? (
                  <button type="button" className="action-button approve" onClick={() => handleApprove(request.id)}>
                    Approve
                  </button>
                ) : request.status === 'approved' ? (
                  <span className="status-pill available">Approved</span>
                ) : request.status === 'return_requested' ? (
                  <span className="status-pill returned">Return Requested</span>
                ) : (
                  <span className="status-pill returned">Returned</span>
                )}
              </div>
            ))
          )}
        </div>
      </section>
    </AppShell>
  )
}

function AdminOverduePage({ requests, onLogout }) {
  const overdueRequests = requests.filter((request) => {
    return request.status === 'approved' && request.dueDate && new Date(request.dueDate) < new Date()
  })

  return (
    <AppShell isLoggedIn={true} onLogout={onLogout} role="admin" requests={requests}>
      <section className="panel">
        <SectionHeader title="Overdue Books" />
        <div className="request-list">
          {overdueRequests.length === 0 ? (
            <p className="empty-list compact">No overdue books.</p>
          ) : (
            overdueRequests.map((request) => (
              <div className="request-row" key={request.id}>
                <div>
                  <strong>Overdue #{request.id}</strong>
                  <p>Student: {request.studentId}</p>
                  <p>Book: {request.bookId}</p>
                  <p>Due: {new Date(request.dueDate).toLocaleDateString()}</p>
                </div>
                <span className="status-pill borrowed">Overdue</span>
              </div>
            ))
          )}
        </div>
      </section>
    </AppShell>
  )
}

function ReturnsPage({ requests, handleApproveReturn, onLogout }) {
  const returnRequests = requests.filter((request) => request.status === 'return_requested')
  const returnedRequests = requests.filter((request) => request.status === 'returned')
  const activeLoans = requests.filter((request) => request.status === 'approved')

  return (
    <AppShell isLoggedIn={true} onLogout={onLogout} requests={requests}>
      <section className="panel">
        <SectionHeader title="Returns Management" />

        <div className="request-panels">
          <div className="mini-panel">
            <h3>Active Loans</h3>
            {activeLoans.length === 0 ? (
              <p className="empty-list compact">No active loans.</p>
            ) : (
              activeLoans.map((request) => (
                <div className="request-row" key={request.id}>
                  <div>
                    <strong>Loan #{request.id}</strong>
                    <p>Student: {request.studentId}</p>
                    <p>Due: {request.dueDate ? new Date(request.dueDate).toLocaleDateString() : 'Not set'}</p>
                  </div>
                  <span className="status-pill available">Borrowed</span>
                </div>
              ))
            )}
          </div>

          <div className="mini-panel">
            <h3>Return Requests</h3>
            {returnRequests.length === 0 ? (
              <p className="empty-list compact">No return requests are waiting for approval.</p>
            ) : (
              returnRequests.map((request) => (
                <div className="request-row" key={request.id}>
                  <div>
                    <strong>Return #{request.id}</strong>
                    <p>Student: {request.studentId}</p>
                    <p>Book: {request.bookId}</p>
                  </div>
                  <button type="button" className="action-button approve" onClick={() => handleApproveReturn(request.id)}>
                    Approve Return
                  </button>
                </div>
              ))
            )}
          </div>

          <div className="mini-panel">
            <h3>Returned Books</h3>
            {returnedRequests.length === 0 ? (
              <p className="empty-list compact">No books have been returned yet.</p>
            ) : (
              returnedRequests.map((request) => (
                <div className="request-row" key={request.id}>
                  <div>
                    <strong>Return #{request.id}</strong>
                    <p>Student: {request.studentId}</p>
                    <p>Book: {request.bookId}</p>
                  </div>
                  <span className="status-pill returned">Closed</span>
                </div>
              ))
            )}
          </div>
        </div>
      </section>
    </AppShell>
  )
}

// Main application component: it fetches data, handles authentication, and defines all routes.
function App() {
  const [students, setStudents] = useState([])
  const [books, setBooks] = useState([])
  const [requests, setRequests] = useState([])
  const [studentForm, setStudentForm] = useState(EMPTY_STUDENT_FORM)
  const [bookForm, setBookForm] = useState(EMPTY_BOOK_FORM)
  const [searchTerm, setSearchTerm] = useState('')
  const [studentId, setStudentId] = useState('')
  const [bookId, setBookId] = useState('')
  const [notice, setNotice] = useState(() => readStoredNotice().message)
  const [noticeTone, setNoticeTone] = useState(() => readStoredNotice().tone)
  const [isLoggedIn, setIsLoggedIn] = useState(() => readStoredAuth().isLoggedIn)
  const [userRole, setUserRole] = useState(() => readStoredAuth().userRole)
  const [activeStudent, setActiveStudent] = useState(() => readStoredAuth().activeStudent || null)
  const noticeTimeoutRef = useRef(null)

  const fetchStudents = async () => {
    try {
      const response = await fetch(`${API_URL}/students`)
      if (!response.ok) throw new Error('Unable to load students')
      setStudents(await response.json())
    } catch (error) {
      console.error('Failed to fetch students:', error)
      setNotice('Could not load student records from the API.')
      setNoticeTone('error')
    }
  }

  const fetchBooks = async () => {
    try {
      const response = await fetch(`${API_URL}/books`)
      if (!response.ok) throw new Error('Unable to load books')
      setBooks(await response.json())
    } catch (error) {
      console.error('Failed to fetch books:', error)
      setNotice('Could not load books from the API.')
      setNoticeTone('error')
    }
  }

  const fetchRequests = async () => {
    try {
      const response = await fetch(`${API_URL}/requests`)
      if (!response.ok) throw new Error('Unable to load requests')
      setRequests(await response.json())
    } catch (error) {
      console.error('Failed to fetch requests:', error)
      setNotice('Could not load requests from the API.')
      setNoticeTone('error')
    }
  }

  const refreshAll = async () => {
    await Promise.all([fetchStudents(), fetchBooks(), fetchRequests()])
  }

  const clearNotice = () => {
    if (noticeTimeoutRef.current) {
      clearTimeout(noticeTimeoutRef.current)
      noticeTimeoutRef.current = null
    }

    setNotice('')
    setNoticeTone('success')
    sessionStorage.removeItem(NOTICE_STORAGE_KEY)
  }

  const handleLogout = () => {
    setIsLoggedIn(false)
    setUserRole(null)
    setActiveStudent(null)
    localStorage.removeItem(AUTH_STORAGE_KEY)
    clearNotice()
  }

  useEffect(() => {
    const auth = readStoredAuth()
    const restoredNotice = readStoredNotice()

    if (auth.isLoggedIn && auth.userRole) {
      setIsLoggedIn(auth.isLoggedIn)
      setUserRole(auth.userRole)
      setActiveStudent(auth.activeStudent || null)
    } else {
      setIsLoggedIn(false)
      setUserRole(null)
      setActiveStudent(null)
      clearNotice()
    }

    if (auth.isLoggedIn && restoredNotice.message) {
      setNotice(restoredNotice.message)
      setNoticeTone(restoredNotice.tone)
    }
  }, [])

  useEffect(() => {
    localStorage.setItem(
      AUTH_STORAGE_KEY,
      JSON.stringify({ isLoggedIn, userRole, activeStudent })
    )
  }, [isLoggedIn, userRole, activeStudent])

  useEffect(() => {
    if (!notice) {
      sessionStorage.removeItem(NOTICE_STORAGE_KEY)
    }

    refreshAll()
  }, [])

  const handleStudentChange = (event) => {
    const { name, value } = event.target
    setStudentForm((current) => ({
      ...current,
      [name]: name === 'registrationNumber' ? normalizeRegistrationNumber(value) : value,
    }))
  }

  const handleBookChange = (event) => {
    const { name, value } = event.target
    setBookForm((current) => ({ ...current, [name]: value }))
  }

  const showNotice = (message, tone = 'success') => {
    if (noticeTimeoutRef.current) {
      clearTimeout(noticeTimeoutRef.current)
      noticeTimeoutRef.current = null
    }

    setNotice(message)
    setNoticeTone(tone)

    if (message) {
      sessionStorage.setItem(NOTICE_STORAGE_KEY, JSON.stringify({ message, tone }))
      noticeTimeoutRef.current = setTimeout(() => {
        clearNotice()
      }, 5000)
      return
    }

    sessionStorage.removeItem(NOTICE_STORAGE_KEY)
  }

  // Register a new student through the librarian flow.
  const handleStudentSubmit = async (event) => {
    event.preventDefault()

    const normalizedRegistrationNumber = normalizeRegistrationNumber(studentForm.registrationNumber)
    if (!isValidRegistrationNumber(normalizedRegistrationNumber)) {
      showNotice('Registration number must use the format FAC/YY/DEPT/NNNNN, for example CST/23/SWE/01137.', 'error')
      return
    }

    try {
      const response = await fetch(`${API_URL}/students`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...studentForm, registrationNumber: normalizedRegistrationNumber }),
      })

      const data = await response.json()
      if (!response.ok) throw new Error(data.message || 'Unable to register student')

      showNotice('Student registered successfully')
      setStudentForm(EMPTY_STUDENT_FORM)
      await refreshAll()
    } catch (error) {
      showNotice(error.message, 'error')
    }
  }

  // Add a new book to the inventory.
  const handleBookSubmit = async (event) => {
    event.preventDefault()

    try {
      const response = await fetch(`${API_URL}/books`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bookForm),
      })

      const data = await response.json()
      if (!response.ok) throw new Error(data.message || 'Unable to add book')

      showNotice(`Book ${data.title} added successfully.`)
      setBookForm(EMPTY_BOOK_FORM)
      await refreshAll()
    } catch (error) {
      showNotice(error.message, 'error')
    }
  }

  // Submit a borrow request after validating that the selected book is available.
  const handleRequestBook = async (event, selectedBookIdOverride = null) => {
    event.preventDefault()

    if (userRole === 'student' && !activeStudent) {
      showNotice('Your student session is not active. Please log in again.', 'error')
      setIsLoggedIn(false)
      setUserRole(null)
      setActiveStudent(null)
      localStorage.removeItem(AUTH_STORAGE_KEY)
      return
    }

    const effectiveBookId = selectedBookIdOverride || bookId
    const resolvedStudentId = userRole === 'student' && activeStudent
      ? String(activeStudent.registrationNumber)
      : studentId.trim()

    const selectedBook = books.find((book) => {
      return String(book.id) === String(effectiveBookId) || String(book.accessionNumber) === String(effectiveBookId)
    })

    if (!resolvedStudentId || !effectiveBookId || !String(effectiveBookId).trim()) {
      showNotice('Please search and select an available book before requesting.', 'error')
      return
    }

    if (!selectedBook) {
      showNotice('Please search and select an available book before requesting.', 'error')
      return
    }

    if (!selectedBook.available) {
      showNotice('Book is not available. It has already been borrowed or requested by another student.', 'error')
      return
    }

    try {
      const response = await fetch(`${API_URL}/requests`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentId: resolvedStudentId, bookId: selectedBook.id }),
      })

      const data = await response.json()
      if (!response.ok) throw new Error(data.message || 'Unable to create request')

      showNotice('Book request sent')
      setStudentId('')
      setBookId('')
      await refreshAll()
    } catch (error) {
      showNotice(error.message, 'error')
    }
  }

  const requestExistsInLatestData = async (requestId) => {
    try {
      const response = await fetch(`${API_URL}/requests`)
      if (!response.ok) return false

      const latestRequests = await response.json()
      return latestRequests.some((request) => Number(request.id) === Number(requestId))
    } catch (error) {
      return false
    }
  }

  // Librarian approves an outstanding borrow request and sets the due date.
  const handleApprove = async (requestId) => {
    try {
      const exists = await requestExistsInLatestData(requestId)
      if (!exists) {
        await refreshAll()
        showNotice('This request is no longer available. Please refresh the list.', 'error')
        return
      }

      const response = await fetch(`${API_URL}/requests/${requestId}/approve`, {
        method: 'PATCH',
      })

      const data = await response.json()
      if (!response.ok) throw new Error(data.message || 'Unable to approve request')

      showNotice(`Request #${requestId} approved successfully.`)
      await refreshAll()
    } catch (error) {
      showNotice(error.message, 'error')
    }
  }

  // Student requests a return for a book that has already been approved and borrowed.
  const handleReturnRequest = async (requestId) => {
    try {
      const exists = await requestExistsInLatestData(requestId)
      if (!exists) {
        await refreshAll()
        showNotice('This request is no longer available. Please refresh the list.', 'error')
        return
      }

      const response = await fetch(`${API_URL}/requests/${requestId}/return`, {
        method: 'PATCH',
      })

      const data = await response.json()
      if (!response.ok) throw new Error(data.message || 'Unable to request book return')

      showNotice(`Return request submitted for request #${requestId}.`)
      await refreshAll()
    } catch (error) {
      showNotice(error.message, 'error')
    }
  }

  // Librarian confirms a returned book and marks the request as complete.
  const handleApproveReturn = async (requestId) => {
    try {
      const exists = await requestExistsInLatestData(requestId)
      if (!exists) {
        await refreshAll()
        showNotice('This request is no longer available. Please refresh the list.', 'error')
        return
      }

      const response = await fetch(`${API_URL}/requests/${requestId}/approve-return`, {
        method: 'PATCH',
      })

      const data = await response.json()
      if (!response.ok) throw new Error(data.message || 'Unable to approve return')

      await refreshAll()
    } catch (error) {
      showNotice(error.message, 'error')
    }
  }

  // Route setup: all pages are protected by role-based access checks.
  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/"
          element={<Navigate to="/login" replace />}
        />
        <Route
          path="/login"
          element={
            <LoginPage
              onLogin={() => {
                clearNotice()
                setIsLoggedIn(true)
                setUserRole('librarian')
              }}
              onAdminLogin={() => {
                clearNotice()
                setIsLoggedIn(true)
                setUserRole('admin')
              }}
              onStudentLogin={(student) => {
                clearNotice()
                setActiveStudent(student)
                setIsLoggedIn(true)
                setUserRole('student')
              }}
            />
          }
        />
        <Route
          path="/admin-dashboard"
          element={
            isLoggedIn && userRole === 'admin' ? (
              <AdminDashboardPage
                students={students}
                books={books}
                requests={requests}
                notice={notice}
                noticeTone={noticeTone}
                onLogout={handleLogout}
              />
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
        <Route
          path="/dashboard"
          element={
            isLoggedIn && userRole === 'librarian' ? (
              <DashboardPage
                students={students}
                books={books}
                requests={requests}
                notice={notice}
                noticeTone={noticeTone}
                studentId={studentId}
                setStudentId={setStudentId}
                bookId={bookId}
                setBookId={setBookId}
                handleRequestBook={handleRequestBook}
                handleApprove={handleApprove}
                handleReturnRequest={handleReturnRequest}
                handleApproveReturn={handleApproveReturn}
                onLogout={handleLogout}
              />
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
        <Route
          path="/student-dashboard"
          element={
            isLoggedIn && userRole === 'student' && activeStudent ? (
              <StudentDashboardPage
                student={activeStudent}
                requests={requests}
                notice={notice}
                noticeTone={noticeTone}
                bookId={bookId}
                setBookId={setBookId}
                handleRequestBook={handleRequestBook}
                handleReturnRequest={handleReturnRequest}
                onLogout={handleLogout}
              />
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
        <Route
          path="/student-borrow"
          element={
            isLoggedIn && userRole === 'student' && activeStudent ? (
              <StudentRequestPage
                books={books}
                notice={notice}
                noticeTone={noticeTone}
                bookId={bookId}
                setBookId={setBookId}
                handleRequestBook={handleRequestBook}
                onLogout={handleLogout}
              />
            ) : isLoggedIn ? (
              <Navigate to="/dashboard" replace />
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
        <Route
          path="/students"
          element={
            isLoggedIn && userRole === 'librarian' ? (
              <StudentsPage
                students={students}
                books={books}
                requests={requests}
                studentForm={studentForm}
                handleStudentChange={handleStudentChange}
                handleStudentSubmit={handleStudentSubmit}
                onLogout={handleLogout}
                notice={notice}
                noticeTone={noticeTone}
              />
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
        <Route
          path="/admin-books"
          element={
            isLoggedIn && userRole === 'admin' ? (
              <AdminInventoryPage
                books={books}
                bookForm={bookForm}
                searchTerm={searchTerm}
                setSearchTerm={setSearchTerm}
                handleBookChange={handleBookChange}
                handleBookSubmit={handleBookSubmit}
                onLogout={handleLogout}
                notice={notice}
                noticeTone={noticeTone}
              />
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
        <Route
          path="/books"
          element={
            isLoggedIn && userRole === 'librarian' ? (
              <BooksPage
                books={books}
                bookForm={bookForm}
                searchTerm={searchTerm}
                setSearchTerm={setSearchTerm}
                handleBookChange={handleBookChange}
                handleBookSubmit={handleBookSubmit}
                onLogout={handleLogout}
                notice={notice}
                noticeTone={noticeTone}
              />
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
        <Route
          path="/admin-borrow-records"
          element={
            isLoggedIn && userRole === 'admin' ? (
              <AdminBorrowRecordsPage
                requests={requests}
                onLogout={handleLogout}
              />
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
        <Route
          path="/borrow-records"
          element={
            isLoggedIn && userRole === 'librarian' ? (
              <BorrowRecordsPage
                requests={requests}
                handleApprove={handleApprove}
                handleReturnRequest={handleReturnRequest}
                handleApproveReturn={handleApproveReturn}
                onLogout={handleLogout}
              />
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
        <Route
          path="/admin-overdue"
          element={
            isLoggedIn && userRole === 'admin' ? (
              <AdminOverduePage requests={requests} onLogout={handleLogout} />
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
        <Route
          path="/returns"
          element={
            isLoggedIn && userRole === 'librarian' ? (
              <ReturnsPage requests={requests} handleApproveReturn={handleApproveReturn} onLogout={handleLogout} />
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
      </Routes>
    </BrowserRouter>
  )
}

export default App
