import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { useGameStore } from './store/gameStore';
import './styles.css';

// Development only: lets browser tests and the console inspect the run. Removed from production builds.
if (import.meta.env.DEV) (window as unknown as { __gameStore: typeof useGameStore }).__gameStore = useGameStore;

const root = document.getElementById('root');
if (!root) throw new Error('Missing #root element');

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
