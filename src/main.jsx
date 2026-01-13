import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App' // 🟢 FIX: Removed .jsx extension to let bundler resolve it
import './index.css'

// 🟢 PWA AUTOMATION
// If this still fails, ensure you ran: npm install vite-plugin-pwa
import { registerSW } from 'virtual:pwa-register'

const updateSW = registerSW({
  onNeedRefresh() {
    if(confirm("New content available. Reload?")) {
      updateSW(true);
    }
  },
  onOfflineReady() {
    console.log("App ready to work offline");
  },
})

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)