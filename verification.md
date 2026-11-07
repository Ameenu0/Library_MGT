# Verification Guide for Achieved Weekly Tasks

This document records how to verify the work completed in Week 1, Week 2, and Week 3 of the Library Management System project. The project environment has now been successfully set up and the request/approval workflow has been implemented and verified. Use the terminal commands for fast confirmation and the browser steps for visual validation.

---

## Current Verified Status

The following checks were completed successfully:

### Frontend verification
Command used:
`cd /Users/aminuayuba/Desktop/Library_MGT/frontend && npm run build`

Result:
`✓ built in 1.08s`

The frontend has been updated to use separate role-based pages for login, librarian operations, student flows, and admin-only views. The admin inventory page now supports adding books, and the admin dashboard includes student search without registration access.

### Backend verification
Command used:
`cd /Users/aminuayuba/Desktop/Library_MGT/backend && npm test -- --runInBand`

Result:
`Test Suites: 1 passed, 1 total` and `Tests: 9 passed, 9 total`

### Backend runtime check
Command used:
`cd /Users/aminuayuba/Desktop/Library_MGT/backend && node server.js`

Result:
`Library backend running on port 5000`

These outcomes confirm that the environment setup and the completed library workflow are working correctly, including the most recent admin and inventory refinements.

### Latest Confirmed Features
- Admin-only navigation is isolated from librarian routes.
- Admin Library Inventory allows adding new books.
- Admin dashboard supports student lookup by registration number or name.
- Student search results surface active loans and overdue status when present.
- The login route remains the default landing page.
- The application continues to build successfully after the latest admin and routing updates.

## Week 1: Requirements Gathering and Planning

### 1. Review the project brief, raw notes, and problem statement
Verification via terminal:
- Open the project folder:
  `cd /Users/aminuayuba/Desktop/Library_MGT`
- Confirm the requirement files exist:
  `ls -la`
- View the project notes:
  `cat rawnotes.txt`
- View the project plan:
  `cat plan.md`

Expected result:
- The files contain the library rules, project objective, and implementation direction.

Verification via browser:
- Open the project folder in VS Code.
- Open `rawnotes.txt` and `plan.md`.
- Confirm that the library registration, borrowing, return policy, and project scope are present.

### 2. Define functional and non-functional requirements
Verification via terminal:
- Check the documentation contents:
  `grep -n "Functional Requirements\|Non-Functional Requirements\|Objectives\|Scope" plan.md`

Expected result:
- The document includes requirement sections describing user roles, expected features, and quality expectations.

Verification via browser:
- Open `plan.md` in VS Code or browser preview.
- Confirm the project includes student, librarian, borrowing, return, and system quality requirements.

### 3. Draft project scope and user roles
Verification via terminal:
- Search for key headings:
  `grep -n "Scope of the System\|Actors\|Use Case Summary\|Student Module\|Librarian Module" plan.md`

Expected result:
- The plan lists the system scope, actors, and major roles.

Verification via browser:
- Open the relevant section of `plan.md`.
- Check that the project defines the scope, student role, librarian role, and use cases.

### 4. Identify use cases for student and librarian
Verification via terminal:
- Search for use cases:
  `grep -n "Register student\|Borrow a book\|Return a book\|Issue library card\|View overdue books" plan.md`

Expected result:
- The use case list contains the expected library operations.

Verification via browser:
- Open the plan and review the use case summary.
- Confirm the process flow includes registration, book issue, return, and overdue tracking.

### 5. Prepare the requirement analysis and project proposal
Verification via terminal:
- Ensure that the documentation is saved in the workspace:
  `find . -maxdepth 2 -type f | sort`

Expected result:
- `plan.md` and project-related documentation are present in the workspace.

Verification via browser:
- Open `plan.md`.
- Confirm the document is complete and ready for the project proposal and documentation sections.

### 6. Confirm frontend and backend technology stack
Verification via terminal:
- Check the technical stack section:
  `grep -n "React\|Node.js\|MongoDB\|Express.js" plan.md`

Expected result:
- The project plan clearly states the selected frontend and backend technologies.

Verification via browser:
- Open the architecture section in `plan.md`.
- Confirm that React is chosen for the frontend and Node.js for the backend.

---

## Week 2: Environment Setup

### 1. Create the project repository and initialize project structure
Verification via terminal:
- Check the repository status:
  `git status --short`
- See if the project is initialized:
  `git rev-parse --is-inside-work-tree`

Expected result:
- The terminal confirms Git is active and the repository is initialized.

Verification via browser:
- Open the GitHub repository or local project folder structure in VS Code.
- Make sure the project files are organized for frontend and backend work.

### 2. Install Node.js and verify npm
Verification via terminal:
- Check the runtime version:
  `node -v`
- Check the package manager version:
  `npm -v`

Expected result:
- Node.js and npm are installed and version numbers are displayed.

Verification via browser:
- No browser verification is required here.
- The terminal output is the main evidence.

### 3. Initialize the backend project with Express.js
Verification via terminal:
- Create the backend folder if not already present:
  `mkdir -p backend`
