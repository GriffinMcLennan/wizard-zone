import { useRef, useState, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface NovaBlastEffectProps {
  position: { x: number; y: number; z: number };
  radius: number;
  onComplete: () => void;
}

export function NovaBlastEffect({ position, radius, onComplete }: NovaBlastEffectProps) {
  const groupRef = useRef<THREE.Group>(null);
  const [progress, setProgress] = useState(0);
  const completedRef = useRef(false);
  const duration = 0.5; // seconds

  useFrame((_, delta) => {
    if (completedRef.current) return;

    setProgress(p => {
      const newProgress = p + delta / duration;
      if (newProgress >= 1) {
        completedRef.current = true;
        return 1;
      }
      return newProgress;
    });
  });

  // Call onComplete outside of render cycle
  useEffect(() => {
    if (completedRef.current && progress >= 1) {
      onComplete();
    }
  }, [progress, onComplete]);

  // Expanding radius with easing
  const easeOutQuart = (t: number) => 1 - Math.pow(1 - t, 4);
  const currentRadius = radius * easeOutQuart(progress);

  // Fade out opacity
  const opacity = 1 - Math.pow(progress, 2);

  // Rotation for visual interest
  const rotation = progress * Math.PI * 2;

  return (
    <group ref={groupRef} position={[position.x, position.y + 0.5, position.z]}>
      {/* Inner bright core - expands and fades */}
      <mesh rotation={[0, rotation, 0]}>
        <icosahedronGeometry args={[currentRadius * 0.3, 2]} />
        <meshStandardMaterial
          color="#ffffff"
          emissive="#ffaa00"
          emissiveIntensity={4 * opacity}
          transparent
          opacity={opacity * 0.9}
        />
      </mesh>

      {/* Middle orange ring */}
      <mesh rotation={[Math.PI / 2, rotation * 0.5, 0]}>
        <torusGeometry args={[currentRadius * 0.6, 0.15, 8, 32]} />
        <meshStandardMaterial
          color="#ff6600"
          emissive="#ff4400"
          emissiveIntensity={3 * opacity}
          transparent
          opacity={opacity * 0.8}
        />
      </mesh>

      {/* Outer expanding shockwave sphere */}
      <mesh>
        <sphereGeometry args={[currentRadius, 32, 32]} />
        <meshBasicMaterial
          color="#ff4400"
          transparent
          opacity={opacity * 0.25}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Secondary inner sphere for depth */}
      <mesh>
        <sphereGeometry args={[currentRadius * 0.7, 24, 24]} />
        <meshBasicMaterial
          color="#ff8800"
          transparent
          opacity={opacity * 0.15}
          side={THREE.BackSide}
        />
      </mesh>

      {/* Flame particles ring */}
      <mesh rotation={[Math.PI / 2, 0, rotation * 2]}>
        <ringGeometry args={[currentRadius * 0.4, currentRadius * 0.9, 32]} />
        <meshBasicMaterial
          color="#ff6622"
          transparent
          opacity={opacity * 0.4}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Dynamic point light at center */}
      <pointLight
        color="#ff6622"
        intensity={15 * opacity}
        distance={radius * 3}
        decay={2}
      />

      {/* Secondary light for fill */}
      <pointLight
        color="#ffaa44"
        intensity={8 * opacity}
        distance={radius * 2}
        decay={2}
        position={[0, 1, 0]}
      />
    </group>
  );
}
