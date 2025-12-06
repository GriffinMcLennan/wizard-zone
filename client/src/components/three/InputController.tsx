import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useInput } from '../../hooks/useInput';
import { NETWORK } from '@wizard-zone/shared';

export function InputController() {
  const { sendCurrentInput } = useInput();
  const lastSendTime = useRef(0);
  const sendInterval = 1000 / NETWORK.CLIENT_SEND_RATE;

  useFrame(() => {
    const now = performance.now();
    if (now - lastSendTime.current >= sendInterval) {
      sendCurrentInput();
      lastSendTime.current = now;
    }
  });

  return null;
}
