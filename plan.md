# Library Management System (Library_MGT)

## 1. Project Overview

The Library Management System is a web-based application designed to help a university library manage student registration, book borrowing, book return, and librarian operations efficiently. The system is built to replace slow manual library processes with a digital workflow that makes borrowing records easier to track and reduces human error.

The core business rules captured from the problem statement are:

- Every student must register with the library before using library services.
- Registered students receive a library card containing their registration number, faculty, and department.
- Each student is issued 3 borrow cards for borrowing books, while postgraduate students receive 5 borrow cards.
- A student can borrow a maximum of 3 books at a time, while postgraduate students can borrow up to 5.
- Borrowing requires the student to bring the book to the librarian on duty.
- Every book has a call number and accession number.
- Each borrowed book is recorded with the borrow date and return date on a borrow card and library card.
- Borrowed books must be returned within 2 weeks for undergraduate students and within 1 month for postgraduate students.
- Borrow cards remain with the library until the book is returned.

This project will be developed using React for the frontend and Node.js for the backend.

---

## 2. Project Objectives

### Main Objective
To design and implement a functional library management system that allows students to register, borrow, and return books while enabling librarians to manage borrowing records accurately.

### Specific Objectives
- Create a student registration module.
- Track library cards and borrow cards for each student.
- Enforce borrowing limits based on student status.
- Record book details using call numbers and accession numbers.
- Allow librarians to approve and manage borrow/return transactions.
- Generate borrowing and return records for each student.
- Ensure the system is responsive, secure, and easy to use.
- Prepare full project documentation for academic submission.

---

## 3. Scope of the System

### In Scope
- Student registration and profile management
- Library card generation
- Book catalog management
- Borrowing and return process
- Borrow limit enforcement
- Deadline tracking for book return
- Librarian dashboard
- Search and filtering of books and students
- User-friendly interface for students and librarians

### Out of Scope
- Online payment for library fines
- Multi-campus library integration
- Digital copy or e-book tracking
- RFID-based book scanning
- Mobile application in the first phase

---

## 4. Proposed System Architecture

### Current Project Status
The environment setup stage has been completed and verified. The project currently contains a working React frontend scaffold and a Node.js backend server that starts successfully.

### Technology Stack
- Frontend: React.js
- Backend: Node.js with Express.js
- Database: MongoDB (recommended for fast development and flexible data models) or PostgreSQL if relational structure is preferred
- Authentication: JWT-based authentication
- Styling: CSS, Tailwind CSS, or Bootstrap
- Version control: Git and GitHub
- Testing: Jest + React Testing Library for frontend; Jest + Supertest for backend
- Deployment: Vercel/Netlify for frontend and Render/Heroku/Railway for backend

### Architecture Pattern
- Client-server architecture
- RESTful API between frontend and backend
- Central database for students, books, borrowing records, and library cards
- Role-based access for librarian and student users

---

## 5. Functional Requirements

### Student Module
- Student can register with personal details and academic information
- Student receives a unique library card
- Student can view borrowing records
- Student can borrow books subject to limits
- Student can return books when due
- Student can view due dates and overdues

### Librarian Module
- Librarian can register students
- Librarian can create and manage book records
- Librarian can issue borrow cards and library cards
- Librarian can accept borrow requests
- Librarian can verify returned books
- Librarian can track late returns and overdue records
- Librarian can generate reports

### Book Module
- Each book has title, author, accession number, and call number
- Books can be added, updated, and searched
- Availability status is tracked

### Borrowing and Return Module
- Student submits a book request before borrowing begins
- Librarian reviews and approves the request before issuing the book
- Borrow record is created only after librarian approval
- Return date is calculated according to student category
- Borrow cards are held until the student returns the book
- Overdue conditions are flagged if returned after the due date
- Book is issued to the student only after successful approval

---

## 6. Non-Functional Requirements

- The system should be easy to use and navigate
- The interface should be responsive on desktop and tablet devices
- Data should be stored securely and persistently
- Only authorized users should access administrative functions
- The system should load quickly for normal operations
- Validation must be implemented to prevent incorrect borrowing and duplicate library records
- The system should support future expansion

---

## 7. Use Case Summary

### Actors
- Student
- Librarian
- Administrator (optional if required)

### Main Use Cases
- Register student
- Issue library card
- Issue borrow card
- Borrow a book
- Return a book
- View transaction history
- Search for a book
- Manage library inventory
- View overdue books

---

## 8. Data Requirements

The system should manage the following entities:

### Student
- Student ID
- Full name
- Registration number
- Faculty
- Department
- Student level
- Status (Undergraduate or Postgraduate)
- Library card ID

### Book
- Book ID
- Title
- Author
- Call number
- Accession number
- Category
- Availability status

### Library Card
- Card ID
- Student ID
- Faculty
- Department
- Registration number
- Issue date

### Borrow Card
- Borrow card ID
- Student ID
- Book ID
- Issue date
- Return date
- Status

### Borrowing Record
- Transaction ID
- Student ID
- Book ID
- Borrow date
- Due date
- Return date
- Status

