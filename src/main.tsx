import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';
import { LangProvider } from './lib/i18n';
import { AppStoreProvider } from './store/AppStore';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <LangProvider>
      <AppStoreProvider>
        <App />
      </AppStoreProvider>
    </LangProvider>
  </StrictMode>,
);
