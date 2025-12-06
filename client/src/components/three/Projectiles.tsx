import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useGameStore } from '../../stores/gameStore';
import { ProjectileState } from '@wizard-zone/shared';

export function Projectiles() {
  const projectiles = useGameStore((s) => s.projectiles);

  return (
    <>
      {projectiles.map((projectile) => (
        <Projectile key={projectile.id} projectile={projectile} />
      ))}
    </>
  );
}

interface ProjectileProps {
  projectile: ProjectileState;
}

function Projectile({ projectile }: ProjectileProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const glowRef = useRef<THREE.PointLight>(null);

  useFrame(() => {
    if (meshRef.current) {
      meshRef.current.position.set(
        projectile.position.x,
        projectile.position.y,
        projectile.position.z
      );

      // Rotate the projectile for visual effect
      meshRef.current.rotation.x += 0.1;
      meshRef.current.rotation.y += 0.15;
    }

    if (glowRef.current) {
      glowRef.current.position.set(
        projectile.position.x,
        projectile.position.y,
        projectile.position.z
      );
    }
  });

  return (
    <group>
      {/* Main projectile mesh */}
      <mesh ref={meshRef} castShadow>
        <icosahedronGeometry args={[0.25, 1]} />
        <meshStandardMaterial
          color="#ff6600"
          emissive="#ff3300"
          emissiveIntensity={2}
        />
      </mesh>

      {/* Point light for glow effect */}
      <pointLight
        ref={glowRef}
        color="#ff4400"
        intensity={2}
        distance={5}
        decay={2}
      />
    </group>
  );
}
