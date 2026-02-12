// --- Game Constants ---
export const FPS = 60;
export const MAX_LEVEL = 5;
export const ACCEL = 0.8;
export const FRICTION = 0.92;
export const MAX_SPEED = 8;
export const DASH_SPEED = 20;

// --- Canvas dimensions (mutable, updated on resize) ---
export let CANVAS_WIDTH = window.innerWidth;
export let CANVAS_HEIGHT = window.innerHeight;

export const setCanvasSize = (w: number, h: number) => {
    CANVAS_WIDTH = w;
    CANVAS_HEIGHT = h;
};

// --- Types ---
export type Player = {
    x: number;
    y: number;
    w: number;
    h: number;
    vx: number;
    vy: number;
    hp: number;
    maxHp: number;
    invincibleTimer: number;
    fireCooldown: number;
    missileCooldown: number;
    weaponLevel: number;
    dashCooldown: number;
    dashDuration: number;
    hasMissiles: boolean;
    autoFire: boolean;
};

export type Enemy = {
    id: number;
    type: string;
    x: number;
    y: number;
    w: number;
    h: number;
    vx: number;
    vy: number;
    hp: number;
    maxHp: number;
    scoreValue: number;
    hasDrop: boolean;
    attackTimer: number;
    isBoss?: boolean;
    phase?: number;
    moveTimer?: number;
    targetY?: number;
    isCharging?: boolean;
    isFiring?: boolean;
    chargeTimer?: number;
    fireTimer?: number;
};

export type Bullet = {
    x: number;
    y: number;
    w: number;
    h: number;
    vx: number;
    vy: number;
    owner: 'player' | 'enemy';
    damage: number;
    ttl: number;
    isLaser?: boolean;
    isWave?: boolean;
    isPlasma?: boolean;
    isMissile?: boolean;
    isBeam?: boolean;
    isBomb?: boolean;
    targetId?: number;
    initialY?: number;
    hitIds?: number[];
};

export type Particle = {
    x: number;
    y: number;
    w: number;
    h: number;
    vx: number;
    vy: number;
    life: number;
    maxLife: number;
    color: string;
    size: number;
};

export type PowerUp = {
    x: number;
    y: number;
    w: number;
    h: number;
    vx: number;
    vy: number;
    type: 'weapon' | 'health' | 'shield' | 'missile';
    ttl: number;
};

export type FloatingText = {
    x: number;
    y: number;
    text: string;
    color: string;
    life: number;
    vy: number;
};

export type Star = {
    x: number;
    y: number;
    size: number;
    speed: number;
    brightness: number;
};

export type TouchState = {
    active: boolean;
    x: number;
    y: number;
};

export type GameScreenState =
    | 'start'
    | 'playing'
    | 'paused'
    | 'gameover'
    | 'victory';

export type GameState = {
    frames: number;
    shake: number;
    levelProgress: number;
    bossActive: boolean;
    score: number;
    lives: number;
    level: number;
    weaponName: string;
    player: Player;
    enemies: Enemy[];
    bullets: Bullet[];
    particles: Particle[];
    powerups: PowerUp[];
    floatingTexts: FloatingText[];
    stars: Star[];
    keys: Record<string, boolean>;
    touch: TouchState;
};

// --- Collision Detection ---
export const checkCollision = (
    e1: { x: number; y: number; w: number; h: number },
    e2: { x: number; y: number; w: number; h: number }
): boolean => {
    return (
        Math.abs(e1.x - e2.x) < (e1.w + e2.w) / 2 &&
        Math.abs(e1.y - e2.y) < (e1.h + e2.h) / 2
    );
};

// --- Initial State Factory ---
export const createInitialGameState = (): GameState => ({
    frames: 0,
    shake: 0,
    levelProgress: 0,
    bossActive: false,
    score: 0,
    lives: 3,
    level: 1,
    weaponName: 'NORMAL',
    player: {
        x: 100,
        y: 300,
        w: 36,
        h: 24,
        vx: 0,
        vy: 0,
        hp: 100,
        maxHp: 100,
        invincibleTimer: 0,
        fireCooldown: 0,
        missileCooldown: 0,
        weaponLevel: 0,
        dashCooldown: 0,
        dashDuration: 0,
        hasMissiles: false,
        autoFire: false,
    },
    enemies: [],
    bullets: [],
    particles: [],
    powerups: [],
    floatingTexts: [],
    stars: [],
    keys: {},
    touch: { active: false, x: 0, y: 0 },
});
