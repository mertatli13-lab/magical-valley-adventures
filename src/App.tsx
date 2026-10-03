import { GameScene } from './scene/GameScene';
import { DebugPanel } from './ui/DebugPanel';
import { Hud } from './ui/Hud';
import { Landing } from './ui/screens/Landing';
import { Out } from './ui/screens/Out';
import { Pause } from './ui/screens/Pause';
import { Results } from './ui/screens/Results';
import { Select } from './ui/screens/Select';
import { useControls } from './ui/useControls';

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
      <Landing />
      <DebugPanel />
    </div>
  );
}
