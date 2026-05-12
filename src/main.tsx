import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'
import { initNotificationStore } from '@/stores/notificationStore'

// eventBus → toastStore の接続を開始（アプリ寿命と同期）
initNotificationStore()

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
