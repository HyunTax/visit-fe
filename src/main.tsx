import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import ReservePage from './ReservePage'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ReservePage />
  </StrictMode>,
)
