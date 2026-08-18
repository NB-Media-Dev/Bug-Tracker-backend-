import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { BrowserRouter } from 'react-router-dom'
import { applyThemeOnLoad } from './lib/theme'

// Apply saved theme immediately from localStorage before React renders
// This prevents a flash of the wrong/default theme on page refresh
applyThemeOnLoad();

createRoot(document.getElementById('root')).render(
  <BrowserRouter>
    <App />
  </BrowserRouter>,
)
