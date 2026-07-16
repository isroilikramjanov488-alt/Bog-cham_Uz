import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Redirect API and WebSocket calls to the Render backend when deployed to Vercel or other production hosts.
if (
  typeof window !== 'undefined' &&
  window.location.hostname !== 'localhost' &&
  window.location.hostname !== '127.0.0.1' &&
  !window.location.hostname.includes('ais-dev') &&
  !window.location.hostname.includes('ais-pre')
) {
  const BACKEND_HOST = 'bog-cham-uz.onrender.com';
  const BACKEND_URL = `https://${BACKEND_HOST}`;

  // 1. Intercept API Fetch requests
  const originalFetch = window.fetch;
  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    let url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
    
    const origin = window.location.origin;
    let isApiCall = false;
    let relativePath = '';

    if (url.startsWith('/api')) {
      isApiCall = true;
      relativePath = url;
    } else if (url.startsWith(`${origin}/api`)) {
      isApiCall = true;
      relativePath = url.substring(origin.length);
    } else if (url.startsWith('api/') || url.startsWith('./api/')) {
      isApiCall = true;
      relativePath = '/' + url.replace(/^\.?\/?/, '');
    }

    if (isApiCall) {
      const targetUrl = `${BACKEND_URL}${relativePath}`;
      if (typeof input === 'string') {
        return originalFetch(targetUrl, init);
      } else if (input instanceof URL) {
        return originalFetch(new URL(targetUrl), init);
      } else {
        const newRequest = new Request(targetUrl, input);
        return originalFetch(newRequest, init);
      }
    }
    return originalFetch(input, init);
  };

  // 2. Intercept WebSocket connections
  const OriginalWebSocket = window.WebSocket;
  // @ts-ignore
  window.WebSocket = function (url: string | URL, protocols?: string | string[]) {
    let targetUrl = typeof url === 'string' ? url : url.toString();
    if (targetUrl.includes(window.location.host)) {
      targetUrl = targetUrl.replace(window.location.host, BACKEND_HOST);
      if (targetUrl.startsWith('ws://')) {
        targetUrl = targetUrl.replace('ws://', 'wss://');
      }
    }
    return new OriginalWebSocket(targetUrl, protocols);
  };
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
