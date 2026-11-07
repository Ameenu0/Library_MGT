# Deployment Guide

## Local development

1. Copy the example environment files:
   - backend/.env.example -> backend/.env
   - frontend/.env.example -> frontend/.env
2. Start the backend:
   - cd backend
   - npm install
   - npm start
3. Start the frontend:
   - cd frontend
   - npm install
   - npm run dev -- --host 0.0.0.0

## Production PostgreSQL setup

For a hosted production deployment, configure PostgreSQL and set:
- DATABASE_URL=postgresql://username:password@host:port/database_name
- CORS_ORIGIN=https://your-vercel-app-url

## Public deployment

### Frontend (Vercel)
1. Import the frontend folder into Vercel.
2. Set the environment variable:
   - VITE_API_URL=https://your-render-backend-url/api
3. Deploy the app.

### Backend (Render)
1. Import the backend folder into Render.
2. Set the start command:
   - npm install && npm start
3. Set environment variables:
   - PORT=5000
   - DATABASE_URL=postgresql://username:password@host:port/database_name
   - CORS_ORIGIN=https://your-vercel-app-url
4. Deploy the service.

## Notes
- PostgreSQL is the recommended production database for this system.
- The app now supports PostgreSQL when DATABASE_URL is supplied.
- Local development can still continue without a live PostgreSQL instance when using the fallback behavior.
