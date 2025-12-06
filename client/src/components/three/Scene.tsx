import { useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { useGameStore } from '../../stores/gameStore';

export function Scene() {
  const connectionState = useGameStore((s) => s.connectionState);
  const remotePlayers = useGameStore((s) => s.remotePlayers);

  return (
    <>
      {/* Lighting */}
      <ambientLight intensity={0.4} />
      <directionalLight position={[50, 100, 50]} intensity={1} castShadow />

      {/* Ground plane */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <planeGeometry args={[100, 100]} />
        <meshStandardMaterial color="#2d4a3e" />
      </mesh>

      {/* Grid helper for visual reference */}
      <gridHelper args={[100, 50, '#444', '#333']} position={[0, 0.01, 0]} />

      {/* Remote players */}
      {Array.from(remotePlayers.values()).map((player) => (
        <RemotePlayerMesh key={player.id} player={player} />
      ))}

      {/* Sky */}
      <mesh>
        <sphereGeometry args={[500, 32, 32]} />
        <meshBasicMaterial color="#1a1a2e" side={2} />
      </mesh>
    </>
  );
}

interface RemotePlayerMeshProps {
  player: { id: string; position: { x: number; y: number; z: number }; yaw: number; isAlive: boolean };
}

function RemotePlayerMesh({ player }: RemotePlayerMeshProps) {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame(() => {
    if (meshRef.current) {
      meshRef.current.position.set(player.position.x, player.position.y, player.position.z);
      meshRef.current.rotation.y = player.yaw;
    }
  });

  if (!player.isAlive) return null;

  return (
    <mesh ref={meshRef} castShadow>
      <capsuleGeometry args={[0.4, 1.0, 4, 8]} />
      <meshStandardMaterial color="#4488ff" />
    </mesh>
  );
}
