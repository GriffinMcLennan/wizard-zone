import { useRef, useMemo } from 'react';
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
  const groupRef = useRef<THREE.Group>(null);
  const coreRef = useRef<THREE.Mesh>(null);
  const glowRef = useRef<THREE.PointLight>(null);
  const trailRef = useRef<THREE.Points>(null);

  // Create trail particle positions
  const trailCount = 12;
  const trailPositions = useMemo(() => {
    const positions = new Float32Array(trailCount * 3);
    return positions;
  }, []);

  const trailSizes = useMemo(() => {
    const sizes = new Float32Array(trailCount);
    for (let i = 0; i < trailCount; i++) {
      sizes[i] = 0.15 * (1 - i / trailCount);
    }
    return sizes;
  }, []);

  // Keep track of previous positions for trail
  const prevPositions = useRef<{ x: number; y: number; z: number }[]>([]);

  useFrame((_, delta) => {
    if (groupRef.current) {
      groupRef.current.position.set(
        projectile.position.x,
        projectile.position.y,
        projectile.position.z
      );
    }

    if (coreRef.current) {
      // Rotate the core for visual effect
      coreRef.current.rotation.x += delta * 8;
      coreRef.current.rotation.y += delta * 12;

      // Pulsing scale effect
      const pulse = 1 + Math.sin(Date.now() * 0.02) * 0.1;
      coreRef.current.scale.setScalar(pulse);
    }

    // Update trail positions
    if (trailRef.current) {
      // Add current position to history
      prevPositions.current.unshift({
        x: projectile.position.x,
        y: projectile.position.y,
        z: projectile.position.z,
      });

      // Keep only the last trailCount positions
      if (prevPositions.current.length > trailCount) {
        prevPositions.current = prevPositions.current.slice(0, trailCount);
      }

      // Update trail geometry
      const positions = trailRef.current.geometry.attributes.position as THREE.BufferAttribute;
      if (positions) {
        const arr = positions.array as Float32Array;
        for (let i = 0; i < trailCount; i++) {
          const pos = prevPositions.current[i] || projectile.position;
          arr[i * 3] = pos.x;
          arr[i * 3 + 1] = pos.y;
          arr[i * 3 + 2] = pos.z;
        }
        positions.needsUpdate = true;
      }
    }

    if (glowRef.current) {
      // Flickering light intensity
      glowRef.current.intensity = 3 + Math.sin(Date.now() * 0.03) * 0.5;
    }
  });

  return (
    <group ref={groupRef}>
      {/* Inner core - bright hot center */}
      <mesh ref={coreRef} castShadow>
        <icosahedronGeometry args={[0.2, 2]} />
        <meshStandardMaterial
          color="#ffffff"
          emissive="#ffaa00"
          emissiveIntensity={3}
        />
      </mesh>

      {/* Outer flame layer */}
      <mesh>
        <icosahedronGeometry args={[0.3, 1]} />
        <meshStandardMaterial
          color="#ff6600"
          emissive="#ff3300"
          emissiveIntensity={2}
          transparent
          opacity={0.7}
        />
      </mesh>

      {/* Outer glow sphere */}
      <mesh>
        <sphereGeometry args={[0.5, 16, 16]} />
        <meshBasicMaterial
          color="#ff4400"
          transparent
          opacity={0.15}
          side={THREE.BackSide}
        />
      </mesh>

      {/* Point light for dynamic lighting */}
      <pointLight
        ref={glowRef}
        color="#ff6622"
        intensity={3}
        distance={8}
        decay={2}
      />

      {/* Trail particles */}
      <points ref={trailRef}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={trailCount}
            array={trailPositions}
            itemSize={3}
          />
          <bufferAttribute
            attach="attributes-size"
            count={trailCount}
            array={trailSizes}
            itemSize={1}
          />
        </bufferGeometry>
        <pointsMaterial
          color="#ff8844"
          size={0.15}
          transparent
          opacity={0.6}
          sizeAttenuation
          blending={THREE.AdditiveBlending}
        />
      </points>
    </group>
  );
}