- Confirm its presence:
  `ls -la backend`

Expected result:
- The backend folder exists and is ready for Node.js server setup.

Verification via browser:
- Open the backend folder in VS Code.
- Confirm the project has package files and server setup files after initialization.

### 4. Initialize the frontend project with React
Verification via terminal:
- Create the frontend project folder:
  `mkdir -p frontend`
- Confirm the structure:
  `ls -la frontend`

Expected result:
- The frontend folder exists and is ready for React setup.

Verification via browser:
- Open the frontend folder and inspect the source files once the React app is created.
- Confirm the app structure includes `src`, `public`, and configuration files.

### 5. Install dependencies for both projects
Verification via terminal:
- In the backend folder:
  `npm install`
- In the frontend folder:
  `npm install`

Expected result:
- The command completes without dependency errors.

Verification via browser:
- Check that project folders contain `node_modules` and the package lock files.

### 6. Configure environment variables for ports and database settings
Verification via terminal:
- Confirm that .env files or environment config exist:
  `find . -maxdepth 2 -name ".env*" -print`

Expected result:
- Environment files are available for the backend and frontend.

Verification via browser:
- Open the configuration files and verify keys such as port number, database URL, and secret values are present.

### 7. Ensure Git workflow is connected to the repository
Verification via terminal:
- Check the current branch:
  `git branch --show-current`
- Check Git status:
  `git status`

Expected result:
- The branch is active and the project files are tracked by Git.

Verification via browser:
- Open the repository in GitHub or VS Code Source Control panel.
- Confirm the files are visible and ready for commit.

---

## Recommended End-of-Week Verification Checklist

For each completed week, run the following before moving to the next stage:

1. Open the project plan and verify that week objectives are marked as achieved.
2. Confirm the framework is installed and working.
3. Check that the folder structure matches the design.
4. Validate project files with the terminal.
5. Run the app locally if the frontend/backend are initialized.

Example terminal validation:
- `node -v`
- `npm -v`
- `git status`
- `ls -la`
- `find . -maxdepth 2 -type f | sort`

Example browser validation:
- Open the React app in the browser at the local development URL.
- Check that the page loads without errors.
- Confirm the backend API responds if the server is running.

---
## Week 3: Phase 3 Database and Backend Completion

### What was achieved
The Phase 3 milestone was completed successfully with the following backend capabilities implemented and verified:

- Persistent SQLite database created and used for the project
- Student registration records stored and validated
- Book catalog records stored and validated
- Book request creation implemented
- Librarian approval workflow implemented
- Book return workflow implemented
- Duplicate pending request prevention enforced
- Borrow limit rules enforced for students:
  - undergraduate: 3 active loans
  - postgraduate: 5 active loans
- Due date calculation based on student category implemented
- Student loan history endpoint implemented
- Overdue request tracking endpoint implemented
- Database reset and seed endpoints added for testing and demo setup
- Clear JSON error responses implemented for invalid requests and failed operations
- Automated regression tests added and passing

### Verification commands used
Command used:
`cd /Users/aminuayuba/Desktop/Library_MGT/backend && npm test -- --runInBand`

Result:
- `Test Suites: 1 passed, 1 total`
- `Tests: 9 passed, 9 total`

Frontend build validation:
`cd /Users/aminuayuba/Desktop/Library_MGT/frontend && npm run build`

Result:
- `✓ built in 539ms`

### Evidence summary
These results confirm that the Week 3 Phase 3 work is complete and the library system is functioning according to the core project requirements.

### Example API checks
The following endpoints were verified through the test suite and runtime logic:
- `GET /api/health`
- `POST /api/students`
- `POST /api/books`
- `POST /api/requests`
- `PATCH /api/requests/:id/approve`
- `PATCH /api/requests/:id/return`
- `GET /api/requests/history`
- `GET /api/requests/overdue`
- `DELETE /api/testing/reset`
- `POST /api/testing/seed`

This confirms the implemented workflow matches the project requirement for student request, librarian approval, due-date management, and return tracking.

---

## Week 4: Frontend Phase 4 Completion

### Tasks completed in this week
The following Phase 4 tasks were completed successfully:

1. React project structure and reusable UI components
2. Landing page and dashboard layout
3. Student registration form
4. Book catalog view with search and filtering
5. Librarian dashboard for book and student management
6. Borrowing form and validation
7. Return-book workflow
8. Success, failure, and validation notifications

### Validation evidence
Command used:
`cd /Users/aminuayuba/Desktop/Library_MGT/frontend && npm run build`

Result:
`✓ built in 512ms`

This confirms the frontend dashboard, registration form, catalog, librarian actions, borrowing flow, return flow, and notification system compile successfully and are ready for the next improvement phase.

### Application Startup and Feature Testing Commands

This section lists the exact commands to run the application from the development server stage through feature testing, with browser testing prioritized first.

### 1. Start the backend server
Open a terminal and run:

```bash
cd /Users/aminuayuba/Desktop/Library_MGT/backend
npm install
cp .env.example .env
npm run dev
```

Expected result:
- The backend starts successfully.
- The terminal should print a message indicating the server is running, such as:
  `Library backend running on port 5000`

