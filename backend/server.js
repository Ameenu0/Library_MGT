require('dotenv').config();

const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

const students = [];
const books = [];
const requests = [
  {
    id: 1,
    studentId: 'STD-001',
    bookId: 'BK-001',
    status: 'pending',
    requestedAt: new Date().toISOString(),
  },
];

app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    message: 'Library Management API is running',
    timestamp: new Date().toISOString(),
  });
});

app.get('/api/students', (req, res) => {
  res.status(200).json(students);
});

app.post('/api/students', (req, res) => {
  const student = {
    id: Date.now(),
    registrationNumber: req.body.registrationNumber || 'STD-NEW',
    fullName: req.body.fullName || 'New Student',
    faculty: req.body.faculty || 'Science',
    department: req.body.department || 'Computer Science',
    status: req.body.status || 'undergraduate',
  };

  students.push(student);
  res.status(201).json(student);
});

app.get('/api/books', (req, res) => {
  res.status(200).json(books);
});

app.post('/api/books', (req, res) => {
  const book = {
    id: Date.now(),
    title: req.body.title || 'New Book',
    author: req.body.author || 'Unknown Author',
    callNumber: req.body.callNumber || 'QA-001',
    accessionNumber: req.body.accessionNumber || 'ACC-001',
    available: true,
  };

  books.push(book);
  res.status(201).json(book);
});

app.get('/api/requests', (req, res) => {
  res.status(200).json(requests);
});

app.post('/api/requests', (req, res) => {
  const request = {
    id: Date.now(),
    studentId: req.body.studentId || 'STD-001',
    bookId: req.body.bookId || 'BK-001',
    status: 'pending',
    requestedAt: new Date().toISOString(),
  };

  requests.push(request);
  res.status(201).json(request);
});

app.patch('/api/requests/:id/approve', (req, res) => {
  const requestItem = requests.find((item) => String(item.id) === String(req.params.id));

  if (!requestItem) {
    return res.status(404).json({ message: 'Request not found' });
  }

  requestItem.status = 'approved';
  requestItem.approvedAt = new Date().toISOString();

  return res.status(200).json(requestItem);
});

app.get('/', (req, res) => {
  res.send('Library Management System backend is running.');
});

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Library backend running on port ${PORT}`);
  });
}

module.exports = app;
