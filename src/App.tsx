import { GameScene } from './scene/GameScene';
import { DebugPanel } from './ui/DebugPanel';
import { OutBanner } from './ui/OutBanner';
import { Title } from './ui/Title';
import { useControls } from './ui/useControls';

export function App() {
  useControls();
  return (
    <div className="app">
      <GameScene />
      <Title />
      <OutBanner />
      <DebugPanel />
    </div>
  );
}
