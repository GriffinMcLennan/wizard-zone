// Arena configuration
const ARENA_SIZE = 60;
const GROUND_COLOR = '#2d4a3e';
const PLATFORM_COLOR = '#4a5568';
const WALL_COLOR = '#3d4555';

interface PlatformProps {
  position: [number, number, number];
  size: [number, number, number];
  color?: string;
}

function Platform({ position, size, color = PLATFORM_COLOR }: PlatformProps) {
  return (
    <mesh position={position} castShadow receiveShadow>
      <boxGeometry args={size} />
      <meshStandardMaterial color={color} />
    </mesh>
  );
}

interface PillarProps {
  position: [number, number, number];
  height: number;
  radius?: number;
}

function Pillar({ position, height, radius = 1 }: PillarProps) {
  return (
    <mesh position={[position[0], height / 2, position[2]]} castShadow receiveShadow>
      <cylinderGeometry args={[radius, radius, height, 8]} />
      <meshStandardMaterial color={WALL_COLOR} />
    </mesh>
  );
}

export function Arena() {
  return (
    <group>
      {/* Main ground plane */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <planeGeometry args={[ARENA_SIZE, ARENA_SIZE]} />
        <meshStandardMaterial color={GROUND_COLOR} />
      </mesh>

      {/* Grid overlay */}
      <gridHelper args={[ARENA_SIZE, 30, '#3a5a4a', '#2a4a3a']} position={[0, 0.01, 0]} />

      {/* Arena boundary walls */}
      <Platform position={[0, 7.5, -ARENA_SIZE / 2]} size={[ARENA_SIZE, 15, 1]} color={WALL_COLOR} />
      <Platform position={[0, 7.5, ARENA_SIZE / 2]} size={[ARENA_SIZE, 15, 1]} color={WALL_COLOR} />
      <Platform position={[-ARENA_SIZE / 2, 7.5, 0]} size={[1, 15, ARENA_SIZE]} color={WALL_COLOR} />
      <Platform position={[ARENA_SIZE / 2, 7.5, 0]} size={[1, 15, ARENA_SIZE]} color={WALL_COLOR} />

      {/* Central elevated platform */}
      <Platform position={[0, 2, 0]} size={[12, 0.5, 12]} />

      {/* Corner platforms - lower level */}
      <Platform position={[-20, 1.5, -20]} size={[8, 0.5, 8]} />
      <Platform position={[20, 1.5, -20]} size={[8, 0.5, 8]} />
      <Platform position={[-20, 1.5, 20]} size={[8, 0.5, 8]} />
      <Platform position={[20, 1.5, 20]} size={[8, 0.5, 8]} />

      {/* Corner platforms - upper level */}
      <Platform position={[-20, 4, -20]} size={[5, 0.5, 5]} />
      <Platform position={[20, 4, -20]} size={[5, 0.5, 5]} />
      <Platform position={[-20, 4, 20]} size={[5, 0.5, 5]} />
      <Platform position={[20, 4, 20]} size={[5, 0.5, 5]} />

      {/* Side platforms */}
      <Platform position={[-20, 2.5, 0]} size={[6, 0.5, 10]} />
      <Platform position={[20, 2.5, 0]} size={[6, 0.5, 10]} />
      <Platform position={[0, 2.5, -20]} size={[10, 0.5, 6]} />
      <Platform position={[0, 2.5, 20]} size={[10, 0.5, 6]} />

      {/* Floating platforms - high level */}
      <Platform position={[-10, 5, -10]} size={[4, 0.5, 4]} />
      <Platform position={[10, 5, -10]} size={[4, 0.5, 4]} />
      <Platform position={[-10, 5, 10]} size={[4, 0.5, 4]} />
      <Platform position={[10, 5, 10]} size={[4, 0.5, 4]} />

      {/* Central tower platform */}
      <Platform position={[0, 6, 0]} size={[6, 0.5, 6]} />

      {/* Decorative pillars */}
      <Pillar position={[-6, 0, -6]} height={6} radius={0.5} />
      <Pillar position={[6, 0, -6]} height={6} radius={0.5} />
      <Pillar position={[-6, 0, 6]} height={6} radius={0.5} />
      <Pillar position={[6, 0, 6]} height={6} radius={0.5} />

      {/* Cover obstacles in open areas */}
      <Platform position={[-12, 0.75, 0]} size={[2, 1.5, 4]} />
      <Platform position={[12, 0.75, 0]} size={[2, 1.5, 4]} />
      <Platform position={[0, 0.75, -12]} size={[4, 1.5, 2]} />
      <Platform position={[0, 0.75, 12]} size={[4, 1.5, 2]} />
    </group>
  );
}
