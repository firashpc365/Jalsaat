import React from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './src/App';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// After the app has mounted, find the loader and fade it out.
const loader = document.getElementById('app-loader');
if (loader) {
  loader.classList.add('fade-out');
  // Remove the loader from the DOM after the transition is complete
  loader.addEventListener('transitionend', () => {
    loader.remove();
  });
}