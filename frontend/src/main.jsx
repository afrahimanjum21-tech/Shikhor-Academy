import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import { BrowserRouter } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { NotificationProvider } from './context/NotificationContext'
import { UploadProvider } from './context/UploadContext'
import { ConfirmProvider } from './components/common/ConfirmDialog'
import { Toaster } from 'react-hot-toast'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <NotificationProvider>
          <UploadProvider>
            <ConfirmProvider>
            <App />
            <Toaster
              position="top-right"
              toastOptions={{
                style: {
                  borderRadius: '10px',
                  fontSize: '14px',
                  fontWeight: 500,
                },
                success: {
                  style: { background: '#ECFDF5', color: '#065F46', border: '1px solid #A7F3D0' },
                  iconTheme: { primary: '#10B981', secondary: '#ECFDF5' },
                },
                error: {
                  style: { background: '#FEF2F2', color: '#991B1B', border: '1px solid #FECACA' },
                  iconTheme: { primary: '#EF4444', secondary: '#FEF2F2' },
                },
              }}
            />
          </ConfirmProvider>
          </UploadProvider>
        </NotificationProvider>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>,
)