import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@chart/tokens/css'
import './index.css'
import App from './App.tsx'
console.error('[chart-debug] main.tsx loaded')

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
