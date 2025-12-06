import { useEffect, useRef, useCallback } from 'react';
import { InputState } from '@wizard-zone/shared';
import { useGameStore } from '../stores/gameStore';

interface KeyState {
  forward: boolean;
  backward: boolean;
  left: boolean;
  right: boolean;
  jump: boolean;
  dash: boolean;
  launchJump: boolean;
  primaryFire: boolean;
  novaBlast: boolean;
  arcaneRay: boolean;
}

export function useInput() {
  const sequenceRef = useRef(0);
  const keysRef = useRef<KeyState>({
    forward: false,
    backward: false,
    left: false,
    right: false,
    jump: false,
    dash: false,
    launchJump: false,
    primaryFire: false,
    novaBlast: false,
    arcaneRay: false,
  });

  const sendInput = useGameStore((s) => s.sendInput);
  const addToInputHistory = useGameStore((s) => s.addToInputHistory);
  const getLookYaw = () => useGameStore.getState().lookYaw;
  const getLookPitch = () => useGameStore.getState().lookPitch;

  // Key mappings
  const keyMap: Record<string, keyof KeyState> = {
    KeyW: 'forward',
    ArrowUp: 'forward',
    KeyS: 'backward',
    ArrowDown: 'backward',
    KeyA: 'left',
    ArrowLeft: 'left',
    KeyD: 'right',
    ArrowRight: 'right',
    Space: 'jump',
    ShiftLeft: 'dash',
    ShiftRight: 'dash',
    KeyQ: 'launchJump',
    KeyE: 'novaBlast',
    KeyR: 'arcaneRay',
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const action = keyMap[e.code];
      if (action) {
        keysRef.current[action] = true;
        e.preventDefault();
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const action = keyMap[e.code];
      if (action) {
        keysRef.current[action] = false;
      }
    };

    const handleMouseDown = (e: MouseEvent) => {
      if (e.button === 0) {
        keysRef.current.primaryFire = true;
      }
    };

    const handleMouseUp = (e: MouseEvent) => {
      if (e.button === 0) {
        keysRef.current.primaryFire = false;
      }
    };

    // Prevent context menu on right-click
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('contextmenu', handleContextMenu);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('contextmenu', handleContextMenu);
    };
  }, []);

  const getCurrentInput = useCallback((): InputState => {
    const keys = keysRef.current;

    return {
      sequenceNumber: ++sequenceRef.current,
      timestamp: performance.now(),
      movement: {
        forward: keys.forward,
        backward: keys.backward,
        left: keys.left,
        right: keys.right,
      },
      look: {
        yaw: getLookYaw(),
        pitch: getLookPitch(),
      },
      actions: {
        jump: keys.jump,
        dash: keys.dash,
        launchJump: keys.launchJump,
        primaryFire: keys.primaryFire,
        novaBlast: keys.novaBlast,
        arcaneRay: keys.arcaneRay,
      },
    };
  }, []);

  const sendCurrentInput = useCallback(() => {
    const input = getCurrentInput();
    addToInputHistory(input);
    sendInput(input);
    return input;
  }, [getCurrentInput, sendInput, addToInputHistory]);

  return {
    getCurrentInput,
    sendCurrentInput,
    getKeys: () => keysRef.current,
  };
}
