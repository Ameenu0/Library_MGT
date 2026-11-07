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
The project has moved beyond environment setup. The frontend and backend are both working, and the core library workflows have been implemented and verified. The current build includes a role-based admin flow, librarian management screens, and student-facing borrowing logic with approval and return tracking.

### Latest Implementation Progress (2026-10-15)
- The default route is the login page, and users are not kept signed in after refresh unless the app state is explicitly restored.
- Separate admin routes were implemented so admin pages do not fall through to librarian screens.
- The admin panel is restricted to the requested modules: Library Inventory, Transaction History, and Overdue Books.
- The admin inventory section allows adding books while also supporting catalog search.
- The admin dashboard now includes student search by registration number or name, without allowing student registration from the admin view.
- Student search results show borrowed-but-not-returned books and overdue loans, or a "none of this" message when there are no issues.
- Book availability is displayed as "Not available" when a book has been requested, approved, or otherwise cannot be borrowed.
- The request workflow remains protected by librarian approval before a book is formally issued.
- Frontend build verification has been completed successfully with Vite.

### Technology Stack
- Frontend: React.js
- Backend: Node.js with Express.js
- Database: SQLite for this project, with PostgreSQL as the recommended upgrade path for larger production deployments
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

## 5. Main Functional Requirements

The current system is designed around three main actors: student, librarian, and admin. The application supports a role-based workflow in which users log in from the same entry screen but are routed to the correct dashboard according to their role.

### Student Functional Requirements
- A student must be able to log in using their registration number or email and password.
- A first-time student must be able to activate their account by creating a password using their registration number, new password, and confirm password.
- The student must be able to view their dashboard with active borrowing information, due dates, and loan status.
- The student must be able to request a book for borrowing.
- The system must prevent a student from borrowing more than the allowed maximum number of books.
- The student must be able to see whether a requested book is available or unavailable.
- The student should be able to return books and view updated borrowing records on their dashboard.
- The student must be able to access only their own information and borrowing data.
- The system must enforce correct validation for password creation, including matching passwords and minimum password length.

### Librarian Functional Requirements
- The librarian must be able to log in and access the librarian dashboard.
- The librarian must be able to register or manage student records.
- The librarian must be able to approve or reject student borrow requests.
- The librarian must be able to view students with borrowed books and overdue records.
- The librarian must be able to search students by registration number or name.
- The librarian must be able to search books and view availability.
- The librarian must be able to manage library inventory and book records.
- The librarian must be able to track borrowing and return transactions.
- The librarian must be able to identify whether a student has any books not returned and whether any loans are overdue.

### Admin Functional Requirements
- The admin must be able to log in and access the admin dashboard.
- The admin must be able to view library overview statistics and operational summaries.
- The admin must be able to manage library inventory.
- The admin must be able to view transaction history.
- The admin must be able to view overdue books and loan issues.
- The admin must be able to search for students but must not be allowed to register students.
- The admin must only access the permitted modules and not the full librarian workflow.

### Book and Borrowing Functional Requirements
- Each book must include a title, author, accession number, and call number.
- Books must be marked as available or unavailable based on current state.
- A student request must be stored only after validation and must not be silently lost.
- A student cannot borrow a book until the librarian approves the request.
- Loan due dates must be calculated according to the student’s category.
- A student with overdue books must be flagged clearly in the system.
- Returned books must update availability and clear the active loan from the student’s dashboard.
- Requests for unavailable books must show the correct status as "Not available" rather than a misleading request state.

### Authentication and Security Requirements
- The system must route users by role after login.
- The default login page must be the default entry point.
- The app must clear stale data from the login and activation forms so that users always begin with blank fields.
- Student accounts must support self-service password activation rather than automatic default password generation.
- The system must prevent unauthorized access to dashboards and restrict navigation according to role.

---

## 6. Development Approach

The system was developed using an iterative, role-based approach that started with the core business rules and then moved to implementation, validation, and cleanup.

### Approach Used
1. Requirement analysis and business-rule mapping.
   - The project began by identifying the library workflows, roles, and approval rules needed for students, librarians, and admin staff.

2. Modular system design.
   - The application was separated into a React frontend for user interfaces and an Express backend for business logic and data storage.
   - Role-based routes were created so the same app could serve student, librarian, and admin screens cleanly.

