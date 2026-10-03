import { GameScene } from './scene/GameScene';
import { DebugPanel } from './ui/DebugPanel';
import { Hud } from './ui/Hud';
import { OutBanner } from './ui/OutBanner';
import { useControls } from './ui/useControls';

export function App() {
  useControls();
  return (
    <div className="app">
      <GameScene />
      <Hud />
      <OutBanner />
      <DebugPanel />
    </div>
  );
}
