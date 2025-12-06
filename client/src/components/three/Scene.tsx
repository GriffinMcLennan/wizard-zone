import { useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Sky } from '@react-three/drei';
import * as THREE from 'three';
import { useGameStore } from '../../stores/gameStore';
import { useFirstPersonControls } from '../../hooks/useFirstPersonControls';
import { InputController } from './InputController';
import { Arena } from './Arena';
import { Projectiles } from './Projectiles';
import { PHYSICS } from '@wizard-zone/shared';

export function Scene() {
  const connectionState = useGameStore((s) => s.connectionState);
  const remotePlayers = useGameStore((s) => s.remotePlayers);
  const isSpectating = useGameStore((s) => s.isSpectating);

  return (
    <>
      {/* Camera controller and input handling */}
      {connectionState === 'connected' && (
        <>
          {isSpectating ? <SpectatorCamera /> : <FirstPersonCamera />}
          {!isSpectating && <InputController />}
        </>
      )}

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

      {/* Projectiles */}
      <Projectiles />

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

function SpectatorCamera() {
  const { camera } = useThree();
  const spectateTargetId = useGameStore((s) => s.spectateTargetId);
  const remotePlayers = useGameStore((s) => s.remotePlayers);
  const angleRef = useRef(0);

  // Spectator camera orbits around the target player
  useFrame((_, delta) => {
    const target = spectateTargetId ? remotePlayers.get(spectateTargetId) : null;

    if (target) {
      // Slowly orbit around the target
      angleRef.current += delta * 0.3;

      const distance = 8;
      const height = 4;

      camera.position.set(
        target.position.x + Math.sin(angleRef.current) * distance,
        target.position.y + height,
        target.position.z + Math.cos(angleRef.current) * distance
      );

      camera.lookAt(
        target.position.x,
        target.position.y + 1,
        target.position.z
      );
    } else {
      // No target - look at arena center from above
      camera.position.set(0, 30, 30);
      camera.lookAt(0, 0, 0);
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
