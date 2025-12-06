import { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { Scene } from './components/three/Scene';
import { HUD } from './components/ui/HUD';
import { MainMenu } from './components/ui/MainMenu';
import { DeathOverlay } from './components/ui/DeathOverlay';
import { GameOverScreen } from './components/ui/GameOverScreen';
import { WaitingScreen } from './components/ui/WaitingScreen';
import { useGameStore } from './stores/gameStore';

export function App() {
  const connectionState = useGameStore((s) => s.connectionState);
  const gamePhase = useGameStore((s) => s.gamePhase);

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      {connectionState === 'disconnected' && <MainMenu />}

      <Canvas
        camera={{ fov: 90, near: 0.1, far: 1000, position: [0, 2, 5] }}
        gl={{ antialias: true, powerPreference: 'high-performance' }}
        style={{ background: '#1a1a2e' }}
      >
        <Suspense fallback={null}>
          <Scene />
        </Suspense>
      </Canvas>

      {connectionState === 'connected' && (
        <>
          <WaitingScreen />
          {gamePhase === 'playing' && <HUD />}
          <DeathOverlay />
          <GameOverScreen />
        </>
      )}
    </div>
  );
}
