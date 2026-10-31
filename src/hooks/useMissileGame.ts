import { useState, useEffect, useRef, useCallback } from 'react';
import { 
  GamePhase, 
  Battery, 
  City, 
  InterceptorMissile, 
  EnemyRocket, 
  BlastExplosion, 
  Particle, 
  CrosshairMarker, 
  FloatingText,
  GameStats,
  Language
} from '../types/game';
import { sounds } from '../services/audio';

const TARGET_SCORE = 1000;
const SCORE_PER_KILL = 20;
const BONUS_PER_AMMO = 5;
const BONUS_PER_CITY = 30;

export function useMissileGame(lang: Language) {
  const [phase, setPhase] = useState<GamePhase>('IDLE');
  const [score, setScore] = useState<number>(0);
  const [round, setRound] = useState<number>(1);
  const [selectedBattery, setSelectedBattery] = useState<number | null>(null); // null = auto closest
  const [stats, setStats] = useState<GameStats>({
    score: 0,
    targetScore: TARGET_SCORE,
    round: 1,
    rocketsDestroyed: 0,
    missilesFired: 0,
    citiesLost: 0,
    highestChain: 0,
    firepower: 1,
  });

  // Round summary data
  const [roundSummary, setRoundSummary] = useState<{
    round: number;
    surplusAmmo: number;
    ammoBonus: number;
    survivingCities: number;
    cityBonus: number;
    waveScore: number;
    newTotal: number;
  } | null>(null);

  // Canvas ref
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Mutable Game Simulation State (held in ref for 60fps loop)
  const sim = useRef<{
    width: number;
    height: number;
    phase: GamePhase;
    batteries: Battery[];
    cities: City[];
    missiles: InterceptorMissile[];
    rockets: EnemyRocket[];
    explosions: BlastExplosion[];
    particles: Particle[];
    crosshairs: CrosshairMarker[];
    floatingTexts: FloatingText[];
    
    // Wave spawning state
    waveTotalRockets: number;
    rocketsSpawned: number;
    spawnCooldown: number;
    shake: number;
    stars: { x: number; y: number; size: number; alpha: number; twinkleSpeed: number }[];
    mousePos: { x: number; y: number };
    
    // Stats accumulation
    score: number;
    round: number;
    rocketsDestroyed: number;
    missilesFired: number;
    citiesLost: number;
    currentChain: number;
    highestChain: number;
    lastTime: number;
  }>({
    width: 800,
    height: 600,
    phase: 'IDLE',
    batteries: [],
    cities: [],
    missiles: [],
    rockets: [],
    explosions: [],
    particles: [],
    crosshairs: [],
    floatingTexts: [],
    waveTotalRockets: 12,
    rocketsSpawned: 0,
    spawnCooldown: 60,
    shake: 0,
    stars: [],
    mousePos: { x: 400, y: 300 },
    score: 0,
    round: 1,
    rocketsDestroyed: 0,
    missilesFired: 0,
    citiesLost: 0,
    currentChain: 0,
    highestChain: 0,
    lastTime: 0,
  });

  // Initialize stars once
  const initStars = (w: number, h: number) => {
    const stars = [];
    const count = Math.floor((w * h) / 4500);
    for (let i = 0; i < count; i++) {
      stars.push({
        x: Math.random() * w,
        y: Math.random() * (h * 0.78),
        size: Math.random() * 1.6 + 0.4,
        alpha: Math.random() * 0.8 + 0.2,
        twinkleSpeed: Math.random() * 0.03 + 0.01,
      });
    }
    return stars;
  };

  // Setup layout for batteries and cities based on width and height
  const setupLayout = useCallback((w: number, h: number, preserveCities = false) => {
    const s = sim.current;
    s.width = w;
    s.height = h;
    const groundY = h - 45;

    // 4 Batteries: Left Wing (25 ammo), Mid-Left Main (35 ammo), Mid-Right Main (35 ammo), Right Wing (25 ammo)
    const bPos = [w * 0.08, w * 0.36, w * 0.64, w * 0.92];
    const bMaxAmmo = [25, 35, 35, 25];
    const bNames = ['battery1', 'battery2', 'battery3', 'battery4'];

    if (s.batteries.length === 0) {
      s.batteries = bPos.map((x, i) => ({
        id: i,
        nameKey: bNames[i],
        x,
        y: groundY,
        maxAmmo: bMaxAmmo[i],
        ammo: bMaxAmmo[i],
        isAlive: true,
        angle: -Math.PI / 2,
        recoil: 0,
      }));
    } else {
      s.batteries.forEach((b, i) => {
        b.x = bPos[i];
        b.y = groundY;
      });
    }

    // 8 Fairytale Cottages across 3 neighborhoods between batteries
    // Neighborhood 1 (between 0.08 and 0.36): [0.17, 0.27]
    // Neighborhood 2 (between 0.36 and 0.64): [0.43, 0.48, 0.52, 0.57]
    // Neighborhood 3 (between 0.64 and 0.92): [0.73, 0.83]
    const cityXs = [
      w * 0.17, w * 0.27,
      w * 0.43, w * 0.48, w * 0.52, w * 0.57,
      w * 0.73, w * 0.83
    ];
    if (!preserveCities || s.cities.length === 0) {
      s.cities = cityXs.map((x, i) => ({
        id: i,
        x,
        y: groundY + 4,
        width: Math.min(34, w * 0.045),
        height: 28,
        isAlive: true,
        smokeTimer: 0,
      }));
    } else {
      s.cities.forEach((c, i) => {
        c.x = cityXs[i];
        c.y = groundY + 4;
        c.width = Math.min(34, w * 0.045);
      });
    }

    if (s.stars.length === 0) {
      s.stars = initStars(w, h);
    }
  }, []);

  // Start new game completely
  const startNewGame = useCallback(() => {
    const s = sim.current;
    s.score = 0;
    s.round = 1;
    s.rocketsDestroyed = 0;
    s.missilesFired = 0;
    s.citiesLost = 0;
    s.currentChain = 0;
    s.highestChain = 0;
    s.missiles = [];
    s.rockets = [];
    s.explosions = [];
    s.particles = [];
    s.crosshairs = [];
    s.floatingTexts = [];
    s.rocketsSpawned = 0;
    s.waveTotalRockets = 16;
    s.spawnCooldown = 32;
    s.shake = 0;

    // Reset batteries (all 4 batteries restored)
    s.batteries.forEach(b => {
      b.isAlive = true;
      b.ammo = b.maxAmmo;
      b.angle = -Math.PI / 2;
      b.recoil = 0;
    });

    // Reset cities (all 8 cottages restored)
    s.cities.forEach(c => {
      c.isAlive = true;
      c.smokeTimer = 0;
    });

    setScore(0);
    setRound(1);
    setRoundSummary(null);
    setPhase('PLAYING');
    s.phase = 'PLAYING';
    sounds.playClick();
  }, []);

  // Deploy next wave after summary
  const startNextWave = useCallback(() => {
    const s = sim.current;
    s.round += 1;
    s.rocketsSpawned = 0;
    s.waveTotalRockets = Math.min(52, 14 + s.round * 6);
    s.spawnCooldown = 32;
    s.missiles = [];
    s.rockets = [];
    s.explosions = [];
    s.crosshairs = [];

    // Per rules: Batteries are repaired & ammo replenished to full every round!
    s.batteries.forEach(b => {
      b.isAlive = true;
      b.ammo = b.maxAmmo;
      b.recoil = 0;
    });
    // Cities once destroyed do NOT recover (preserved as is)

    setRound(s.round);
    setRoundSummary(null);
    setPhase('PLAYING');
    s.phase = 'PLAYING';
    sounds.playClick();
  }, []);

  // Choose the best battery to shoot
  const findShootingBattery = useCallback((targetX: number, manualIndex: number | null): Battery | null => {
    const s = sim.current;
    if (manualIndex !== null) {
      const b = s.batteries[manualIndex];
      if (b && b.isAlive && b.ammo > 0) return b;
    }

    // Auto find closest operational battery with ammo
    let bestBattery: Battery | null = null;
    let minDistance = Infinity;

    s.batteries.forEach(b => {
      if (b.isAlive && b.ammo > 0) {
        const dist = Math.abs(b.x - targetX);
        if (dist < minDistance) {
          minDistance = dist;
          bestBattery = b;
        }
      }
    });

    return bestBattery;
  }, []);

  // Fire missile towards (targetX, targetY)
  const fireMissile = useCallback((targetX: number, targetY: number) => {
    const s = sim.current;
    if (s.phase !== 'PLAYING') return;

    // Disallow firing directly inside the ground zone
    const maxY = s.height - 40;
    const clampedY = Math.min(targetY, maxY);

    const battery = findShootingBattery(targetX, selectedBattery);
    if (!battery) {
      sounds.playEmpty();
      return;
    }

    // Firepower calculation: +1 bullet every 10 kills, -1 bullet per lost house
    const baseVolley = 1;
    const killBonus = Math.floor(s.rocketsDestroyed / 10);
    const destroyedCities = s.cities.filter(c => !c.isAlive).length;
    const volleyCount = Math.max(1, baseVolley + killBonus - destroyedCities);

    // Number of missiles to actually fire (bounded by battery ammo)
    const shotsToFire = Math.min(battery.ammo, volleyCount);
    battery.ammo -= shotsToFire;
    battery.recoil = 12 + Math.min(8, shotsToFire * 2);

    // Calculate angle for barrel
    const dx = targetX - battery.x;
    const dy = clampedY - (battery.y - 12);
    battery.angle = Math.atan2(dy, dx);

    const baseSpeed = Math.max(9, s.width * 0.015);

    // Launch shotsToFire cute bunny interceptors
    for (let k = 0; k < shotsToFire; k++) {
      let offsetX = 0;
      let offsetY = 0;
      if (shotsToFire > 1) {
        const spread = 28;
        offsetX = (k - (shotsToFire - 1) / 2) * spread;
        offsetY = Math.abs(k - (shotsToFire - 1) / 2) * 6 * (k % 2 === 0 ? -1 : 1);
      }

      const curTargetX = Math.max(20, Math.min(s.width - 20, targetX + offsetX));
      const curTargetY = Math.max(30, Math.min(clampedY, clampedY + offsetY));

      const missile: InterceptorMissile = {
        id: Math.random().toString(36).substring(2, 9),
        startX: battery.x + (shotsToFire > 1 ? (k - (shotsToFire - 1) / 2) * 6 : 0),
        startY: battery.y - 14,
        x: battery.x,
        y: battery.y - 14,
        targetX: curTargetX,
        targetY: curTargetY,
        speed: baseSpeed * (1 + (Math.random() - 0.5) * 0.08),
        progress: 0,
        exploded: false,
        sourceBatteryId: battery.id,
      };

      s.missiles.push(missile);
      s.missilesFired++;

      s.crosshairs.push({
        id: missile.id,
        x: curTargetX,
        y: curTargetY,
        alpha: 1.0,
        batteryId: battery.id,
      });
    }

    sounds.playLaunch(battery.id);
  }, [findShootingBattery, selectedBattery]);

  // Main game update & render loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;

    const handleResize = () => {
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      
      canvas.width = Math.floor(rect.width * dpr);
      canvas.height = Math.floor(rect.height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      setupLayout(rect.width, rect.height, true);
    };

    handleResize();
    window.addEventListener('resize', handleResize);

    // Initial setup
    const rect = canvas.getBoundingClientRect();
    setupLayout(rect.width, rect.height, false);

    // Game loop tick
    const loop = (timestamp: number) => {
      const s = sim.current;
      if (!s.lastTime) s.lastTime = timestamp;
      const dt = Math.min((timestamp - s.lastTime) / 1000, 0.1);
      s.lastTime = timestamp;

      // UPDATE SIMULATION
      if (s.phase === 'PLAYING') {
        // 1. Spawning enemy rockets
        if (s.rocketsSpawned < s.waveTotalRockets) {
          s.spawnCooldown -= 60 * dt;
          if (s.spawnCooldown <= 0) {
            // Determine targets available: living cities & living batteries
            const livingCities = s.cities.filter(c => c.isAlive);
            const livingBatteries = s.batteries.filter(b => b.isAlive);
            
            let targetType: 'city' | 'battery' = 'city';
            let targetIndex = 0;
            let targetX = s.width * 0.5;
            let targetY = s.height - 40;

            const roll = Math.random();
            if (livingBatteries.length > 0 && (livingCities.length === 0 || roll < 0.38)) {
              // Target battery
              const b = livingBatteries[Math.floor(Math.random() * livingBatteries.length)];
              targetType = 'battery';
              targetIndex = b.id;
              targetX = b.x;
              targetY = b.y - 8;
            } else if (livingCities.length > 0) {
              // Target city
              const c = livingCities[Math.floor(Math.random() * livingCities.length)];
              targetType = 'city';
              targetIndex = c.id;
              targetX = c.x;
              targetY = c.y - 8;
            } else if (s.batteries.length > 0) {
              // Target any battery position even if destroyed
              const b = s.batteries[Math.floor(Math.random() * s.batteries.length)];
              targetType = 'battery';
              targetIndex = b.id;
              targetX = b.x;
              targetY = b.y;
            }

            // Spawn rocket from top
            const startX = Math.random() * (s.width - 60) + 30;
            const startY = -15;

            // Speed calculation: accelerated to 1.5x of previous speed per user request ("把敌方炮弹的速度加快到原来的1.5倍")
            const baseSpd = (0.38 + Math.min(s.round * 0.09, 0.95)) * 1.5;
            const speed = baseSpd * (0.9 + Math.random() * 0.28);

            // Splitting rockets logic (MIRVs on round 2+)
            const canSplit = s.round >= 2 && Math.random() < 0.35;

            s.rockets.push({
              id: Math.random().toString(36).substring(2, 9),
              startX,
              startY,
              x: startX,
              y: startY,
              targetX,
              targetY,
              speed,
              targetType,
              targetIndex,
              progress: 0,
              canSplit,
              splitAtProgress: 0.35 + Math.random() * 0.25,
              hasSplit: false,
            });

            s.rocketsSpawned++;
            // Next spawn delay in frames (paced with escalating difficulty)
            s.spawnCooldown = Math.max(16, 50 - s.round * 4 + Math.random() * 22);
          }
        }

        // 2. Update rockets & check for splits
        const newSplitRockets: EnemyRocket[] = [];
        for (let i = s.rockets.length - 1; i >= 0; i--) {
          const r = s.rockets[i];
          const totalDist = Math.hypot(r.targetX - r.startX, r.targetY - r.startY);
          r.progress += (r.speed * 60 * dt) / totalDist;

          if (r.progress >= 1) {
            r.progress = 1;
            r.x = r.targetX;
            r.y = r.targetY;

            // Impact!
            s.shake = 10;
            // Create impact explosion on ground
            s.explosions.push({
              id: Math.random().toString(36).substring(2, 9),
              x: r.x,
              y: r.y,
              radius: 6,
              maxRadius: 36,
              growthRate: 45,
              fadeRate: 35,
              state: 'expanding',
              color: '#f97316',
              isPlayerBlast: false,
            });

            // Damage target
            if (r.targetType === 'battery') {
              const b = s.batteries[r.targetIndex];
              if (b && b.isAlive) {
                b.isAlive = false;
                sounds.playBatteryDestroyed();
                s.floatingTexts.push({
                  id: Math.random().toString(),
                  x: b.x,
                  y: b.y - 25,
                  text: lang === 'zh' ? '炮台被毁!' : 'BATTERY LOST!',
                  color: '#ef4444',
                  alpha: 1,
                  vy: -20,
                });

                // Spawn debris particles
                for (let p = 0; p < 25; p++) {
                  s.particles.push({
                    id: Math.random().toString(),
                    x: b.x,
                    y: b.y - 5,
                    vx: (Math.random() - 0.5) * 120,
                    vy: -Math.random() * 120 - 20,
                    life: 1,
                    maxLife: 1,
                    color: Math.random() > 0.5 ? '#f97316' : '#94a3b8',
                    size: Math.random() * 3 + 1,
                  });
                }
              }
            } else if (r.targetType === 'city') {
              const c = s.cities[r.targetIndex];
              if (c && c.isAlive) {
                c.isAlive = false;
                s.citiesLost++;
                sounds.playExplosion(1.3);
                s.floatingTexts.push({
                  id: Math.random().toString(),
                  x: c.x,
                  y: c.y - 20,
                  text: lang === 'zh' ? '房屋损毁 齐射-1!' : 'HOUSE LOST! -1 VOLLEY!',
                  color: '#fb7185',
                  alpha: 1.2,
                  vy: -20,
                });

                for (let p = 0; p < 20; p++) {
                  s.particles.push({
                    id: Math.random().toString(),
                    x: c.x,
                    y: c.y - 5,
                    vx: (Math.random() - 0.5) * 100,
                    vy: -Math.random() * 90 - 15,
                    life: 1,
                    maxLife: 1,
                    color: '#f59e0b',
                    size: Math.random() * 3 + 1.5,
                  });
                }
              }
            }

            // Remove rocket
            s.rockets.splice(i, 1);
            continue;
          }

          // Check for MIRV splitting
          if (r.canSplit && !r.hasSplit && r.splitAtProgress && r.progress >= r.splitAtProgress) {
            r.hasSplit = true;
            // Split into 2 or 3 sub-warheads aiming at nearby targets
            const livingCities = s.cities.filter(c => c.isAlive);
            const livingBatteries = s.batteries.filter(b => b.isAlive);
            const targets = [...livingCities, ...livingBatteries];
            const splitCount = s.round >= 3 ? 3 : 2;
            
            if (targets.length > 0) {
              for (let k = 0; k < splitCount; k++) {
                const chosen = targets[Math.floor(Math.random() * targets.length)];
                const isBat = 'maxAmmo' in chosen;
                newSplitRockets.push({
                  id: Math.random().toString(36).substring(2, 9),
                  startX: r.x,
                  startY: r.y,
                  x: r.x,
                  y: r.y,
                  targetX: chosen.x + (Math.random() - 0.5) * 20,
                  targetY: isBat ? (chosen as Battery).y : (chosen as City).y,
                  speed: r.speed * 1.15,
                  targetType: isBat ? 'battery' : 'city',
                  targetIndex: chosen.id,
                  progress: 0,
                  canSplit: false,
                  hasSplit: true,
                });
              }
            }
          }

          // Update current position along trajectory
          r.x = r.startX + (r.targetX - r.startX) * r.progress;
          r.y = r.startY + (r.targetY - r.startY) * r.progress;

          // Rocket smoke spark
          if (Math.random() < 0.4) {
            s.particles.push({
              id: Math.random().toString(),
              x: r.x + (Math.random() - 0.5) * 2,
              y: r.y,
              vx: (Math.random() - 0.5) * 8,
              vy: -Math.random() * 15 - 5,
              life: 0.6,
              maxLife: 0.6,
              color: '#ef4444',
              size: Math.random() * 2 + 1,
            });
          }
        }

        if (newSplitRockets.length > 0) {
          s.rockets.push(...newSplitRockets);
        }

        // 3. Update interceptor missiles
        for (let i = s.missiles.length - 1; i >= 0; i--) {
          const m = s.missiles[i];
          const totalDist = Math.hypot(m.targetX - m.startX, m.targetY - m.startY);
          m.progress += (m.speed * 60 * dt) / totalDist;

          if (m.progress >= 1) {
            m.progress = 1;
            m.x = m.targetX;
            m.y = m.targetY;
            m.exploded = true;

            // Trigger blast explosion
            s.explosions.push({
              id: Math.random().toString(36).substring(2, 9),
              x: m.x,
              y: m.y,
              radius: 5,
              maxRadius: 48,
              growthRate: 85,
              fadeRate: 40,
              state: 'expanding',
              color: '#38bdf8',
              isPlayerBlast: true,
            });

            // Particles
            for (let p = 0; p < 16; p++) {
              const ang = Math.random() * Math.PI * 2;
              const spd = Math.random() * 80 + 30;
              s.particles.push({
                id: Math.random().toString(),
                x: m.x,
                y: m.y,
                vx: Math.cos(ang) * spd,
                vy: Math.sin(ang) * spd,
                life: 0.7,
                maxLife: 0.7,
                color: Math.random() > 0.4 ? '#38bdf8' : '#e0e7ff',
                size: Math.random() * 2.5 + 1,
              });
            }

            sounds.playExplosion(1.0);

            // Remove crosshair matching this missile
            const chIndex = s.crosshairs.findIndex(c => c.id === m.id);
            if (chIndex !== -1) {
              s.crosshairs.splice(chIndex, 1);
            }

            s.missiles.splice(i, 1);
            continue;
          }

          m.x = m.startX + (m.targetX - m.startX) * m.progress;
          m.y = m.startY + (m.targetY - m.startY) * m.progress;

          // Smoke trail
          s.particles.push({
            id: Math.random().toString(),
            x: m.x,
            y: m.y,
            vx: (Math.random() - 0.5) * 6,
            vy: (Math.random() - 0.5) * 6,
            life: 0.5,
            maxLife: 0.5,
            color: '#67e8f9',
            size: 2,
          });
        }

        // 4. Update explosions & check collision against enemy rockets
        let killsInTick = 0;
        for (let i = s.explosions.length - 1; i >= 0; i--) {
          const exp = s.explosions[i];
          if (exp.state === 'expanding') {
            exp.radius += exp.growthRate * dt;
            if (exp.radius >= exp.maxRadius) {
              exp.radius = exp.maxRadius;
              exp.state = 'shrinking';
            }
          } else if (exp.state === 'shrinking') {
            exp.radius -= exp.fadeRate * dt;
            if (exp.radius <= 0) {
              s.explosions.splice(i, 1);
              continue;
            }
          }

          // Check collision with enemy rockets
          for (let rIdx = s.rockets.length - 1; rIdx >= 0; rIdx--) {
            const rocket = s.rockets[rIdx];
            const dist = Math.hypot(rocket.x - exp.x, rocket.y - exp.y);
            // Enlarged collision radius to match the bigger missile sprite (+10px)
            if (dist <= exp.radius + 10) {
              // Rocket hit!
              s.rockets.splice(rIdx, 1);
              killsInTick++;
              s.rocketsDestroyed++;
              s.score += SCORE_PER_KILL; // +20 points per requirement
              setScore(s.score);

              // Every 10 kills firepower upgrade notification
              if (s.rocketsDestroyed > 0 && s.rocketsDestroyed % 10 === 0) {
                s.floatingTexts.push({
                  id: Math.random().toString(),
                  x: s.width * 0.5,
                  y: s.height * 0.35,
                  text: lang === 'zh' ? '★ 击落10颗！齐射火力+1 ★' : '★ 10 KILLS! VOLLEY FIREPOWER +1 ★',
                  color: '#f472b6',
                  alpha: 1.5,
                  vy: -20,
                });
              }

              sounds.playKill();

              // Floating score notice
              s.floatingTexts.push({
                id: Math.random().toString(),
                x: rocket.x,
                y: rocket.y - 12,
                text: `+${SCORE_PER_KILL}`,
                color: '#4ade80',
                alpha: 1,
                vy: -35,
              });

              // Secondary chain reaction explosion
              s.explosions.push({
                id: Math.random().toString(36).substring(2, 9),
                x: rocket.x,
                y: rocket.y,
                radius: 4,
                maxRadius: 40,
                growthRate: 80,
                fadeRate: 45,
                state: 'expanding',
                color: '#fbbf24',
                isPlayerBlast: true,
              });

              // Sparks
              for (let p = 0; p < 18; p++) {
                const ang = Math.random() * Math.PI * 2;
                const spd = Math.random() * 90 + 20;
                s.particles.push({
                  id: Math.random().toString(),
                  x: rocket.x,
                  y: rocket.y,
                  vx: Math.cos(ang) * spd,
                  vy: Math.sin(ang) * spd,
                  life: 0.8,
                  maxLife: 0.8,
                  color: '#fbbf24',
                  size: Math.random() * 3 + 1,
                });
              }

              // Winning condition check:
              // "得到1000分，就判定成功，点击再玩一次。"
              if (s.score >= TARGET_SCORE) {
                s.phase = 'VICTORY';
                setPhase('VICTORY');
                sounds.playVictory();
                break;
              }
            }
          }

          if (s.phase === 'VICTORY') break;
        }

        // Defeat condition check:
        // "当三个炮台都被敌方击毁，就判定失败。"
        const allBatteriesDestroyed = s.batteries.every(b => !b.isAlive);
        if (allBatteriesDestroyed && s.phase === 'PLAYING') {
          s.phase = 'GAME_OVER';
          setPhase('GAME_OVER');
          sounds.playGameOver();
        }

        // Check if wave is cleared
        if (
          s.phase === 'PLAYING' &&
          s.rocketsSpawned >= s.waveTotalRockets &&
          s.rockets.length === 0 &&
          s.explosions.length === 0 &&
          s.missiles.length === 0
        ) {
          // Wave complete! Calculate bonus
          const surplusAmmo = s.batteries.reduce((sum, b) => sum + (b.isAlive ? b.ammo : 0), 0);
          const ammoBonus = surplusAmmo * BONUS_PER_AMMO;
          const survivingCities = s.cities.filter(c => c.isAlive).length;
          const cityBonus = survivingCities * BONUS_PER_CITY;
          const waveBonus = ammoBonus + cityBonus;

          s.score += waveBonus;
          setScore(s.score);

          setRoundSummary({
            round: s.round,
            surplusAmmo,
            ammoBonus,
            survivingCities,
            cityBonus,
            waveScore: waveBonus,
            newTotal: s.score,
          });

          if (s.score >= TARGET_SCORE) {
            s.phase = 'VICTORY';
            setPhase('VICTORY');
            sounds.playVictory();
          } else {
            s.phase = 'ROUND_TRANSITION';
            setPhase('ROUND_TRANSITION');
            sounds.playWaveComplete();
          }
        }
      }

      // 5. Update particles
      for (let i = s.particles.length - 1; i >= 0; i--) {
        const p = s.particles[i];
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.vy += 80 * dt; // gravity
        p.life -= dt;
        if (p.life <= 0) {
          s.particles.splice(i, 1);
        }
      }

      // 6. Update floating texts
      for (let i = s.floatingTexts.length - 1; i >= 0; i--) {
        const ft = s.floatingTexts[i];
        ft.y += ft.vy * dt;
        ft.alpha -= dt * 0.9;
        if (ft.alpha <= 0) {
          s.floatingTexts.splice(i, 1);
        }
      }

      // 7. Update battery recoil & aiming dynamically towards cursor
      const groundLine = s.height - 45;
      s.batteries.forEach(b => {
        if (b.recoil > 0) {
          b.recoil = Math.max(0, b.recoil - 30 * dt);
        }
        if (b.isAlive) {
          const dx = s.mousePos.x - b.x;
          const dy = Math.min(s.mousePos.y, groundLine - 14) - (b.y - 18);
          const targetAngle = Math.atan2(dy, dx);
          let diff = targetAngle - b.angle;
          while (diff < -Math.PI) diff += Math.PI * 2;
          while (diff > Math.PI) diff -= Math.PI * 2;
          b.angle += diff * Math.min(1, 12 * dt);
        }
      });

      // 8. Decay screen shake
      if (s.shake > 0) {
        s.shake = Math.max(0, s.shake - 25 * dt);
      }

      // Sync stats state periodically or on change
      const baseVolley = 1;
      const killBonus = Math.floor(s.rocketsDestroyed / 10);
      const destroyedCities = s.cities.filter(c => !c.isAlive).length;
      const currentFirepower = Math.max(1, baseVolley + killBonus - destroyedCities);

      setStats({
        score: s.score,
        targetScore: TARGET_SCORE,
        round: s.round,
        rocketsDestroyed: s.rocketsDestroyed,
        missilesFired: s.missilesFired,
        citiesLost: s.citiesLost,
        highestChain: s.highestChain,
        firepower: currentFirepower,
      });

      // ----------------------------------------------------
      // RENDER GAME CANVAS
      // ----------------------------------------------------
      ctx.save();

      // Screen shake translation
      if (s.shake > 0) {
        const sx = (Math.random() - 0.5) * s.shake;
        const sy = (Math.random() - 0.5) * s.shake;
        ctx.translate(sx, sy);
      }

      // 1. Clear & Background: Dreamy Candy Celestial Sky
      const bgGrad = ctx.createLinearGradient(0, 0, 0, s.height);
      bgGrad.addColorStop(0, '#130924'); // deep twilight amethyst
      bgGrad.addColorStop(0.45, '#1e1b4b'); // midnight indigo
      bgGrad.addColorStop(0.8, '#2e1065'); // soft violet
      bgGrad.addColorStop(1, '#3b0764'); // horizon berry rose
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, s.width, s.height);

      // Cute Dreamy Nebula Glows (soft pink & cyan clouds)
      const nebula1 = ctx.createRadialGradient(
        s.width * 0.25, s.height * 0.35, 10,
        s.width * 0.25, s.height * 0.35, s.width * 0.35
      );
      nebula1.addColorStop(0, 'rgba(244, 114, 182, 0.14)');
      nebula1.addColorStop(0.6, 'rgba(192, 132, 252, 0.08)');
      nebula1.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = nebula1;
      ctx.fillRect(0, 0, s.width, s.height);

      const nebula2 = ctx.createRadialGradient(
        s.width * 0.75, s.height * 0.45, 10,
        s.width * 0.75, s.height * 0.45, s.width * 0.35
      );
      nebula2.addColorStop(0, 'rgba(56, 189, 248, 0.12)');
      nebula2.addColorStop(0.6, 'rgba(168, 85, 247, 0.06)');
      nebula2.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = nebula2;
      ctx.fillRect(0, 0, s.width, s.height);

      // Cute Pastel Ringed Planet (Candy Saturn) in upper left
      const planetX = s.width * 0.14;
      const planetY = Math.max(50, s.height * 0.16);
      ctx.save();
      ctx.translate(planetX, planetY);
      // Planet Rings (back)
      ctx.strokeStyle = 'rgba(110, 231, 183, 0.55)';
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      ctx.ellipse(0, 0, 24, 7, -Math.PI / 8, Math.PI, 0);
      ctx.stroke();

      // Planet Body (Lavender candy sphere)
      const planetGrad = ctx.createRadialGradient(-3, -3, 2, 0, 0, 13);
      planetGrad.addColorStop(0, '#f5d0fe');
      planetGrad.addColorStop(0.6, '#c084fc');
      planetGrad.addColorStop(1, '#7e22ce');
      ctx.fillStyle = planetGrad;
      ctx.beginPath();
      ctx.arc(0, 0, 13, 0, Math.PI * 2);
      ctx.fill();

      // Planet Rings (front)
      ctx.strokeStyle = '#6ee7b7';
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      ctx.ellipse(0, 0, 24, 7, -Math.PI / 8, 0, Math.PI);
      ctx.stroke();
      ctx.restore();

      // Cute Crescent Moon with sleeping face in upper right
      const moonX = s.width * 0.85;
      const moonY = Math.max(45, s.height * 0.14);
      ctx.save();
      // Moon Outer Glow
      const moonGlow = ctx.createRadialGradient(moonX, moonY, 12, moonX, moonY, 32);
      moonGlow.addColorStop(0, 'rgba(254, 240, 138, 0.35)');
      moonGlow.addColorStop(1, 'rgba(254, 240, 138, 0)');
      ctx.fillStyle = moonGlow;
      ctx.beginPath();
      ctx.arc(moonX, moonY, 32, 0, Math.PI * 2);
      ctx.fill();

      // Crescent Moon Shape
      ctx.fillStyle = '#fef08a';
      ctx.beginPath();
      ctx.arc(moonX, moonY, 16, 0.2 * Math.PI, 1.8 * Math.PI, false);
      ctx.arc(moonX - 5, moonY - 2, 14, 1.7 * Math.PI, 0.3 * Math.PI, true);
      ctx.closePath();
      ctx.fill();

      // Sweet Sleeping Face on Moon
      ctx.strokeStyle = '#ca8a04';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.arc(moonX - 8, moonY - 2, 2.5, 0.1 * Math.PI, 0.9 * Math.PI); // cute closed sleeping eye
      ctx.stroke();
      // Rosy blush on moon
      ctx.fillStyle = '#f472b6';
      ctx.beginPath();
      ctx.arc(moonX - 6, moonY + 3, 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // Stars: pastel round stars + 4-point diamond sparkles
      s.stars.forEach((star, idx) => {
        star.alpha += Math.sin(timestamp * star.twinkleSpeed) * 0.008;
        const a = Math.max(0.15, Math.min(0.95, star.alpha));
        const starColor = idx % 3 === 0 ? `rgba(254, 240, 138, ${a})` : idx % 3 === 1 ? `rgba(244, 114, 182, ${a})` : `rgba(125, 211, 252, ${a})`;
        
        ctx.fillStyle = starColor;
        // Occasionally draw 4-point sparkle star
        if (idx % 7 === 0) {
          const spSize = star.size * 2.2;
          ctx.beginPath();
          ctx.moveTo(star.x, star.y - spSize);
          ctx.quadraticCurveTo(star.x, star.y, star.x + spSize, star.y);
          ctx.quadraticCurveTo(star.x, star.y, star.x, star.y + spSize);
          ctx.quadraticCurveTo(star.x, star.y, star.x - spSize, star.y);
          ctx.quadraticCurveTo(star.x, star.y, star.x, star.y - spSize);
          ctx.fill();
        } else {
          ctx.beginPath();
          ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
          ctx.fill();
        }
      });

      // Tina Rabbit Starlight Constellation in upper sky
      ctx.save();
      const constelX = s.width * 0.46;
      const constelY = Math.max(38, s.height * 0.12);
      ctx.strokeStyle = 'rgba(254, 240, 138, 0.3)';
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 4]);
      const rabbitNodes = [
        [0, 0], [12, -8], [24, -4], [28, 8], [16, 14], [0, 10], [-8, 4], [0, 0],
        [12, -8], [15, -18], [19, -16], [24, -4],
      ];
      ctx.beginPath();
      rabbitNodes.forEach(([dx, dy], i) => {
        const nx = constelX + dx;
        const ny = constelY + dy;
        if (i === 0 || i === 8) ctx.moveTo(nx, ny);
        else ctx.lineTo(nx, ny);
      });
      ctx.stroke();
      ctx.setLineDash([]);
      // Constellation star nodes
      rabbitNodes.slice(0, 8).forEach(([dx, dy]) => {
        ctx.fillStyle = '#fef08a';
        ctx.beginPath();
        ctx.arc(constelX + dx, constelY + dy, 1.8, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.restore();

      // Distant rolling fairytale hills with silhouettes of tiny pines
      const groundY = s.height - 45;
      ctx.fillStyle = '#161d36';
      ctx.beginPath();
      ctx.moveTo(0, groundY);
      for (let x = 0; x <= s.width; x += 30) {
        const hillY = groundY - 14 - Math.sin(x * 0.012) * 8 - Math.cos(x * 0.035) * 5;
        ctx.lineTo(x, hillY);
      }
      ctx.lineTo(s.width, groundY);
      ctx.closePath();
      ctx.fill();

      // Tiny fairytale pine trees on distant hills
      ctx.fillStyle = '#1e293b';
      for (let tx = 25; tx < s.width; tx += 65) {
        const ty = groundY - 14 - Math.sin(tx * 0.012) * 8 - Math.cos(tx * 0.035) * 5;
        ctx.beginPath();
        ctx.moveTo(tx, ty - 12);
        ctx.lineTo(tx + 4, ty);
        ctx.lineTo(tx - 4, ty);
        ctx.closePath();
        ctx.fill();
      }

      // Front Whimsical Grassy Ground Plane
      const groundGrad = ctx.createLinearGradient(0, groundY, 0, s.height);
      groundGrad.addColorStop(0, '#0f172a');
      groundGrad.addColorStop(0.3, '#0b1120');
      groundGrad.addColorStop(1, '#050811');
      ctx.fillStyle = groundGrad;
      ctx.fillRect(0, groundY, s.width, s.height - groundY);

      // Glowing Grass Ridge Line
      ctx.strokeStyle = '#34d399';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, groundY);
      ctx.lineTo(s.width, groundY);
      ctx.stroke();

      // Tiny cute flowers along the ground edge
      for (let fx = 15; fx < s.width; fx += 35) {
        ctx.fillStyle = fx % 70 === 0 ? '#f472b6' : fx % 50 === 0 ? '#fef08a' : '#60a5fa';
        ctx.beginPath();
        ctx.arc(fx, groundY - 3, 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#10b981';
        ctx.fillRect(fx - 0.5, groundY - 2, 1, 2);
      }

      // Render Fairytale Cottages (Exquisite storybook houses across 8 positions)
      s.cities.forEach((city, index) => {
        const cx = city.x;
        const cy = city.y;
        const w = city.width;

        // 8 distinct cottage palettes
        const roofColors = [
          '#f43f5e', '#a855f7', '#0284c7', '#f59e0b', 
          '#10b981', '#ec4899', '#8b5cf6', '#06b6d4'
        ];
        const wallColors = [
          '#fef3c7', '#fdf4ff', '#e0f2fe', '#fef9c3', 
          '#ecfdf5', '#fff1f2', '#f5f3ff', '#ecfeff'
        ];
        const roofCol = roofColors[index % roofColors.length];
        const wallCol = wallColors[index % wallColors.length];

        if (city.isAlive) {
          ctx.save();
          const houseW = w * 0.92;
          const houseH = 22;
          const roofH = 15;

          // 1. Chimney & Animated Curly Smoke Puff
          const chimneyX = cx + houseW * 0.24;
          const chimneyY = cy - houseH - roofH + 4;
          ctx.fillStyle = '#b45309';
          ctx.fillRect(chimneyX, chimneyY, 4.5, 12);
          ctx.fillStyle = '#78350f';
          ctx.fillRect(chimneyX - 1, chimneyY, 6.5, 2.5); // chimney cap

          // Animated cute smoke puff drifting up
          const smokeOffset = (timestamp * 0.02 + index * 35) % 22;
          const smokeAlpha = Math.max(0, 1 - smokeOffset / 22);
          ctx.fillStyle = `rgba(255, 255, 255, ${smokeAlpha * 0.65})`;
          ctx.beginPath();
          ctx.arc(
            chimneyX + 2.5 + Math.sin(timestamp * 0.004 + index) * 3, 
            chimneyY - 4 - smokeOffset * 0.6, 
            2.2 + smokeOffset * 0.15, 
            0, Math.PI * 2
          );
          ctx.fill();

          // 2. Main Cottage Wall
          ctx.fillStyle = wallCol;
          ctx.fillRect(cx - houseW * 0.5, cy - houseH, houseW, houseH);
          ctx.strokeStyle = '#64748b';
          ctx.lineWidth = 1;
          ctx.strokeRect(cx - houseW * 0.5, cy - houseH, houseW, houseH);

          // Timber framing details (vertical wood beams)
          ctx.fillStyle = '#78350f';
          ctx.fillRect(cx - houseW * 0.5, cy - houseH, 1.8, houseH);
          ctx.fillRect(cx + houseW * 0.5 - 1.8, cy - houseH, 1.8, houseH);

          // 3. Steep Scalloped Storybook Gable Roof
          ctx.fillStyle = roofCol;
          ctx.beginPath();
          ctx.moveTo(cx - houseW * 0.62, cy - houseH + 2);
          ctx.lineTo(cx, cy - houseH - roofH);
          ctx.lineTo(cx + houseW * 0.62, cy - houseH + 2);
          ctx.closePath();
          ctx.fill();

          // Roof eaves highlight
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 1.2;
          ctx.beginPath();
          ctx.moveTo(cx - houseW * 0.62, cy - houseH + 2);
          ctx.lineTo(cx, cy - houseH - roofH);
          ctx.lineTo(cx + houseW * 0.62, cy - houseH + 2);
          ctx.stroke();

          // Cute golden star atop roof peak
          ctx.fillStyle = '#fef08a';
          ctx.beginPath();
          ctx.arc(cx, cy - houseH - roofH - 2, 2.2, 0, Math.PI * 2);
          ctx.fill();

          // 4. Arched Wooden Front Door
          const doorW = 6.5;
          const doorH = 10.5;
          ctx.fillStyle = '#92400e';
          ctx.beginPath();
          ctx.roundRect(cx - doorW * 0.5, cy - doorH, doorW, doorH, [3, 3, 0, 0]);
          ctx.fill();
          // Brass door handle
          ctx.fillStyle = '#fde047';
          ctx.fillRect(cx + 1, cy - doorH * 0.5, 1.2, 1.2);

          // 5. Warm Glowing Multi-pane Windows with Flower Boxes
          const winW = 5.5;
          const winH = 6.5;
          const winX = cx - houseW * 0.36;
          const winY = cy - houseH + 4;

          // Warm golden window light
          ctx.fillStyle = '#fef08a';
          ctx.fillRect(winX, winY, winW, winH);
          ctx.strokeStyle = '#78350f';
          ctx.lineWidth = 0.8;
          ctx.strokeRect(winX, winY, winW, winH);
          // Window cross-mullion
          ctx.beginPath();
          ctx.moveTo(winX + winW * 0.5, winY);
          ctx.lineTo(winX + winW * 0.5, winY + winH);
          ctx.moveTo(winX, winY + winH * 0.5);
          ctx.lineTo(winX + winW, winY + winH * 0.5);
          ctx.stroke();

          // Flower box under window with tiny blooming petals!
          ctx.fillStyle = '#854d0e';
          ctx.fillRect(winX - 1, winY + winH, winW + 2, 2.2);
          ctx.fillStyle = index % 2 === 0 ? '#f472b6' : '#fbbf24';
          ctx.fillRect(winX, winY + winH - 1.2, 2, 1.8);
          ctx.fillStyle = index % 2 === 0 ? '#fbbf24' : '#60a5fa';
          ctx.fillRect(winX + 3.2, winY + winH - 1.2, 2, 1.8);

          // Cozy porch lantern over door
          ctx.fillStyle = 'rgba(254, 240, 138, 0.4)';
          ctx.beginPath();
          ctx.arc(cx, cy - doorH - 2, 4.5, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#fef08a';
          ctx.fillRect(cx - 1, cy - doorH - 3, 2, 2);

          ctx.restore();
        } else {
          // Destroyed fairytale cottage: cute tumbled stone ruins with repair flag
          ctx.save();
          const cx = city.x;
          const cy = city.y;

          // Crumbled pastel bricks
          ctx.fillStyle = '#64748b';
          ctx.beginPath();
          ctx.arc(cx, cy, 13, Math.PI, 0);
          ctx.fill();

          // Tumbled colorful bricks
          ctx.fillStyle = roofCol;
          ctx.fillRect(cx - 7, cy - 6, 4.5, 2.8);
          ctx.fillRect(cx + 3, cy - 5, 4, 2.8);

          // Tiny cute white surrender / repair flag
          ctx.strokeStyle = '#cbd5e1';
          ctx.lineWidth = 1.2;
          ctx.beginPath();
          ctx.moveTo(cx - 2, cy);
          ctx.lineTo(cx - 2, cy - 13);
          ctx.stroke();

          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          ctx.moveTo(cx - 2, cy - 13);
          ctx.lineTo(cx + 5.5, cy - 9.5);
          ctx.lineTo(cx - 2, cy - 6);
          ctx.closePath();
          ctx.fill();

          // Soft cartoon puff of dust
          if (Math.random() < 0.1) {
            s.particles.push({
              id: Math.random().toString(),
              x: cx + (Math.random() - 0.5) * 8,
              y: cy - 6,
              vx: (Math.random() - 0.5) * 4,
              vy: -Math.random() * 15 - 8,
              life: 0.7,
              maxLife: 0.7,
              color: 'rgba(244, 114, 182, 0.4)',
              size: Math.random() * 3 + 2,
            });
          }
          ctx.restore();
        }
      });

      // Render 4 Missile Batteries (Exquisite Rabbit Citadel Turrets)
      s.batteries.forEach(battery => {
        const bx = battery.x;
        const by = battery.y;
        const isMainCitadel = battery.id === 1 || battery.id === 2;

        if (battery.isAlive) {
          ctx.save();

          // 1. Foundation: Beveled armored reinforced bastion base
          const baseW = isMainCitadel ? 58 : 46;
          const baseH = 20;
          
          // Outer shadow bed
          ctx.fillStyle = '#090d16';
          ctx.beginPath();
          ctx.ellipse(bx, by + 2, baseW * 0.58, 7, 0, 0, Math.PI * 2);
          ctx.fill();

          // Lower armored glacis (chamfered bastion)
          const bGrad = ctx.createLinearGradient(0, by - baseH, 0, by);
          bGrad.addColorStop(0, '#334155');
          bGrad.addColorStop(0.3, '#1e293b');
          bGrad.addColorStop(1, '#0f172a');
          ctx.fillStyle = bGrad;
          ctx.strokeStyle = '#64748b';
          ctx.lineWidth = 1.5;

          ctx.beginPath();
          ctx.moveTo(bx - baseW * 0.5, by);
          ctx.lineTo(bx - baseW * 0.36, by - baseH);
          ctx.lineTo(bx + baseW * 0.36, by - baseH);
          ctx.lineTo(bx + baseW * 0.5, by);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();

          // Hazard caution stripes on the lower glacis plate
          ctx.save();
          ctx.beginPath();
          ctx.moveTo(bx - baseW * 0.44, by);
          ctx.lineTo(bx - baseW * 0.34, by - 7);
          ctx.lineTo(bx + baseW * 0.34, by - 7);
          ctx.lineTo(bx + baseW * 0.44, by);
          ctx.closePath();
          ctx.clip();

          ctx.strokeStyle = '#eab308';
          ctx.lineWidth = 3.5;
          for (let stripeX = bx - baseW; stripeX < bx + baseW; stripeX += 11) {
            ctx.beginPath();
            ctx.moveTo(stripeX, by);
            ctx.lineTo(stripeX + 9, by - 9);
            ctx.stroke();
          }
          ctx.restore();

          // Hydraulic recoil stabilizing jacks on the left & right
          ctx.fillStyle = '#94a3b8';
          ctx.fillRect(bx - baseW * 0.48, by - 11, 2.8, 11);
          ctx.fillRect(bx + baseW * 0.48 - 2.8, by - 11, 2.8, 11);
          // Chrome piston heads
          ctx.fillStyle = '#cbd5e1';
          ctx.fillRect(bx - baseW * 0.49, by - 13, 4.5, 2.8);
          ctx.fillRect(bx + baseW * 0.49 - 4.5, by - 13, 4.5, 2.8);

          // LED Status light bar on bunker center
          const statusColor = battery.ammo > 7 ? '#38bdf8' : battery.ammo > 0 ? '#f59e0b' : '#ef4444';
          ctx.fillStyle = statusColor;
          ctx.shadowColor = statusColor;
          ctx.shadowBlur = 5;
          const ledCount = isMainCitadel ? 4 : 3;
          for (let i = 0; i < ledCount; i++) {
            const ledX = bx - (ledCount * 3.5) + i * 7;
            ctx.fillRect(ledX, by - 15, 4.5, 2.2);
          }
          ctx.shadowBlur = 0;

          // 2. Turret Mount Platform & Azimuth Turntable Ring
          const ringY = by - baseH;
          ctx.fillStyle = '#1e293b';
          ctx.strokeStyle = '#475569';
          ctx.lineWidth = 1.2;
          ctx.beginPath();
          ctx.ellipse(bx, ringY, isMainCitadel ? 20 : 16, 5.5, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();

          // 3. Aiming Turret Cupola and Barrels
          ctx.save();
          ctx.translate(bx, ringY - 4);

          // Faint laser targeting assist beam towards aiming angle
          ctx.save();
          ctx.rotate(battery.angle);
          ctx.strokeStyle = 'rgba(56, 189, 248, 0.2)';
          ctx.lineWidth = 1;
          ctx.setLineDash([4, 6]);
          ctx.beginPath();
          ctx.moveTo(32, 0);
          ctx.lineTo(260, 0);
          ctx.stroke();
          ctx.setLineDash([]);
          ctx.restore();

          // Rotate turret for barrel drawing
          ctx.rotate(battery.angle);

          // Barrels configuration: Main citadels have Triple Heavy Railguns, Wings have Twin Rapid Railguns
          const recoilOffset = battery.recoil;
          const barrelLen = (isMainCitadel ? 25 : 21) - recoilOffset;
          const barrelWidth = isMainCitadel ? 4.2 : 3.8;

          if (isMainCitadel) {
            // Triple heavy railguns
            const offsets = [-6.5, 0, 6.5];
            offsets.forEach(yOff => {
              // Barrel tube
              ctx.fillStyle = '#0f172a';
              ctx.fillRect(0, yOff - barrelWidth * 0.5, barrelLen, barrelWidth);
              // Barrel upper highlight
              ctx.fillStyle = '#38bdf8';
              ctx.fillRect(3, yOff - 0.9, barrelLen - 7, 1.8);
              // Muzzle brake
              ctx.fillStyle = '#0284c7';
              ctx.fillRect(barrelLen - 3.8, yOff - barrelWidth * 0.5 - 1.2, 3.8, barrelWidth + 2.4);
            });
          } else {
            // Twin high-velocity railguns
            const offsets = [-4.2, 4.2];
            offsets.forEach(yOff => {
              ctx.fillStyle = '#0f172a';
              ctx.fillRect(0, yOff - barrelWidth * 0.5, barrelLen, barrelWidth);
              // Cyan plasma energy conduit
              ctx.fillStyle = '#38bdf8';
              ctx.fillRect(3, yOff - 0.75, barrelLen - 6, 1.5);
              // Muzzle compensator
              ctx.fillStyle = '#0284c7';
              ctx.fillRect(barrelLen - 3.5, yOff - barrelWidth * 0.5 - 1, 3.5, barrelWidth + 2);
            });
          }

          // Muzzle Flash effect when firing
          if (battery.recoil > 4) {
            ctx.fillStyle = '#fef08a';
            ctx.shadowColor = '#38bdf8';
            ctx.shadowBlur = 12;
            ctx.beginPath();
            ctx.arc(barrelLen + 6, 0, isMainCitadel ? 9 : 7, 0, Math.PI * 2);
            ctx.fill();
            ctx.shadowBlur = 0;
          }

          // Armored Mantlet & Dome
          ctx.restore(); // restore rotation back to bx, ringY - 4

          // Turret Armor Dome
          const domeRadius = isMainCitadel ? 13 : 10.5;
          const domeGrad = ctx.createRadialGradient(
            bx - 3, ringY - 6, 2,
            bx, ringY - 4, domeRadius
          );
          domeGrad.addColorStop(0, '#475569');
          domeGrad.addColorStop(0.5, '#1e293b');
          domeGrad.addColorStop(1, '#0f172a');
          ctx.fillStyle = domeGrad;
          ctx.strokeStyle = '#38bdf8';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.arc(bx, ringY - 4, domeRadius, Math.PI, 0);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();

          // Optic visor slit
          ctx.fillStyle = '#38bdf8';
          ctx.fillRect(bx - 4.5, ringY - 8.5, 9, 2);

          // Turret top sensor: Main citadels have rotating radar; wings have comms beacon
          if (isMainCitadel) {
            const radarAngle = (timestamp * 0.0035 + battery.id) % (Math.PI * 2);
            const radarWidth = Math.cos(radarAngle) * 7.5;
            ctx.strokeStyle = '#94a3b8';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.moveTo(bx, ringY - domeRadius - 3);
            ctx.lineTo(bx, ringY - domeRadius);
            ctx.stroke();

            ctx.strokeStyle = '#38bdf8';
            ctx.beginPath();
            ctx.ellipse(bx, ringY - domeRadius - 5, Math.abs(radarWidth) + 2, 2.8, 0, 0, Math.PI * 2);
            ctx.stroke();
          } else {
            // Wing turret comms antenna
            const isLeft = battery.id === 0;
            ctx.strokeStyle = '#94a3b8';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(bx + (isLeft ? -5 : 5), ringY - domeRadius);
            ctx.lineTo(bx + (isLeft ? -7 : 7), ringY - domeRadius - 7);
            ctx.stroke();
            // Blinking beacon
            if (Math.sin(timestamp * 0.006 + battery.id) > 0) {
              ctx.fillStyle = '#38bdf8';
              ctx.beginPath();
              ctx.arc(bx + (isLeft ? -7 : 7), ringY - domeRadius - 8, 1.5, 0, Math.PI * 2);
              ctx.fill();
            }
          }

          // 4. Digital Munitions HUD beneath the battery
          ctx.fillStyle = '#090d16';
          ctx.strokeStyle = '#334155';
          ctx.lineWidth = 1;
          const hudW = 46;
          ctx.fillRect(bx - hudW * 0.5, by + 6, hudW, 16);
          ctx.strokeRect(bx - hudW * 0.5, by + 6, hudW, 16);

          ctx.fillStyle = battery.ammo > 5 ? '#38bdf8' : battery.ammo > 0 ? '#fbbf24' : '#ef4444';
          ctx.font = '700 11px JetBrains Mono, monospace';
          ctx.textAlign = 'center';
          ctx.fillText(`${battery.ammo}/${battery.maxAmmo}`, bx, by + 18);

          // Battery role label
          ctx.fillStyle = '#94a3b8';
          ctx.font = '600 9px Plus Jakarta Sans, sans-serif';
          const bLabelsZh = ['左翼·25', '左主·35', '右主·35', '右翼·25'];
          const bLabelsEn = ['L-WING 25', 'L-MAIN 35', 'R-MAIN 35', 'R-WING 25'];
          const bLabel = lang === 'zh' ? bLabelsZh[battery.id] || `塔${battery.id + 1}` : bLabelsEn[battery.id] || `TOWER ${battery.id + 1}`;
          ctx.fillText(bLabel, bx, by + 32);

          ctx.restore();
        } else {
          // Destroyed battery bunker
          ctx.save();
          const baseW = isMainCitadel ? 58 : 46;
          
          ctx.fillStyle = '#111827';
          ctx.strokeStyle = '#ef4444';
          ctx.lineWidth = 1.5;

          ctx.beginPath();
          ctx.moveTo(bx - baseW * 0.5, by);
          ctx.lineTo(bx - baseW * 0.3, by - 12);
          ctx.lineTo(bx - 4, by - 14);
          ctx.lineTo(bx + 6, by - 8);
          ctx.lineTo(bx + baseW * 0.35, by - 14);
          ctx.lineTo(bx + baseW * 0.5, by);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();

          // Blown open core & twisted rebar
          ctx.fillStyle = '#450a0a';
          ctx.beginPath();
          ctx.arc(bx, by - 8, 9, Math.PI, 0);
          ctx.fill();

          // Electrical sparks
          if (Math.random() < 0.2) {
            ctx.strokeStyle = '#67e8f9';
            ctx.lineWidth = 1.2;
            ctx.beginPath();
            ctx.moveTo(bx - 6, by - 10);
            ctx.lineTo(bx - 2 + (Math.random() - 0.5) * 8, by - 16 + (Math.random() - 0.5) * 8);
            ctx.stroke();
          }

          // Offline warning badge
          ctx.fillStyle = '#ef4444';
          ctx.font = '700 9.5px JetBrains Mono, monospace';
          ctx.textAlign = 'center';
          ctx.fillText(lang === 'zh' ? '损毁 OFFLINE' : 'DESTROYED', bx, by + 18);

          ctx.restore();
        }
      });

      // Render Crosshair Targets ('X')
      s.crosshairs.forEach(ch => {
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 2;
        const size = 6;
        ctx.beginPath();
        ctx.moveTo(ch.x - size, ch.y - size);
        ctx.lineTo(ch.x + size, ch.y + size);
        ctx.moveTo(ch.x + size, ch.y - size);
        ctx.lineTo(ch.x - size, ch.y + size);
        ctx.stroke();

        // Pulsing outer targeting ring
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.4)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(ch.x, ch.y, size * 1.8, 0, Math.PI * 2);
        ctx.stroke();
      });

      // Render Interceptor Missiles: Cute Flying Bunnies! (Larger & Exquisite)
      s.missiles.forEach(m => {
        // Soft stardust trail
        const trailGrad = ctx.createLinearGradient(m.startX, m.startY, m.x, m.y);
        trailGrad.addColorStop(0, 'rgba(255, 255, 255, 0.1)');
        trailGrad.addColorStop(0.6, 'rgba(254, 240, 138, 0.55)');
        trailGrad.addColorStop(1, 'rgba(255, 255, 255, 0.95)');

        ctx.strokeStyle = trailGrad;
        ctx.lineWidth = 2.6;
        ctx.beginPath();
        ctx.moveTo(m.startX, m.startY);
        ctx.lineTo(m.x, m.y);
        ctx.stroke();

        // Calculate heading angle
        const angle = Math.atan2(m.targetY - m.startY, m.targetX - m.startX);
        ctx.save();
        ctx.translate(m.x, m.y);
        ctx.rotate(angle);

        // Scale up: Bunny is now noticeably larger (~1.6x previous dimensions)
        // Fluffy Bunny Tail (triple round puff)
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(-16, 0, 5, 0, Math.PI * 2);
        ctx.arc(-17, -2.5, 3.5, 0, Math.PI * 2);
        ctx.arc(-17, 2.5, 3.5, 0, Math.PI * 2);
        ctx.fill();

        // Bunny Floppy Ears (flowing backwards in slipstream)
        // Top ear
        ctx.fillStyle = '#ffffff';
        ctx.strokeStyle = '#f472b6';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.ellipse(-11, -9, 10.5, 4.2, -Math.PI / 8, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        // Inner ear soft pink
        ctx.fillStyle = '#f472b6';
        ctx.beginPath();
        ctx.ellipse(-11, -9, 7, 2.2, -Math.PI / 8, 0, Math.PI * 2);
        ctx.fill();

        // Bottom ear
        ctx.fillStyle = '#ffffff';
        ctx.strokeStyle = '#f472b6';
        ctx.beginPath();
        ctx.ellipse(-11, 9, 10.5, 4.2, Math.PI / 8, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        // Inner ear soft pink
        ctx.fillStyle = '#f472b6';
        ctx.beginPath();
        ctx.ellipse(-11, 9, 7, 2.2, Math.PI / 8, 0, Math.PI * 2);
        ctx.fill();

        // Tiny gold star hairpin at ear root
        ctx.fillStyle = '#fef08a';
        ctx.beginPath();
        ctx.arc(-6, -8, 2.5, 0, Math.PI * 2);
        ctx.fill();

        // Bunny Main Chubby Body (Whimsical plump white bunny)
        const bodyGrad = ctx.createRadialGradient(4, -4, 2, 0, 0, 16);
        bodyGrad.addColorStop(0, '#ffffff');
        bodyGrad.addColorStop(0.7, '#fdf2f8');
        bodyGrad.addColorStop(1, '#fce7f3');
        ctx.fillStyle = bodyGrad;
        ctx.strokeStyle = '#fbcfe8';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.ellipse(0, 0, 16, 11, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Cute Little Front Paws tucked forward
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.ellipse(6, 7, 4, 2.5, Math.PI / 6, 0, Math.PI * 2);
        ctx.fill();

        // Big Anime Doe Eyes (Glittering black with double shine catchlights)
        ctx.fillStyle = '#0f172a';
        ctx.beginPath();
        ctx.arc(6, -3.5, 2.6, 0, Math.PI * 2);
        ctx.fill();
        // Double catchlights
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(7, -4.2, 1.1, 0, Math.PI * 2);
        ctx.arc(5.2, -2.6, 0.6, 0, Math.PI * 2);
        ctx.fill();

        // Cute Blushing Cheek
        ctx.fillStyle = 'rgba(244, 114, 182, 0.85)';
        ctx.beginPath();
        ctx.ellipse(3, 2.5, 3.2, 2, 0, 0, Math.PI * 2);
        ctx.fill();
        // Cheek highlight sparkle
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(3, 2, 1, 1);

        // Sweet Pink Nose
        ctx.fillStyle = '#f43f5e';
        ctx.beginPath();
        ctx.arc(13.5, -0.5, 1.8, 0, Math.PI * 2);
        ctx.fill();

        // Whiskers
        ctx.strokeStyle = 'rgba(203, 213, 225, 0.85)';
        ctx.lineWidth = 0.8;
        ctx.beginPath();
        ctx.moveTo(11, 1);
        ctx.lineTo(16, 3);
        ctx.moveTo(11, 3);
        ctx.lineTo(15, 6);
        ctx.stroke();

        // Golden Star Magic Wand Sparkle at Front
        ctx.fillStyle = '#fef08a';
        ctx.beginPath();
        ctx.arc(17, -0.5, 3, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
      });

      // Render Enemy Rockets: Cute Mischievous Carrot Missiles! (Exquisite)
      s.rockets.forEach(r => {
        // Trajectory smoke & sparkle trail
        const trailGrad = ctx.createLinearGradient(r.startX, r.startY, r.x, r.y);
        trailGrad.addColorStop(0, 'rgba(251, 146, 60, 0.1)');
        trailGrad.addColorStop(0.7, 'rgba(249, 115, 22, 0.45)');
        trailGrad.addColorStop(1, r.canSplit ? 'rgba(244, 63, 94, 0.9)' : 'rgba(249, 115, 22, 0.85)');

        ctx.strokeStyle = trailGrad;
        ctx.lineWidth = r.canSplit ? 2.8 : 2.2;
        ctx.beginPath();
        ctx.moveTo(r.startX, r.startY);
        ctx.lineTo(r.x, r.y);
        ctx.stroke();

        // Calculate heading angle
        const angle = Math.atan2(r.targetY - r.startY, r.targetX - r.startX);

        ctx.save();
        ctx.translate(r.x, r.y);
        ctx.rotate(angle);

        // Carrot dimensions: Length ~26px, Half Width ~5.5px
        const cLen = r.canSplit ? 30 : 26;
        const cHalfW = r.canSplit ? 6 : 5;

        // Animated rocket exhaust thrust flame flickering behind leaves
        const flameLen = 8 + Math.sin(timestamp * 0.05 + r.x) * 4;
        const flameGrad = ctx.createLinearGradient(-12 - flameLen, 0, -12, 0);
        flameGrad.addColorStop(0, 'rgba(239, 68, 68, 0)');
        flameGrad.addColorStop(0.5, '#f97316');
        flameGrad.addColorStop(1, '#fef08a');
        ctx.fillStyle = flameGrad;
        ctx.beginPath();
        ctx.moveTo(-12 - flameLen, 0);
        ctx.lineTo(-12, -3);
        ctx.lineTo(-12, 3);
        ctx.closePath();
        ctx.fill();

        // Leafy Green Carrot Top (Rear aerodynamic thruster fins)
        ctx.fillStyle = '#22c55e';
        ctx.strokeStyle = '#15803d';
        ctx.lineWidth = 0.8;

        // Top leaf
        ctx.beginPath();
        ctx.ellipse(-12, -4, 6.5, 2.2, -Math.PI / 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        // Middle leaf
        ctx.beginPath();
        ctx.ellipse(-15, 0, 7.5, 2.2, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        // Bottom leaf
        ctx.beginPath();
        ctx.ellipse(-12, 4, 6.5, 2.2, Math.PI / 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Carrot Body (Plump, tapered towards nose tip)
        const carrotGrad = ctx.createLinearGradient(0, -cHalfW, 0, cHalfW);
        if (r.canSplit) {
          // Golden giant carrot for split rockets
          carrotGrad.addColorStop(0, '#fef08a');
          carrotGrad.addColorStop(0.5, '#f59e0b');
          carrotGrad.addColorStop(1, '#b45309');
        } else {
          carrotGrad.addColorStop(0, '#fdba74');
          carrotGrad.addColorStop(0.4, '#f97316');
          carrotGrad.addColorStop(1, '#c2410c');
        }

        ctx.fillStyle = carrotGrad;
        ctx.strokeStyle = r.canSplit ? '#eab308' : '#ea580c';
        ctx.lineWidth = 1.2;

        ctx.beginPath();
        ctx.moveTo(-9, -cHalfW);
        ctx.lineTo(cLen * 0.45, -cHalfW * 0.8);
        ctx.lineTo(cLen, 0); // pointed nose
        ctx.lineTo(cLen * 0.45, cHalfW * 0.8);
        ctx.lineTo(-9, cHalfW);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Cute carrot ridge textures
        ctx.strokeStyle = r.canSplit ? 'rgba(180, 83, 9, 0.45)' : 'rgba(154, 52, 18, 0.45)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(-2, -cHalfW * 0.6);
        ctx.lineTo(-2, cHalfW * 0.6);
        ctx.moveTo(6, -cHalfW * 0.45);
        ctx.lineTo(6, cHalfW * 0.45);
        ctx.stroke();

        // Mischievous little eyes & eyebrows on the carrot!
        // Little angry/mischievous eyebrow
        ctx.strokeStyle = '#451a03';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(1.5, -4);
        ctx.lineTo(5.5, -3);
        ctx.stroke();

        // Eye
        ctx.fillStyle = '#0f172a';
        ctx.beginPath();
        ctx.arc(3.5, -2, 1.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(3.8, -2.3, 0.5, 0, Math.PI * 2);
        ctx.fill();

        // Glowing nose tip aura
        const glowRadius = r.canSplit ? 14 : 11;
        const tipGlow = ctx.createRadialGradient(
          cLen, 0, 1,
          cLen, 0, glowRadius
        );
        tipGlow.addColorStop(0, '#ffffff');
        tipGlow.addColorStop(0.3, r.canSplit ? '#fbbf24' : '#f97316');
        tipGlow.addColorStop(1, 'rgba(249, 115, 22, 0)');
        ctx.fillStyle = tipGlow;
        ctx.beginPath();
        ctx.arc(cLen, 0, glowRadius, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
      });

      // Render Blast Explosions: Fluffy Cartoon Cloud Burst (STRICTLY NO COLORED HALO / RINGS)
      s.explosions.forEach(exp => {
        const radius = Math.max(1, exp.radius);
        ctx.save();

        // 1. Soft billowing puffy cotton cloud burst (clean, cute, pure cloud cream)
        const puffs = 7;
        for (let p = 0; p < puffs; p++) {
          const angle = (p / puffs) * Math.PI * 2;
          const dist = radius * 0.42;
          const px = exp.x + Math.cos(angle) * dist;
          const py = exp.y + Math.sin(angle) * dist;
          const puffRadius = radius * 0.56;

          const cloudGrad = ctx.createRadialGradient(
            px, py, 0,
            px, py, puffRadius
          );
          if (exp.isPlayerBlast) {
            cloudGrad.addColorStop(0, 'rgba(255, 255, 255, 0.95)');
            cloudGrad.addColorStop(0.65, 'rgba(254, 249, 195, 0.85)');
            cloudGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
          } else {
            cloudGrad.addColorStop(0, 'rgba(254, 240, 138, 0.95)');
            cloudGrad.addColorStop(0.6, 'rgba(251, 146, 60, 0.85)');
            cloudGrad.addColorStop(1, 'rgba(244, 63, 94, 0)');
          }
          ctx.fillStyle = cloudGrad;
          ctx.beginPath();
          ctx.arc(px, py, puffRadius, 0, Math.PI * 2);
          ctx.fill();
        }

        // 2. Bright warm center puff flash
        const centerGrad = ctx.createRadialGradient(
          exp.x, exp.y, 0,
          exp.x, exp.y, radius * 0.55
        );
        centerGrad.addColorStop(0, '#ffffff');
        centerGrad.addColorStop(0.5, exp.isPlayerBlast ? '#fef08a' : '#fed7aa');
        centerGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
        ctx.fillStyle = centerGrad;
        ctx.beginPath();
        ctx.arc(exp.x, exp.y, radius * 0.55, 0, Math.PI * 2);
        ctx.fill();

        // 3. Delicate 4-point golden sparkle stars inside (NO colored stroke ring)
        const starCount = 5;
        for (let sIdx = 0; sIdx < starCount; sIdx++) {
          const sAng = (sIdx / starCount) * Math.PI * 2 + (exp.radius * 0.04);
          const sDist = radius * 0.62;
          const sx = exp.x + Math.cos(sAng) * sDist;
          const sy = exp.y + Math.sin(sAng) * sDist;
          const spSize = 3;
          ctx.fillStyle = '#fef08a';
          ctx.beginPath();
          ctx.moveTo(sx, sy - spSize);
          ctx.quadraticCurveTo(sx, sy, sx + spSize, sy);
          ctx.quadraticCurveTo(sx, sy, sx, sy + spSize);
          ctx.quadraticCurveTo(sx, sy, sx - spSize, sy);
          ctx.quadraticCurveTo(sx, sy, sx, sy - spSize);
          ctx.fill();
        }

        ctx.restore();
      });

      // Render Particles
      s.particles.forEach(p => {
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      });

      // Render Floating Combat Text (+20, notices)
      s.floatingTexts.forEach(ft => {
        ctx.fillStyle = ft.color;
        ctx.globalAlpha = Math.max(0, ft.alpha);
        ctx.font = '700 13px JetBrains Mono, monospace';
        ctx.textAlign = 'center';
        ctx.fillText(ft.text, ft.x, ft.y);
        ctx.globalAlpha = 1.0;
      });

      ctx.restore();

      animationFrameId = requestAnimationFrame(loop);
    };

    animationFrameId = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
    };
  }, [setupLayout, lang]);

  // Click & Touch Handlers
  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (phase !== 'PLAYING') return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    fireMissile(x, y);
  };

  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    sim.current.mousePos = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  };

  const handleCanvasTouch = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (phase !== 'PLAYING') return;
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas || e.touches.length === 0) return;
    const rect = canvas.getBoundingClientRect();
    const touch = e.touches[0];
    const x = touch.clientX - rect.left;
    const y = touch.clientY - rect.top;
    sim.current.mousePos = { x, y };
    fireMissile(x, y);
  };

  // Keyboard shortcut listener: 1, 2, 3 for batteries, Space/ESC for pause
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === '1') {
        setSelectedBattery(prev => (prev === 0 ? null : 0));
        sounds.playClick();
      } else if (e.key === '2') {
        setSelectedBattery(prev => (prev === 1 ? null : 1));
        sounds.playClick();
      } else if (e.key === '3') {
        setSelectedBattery(prev => (prev === 2 ? null : 2));
        sounds.playClick();
      } else if (e.key === '4') {
        setSelectedBattery(prev => (prev === 3 ? null : 3));
        sounds.playClick();
      } else if (e.key === 'Escape' || e.key === 'p' || e.key === 'P') {
        if (phase === 'PLAYING') {
          setPhase('PAUSED');
          sim.current.phase = 'PAUSED';
          sounds.playClick();
        } else if (phase === 'PAUSED') {
          setPhase('PLAYING');
          sim.current.phase = 'PLAYING';
          sounds.playClick();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [phase]);

  const togglePause = useCallback(() => {
    if (phase === 'PLAYING') {
      setPhase('PAUSED');
      sim.current.phase = 'PAUSED';
    } else if (phase === 'PAUSED') {
      setPhase('PLAYING');
      sim.current.phase = 'PLAYING';
    }
    sounds.playClick();
  }, [phase]);

  return {
    phase,
    setPhase,
    score,
    round,
    stats,
    selectedBattery,
    setSelectedBattery,
    canvasRef,
    handleCanvasClick,
    handleCanvasMouseMove,
    handleCanvasTouch,
    startNewGame,
    startNextWave,
    togglePause,
    roundSummary,
  };
}
