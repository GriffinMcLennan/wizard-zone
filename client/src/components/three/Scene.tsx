import { useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Sky } from '@react-three/drei';
import * as THREE from 'three';
import { useGameStore } from '../../stores/gameStore';
import { useFirstPersonControls } from '../../hooks/useFirstPersonControls';
import { Arena } from './Arena';
import { PHYSICS } from '@wizard-zone/shared';

export function Scene() {
  const connectionState = useGameStore((s) => s.connectionState);
  const remotePlayers = useGameStore((s) => s.remotePlayers);

  return (
    <>
      {/* First-person camera controller */}
      {connectionState === 'connected' && <FirstPersonCamera />}

      {/* Lighting */}
      <ambientLight intensity={0.5} />
      <directionalLight
        position={[50, 100, 50]}
        intensity={1.5}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-far={200}
        shadow-camera-left={-50}
        shadow-camera-right={50}
        shadow-camera-top={50}
        shadow-camera-bottom={-50}
      />
      <hemisphereLight args={['#87CEEB', '#2d4a3e', 0.3]} />

      {/* Arena with platforms */}
      <Arena />

      {/* Remote players */}
      {Array.from(remotePlayers.values()).map((player) => (
        <RemotePlayerMesh key={player.id} player={player} />
      ))}

      {/* Sky */}
      <Sky
        distance={450000}
        sunPosition={[100, 50, 100]}
        inclination={0.5}
        azimuth={0.25}
        rayleigh={0.5}
      />

      {/* Fog for atmosphere */}
      <fog attach="fog" args={['#1a1a2e', 30, 100]} />
    </>
  );
}

function FirstPersonCamera() {
  const { camera } = useThree();
  const localPlayer = useGameStore((s) => s.localPlayer);
  useFirstPersonControls();

  // Update camera position to match local player
  useFrame(() => {
    if (localPlayer) {
      camera.position.set(
        localPlayer.position.x,
        localPlayer.position.y + PHYSICS.PLAYER_HEIGHT / 2,
        localPlayer.position.z
      );
    }
  });

  return null;
}

interface RemotePlayerMeshProps {
  player: {
    id: string;
    name: string;
    position: { x: number; y: number; z: number };
    yaw: number;
    isAlive: boolean;
  };
}

function RemotePlayerMesh({ player }: RemotePlayerMeshProps) {
  const meshRef = useRef<THREE.Group>(null);

  useFrame(() => {
    if (meshRef.current) {
      meshRef.current.position.set(
        player.position.x,
        player.position.y,
        player.position.z
      );
      meshRef.current.rotation.y = player.yaw;
    }
  });

  if (!player.isAlive) return null;

  return (
    <group ref={meshRef}>
      {/* Body */}
      <mesh castShadow position={[0, 0.9, 0]}>
        <capsuleGeometry args={[0.4, 1.0, 4, 8]} />
        <meshStandardMaterial color="#6644ff" />
      </mesh>

      {/* Wizard hat */}
      <mesh castShadow position={[0, 1.8, 0]}>
        <coneGeometry args={[0.35, 0.6, 8]} />
        <meshStandardMaterial color="#4422aa" />
      </mesh>

      {/* Name tag */}
      <sprite position={[0, 2.3, 0]} scale={[2, 0.5, 1]}>
        <spriteMaterial color="#ffffff" opacity={0.8} transparent />
      </sprite>
    </group>
  );
}