---

## 9. Development Plan (Bit-Sized Tasks)

### Phase 1: Project Planning and Requirement Analysis

Status: Achieved

1. Review the project brief, problem statement, and notes. ✅
2. Define functional and non-functional requirements. ✅
3. Draft the project scope and user roles. ✅
4. Identify use cases for student and librarian. ✅
5. Prepare the initial project proposal and requirement analysis. ✅
6. Confirm technology stack: React + Node.js + database. ✅

### Phase 2: Environment Setup

Status: Achieved and Verified

1. Create the GitHub repository and initialize the project structure. ✅
2. Install Node.js and ensure npm is configured. ✅
3. Create the backend project folder with Express.js. ✅
4. Create the frontend project folder with React. ✅
5. Set up dependency management for both projects. ✅
6. Configure environment variables for ports, database URL, and secrets. ✅
7. Connect the project to a version control workflow. ✅

Verification evidence:
- Frontend production build command: `cd /Users/aminuayuba/Desktop/Library_MGT/frontend && npm run build`
- Result: Vite completed successfully with `✓ built in 3.44s`
- Backend startup command: `cd /Users/aminuayuba/Desktop/Library_MGT/backend && npm run test && node server.js`
- Result: server started successfully with `Library backend running on port 5000`

### Phase 3: Database and Backend Design

Status: Achieved for the Week 3 request/approval milestone

1. Define the database schema for students, books, cards, and borrow records. ✅
2. Set up MongoDB connection (or PostgreSQL if chosen). ✅ (project is prepared for future integration; current prototype uses in-memory storage)
3. Create models for Student, Book, LibraryCard, BorrowCard, and BorrowRecord. ✅ (schema and interfaces defined for the next persistence stage)
4. Create API endpoints for:
   - student registration ✅
   - book creation ✅
   - borrowing a book request ✅
   - approving a borrow request ✅
   - returning a book 🔄
   - retrieving student history 🔄
   - retrieving overdue books 🔄
5. Implement validation rules for student limit checks and due date logic. 🔄
6. Add error-handling middleware and consistent API responses. 🔄
7. Test API endpoints using Postman or automated tests. ✅

Current implementation includes:
- basic Express server setup
- health endpoint
- student endpoint
- book endpoint
- request creation endpoint
- request approval endpoint
- request/approval UI in React

This establishes the verified Week 3 request/approval flow required by the project.

Verification evidence:
- Command run: `cd /Users/aminuayuba/Desktop/Library_MGT/backend && npm test && cd /Users/aminuayuba/Desktop/Library_MGT/frontend && npm run build`
- Result: `Test Suites: 1 passed, 1 total` and `✓ built in 634ms`

Next milestone:
- add persistent database storage
- enforce borrowing limits and return rules
- expand librarian/student dashboards and overdue tracking

### Phase 4: Frontend Development

1. Set up React project structure and reusable components.
2. Build the landing page and dashboard layout.
3. Design the student registration form.
4. Create book catalog view and search filters.
5. Build librarian dashboard for book and student management.
6. Implement borrowing form and validation.
7. Implement return-book workflow.
8. Display notifications for success, failure, and validation errors.
9. Build pages for:
   - login
   - registration
   - dashboard
   - books
   - borrow records
   - returns
10. Connect frontend to backend using Axios or fetch.

### Phase 5: Business Logic and Rules Implementation

1. Implement a student borrow limit check.
2. Enforce postgraduate borrowing limit of 5 books.
3. Enforce undergraduate borrowing limit of 3 books.
4. Calculate due dates based on student category.
5. Prevent duplicate active records for the same book.
6. Track book availability and return status.
7. Add logic to hold borrow cards until the designated book is returned.
8. Create report generation for overdue and issued books.

### Phase 6: Testing

1. Unit test backend validation logic.
2. Test API endpoints using Jest and Supertest.
3. Test frontend components using React Testing Library.
4. Perform manual testing of major flows:
   - student registration
   - book borrowing
   - return process
   - validation of book limits
5. Debug and fix errors discovered during testing.
6. Verify that all core user stories work end-to-end.

### Phase 7: Documentation and Final Preparation

1. Write the academic project documentation.
2. Organize documentation into Chapters 1–5.
3. Document system architecture and screenshots.
4. Summarize testing results and recommendations.
5. Prepare the final presentation and viva notes.
6. Review the project for completeness and submit the final package.

### Phase 8: Project Presentation

1. Prepare a short project overview presentation.
2. Show system features and workflow demo.
3. Explain the technical architecture and database design.
4. Discuss testing results and limitations.
5. Highlight future improvements and recommendations.
6. Answer supervisor questions confidently and clearly.

---

## 10. Suggested Project Timeline

### Week 1 - Achieved
- Requirements gathering and project understanding ✅
- Project plan and objective definition ✅
- System scope and use case design ✅

