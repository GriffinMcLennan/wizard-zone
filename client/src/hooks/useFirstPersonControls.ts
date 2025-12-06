import { useEffect, useRef, useCallback } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import { Euler } from 'three';
import { PHYSICS } from '@wizard-zone/shared';

interface FirstPersonControlsState {
  isLocked: boolean;
  yaw: number;
  pitch: number;
}

export function useFirstPersonControls() {
  const { camera, gl } = useThree();
  const stateRef = useRef<FirstPersonControlsState>({
    isLocked: false,
    yaw: 0,
    pitch: 0,
  });

  const euler = useRef(new Euler(0, 0, 0, 'YXZ'));

  // Handle pointer lock
  const requestLock = useCallback(() => {
    gl.domElement.requestPointerLock();
  }, [gl]);

  useEffect(() => {
    const handleLockChange = () => {
      stateRef.current.isLocked = document.pointerLockElement === gl.domElement;
    };

    const handleLockError = () => {
      console.error('Pointer lock error');
    };

    document.addEventListener('pointerlockchange', handleLockChange);
    document.addEventListener('pointerlockerror', handleLockError);

    return () => {
      document.removeEventListener('pointerlockchange', handleLockChange);
      document.removeEventListener('pointerlockerror', handleLockError);
    };
  }, [gl]);

  // Handle mouse movement
  useEffect(() => {
    const handleMouseMove = (event: MouseEvent) => {
      if (!stateRef.current.isLocked) return;

      const sensitivity = 0.002;
      const movementX = event.movementX || 0;
      const movementY = event.movementY || 0;

      stateRef.current.yaw -= movementX * sensitivity;
      stateRef.current.pitch -= movementY * sensitivity;

      // Clamp pitch to prevent flipping
      stateRef.current.pitch = Math.max(
        -PHYSICS.MAX_PITCH,
        Math.min(PHYSICS.MAX_PITCH, stateRef.current.pitch)
      );
    };

    document.addEventListener('mousemove', handleMouseMove);
    return () => document.removeEventListener('mousemove', handleMouseMove);
  }, []);

  // Click to lock
  useEffect(() => {
    const handleClick = () => {
      if (!stateRef.current.isLocked) {
        requestLock();
      }
    };

    gl.domElement.addEventListener('click', handleClick);
    return () => gl.domElement.removeEventListener('click', handleClick);
  }, [gl, requestLock]);

  // Update camera rotation each frame
  useFrame(() => {
    euler.current.set(stateRef.current.pitch, stateRef.current.yaw, 0, 'YXZ');
    camera.quaternion.setFromEuler(euler.current);
  });

  return {
    isLocked: () => stateRef.current.isLocked,
    getYaw: () => stateRef.current.yaw,
    getPitch: () => stateRef.current.pitch,
    requestLock,
  };
}
