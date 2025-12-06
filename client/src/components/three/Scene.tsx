import { useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Sky } from '@react-three/drei';
import * as THREE from 'three';
import { useGameStore } from '../../stores/gameStore';
import { useFirstPersonControls } from '../../hooks/useFirstPersonControls';
import { InputController } from './InputController';
import { Arena } from './Arena';
import { Projectiles } from './Projectiles';
import { NovaBlastEffect } from './NovaBlastEffect';
import { ArcaneRayEffect } from './ArcaneRayEffect';
import { PHYSICS } from '@wizard-zone/shared';

export function Scene() {
  const connectionState = useGameStore((s) => s.connectionState);
  const remotePlayers = useGameStore((s) => s.remotePlayers);
  const isSpectating = useGameStore((s) => s.isSpectating);
  const novaBlasts = useGameStore((s) => s.novaBlasts);
  const arcaneRays = useGameStore((s) => s.arcaneRays);
  const removeNovaBlast = useGameStore((s) => s.removeNovaBlast);
  const removeArcaneRay = useGameStore((s) => s.removeArcaneRay);

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

      {/* Nova Blast Effects */}
      {novaBlasts.map((effect) => (
        <NovaBlastEffect
          key={effect.id}
          position={effect.position}
          radius={effect.radius}
          onComplete={() => removeNovaBlast(effect.id)}
        />
      ))}

      {/* Arcane Ray Effects */}
      {arcaneRays.map((effect) => (
        <ArcaneRayEffect
          key={effect.id}
          origin={effect.origin}
          endpoint={effect.endpoint}
          onComplete={() => removeArcaneRay(effect.id)}
        />
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
    health?: number;
    maxHealth?: number;
  };
}

function RemotePlayerMesh({ player }: RemotePlayerMeshProps) {
  const meshRef = useRef<THREE.Group>(null);
  const robeRef = useRef<THREE.Mesh>(null);
  const orbRef = useRef<THREE.Mesh>(null);

  useFrame((_, delta) => {
    if (meshRef.current) {
      meshRef.current.position.set(
        player.position.x,
        player.position.y,
        player.position.z
      );
      meshRef.current.rotation.y = player.yaw;
    }

    // Floating orb animation
    if (orbRef.current) {
      orbRef.current.position.y = 1.6 + Math.sin(Date.now() * 0.003) * 0.1;
      orbRef.current.rotation.y += delta * 2;
    }

    // Subtle robe sway
    if (robeRef.current) {
      robeRef.current.rotation.z = Math.sin(Date.now() * 0.002) * 0.03;
    }
  });

  if (!player.isAlive) return null;

  const healthPercent = (player.health ?? 100) / (player.maxHealth ?? 100);

  return (
    <group ref={meshRef}>
      {/* Robe/Body */}
      <mesh ref={robeRef} castShadow position={[0, 0.8, 0]}>
        <cylinderGeometry args={[0.25, 0.45, 1.4, 8]} />
        <meshStandardMaterial
          color="#4c1d95"
          emissive="#2d1b69"
          emissiveIntensity={0.2}
        />
      </mesh>

      {/* Robe bottom flare */}
      <mesh castShadow position={[0, 0.15, 0]}>
        <cylinderGeometry args={[0.45, 0.5, 0.3, 8]} />
        <meshStandardMaterial color="#3b0764" />
      </mesh>

      {/* Head */}
      <mesh castShadow position={[0, 1.55, 0]}>
        <sphereGeometry args={[0.22, 16, 16]} />
        <meshStandardMaterial color="#f5d0c5" />
      </mesh>

      {/* Wizard hat - brim */}
      <mesh castShadow position={[0, 1.7, 0]}>
        <cylinderGeometry args={[0.4, 0.4, 0.08, 16]} />
        <meshStandardMaterial color="#1e1b4b" />
      </mesh>

      {/* Wizard hat - cone */}
      <mesh castShadow position={[0, 2.1, 0]}>
        <coneGeometry args={[0.3, 0.8, 8]} />
        <meshStandardMaterial
          color="#312e81"
          emissive="#4c1d95"
          emissiveIntensity={0.3}
        />
      </mesh>

      {/* Hat star decoration */}
      <mesh position={[0, 2.0, 0.31]}>
        <octahedronGeometry args={[0.08, 0]} />
        <meshStandardMaterial
          color="#fbbf24"
          emissive="#f59e0b"
          emissiveIntensity={1}
        />
      </mesh>

      {/* Floating magic orb */}
      <group position={[0.5, 1.2, 0.3]}>
        <mesh ref={orbRef}>
          <sphereGeometry args={[0.12, 16, 16]} />
          <meshStandardMaterial
            color="#a78bfa"
            emissive="#7c3aed"
            emissiveIntensity={2}
            transparent
            opacity={0.9}
          />
        </mesh>
        <pointLight color="#8b5cf6" intensity={0.5} distance={2} />
      </group>

      {/* Health bar background */}
      <mesh position={[0, 2.4, 0]}>
        <planeGeometry args={[0.8, 0.1]} />
        <meshBasicMaterial color="#1f2937" transparent opacity={0.8} />
      </mesh>

      {/* Health bar fill */}
      <mesh position={[-0.4 * (1 - healthPercent), 2.4, 0.01]}>
        <planeGeometry args={[0.8 * healthPercent, 0.08]} />
        <meshBasicMaterial
          color={healthPercent > 0.5 ? '#22c55e' : healthPercent > 0.25 ? '#eab308' : '#ef4444'}
        />
      </mesh>

      {/* Subtle glow under wizard */}
      <pointLight
        position={[0, 0.5, 0]}
        color="#8b5cf6"
        intensity={0.3}
        distance={3}
      />
    </group>
  );
}
