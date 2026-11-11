// =====================================================================
//  main.jsx  -  FRONTEND ENTRY POINT
// =====================================================================
//  The browser loads index.html, which contains an empty <div id="root">.
//  This file starts React and draws the <App /> component into that div.
//  Everything else (pages, menus, forms) is inside App.jsx.

// React's StrictMode wrapper: it adds extra development-time warnings (it has no effect on the final website).
import { StrictMode } from 'react'
// createRoot connects React to a real element on the page.
import { createRoot } from 'react-dom/client'
// Global styles that apply to the whole app.
import './index.css'
// The main component that contains all pages (see App.jsx).
import App from './App.jsx'

// Find <div id="root"> in index.html and render the whole app inside it.
createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)