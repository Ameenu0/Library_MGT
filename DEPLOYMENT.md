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
   - CORS_ORIGIN=https://your-vercel-app-url
4. Deploy the service.

## Notes
- For production, prefer PostgreSQL over SQLite.
- SQLite is acceptable for a small school project demo but is less robust for public multi-user deployment.
- The app currently expects the frontend to use the deployed backend URL instead of localhost.
