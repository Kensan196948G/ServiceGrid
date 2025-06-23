import * as React from 'react';
import { createRoot } from 'react-dom/client';
import AppComplete from './App-complete';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = createRoot(rootElement);
root.render(
  <React.StrictMode>
    <AppComplete />
  </React.StrictMode>
);