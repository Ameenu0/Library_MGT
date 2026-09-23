import { useEffect, useState } from 'react'
import './App.css'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

function App() {
  const [requests, setRequests] = useState([])
  const [studentId, setStudentId] = useState('STD-001')
  const [bookId, setBookId] = useState('BK-001')
  const [message, setMessage] = useState('')

  const fetchRequests = async () => {
    try {
      const response = await fetch(`${API_URL}/requests`)
      const data = await response.json()
      setRequests(data)
    } catch (error) {
      console.error('Failed to fetch requests:', error)
      setMessage('Could not load requests from the server.')
    }
  }

  useEffect(() => {
    fetchRequests()
  }, [])

  const handleRequestBook = async (event) => {
    event.preventDefault()

    try {
      const response = await fetch(`${API_URL}/requests`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ studentId, bookId }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || 'Unable to create request')
      }

      setMessage(`Book request created successfully for ${data.studentId}.`)
      setStudentId('STD-001')
      setBookId('BK-001')
      fetchRequests()
    } catch (error) {
      setMessage(error.message)
    }
  }

  const handleApprove = async (requestId) => {
    try {
      const response = await fetch(`${API_URL}/requests/${requestId}/approve`, {
        method: 'PATCH',
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || 'Unable to approve request')
      }

      setMessage(`Request ${requestId} approved successfully.`)
      fetchRequests()
    } catch (error) {
      setMessage(error.message)
    }
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">University Library</p>
          <h1>Library Management System</h1>
        </div>
      </header>

      <main className="dashboard">
        <section className="panel request-panel">
          <h2>Request a Book</h2>
          <form onSubmit={handleRequestBook} className="request-form">
            <label>
              Student ID
              <input
                type="text"
                value={studentId}
                onChange={(event) => setStudentId(event.target.value)}
              />
            </label>

            <label>
              Book ID
              <input
                type="text"
                value={bookId}
                onChange={(event) => setBookId(event.target.value)}
              />
            </label>

            <button type="submit">Submit Request</button>
          </form>

          {message && <p className="status-message">{message}</p>}
        </section>

        <section className="panel requests-panel">
          <h2>Pending Requests</h2>

          <div className="request-list">
            {requests.length === 0 ? (
              <p className="empty-state">No requests found.</p>
            ) : (
              requests.map((request) => (
                <article className="request-card" key={request.id}>
                  <div>
                    <strong>Request #{request.id}</strong>
                    <p>Student: {request.studentId}</p>
                    <p>Book: {request.bookId}</p>
                    <p>Status: {request.status}</p>
                  </div>

                  {request.status === 'pending' && (
                    <button type="button" onClick={() => handleApprove(request.id)}>
                      Approve
                    </button>
                  )}
                </article>
              ))
            )}
          </div>
        </section>
      </main>
    </div>
  )
}

export default App
