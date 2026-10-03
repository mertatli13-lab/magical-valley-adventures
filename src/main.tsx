import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { audio } from './audio/audioEngine';
import { loadAllModels, startupModels } from './scene/assets';
import { useGameStore } from './store/gameStore';
import './styles.css';

// Development only: lets browser tests and the console inspect the run. Removed from production builds.
if (import.meta.env.DEV) {
  Object.assign(window as object, { __gameStore: useGameStore, __audio: audio });
}

void loadAllModels(startupModels(useGameStore.getState().session.save.equipped.accessory));
audio.prefetch(); // sound effects only; nothing plays before the first tap

const root = document.getElementById('root');
if (!root) throw new Error('Missing #root element');

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