3. Database and API layer design.
   - SQLite was used for persistent storage of students, books, requests, and borrowing records.
   - REST endpoints were created for login, activation, borrowing, approvals, returns, searches, and overview reporting.

4. Validation-first implementation.
   - Business rules such as borrowing limits, due dates, duplicate request prevention, and overdue checks were enforced in the backend.
   - Frontend validation was also added for activation and login flows.

5. UX refinement and bug cleanup.
   - The interface was refined to remove stale form values, reduce confusion in role switching, and keep activation and login flows simple and consistent.
   - The admin and librarian screens were cleaned so only relevant navigation links and modules remained visible.

6. Verification and testing.
   - Production build checks were executed for the frontend.
   - Backend tests were used to validate request handling, stock logic, and student activation rules.

This approach made it possible to build a practical library management system that matches the actual operational workflow rather than only a conceptual design.

---

## 7. System Workflow

The library system works as follows:

1. User opens the application and lands on the login page.
2. The user enters their registration number or email and password.
3. The server checks the role and redirects the user to the proper dashboard.
4. If the user is a first-time student, they use the “Activate your account” flow to set a password.
5. The student logs in and sees their dashboard with active loans, due dates, and borrowing status.
6. The student submits a borrow request for a book.
7. The request is saved and the system marks the book as unavailable or pending according to the request state.
8. The librarian reviews the request on the librarian dashboard.
9. The librarian approves the book request before the borrow is officially processed.
10. Once approved, the due date is calculated and the book is assigned to the student.
11. The student can return the book when due, after which the system updates the record and restores availability.
12. The librarian and admin can search for students and books, check overdue records, and review system history.
13. The admin can see high-level summaries and manage the inventory without being allowed to perform student registration.

This workflow ensures that the library process is controlled, visible, and auditable from both the student and staff side.

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
- Administrator

### Main Use Cases
- Register student
- Student login to personal dashboard
- View active loans and return due dates
- View borrowing history and outstanding obligations
- Issue library card
- Issue borrow card
- Borrow a book through a request workflow
- Librarian approve the borrowing request
- Return a book
- View transaction history
- Search for a book
- Manage library inventory
- View overdue books
- Administrator login to the administration panel
- Administrator review high-level system metrics and active reports
- Administrator view active requests, loan counts, and overdue summaries
- Administrator monitor the library without disrupting student or librarian workflows

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

Status: Achieved and Verified

1. Define the database schema for students, books, cards, and borrow records. ✅
2. Set up a persistent database for the project. ✅ (SQLite is used for the active implementation)
3. Create models for Student, Book, LibraryCard, BorrowCard, and BorrowRecord. ✅ (implemented as SQLite tables and validation logic)
4. Create API endpoints for:
   - student registration ✅
   - book creation ✅
   - borrowing a book request ✅
   - approving a borrow request ✅
   - returning a book ✅
   - retrieving student history ✅
   - retrieving overdue books ✅
5. Implement validation rules for student limit checks and due date logic. ✅
6. Add error-handling middleware and consistent API responses. ✅
7. Test API endpoints using automated tests. ✅

Current implementation includes:
- SQLite database setup with persistent tables
- health endpoint
- student endpoint
- book endpoint
- request creation endpoint
- request approval endpoint
- request return endpoint
- duplicate request prevention
- borrow-limit enforcement
- request/approval UI in React
- automated backend verification using Jest
- frontend production build validation with Vite

This establishes the verified Week 3 request/approval and return flow required by the project.

Verification evidence:
- Command run: `cd /Users/aminuayuba/Desktop/Library_MGT/backend && npm test -- --runInBand`
- Result: `Test Suites: 1 passed, 1 total`, `Tests: 9 passed, 9 total`
- Command run: `cd /Users/aminuayuba/Desktop/Library_MGT/frontend && npm run build`
- Result: `✓ built in 3.44s`

Next milestone:
- add history and overdue-report endpoints
- expand librarian/student dashboards and reporting
- complete final project documentation and academic reporting

### Phase 3 Continued: Remaining Backend and Database Tasks

The following items remain to complete the full Phase 3 database/backend milestone after the verified request/approval and return workflow:

