import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './pages/App';
import './styles/tailwind.css';

const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error('Failed to find root element for plugin UI');
}

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>
);