Browser validation:
- Open the browser and navigate to:
  `http://localhost:5000/`
- Check that the server is responding.
- Open:
  `http://localhost:5000/api/health`
- Confirm the response contains a JSON success message such as `status: "ok"`.

Terminal validation:
```bash
curl http://localhost:5000/api/health
```

Expected result:
- JSON response with status `ok`.

### 2. Start the frontend development server
Open a second terminal and run:

```bash
cd /Users/aminuayuba/Desktop/Library_MGT/frontend
npm install
cp .env.example .env
npm run dev -- --host 0.0.0.0
```

Expected result:
- Vite starts the development server.
- You will see a local URL such as:
  `http://localhost:5173`

Browser validation:
- Open the browser and navigate to the Vite local URL.
- Confirm the frontend loads without a blank page or runtime error.
- Check that the project home screen renders correctly.

Terminal validation:
```bash
cd /Users/aminuayuba/Desktop/Library_MGT/frontend
npm run build
```

Expected result:
- The app builds successfully without errors.

### 3. Browser-first feature testing checklist
Use the browser before terminal checks for all user-facing features.

#### Student request flow
1. Open the student dashboard or request page.
2. Select a book to request.
3. Submit the request.
4. Confirm the request is created successfully.
5. Check that the request status is shown as `Pending`.

#### Librarian approval flow
1. Open the librarian dashboard.
2. View pending book requests.
3. Select a request and verify the student details and book details.
4. Approve the request.
5. Confirm the request status changes to `Approved`.
6. Verify the book is then issued to the student.

#### Borrowing validation tests
1. Try requesting more books than the allowed limit.
2. Confirm validation prevents over-borrowing.
3. Check that postgraduate students can request up to 5 books, while undergraduates can request up to 3.
4. Confirm the system blocks duplicate active borrow requests for the same book.

#### Return flow
1. View active borrowed books.
2. Mark a book as returned.
3. Confirm the borrow card is released and the book becomes available again.
4. Confirm the record updates in the dashboard.

### 4. Terminal-based verification for feature testing
Use these commands when browser testing is not enough or when validating backend data.

#### Backend health check
```bash
curl http://localhost:5000/api/health
```

#### Frontend production build verification
```bash
cd /Users/aminuayuba/Desktop/Library_MGT/frontend
npm run build
```

#### API endpoint tests after implementation
```bash
cd /Users/aminuayuba/Desktop/Library_MGT/backend
npm test
```

#### Manual API route checks
```bash
curl http://localhost:5000/api/students
curl http://localhost:5000/api/books
curl http://localhost:5000/api/requests
curl -X PATCH http://localhost:5000/api/requests/1/approve
```

Expected result:
- Successful JSON responses for each endpoint after implementation.
- The approval request returns the updated request status as `approved`.

### 5. Exact commands for Week 3 implementation validation
Run the following commands to verify the Week 3 work:

```bash
cd /Users/aminuayuba/Desktop/Library_MGT/backend
npm test
```

Then in the frontend terminal:

```bash
cd /Users/aminuayuba/Desktop/Library_MGT/frontend
npm run build
```

Expected result:
- The backend test suite passes.
- The frontend build completes successfully.
- The request/approval logic is validated by the automated backend tests.

### 6. Final verification checklist before moving to the next milestone
Before marking a feature complete, confirm all of the following:

- The backend server is still running.
- The frontend server is still running.
- The page loads correctly in the browser.
- The required user action succeeds in the UI.
- The request/approval/update reflects in the database or API response.
- The action is validated by terminal command when needed.
- No console error appears in the browser.

---

## Week 3: Request and Approval Workflow

### Objective
Implement the student request flow and librarian approval flow required by the project system design.

### Browser-first verification
1. Open the frontend in the browser using the development URL.
2. Enter a student ID and book ID in the request form.
3. Submit the book request.
4. Confirm the request appears in the pending requests list.
5. Click the Approve button for that request.
6. Confirm the status changes from `pending` to `approved`.
7. Ensure the page does not show errors and the action is reflected clearly in the UI.

### Terminal verification
```bash
cd /Users/aminuayuba/Desktop/Library_MGT/backend
npm test
```

Expected result:
- All backend tests pass.
- The request approval flow is validated in the test suite.

### Exact request/approval API check
```bash
curl http://localhost:5000/api/health
curl http://localhost:5000/api/requests
curl -X POST http://localhost:5000/api/requests \
  -H "Content-Type: application/json" \
  -d '{"studentId":"STD-002","bookId":"BK-002"}'
curl -X PATCH http://localhost:5000/api/requests/1/approve
```

Expected result:
- Health check returns `status: "ok"`.
- Request creation returns a new pending request.
- Approval updates the request status to `approved`.

### Week 3 completion status
- Student request creation: completed
- Librarian approval action: completed
- API validation: completed
- Frontend build validation: completed

---

## Verification Notes

This file should be updated each time a week is marked achieved. The goal is to keep a clear record of how the project was validated using either a browser or a terminal command so that the final documentation and project presentation remain consistent and evidence-based.
