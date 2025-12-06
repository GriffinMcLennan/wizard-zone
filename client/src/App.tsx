import { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { Scene } from './components/three/Scene';
import { HUD } from './components/ui/HUD';
import { MainMenu } from './components/ui/MainMenu';
import { useGameStore } from './stores/gameStore';

export function App() {
  const connectionState = useGameStore((s) => s.connectionState);

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

      {connectionState === 'connected' && <HUD />}
    </div>
  );
}