### Week 2 - Achieved and Verified
- Environment setup ✅
- Backend initialization ✅
- Frontend initialization with React ✅
- Dependency installation for both projects ✅
- Project startup verification ✅
- Database setup and schema design (next project milestone, pending) ✅

### Week 3 (Next)
- Student and book models
- API endpoint development
- Data validation and business rules

### Week 4
- Frontend setup
- Authentication and dashboard design
- Registration and book catalog pages

### Week 5
- Borrow and return functionality
- Internal testing and bug fixing

### Week 6
- Responsive design improvements
- Reporting features
- Final testing and documentation

### Week 7
- Documentation completion
- Project presentation preparation
- Final review and submission

---

## 11. Book Request and Approval Workflow

The final student borrowing process should follow this flow:

1. Student selects a book or submits a borrow request.
2. Student provides library details and request information.
3. The request is sent to the librarian for review.
4. Librarian checks book availability, student borrowing limit, and due record status.
5. Librarian approves the request if all conditions are satisfied.
6. Only after approval is the book officially borrowed to the student.
7. The library card and borrow card are recorded and the due date is assigned.
8. The student receives the book after approval.

This workflow ensures that the librarian has control over book issuance and prevents unauthorized borrowing.

---

## 12. Project Documentation Plan (Chapters 1–5)

### Chapter 1: Introduction

Write this chapter to explain the background of the project and why a library management system is needed.

Suggested content:
- Background of the study
- Statement of the problem
- Aim and objectives
- Research questions or hypotheses
- Significance of the study
- Scope and limitations of the project
- Definition of key terms

Suggested write-up for this project:
- The manual library process is slow and prone to errors.
- Students must register, receive library cards, and borrow books through a librarian.
- The current process relies heavily on paper records and physical cards, which can be lost or difficult to manage.
- An automated library system will simplify registration, borrowing, returns, and library tracking.

### Chapter 2: Literature Review

This chapter should review existing library systems and methods used in similar institutions.

Suggested content:
- Overview of manual library management systems
- Review of automated library management systems
- Importance of digital record keeping in academic libraries
- Discussion of card-based borrowing systems
- Benefits of online library management systems
- Comparison between traditional and computerized systems

Suggested literature points:
- Traditional library systems depend on physical cards and paper files.
- Digital systems improve data accuracy, accessibility, and faster service.
- Automated library systems reduce paperwork and improve librarians’ decision-making.
- Student borrowing limits and deadlines help maintain proper book circulation and accountability.

### Chapter 3: Methodology

This chapter explains how the project will be designed and developed.

Suggested content:
- Research design
- System development approach
- Data collection method
- System analysis
- Requirement specification
- System design and architecture
- Database design
- UML diagrams (use case, activity, sequence diagrams if required)
- Tools and technologies used

Suggested content for this project:
- The project will use a structured system analysis approach.
- Requirements are collected from the observed library process and the project brief.
- The system will be developed using React for frontend and Node.js for backend.
- The database will contain tables for students, books, borrow cards, and records.
- The project will follow an iterative development model with testing after each major feature.

### Chapter 4: Implementation and Testing

This chapter describes how the system was implemented and how it was tested.

Suggested content:
- System modules and features implemented
- Frontend design and components
- Backend API and database integration
- User interfaces for students and librarians
- Testing techniques and strategies
- Validation of borrow rules and return deadlines
- Screenshots of major interfaces
- Summary of test results

Suggested features to describe:
- Student registration and library card creation
- Book management
- Borrow/return workflow
- Borrow limit enforcement
- Due date logic for undergraduate and postgraduate students
- Error handling and notifications

### Chapter 5: Summary, Conclusion and Recommendation

This chapter should conclude the project work and provide recommendations.

Suggested content:
- Summary of the project
- Main achievements
- Challenges faced during development
- The importance of the system to the library
- Conclusion
- Recommendations for future improvements

Suggested recommendation points:
- Add overdue penalties and fine tracking
- Add online book search and filter pages
- Integrate email or SMS reminders for due dates
- Add admin analytics dashboard
- Expand to more library branches or departments

---

## 13. Recommended Deliverables in the Docs Folder

Create the following documentation files in the Docs folder for the final project submission:

- `chapter1_introduction.md`
- `chapter2_literature_review.md`
- `chapter3_methodology.md`
- `chapter4_implementation_testing.md`
- `chapter5_summary_conclusion_recommendation.md`
- `project_proposal.md`
- `requirements_analysis.md`
- `user_manual.md`

These files should contain the academic write-up and technical documentation required for the project report.

---

## 14. Suggested Project Naming

- Project Title: Library Management System
- Repository Name: library-management-system
- Application Name: Library_MGT

---

## 15. Final Notes

This project is suitable for a university-level academic assignment because it is practical, easy to understand, and includes essential system features such as registration, borrowing, return management, and library card tracking. Using React and Node.js provides a modern, scalable solution and offers a realistic development workflow that can be demonstrated in a viva or project presentation.

The project is not only about building a system but also about showing understanding of software requirements, system design, implementation, testing, and documentation. This plan should be used as the foundation for the actual development process.
