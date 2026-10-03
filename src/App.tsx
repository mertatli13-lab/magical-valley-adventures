import { GameScene } from './scene/GameScene';
import { Title } from './ui/Title';

export function App() {
  return (
    <div className="app">
      <GameScene />
      <Title />
    </div>
  );
}
