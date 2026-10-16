import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';

const rootElement = document.getElementById('root')!;
const renderApp = () => createRoot(rootElement).render(
  <StrictMode><App /></StrictMode>,
);

if (window.__dtsOfficeReady) {
  rootElement.textContent = 'Conectando con Outlook…';
  void window.__dtsOfficeReady.then(renderApp, () => {
    rootElement.textContent = 'No se pudo iniciar la conexión con Outlook. Comprueba que el navegador permite cargar Office.js de Microsoft y vuelve a intentarlo.';
    const retry = document.createElement('button');
    retry.textContent = 'Reintentar';
    retry.onclick = () => window.location.reload();
    rootElement.appendChild(retry);
  });
} else {
  renderApp();
}
