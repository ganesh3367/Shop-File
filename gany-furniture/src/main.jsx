import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { MotionConfig } from 'framer-motion';
import App from './App';
import { StoreProvider } from './context/StoreContext';
import { CatalogProvider } from './context/CatalogContext';
import './styles/base.css';
import './styles/components.css';
import './styles/pages.css';
import './styles/features.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <CatalogProvider>
        <StoreProvider>
          <MotionConfig reducedMotion="user">
            <App />
          </MotionConfig>
        </StoreProvider>
      </CatalogProvider>
    </BrowserRouter>
  </React.StrictMode>,
);
