import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import App from './App'
import './index.css'
import './dashboard1.css'
import './equiparacion.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            fontFamily: "'DM Sans', sans-serif",
            fontSize: '14px',
            background: '#0f0e0d',
            color: '#faf8f4',
            borderRadius: '8px',
            padding: '12px 16px',
          },
          success: { iconTheme: { primary: '#2a7a4b', secondary: '#faf8f4' } },
          error:   { iconTheme: { primary: '#b83232', secondary: '#faf8f4' } },
        }}
      />
    </BrowserRouter>
  </React.StrictMode>
)
