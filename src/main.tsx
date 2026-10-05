import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './styles.css'
import './game-improvements.css'
import './visual-refresh.css'
import './theme.css'
import './game-controls.css'
import './atmosphere.css'
import './brand.css'

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
