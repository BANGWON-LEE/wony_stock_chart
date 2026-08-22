import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@chart/tokens/css'
import './index.css'
import App from './App.tsx'
import { Analytics } from '@vercel/analytics/next'
console.error('[chart-debug] main.tsx loaded')

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Analytics />
    <App />
  </StrictMode>,
)