1. Finalize the persistent database choice for production use. ✅ (SQLite chosen for the current project)
2. Create the database models and schemas for:
   - Student ✅
   - Book ✅
   - LibraryCard ✅ (implemented as part of the student registration workflow)
   - BorrowCard ✅ (covered by request/approval lifecycle)
   - BorrowRecord ✅ (represented by request records and return status)
   - BookRequest ✅
3. Add proper validation rules for duplicate student registration, duplicate book records, and repeated pending requests. ✅
4. Implement borrow limit logic:
   - undergraduate maximum of 3 active books ✅
   - postgraduate maximum of 5 active books ✅
5. Implement due date and return date logic based on student category. ✅
6. Create a return-book endpoint that updates book availability and closes the borrow record. ✅
7. Create loan-history and overdue tracking endpoints for each student and for the librarian dashboard. ✅
8. Add business-rule checks before approval so the librarian can only approve valid requests. ✅
9. Add consistent error handling with clear JSON responses for invalid input and failed requests. ✅
10. Add database seed data and sample records for students, books, and borrow requests during testing. ✅
11. Write automated tests for all remaining backend logic, including validation failures and edge cases. ✅
12. Update the frontend to consume the final backend API after persistence is added. ✅ (UI remains compatible with the API contract)
13. Document the API routes and expected outputs for final academic reporting. ✅ (documented in README and verification.md)

These remaining tasks will complete the backend foundation needed before moving into the full frontend dashboard and reporting phase.

### Phase 4: Frontend Development

1. Set up React project structure and reusable components. ✅
2. Build the landing page and dashboard layout. ✅
3. Design the student registration form. ✅
4. Create book catalog view and search filters. ✅
5. Build librarian dashboard for book and student management. ✅
6. Implement borrowing form and validation. ✅
7. Implement return-book workflow. ✅
8. Display notifications for success, failure, and validation errors. ✅
9. Build pages for:
   - login
   - registration
   - dashboard
   - books
   - borrow records
   - returns
   ✅ implemented as separate routed pages in the React app
10. Connect frontend to backend using Axios or fetch. ✅

Current Phase 4 implementation status:
- dashboard-style landing page with library overview cards
- reusable section components and styling framework
- student registration form connected to the backend API
- book catalog view with add-book form and live search filtering
- librarian dashboard with pending requests and active loans
- route-based pages for login, dashboard, students, books, borrow records, and returns
- borrow request validation and action buttons
- return workflow for approved loans
- success/error notification system for user feedback

### Phase 5: Business Logic and Rules Implementation

Status: Achieved and Verified

1. Implement a student borrow limit check. ✅
2. Enforce postgraduate borrowing limit of 5 books. ✅
3. Enforce undergraduate borrowing limit of 3 books. ✅
4. Calculate due dates based on student category. ✅
5. Prevent duplicate active records for the same book. ✅
6. Track book availability and return status. ✅
7. Add logic to hold borrow cards until the designated book is returned. ✅
8. Create report generation for overdue and issued books. ✅

Implementation evidence:
- Borrow limits and category-based rules are enforced in [backend/server.js](backend/server.js)
- Due date generation is handled in the `calculateDueDate` logic in [backend/server.js](backend/server.js)
- Duplicate request blocking, availability checks, and return approvals are covered by [backend/test/app.test.js](backend/test/app.test.js)

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

### Week 3 - Achieved and Extended
- Student and book models ✅
- API endpoint development ✅
- Data validation and business rules ✅
- Return workflow ✅
- SQLite persistence ✅

### Week 4
- Frontend setup ✅
- Landing dashboard and overview cards ✅
- Student registration form ✅
- Book catalog view and search filters ✅
- Authentication and librarian dashboard design 🔄
- Borrow and return workflow UI 🔄

### Week 5
- Borrow and return functionality ✅
- Internal testing and bug fixing ✅

Completed Week 5 activities:
- Borrow request creation and approval flow completed
- Return request and approval flow completed
- Borrow limit enforcement for undergraduate and postgraduate students completed
- Due-date calculation by student category completed
- Duplicate request prevention and book availability tracking completed
- Overdue and history checks completed and validated through API tests

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
