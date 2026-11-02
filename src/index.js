import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';
import { MIYO_VARS } from './styles/colors';

// ✅ Injection globale des variables CSS Miyo sur <html>
const htmlRoot = document.documentElement;
Object.entries(MIYO_VARS).forEach(([key, value]) => {
  htmlRoot.style.setProperty(key, value);
});

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();

// ✅ Mode hors ligne : garde l'application sur l'appareil pour pouvoir l'ouvrir sans internet.
//    Uniquement sur la version construite (npm run build) servie en http(s).
if (
  process.env.NODE_ENV === 'production' &&
  'serviceWorker' in navigator &&
  /^https?:$/.test(window.location.protocol)
) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register(`${process.env.PUBLIC_URL}/service-worker.js`)
      .catch((err) => console.warn('Service worker non enregistré :', err));
  });
}