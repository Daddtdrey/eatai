import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'

// 🟢 PWA REGISTRATION (Critical for Install & Notifications)
import { registerSW } from 'virtual:pwa-register'

const updateSW = registerSW({
  onNeedRefresh() {
    // If a new version is deployed, we ask the user (or just auto-reload)
    console.log("New content available, preparing to update...");
    if (confirm("New update available for EatAi! Click OK to refresh.")) {
      updateSW(true);
    }
  },
  onOfflineReady() {
    console.log("EatAi is ready to work offline 🚀");
  },
})

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)