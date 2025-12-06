export interface MovementInput {
  forward: boolean;
  backward: boolean;
  left: boolean;
  right: boolean;
}

export interface LookInput {
  yaw: number;
  pitch: number;
}

export interface ActionInput {
  jump: boolean;
  dash: boolean;
  launchJump: boolean;
  primaryFire: boolean;
}

export interface InputState {
  sequenceNumber: number;
  timestamp: number;
  movement: MovementInput;
  look: LookInput;
  actions: ActionInput;
}
