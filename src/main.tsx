import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import AppWeb from './AppWeb'
import './index.css'

const isElectron = window.navigator.userAgent.toLowerCase().includes('electron');

const rootElement = document.getElementById('root');
if (rootElement) {
  ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
      {isElectron ? <App /> : <AppWeb />}
    </React.StrictMode>
  );
}
