export type Language = 'zh' | 'en';

export type GamePhase = 
  | 'IDLE'           // Start screen / title
  | 'PLAYING'        // Active defense
  | 'PAUSED'         // Paused
  | 'ROUND_TRANSITION' // Tallying ammo bonus & preparing next wave
  | 'VICTORY'        // Reached 1000 points
  | 'GAME_OVER';     // All 3 batteries destroyed

export interface Position {
  x: number;
  y: number;
}

export interface Battery {
  id: number;
  nameKey: string;
  x: number;
  y: number;
  maxAmmo: number;
  ammo: number;
  isAlive: boolean;
  angle: number; // barrel angle in radians
  recoil: number; // visual recoil kick
}

export interface City {
  id: number;
  x: number;
  y: number;
  width: number;
  height: number;
  isAlive: boolean;
  smokeTimer: number;
}

export interface InterceptorMissile {
  id: string;
  startX: number;
  startY: number;
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  speed: number;
  progress: number; // 0 to 1
  exploded: boolean;
  sourceBatteryId: number;
}

export interface EnemyRocket {
  id: string;
  startX: number;
  startY: number;
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  speed: number;
  targetType: 'city' | 'battery';
  targetIndex: number;
  progress: number;
  canSplit?: boolean;
  splitAtProgress?: number;
  hasSplit?: boolean;
}

export interface BlastExplosion {
  id: string;
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  growthRate: number;
  fadeRate: number;
  state: 'expanding' | 'shrinking' | 'done';
  color: string;
  isPlayerBlast: boolean;
}

export interface Particle {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
}

export interface CrosshairMarker {
  id: string;
  x: number;
  y: number;
  alpha: number;
  batteryId: number;
}

export interface FloatingText {
  id: string;
  x: number;
  y: number;
  text: string;
  color: string;
  alpha: number;
  vy: number;
}

export interface GameStats {
  score: number;
  targetScore: number; // 1000
  round: number;
  rocketsDestroyed: number;
  missilesFired: number;
  citiesLost: number;
  highestChain: number;
  firepower: number; // current bullets per volley = max(1, 1 + floor(kills/10) - citiesLost)
}
