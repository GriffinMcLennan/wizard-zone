import { useRef, useState, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface ArcaneRayEffectProps {
  origin: { x: number; y: number; z: number };
  endpoint: { x: number; y: number; z: number };
  onComplete: () => void;
}

export function ArcaneRayEffect({ origin, endpoint, onComplete }: ArcaneRayEffectProps) {
  const groupRef = useRef<THREE.Group>(null);
  const [progress, setProgress] = useState(0);
  const completedRef = useRef(false);
  const duration = 0.25; // seconds - quick flash

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

  // Calculate beam geometry
  const { midpoint, length, quaternion } = useMemo(() => {
    const dx = endpoint.x - origin.x;
    const dy = endpoint.y - origin.y;
    const dz = endpoint.z - origin.z;
    const len = Math.sqrt(dx * dx + dy * dy + dz * dz);

    const mid = {
      x: (origin.x + endpoint.x) / 2,
      y: (origin.y + endpoint.y) / 2,
      z: (origin.z + endpoint.z) / 2,
    };

    // Calculate rotation to point beam correctly
    const direction = new THREE.Vector3(dx, dy, dz).normalize();
    const quat = new THREE.Quaternion();
    quat.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction);

    return { midpoint: mid, length: len, quaternion: quat };
  }, [origin, endpoint]);

  // Fade with a quick flash
  const flashPhase = progress < 0.3;
  const opacity = flashPhase
    ? 1
    : 1 - Math.pow((progress - 0.3) / 0.7, 2);

  // Pulsing effect
  const pulseScale = 1 + Math.sin(progress * Math.PI * 4) * 0.2;

  return (
    <group ref={groupRef}>
      {/* Main beam core - bright purple */}
      <mesh position={[midpoint.x, midpoint.y, midpoint.z]} quaternion={quaternion}>
        <cylinderGeometry args={[0.06 * pulseScale, 0.06 * pulseScale, length, 8]} />
        <meshStandardMaterial
          color="#aa66ff"
          emissive="#cc88ff"
          emissiveIntensity={6 * opacity}
          transparent
          opacity={opacity}
        />
      </mesh>

      {/* Inner glow layer */}
      <mesh position={[midpoint.x, midpoint.y, midpoint.z]} quaternion={quaternion}>
        <cylinderGeometry args={[0.12 * pulseScale, 0.12 * pulseScale, length, 8]} />
        <meshBasicMaterial
          color="#8844ff"
          transparent
          opacity={opacity * 0.5}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      {/* Outer glow layer */}
      <mesh position={[midpoint.x, midpoint.y, midpoint.z]} quaternion={quaternion}>
        <cylinderGeometry args={[0.25 * pulseScale, 0.25 * pulseScale, length, 8]} />
        <meshBasicMaterial
          color="#6622cc"
          transparent
          opacity={opacity * 0.25}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      {/* Origin flash sphere */}
      <mesh position={[origin.x, origin.y, origin.z]}>
        <sphereGeometry args={[0.3 * pulseScale, 16, 16]} />
        <meshStandardMaterial
          color="#ffffff"
          emissive="#aa66ff"
          emissiveIntensity={5 * opacity}
          transparent
          opacity={opacity * 0.8}
        />
      </mesh>

      {/* Endpoint impact sphere */}
      <mesh position={[endpoint.x, endpoint.y, endpoint.z]}>
        <sphereGeometry args={[0.4 * pulseScale, 16, 16]} />
        <meshStandardMaterial
          color="#ffffff"
          emissive="#cc88ff"
          emissiveIntensity={6 * opacity}
          transparent
          opacity={opacity * 0.9}
        />
      </mesh>

      {/* Endpoint impact ring */}
      <mesh
        position={[endpoint.x, endpoint.y, endpoint.z]}
        quaternion={quaternion}
        rotation={[Math.PI / 2, 0, 0]}
      >
        <ringGeometry args={[0.2, 0.5 + progress * 0.5, 16]} />
        <meshBasicMaterial
          color="#aa66ff"
          transparent
          opacity={opacity * 0.6}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Origin point light */}
      <pointLight
        position={[origin.x, origin.y, origin.z]}
        color="#aa66ff"
        intensity={8 * opacity}
        distance={5}
        decay={2}
      />

      {/* Endpoint point light - brighter */}
      <pointLight
        position={[endpoint.x, endpoint.y, endpoint.z]}
        color="#cc88ff"
        intensity={12 * opacity}
        distance={6}
        decay={2}
      />

      {/* Midpoint light for beam illumination */}
      <pointLight
        position={[midpoint.x, midpoint.y, midpoint.z]}
        color="#8844ff"
        intensity={5 * opacity}
        distance={4}
        decay={2}
      />
    </group>
  );
}
