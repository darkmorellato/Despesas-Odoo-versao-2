import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { ErrorBoundary } from '@/shared/components/ui';
import { initMonitoring } from '@/shared/utils/monitoring';
import '../styles/index.css';

// Monitoramento de erros (opcional — só ativa com VITE_SENTRY_DSN)
void initMonitoring();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary scope="app">
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);
