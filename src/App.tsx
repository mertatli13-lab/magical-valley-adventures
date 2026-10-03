import { lazy, Suspense } from 'react';
import { GameScene } from './scene/GameScene';
import { useGameStore } from './store/gameStore';
import { DebugPanel } from './ui/DebugPanel';
import { Hud } from './ui/Hud';
import { Landing } from './ui/screens/Landing';
import { Out } from './ui/screens/Out';
import { Pause } from './ui/screens/Pause';
import { Results } from './ui/screens/Results';
import { Select } from './ui/screens/Select';
import { useControls } from './ui/useControls';

// The shop is only needed after a run or from a locked character, so it loads on first use.
const Shop = lazy(() => import('./ui/screens/Shop').then((module) => ({ default: module.Shop })));

/** Renders (and so downloads) the shop only when it is open. */
function ShopGate() {
  const open = useGameStore((state) => (state.version, state.session.screen === 'SHOP'));
  if (!open) return null;
  return (
    <Suspense fallback={null}>
      <Shop />
    </Suspense>
  );
}

export function App() {
  useControls();
  return (
    <div className="app">
      <GameScene />
      <Hud />
      <Select />
      <Pause />
      <Out />
      <Results />
      <ShopGate />
      <Landing />
      {/* Development only: production builds leave the debug panel out. */}
      {import.meta.env.DEV && <DebugPanel />}
    </div>
  );
}
