# Library Management System (Library_MGT)

## Project Overview
The Library Management System is a web-based application designed to help a university library manage student registration, library card issuance, book requests, approval workflows, borrowing, and return records.

This project is developed using:
- React for the frontend
- Node.js with Express.js for the backend
- MongoDB as the recommended database system

## Objectives
- Register students and assign library cards
- Allow students to request books
- Require librarian approval before a book is issued
- Enforce borrowing limits for undergraduate and postgraduate students
- Track due dates and return deadlines
- Manage book availability and borrowing records
- Provide a clean interface for librarians and students

## Core Business Rules
- Every student must register with the library before using library services.
- Registered students receive a library card.
- Undergraduates can borrow a maximum of 3 books at a time.
- Postgraduate students can borrow a maximum of 5 books at a time.
- A student must submit a book request before borrowing.
- The librarian must approve the request before the book is issued.
- Every book has a call number and accession number.
- Borrowed books must be returned within 2 weeks for undergraduates and 1 month for postgraduates.
- Borrow cards remain with the library until the book is returned.

## Current Project Status
The project is currently in the implementation phase, and the Week 3 request/approval milestone has been completed and verified.

### Achieved
- Project requirement analysis completed
- Week 1 deliverables completed
- Week 2 environment setup completed
- Frontend React app initialized and built successfully
- Backend Node.js app initialized and server started successfully
- Student book request flow implemented
- Librarian approval flow implemented
- Backend API tests passed
- Frontend production build passed

### Pending
- Persistent database integration
- Full book return and overdue logic
- Stronger role-based UI and validation
- Reporting and final academic documentation

## Project Structure
```bash
Library_MGT/
├── backend/
│   ├── .env.example
│   ├── node_modules/
│   ├── package.json
│   └── server.js
├── frontend/
│   ├── .env.example
│   ├── node_modules/
│   ├── package.json
│   ├── src/
│   ├── public/
│   └── vite.config.js
├── Docs/
├── plan.md
├── rawnotes.txt
├── README.md
├── verification.md
└── .git/
```

## Running the Application
### Backend
```bash
cd backend
npm install
npm run dev
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

## Environment Variables
### Backend
Use the `.env.example` file as a template and create a `.env` file.

Example:
```env
PORT=5000
MONGO_URI=mongodb://localhost:27017/library_mgt
JWT_SECRET=your_jwt_secret_here
NODE_ENV=development
```

### Frontend
Use the `.env.example` file as a template and create a `.env` file.

Example:
```env
VITE_API_URL=http://localhost:5000/api
```

## Verification Commands
### Frontend build
```bash
cd frontend
npm run build
```

### Backend server
```bash
cd backend
npm run test
node server.js
```

## Notes
This README should be updated as the project grows and new features are added. It serves as a quick reference for setup, usage, and project status.
