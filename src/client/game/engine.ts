import {
    CANVAS_WIDTH,
    CANVAS_HEIGHT,
    MAX_LEVEL,
    ACCEL,
    FRICTION,
    MAX_SPEED,
    DASH_SPEED,
    checkCollision,
} from './constants';
import type { GameState, GameScreenState } from './constants';
import { playSound } from './audio';

// --- HUD Callbacks Type ---
export type HudCallbacks = {
    setHudScore: (v: number) => void;
    setHudLives: (v: number) => void;
    setHudLevel: (v: number) => void;
    setPlayerHp: (v: number) => void;
    setHudWeapon: (v: string) => void;
    setBossHp: (v: number | null) => void;
    setBossMaxHp: (v: number) => void;
    setBossProgress: (v: number) => void;
    setDashCooldown: (v: number) => void;
    setShowWarning: (v: boolean) => void;
    setHudAutoFire: (v: boolean) => void;
    setHudHasMissiles: (v: boolean) => void;
    setGameState: (v: GameScreenState) => void;
};

// --- Initialize Stars ---
export const initStars = (s: GameState) => {
    const stars = [];
    for (let i = 0; i < 100; i++) {
        stars.push({
            x: Math.random() * CANVAS_WIDTH,
            y: Math.random() * CANVAS_HEIGHT,
            size: Math.random() * 2 + 0.5,
            speed: Math.random() * 5 + 1,
            brightness: Math.random(),
        });
    }
    s.stars = stars;
};

// --- Spawn Boss ---
export const spawnBoss = (
    s: GameState,
    isHardMode: boolean,
    hud: HudCallbacks
) => {
    s.bossActive = true;

    s.enemies.forEach((e) => {
        for (let k = 0; k < 8; k++)
            addParticles(
                s,
                e.x + (Math.random() - 0.5) * 20,
                e.y + (Math.random() - 0.5) * 20,
                '#ff5500',
                5
            );
    });
    if (s.enemies.length > 0) playSound('explosion');
    s.enemies = [];
    s.bullets = [];

    const baseHp = s.level === 1 ? 80 : 150;
    const multiplier = isHardMode ? 4 : 1;
    const maxHp = (baseHp + s.level * 90) * multiplier;
    const baseSize = 260 + s.level * 20;

    s.enemies.push({
        id: 9999,
        type: 'boss',
        x: CANVAS_WIDTH + 150,
        y: CANVAS_HEIGHT / 2 - 110,
        w: baseSize,
        h: baseSize,
        vx: -0.5,
        vy: 0,
        hp: maxHp,
        maxHp: maxHp,
        scoreValue: 5000 * s.level,
        hasDrop: true,
        isBoss: true,
        attackTimer: 0,
        phase: (s.level - 1) % 5,
        moveTimer: 0,
        targetY: CANVAS_HEIGHT / 2,
    });

    playSound('warning');
    playSound('boss_spawn');
    hud.setShowWarning(true);
    setTimeout(() => hud.setShowWarning(false), 3000);
    hud.setBossHp(maxHp);
    hud.setBossMaxHp(maxHp);
    hud.setBossProgress(100);
};

// --- Spawn Regular Enemy ---
export const spawnEnemy = (s: GameState) => {
    if (s.bossActive) return;

    const chance = Math.random();
    let type = 'fighter';
    let hp = 1;
    let w = 30,
        h = 30;
    let scoreVal = 100;
    let vy = 0;
    let vx = -(Math.random() * 3 + 2 + s.level * 0.5);

    if (s.level > 1 && chance > 0.6) {
        type = 'drone';
        hp = 2;
        w = 25;
        h = 25;
        scoreVal = 150;
        vy = Math.sin(Date.now() / 500) * 3;
        vx = -(Math.random() * 2 + 2);
    }
    if (s.level > 2 && chance > 0.8) {
        type = 'tank';
        hp = 5 + s.level;
        w = 45;
        h = 45;
        scoreVal = 400;
        vx = -1.5;
    }
    if (s.level > 1 && chance > 0.9) {
        type = 'kamikaze';
        hp = 1;
        w = 20;
        h = 20;
        scoreVal = 200;
        vx = -8;
    }
    if (s.level >= 3 && chance > 0.7 && chance <= 0.8) {
        type = 'stealth';
        hp = 2 + Math.floor(s.level / 2);
        w = 34;
        h = 16;
        scoreVal = 300;
        vx = -5 - s.level * 0.4;
    }
    if (s.level >= 3 && chance > 0.85 && chance <= 0.9) {
        type = 'bomber';
        hp = 8 + s.level;
        w = 50;
        h = 40;
        scoreVal = 600;
        vx = -2;
    }
    if (s.level >= 2 && chance > 0.4 && chance <= 0.5) {
        type = 'interceptor';
        hp = 2;
        w = 40;
        h = 12;
        scoreVal = 250;
        vx = -10;
    }
    if (s.level >= 4 && chance > 0.2 && chance <= 0.25) {
        type = 'turret';
        hp = 15;
        w = 40;
        h = 40;
        scoreVal = 500;
        vx = -0.5;
    }

    const hasDrop = Math.random() < 0.15;

    s.enemies.push({
        id: Math.random(),
        x: CANVAS_WIDTH + 50,
        y: Math.random() * (CANVAS_HEIGHT - 60) + 30,
        w,
        h,
        vx,
        vy,
        type,
        hp,
        maxHp: hp,
        scoreValue: scoreVal,
        hasDrop,
        attackTimer: Math.random() * 60,
    });
};

// --- Spawn PowerUp ---
const spawnPowerUp = (s: GameState, x: number, y: number) => {
    const rand = Math.random();
    let type: 'weapon' | 'health' | 'shield' | 'missile' = 'weapon';
    if (rand < 0.3) type = 'health';
    else if (rand < 0.5) type = 'shield';
    else if (rand < 0.7) type = 'missile';

    s.powerups.push({ x, y, w: 20, h: 20, vx: -1.5, vy: 0, type, ttl: 600 });
};

// --- Particles ---
export const addParticles = (
    s: GameState,
    x: number,
    y: number,
    color: string,
    count: number
) => {
    for (let i = 0; i < count; i++) {
        s.particles.push({
            x,
            y,
            w: 0,
            h: 0,
            vx: (Math.random() - 0.5) * 10,
            vy: (Math.random() - 0.5) * 10,
            life: Math.random() * 30 + 10,
            maxLife: 40,
            color,
            size: Math.random() * 3 + 1,
        });
    }
};

// --- Floating Text ---
export const addFloatingText = (
    s: GameState,
    x: number,
    y: number,
    text: string,
    color: string
) => {
    s.floatingTexts.push({ x, y, text, color, life: 60, vy: -1.5 });
};

// --- Toggle AutoFire ---
export const toggleAutoFire = (
    s: GameState,
    hud: HudCallbacks
) => {
    s.player.autoFire = !s.player.autoFire;
    hud.setHudAutoFire(s.player.autoFire);
};

// --- Main Update Loop ---
export const update = (
    s: GameState,
    gameState: GameScreenState,
    isHardMode: boolean,
    lastHpRef: { current: number },
    hud: HudCallbacks
) => {
    if (gameState !== 'playing') return;

    s.frames++;

    // Sync HP
    if (Math.ceil(s.player.hp) !== Math.ceil(lastHpRef.current)) {
        hud.setPlayerHp(Math.max(0, s.player.hp));
        lastHpRef.current = s.player.hp;
    }

    // Sync Dash Cooldown
    if (s.frames % 5 === 0)
        hud.setDashCooldown(
            Math.ceil((s.player.dashCooldown / 60) * 10) / 10
        );

    // Screen Shake
    if (s.shake > 0) s.shake *= 0.9;
    if (s.shake < 0.5) s.shake = 0;

    // DASH LOGIC
    if (s.player.dashCooldown > 0) s.player.dashCooldown--;
    if (s.player.dashDuration > 0) s.player.dashDuration--;

    if (
        (s.keys['Shift'] || s.keys['ShiftLeft']) &&
        s.player.dashCooldown <= 0
    ) {
        s.player.dashDuration = 10;
        s.player.dashCooldown = 60;
        playSound('dash');
        addParticles(s, s.player.x, s.player.y, '#3b82f6', 15);
    }

    // PHYSICS BASED MOVEMENT
    const isDashing = s.player.dashDuration > 0;
    const currentMaxSpeed = isDashing ? DASH_SPEED : MAX_SPEED;

    let dirX = 0;
    let dirY = 0;

    if (s.keys['ArrowUp'] || s.keys['w']) dirY -= 1;
    if (s.keys['ArrowDown'] || s.keys['s']) dirY += 1;
    if (s.keys['ArrowLeft'] || s.keys['a']) dirX -= 1;
    if (s.keys['ArrowRight'] || s.keys['d']) dirX += 1;

    // Touch Input
    if (s.touch.active) {
        const dx = s.touch.x - s.player.x;
        const dy = s.touch.y - s.player.y;
        const dist = Math.hypot(dx, dy);
        const deadzone = 10;

        if (dist > deadzone) {
            dirX = dx / dist;
            dirY = dy / dist;
            s.player.vx += dirX * (ACCEL * 1.5);
            s.player.vy += dirY * (ACCEL * 1.5);
        } else {
            s.player.vx *= 0.8;
            s.player.vy *= 0.8;
        }
    } else {
        s.player.vx += dirX * ACCEL;
        s.player.vy += dirY * ACCEL;
    }

    // Apply Friction
    s.player.vx *= FRICTION;
    s.player.vy *= FRICTION;

    // Clamp Velocity
    const speed = Math.hypot(s.player.vx, s.player.vy);
    if (speed > currentMaxSpeed) {
        s.player.vx = (s.player.vx / speed) * currentMaxSpeed;
        s.player.vy = (s.player.vy / speed) * currentMaxSpeed;
    }

    if (Math.abs(s.player.vx) < 0.1) s.player.vx = 0;
    if (Math.abs(s.player.vy) < 0.1) s.player.vy = 0;

    // Update Position
    s.player.x += s.player.vx;
    s.player.y += s.player.vy;

    // Boundary Checks
    if (s.player.x < s.player.w / 2) {
        s.player.x = s.player.w / 2;
        s.player.vx = 0;
    }
    if (s.player.x > CANVAS_WIDTH - s.player.w / 2) {
        s.player.x = CANVAS_WIDTH - s.player.w / 2;
        s.player.vx = 0;
    }
    if (s.player.y < s.player.h / 2) {
        s.player.y = s.player.h / 2;
        s.player.vy = 0;
    }
    if (s.player.y > CANVAS_HEIGHT - s.player.h / 2) {
        s.player.y = CANVAS_HEIGHT - s.player.h / 2;
        s.player.vy = 0;
    }

    // Dash Trail
    if (isDashing && s.frames % 2 === 0) {
        s.particles.push({
            x: s.player.x - s.player.vx,
            y: s.player.y - s.player.vy,
            w: s.player.w,
            h: s.player.h,
            vx: 0,
            vy: 0,
            life: 10,
            maxLife: 10,
            color: 'rgba(100, 200, 255, 0.4)',
            size: s.player.w,
        });
    }

    // Shooting
    if (s.player.fireCooldown > 0) s.player.fireCooldown--;
    const shouldShoot =
        (s.keys[' '] || s.player.autoFire) && s.player.fireCooldown <= 0;

    if (shouldShoot) {
        playSound('shoot');
        const fireRate = s.player.weaponLevel >= 1 ? 6 : 12;
        s.player.fireCooldown = fireRate;

        const bulletSpeed = 16;
        const laserSpeed = 24;

        if (s.player.weaponLevel === 2) {
            [-1, 0, 1].forEach((dir) => {
                s.bullets.push({
                    x: s.player.x + 20,
                    y: s.player.y,
                    w: 12,
                    h: 4,
                    vx: bulletSpeed,
                    vy: dir * 3,
                    owner: 'player',
                    damage: 1,
                    ttl: 100,
                });
            });
        } else if (s.player.weaponLevel === 3) {
            s.bullets.push({
                x: s.player.x + 20,
                y: s.player.y,
                w: 40,
                h: 6,
                vx: laserSpeed,
                vy: 0,
                owner: 'player',
                damage: 4,
                isLaser: true,
                ttl: 100,
                hitIds: [],
            });
        } else if (s.player.weaponLevel === 4) {
            s.bullets.push({
                x: s.player.x + 20,
                y: s.player.y,
                w: 16,
                h: 8,
                vx: bulletSpeed,
                vy: 0,
                owner: 'player',
                damage: 2,
                isWave: true,
                ttl: 100,
                initialY: s.player.y,
                hitIds: [],
            });
        } else if (s.player.weaponLevel === 5) {
            s.bullets.push({
                x: s.player.x + 20,
                y: s.player.y,
                w: 20,
                h: 20,
                vx: 12,
                vy: 0,
                owner: 'player',
                damage: 6,
                isPlasma: true,
                ttl: 200,
                hitIds: [],
            });
        } else {
            s.bullets.push({
                x: s.player.x + 20,
                y: s.player.y,
                w: 12,
                h: 4,
                vx: bulletSpeed,
                vy: 0,
                owner: 'player',
                damage: 1,
                ttl: 100,
            });
        }
    }

    // Missiles
    if (s.player.hasMissiles) {
        if (s.player.missileCooldown > 0) s.player.missileCooldown--;
        if (s.player.missileCooldown <= 0 && s.enemies.length > 0) {
            s.player.missileCooldown = 45;
            playSound('missile');
            let targetId = -1;
            let minDist = 99999;
            s.enemies.forEach((e) => {
                const dist = Math.hypot(
                    e.x - s.player.x,
                    e.y - s.player.y
                );
                if (dist < minDist) {
                    minDist = dist;
                    targetId = e.id;
                }
            });
            if (targetId !== -1) {
                s.bullets.push({
                    x: s.player.x,
                    y: s.player.y - 10,
                    w: 10,
                    h: 6,
                    vx: 5,
                    vy: -5,
                    owner: 'player',
                    damage: 8,
                    ttl: 150,
                    isMissile: true,
                    targetId: targetId,
                });
            }
        }
    }

    // Auto Fire Toggle
    if (s.keys['e'] || s.keys['E']) {
        if (!s.keys['e_lock']) {
            toggleAutoFire(s, hud);
            s.keys['e_lock'] = true;
        }
    } else {
        s.keys['e_lock'] = false;
    }

    if (s.player.invincibleTimer > 0) s.player.invincibleTimer--;

    // Stars
    s.stars.forEach((star) => {
        star.x -= star.speed;
        if (star.x < 0) {
            star.x = CANVAS_WIDTH;
            star.y = Math.random() * CANVAS_HEIGHT;
        }
    });

    // Spawning Enemies / Boss Check
    if (!s.bossActive) {
        const threshold = isHardMode ? 80 : 40;
        if (s.frames % 15 === 0)
            hud.setBossProgress(
                Math.min(100, (s.levelProgress / threshold) * 100)
            );

        const spawnRate = Math.max(15, 25 - s.level * 3);

        if (s.levelProgress >= threshold) {
            spawnBoss(s, isHardMode, hud);
        } else if (s.frames % spawnRate === 0) {
            spawnEnemy(s);
        }
    }

    // Bullets
    for (let i = s.bullets.length - 1; i >= 0; i--) {
        const b = s.bullets[i]!;

        if (b.isWave) {
            b.x += b.vx;
            b.y = (b.initialY || b.y) + Math.sin(s.frames * 0.2) * 50;
        } else if (
            b.isMissile &&
            b.owner === 'player' &&
            b.targetId !== undefined
        ) {
            const target = s.enemies.find((e) => e.id === b.targetId);
            if (target) {
                const dx = target.x - b.x;
                const dy = target.y - b.y;
                const dist = Math.hypot(dx, dy);
                if (dist > 0) {
                    b.vx += (dx / dist) * 0.8;
                    b.vy += (dy / dist) * 0.8;
                    const spd = Math.hypot(b.vx, b.vy);
                    if (spd > 12) {
                        b.vx = (b.vx / spd) * 12;
                        b.vy = (b.vy / spd) * 12;
                    }
                }
            }
            b.x += b.vx;
            b.y += b.vy;
            if (s.frames % 4 === 0)
                s.particles.push({
                    x: b.x,
                    y: b.y,
                    w: 0,
                    h: 0,
                    vx: 0,
                    vy: 0,
                    life: 20,
                    maxLife: 20,
                    color: '#888',
                    size: 3,
                });
        } else if (b.isMissile && b.owner === 'enemy') {
            const dx = s.player.x - b.x;
            const dy = s.player.y - b.y;
            const dist = Math.hypot(dx, dy);
            if (dist > 0) {
                b.vx += (dx / dist) * 0.3;
                b.vy += (dy / dist) * 0.3;
                const spd = Math.hypot(b.vx, b.vy);
                if (spd > 6) {
                    b.vx = (b.vx / spd) * 6;
                    b.vy = (b.vy / spd) * 6;
                }
            }
            b.x += b.vx;
            b.y += b.vy;
            if (s.frames % 6 === 0)
                s.particles.push({
                    x: b.x,
                    y: b.y,
                    w: 0,
                    h: 0,
                    vx: 0,
                    vy: 0,
                    life: 15,
                    maxLife: 15,
                    color: '#ff0000',
                    size: 2,
                });
        } else {
            b.x += b.vx;
            b.y += b.vy;
        }

        b.ttl--;

        // Bullet Collisions
        if (b.owner === 'player') {
            let hit = false;
            for (let j = s.enemies.length - 1; j >= 0; j--) {
                const e = s.enemies[j]!;
                if (checkCollision(b, e)) {
                    if (b.hitIds && b.hitIds.includes(e.id)) continue;
                    if (b.hitIds) b.hitIds.push(e.id);

                    hit = true;
                    e.hp -= b.damage;
                    addParticles(s, b.x, b.y, '#ffff00', 3);
                    playSound('hit');

                    if (e.hp <= 0) {
                        s.enemies.splice(j, 1);
                        playSound('explosion');

                        s.score += e.scoreValue;
                        hud.setHudScore(s.score);

                        s.levelProgress++;
                        addParticles(s, e.x, e.y, '#ff5500', 10);
                        addFloatingText(s, e.x, e.y, `+${e.scoreValue}`, '#fff');
                        if (e.hasDrop) spawnPowerUp(s, e.x, e.y);

                        if (e.isBoss) {
                            s.bossActive = false;
                            hud.setBossHp(null);
                            hud.setBossMaxHp(1);
                            hud.setBossProgress(0);
                            s.levelProgress = 0;
                            s.enemies = [];
                            s.bullets = [];
                            i = -1;

                            if (s.level >= MAX_LEVEL) {
                                hud.setGameState('victory');
                            } else {
                                s.level++;
                                hud.setHudLevel(s.level);
                                playSound('level_up');
                                addFloatingText(
                                    s,
                                    CANVAS_WIDTH / 2,
                                    CANVAS_HEIGHT / 2,
                                    `LEVEL ${s.level}`,
                                    '#ffff00'
                                );
                            }
                            for (let k = 0; k < 8; k++)
                                addParticles(
                                    s,
                                    e.x + Math.random() * 100 - 50,
                                    e.y + Math.random() * 100 - 50,
                                    '#ffaa00',
                                    25
                                );
                            break;
                        }
                    }
                    break;
                }
            }
            if (hit && !b.isLaser && !b.isPlasma && !b.isBeam) b.ttl = 0;
        } else {
            if (
                s.player.invincibleTimer <= 0 &&
                checkCollision(b, s.player) &&
                !b.isBeam
            ) {
                s.player.hp -= b.damage;
                s.player.invincibleTimer = 60;
                s.shake = 10;
                playSound('hit');
                addParticles(s, s.player.x, s.player.y, '#ff0000', 10);
                b.ttl = 0;
            }
        }

        // Beam Collision
        if (b.isBeam && checkCollision(s.player, b)) {
            if (s.player.invincibleTimer <= 0) {
                s.player.hp -= 30;
                s.player.invincibleTimer = 60;
                s.shake = 15;
                playSound('hit');
                addParticles(s, s.player.x, s.player.y, '#ff0000', 15);
            }
        }

        // Bomb
        if (b.isBomb && b.ttl <= 10) {
            for (let k = 0; k < 8; k++) {
                const angle = ((Math.PI * 2) / 8) * k;
                s.bullets.push({
                    x: b.x,
                    y: b.y,
                    w: 6,
                    h: 6,
                    vx: Math.cos(angle) * 5,
                    vy: Math.sin(angle) * 5,
                    owner: 'enemy',
                    damage: 10,
                    ttl: 40,
                });
            }
            playSound('explosion');
            s.bullets.splice(i, 1);
            addParticles(s, b.x, b.y, '#ff00ff', 8);
            continue;
        }

        if (
            !b.isBeam &&
            (b.x > CANVAS_WIDTH + 50 ||
                b.x < -50 ||
                b.y > CANVAS_HEIGHT + 50 ||
                b.y < -50 ||
                b.ttl <= 0)
        ) {
            s.bullets.splice(i, 1);
        } else if (b.isBeam && b.ttl <= 0) {
            s.bullets.splice(i, 1);
        }
    }

    // Enemies
    for (let i = s.enemies.length - 1; i >= 0; i--) {
        const e = s.enemies[i]!;
        e.x += e.vx;
        e.y += e.vy;
        e.y = Math.max(e.h / 2, Math.min(CANVAS_HEIGHT - e.h / 2, e.y));
        if (e.attackTimer !== undefined) e.attackTimer++;

        if (e.type === 'kamikaze') {
            const dy = s.player.y - e.y;
            e.vy = dy * 0.04;
        } else if (e.type === 'interceptor') {
            e.vy = Math.cos(s.frames * 0.1) * 4;
        } else if (e.type === 'boss') {
            const targetX = CANVAS_WIDTH - 200;

            if (e.isCharging || e.isFiring) {
                e.vx = 0;
                e.vy = 0;
                if (e.isCharging) {
                    e.x += (Math.random() - 0.5) * 2;
                    e.y += (Math.random() - 0.5) * 2;
                }
            } else if (e.x > targetX) {
                e.vx = -2;
                e.vy = 0;
            } else {
                e.vx = 0;
                e.x = targetX;

                if (e.moveTimer === undefined) e.moveTimer = 0;
                if (e.moveTimer <= 0) {
                    e.moveTimer = Math.random() * 60 + 60;
                    e.targetY = 100 + Math.random() * (CANVAS_HEIGHT - 200);
                }
                e.moveTimer--;

                const dy = (e.targetY ?? CANVAS_HEIGHT / 2) - e.y;
                e.vy = dy * 0.05;
            }

            if (e.y < 80) e.y = 80;
            if (e.y > CANVAS_HEIGHT - 80) e.y = CANVAS_HEIGHT - 80;

            if (s.frames % 5 === 0) hud.setBossHp(e.hp);

            if (!e.attackTimer) e.attackTimer = 0;

            if (!e.isCharging && !e.isFiring) {
                if (e.attackTimer % 60 === 0) {
                    s.bullets.push({
                        x: e.x - e.w / 2,
                        y: e.y,
                        w: 16,
                        h: 16,
                        vx: -8,
                        vy: 0,
                        owner: 'enemy',
                        damage: 15,
                        ttl: 200,
                    });
                    playSound('enemy_shoot');
                }

                if (s.level >= 2 && e.attackTimer % 180 === 0) {
                    playSound('missile');
                    s.bullets.push({
                        x: e.x,
                        y: e.y - 30,
                        w: 10,
                        h: 10,
                        vx: -2,
                        vy: -5,
                        owner: 'enemy',
                        damage: 20,
                        ttl: 300,
                        isMissile: true,
                    });
                    s.bullets.push({
                        x: e.x,
                        y: e.y + 30,
                        w: 10,
                        h: 10,
                        vx: -2,
                        vy: 5,
                        owner: 'enemy',
                        damage: 20,
                        ttl: 300,
                        isMissile: true,
                    });
                }

                if (
                    s.level >= 3 &&
                    e.attackTimer % 240 > 200 &&
                    e.attackTimer % 5 === 0
                ) {
                    const offset = (e.attackTimer % 240) - 200;
                    const angle = Math.sin(offset * 0.1) * 0.5;
                    s.bullets.push({
                        x: e.x - 40,
                        y: e.y,
                        w: 8,
                        h: 8,
                        vx: Math.cos(angle + Math.PI) * 10,
                        vy: Math.sin(angle) * 10,
                        owner: 'enemy',
                        damage: 10,
                        ttl: 200,
                    });
                }

                if (s.level >= 4 && e.attackTimer % 400 === 0) {
                    for (let k = 0; k < 12; k++) {
                        const a = ((Math.PI * 2) / 12) * k;
                        s.bullets.push({
                            x: e.x,
                            y: e.y,
                            w: 8,
                            h: 8,
                            vx: Math.cos(a) * 6,
                            vy: Math.sin(a) * 6,
                            owner: 'enemy',
                            damage: 12,
                            ttl: 200,
                        });
                    }
                    playSound('explosion');
                }
            }

            if (s.level >= 5) {
                if (
                    !e.isCharging &&
                    !e.isFiring &&
                    e.attackTimer % 600 === 0
                ) {
                    e.isCharging = true;
                    e.chargeTimer = 90;
                    playSound('beam_charge');
                }

                if (e.isCharging) {
                    e.chargeTimer = (e.chargeTimer ?? 0) - 1;
                    if (e.chargeTimer! <= 0) {
                        e.isCharging = false;
                        e.isFiring = true;
                        e.fireTimer = 300;

                        const beamWidth = e.x + 200;
                        s.bullets.push({
                            x: e.x - beamWidth,
                            y: e.y,
                            w: beamWidth,
                            h: 40,
                            vx: 0,
                            vy: 0,
                            owner: 'enemy',
                            damage: 30,
                            ttl: 300,
                            isBeam: true,
                        });
                        playSound('beam_thunder');
                    }
                }

                if (e.isFiring) {
                    e.fireTimer = (e.fireTimer ?? 0) - 1;
                    if (e.fireTimer! <= 0) {
                        e.isFiring = false;
                    }
                }
            }
        }

        // Regular Enemy Shooting
        if (
            !e.isBoss &&
            e.type !== 'kamikaze' &&
            Math.random() < 0.02 * s.level
        ) {
            if (e.type === 'tank' || e.type === 'turret') {
                [-0.5, 0, 0.5].forEach((d) => {
                    s.bullets.push({
                        x: e.x,
                        y: e.y,
                        w: 8,
                        h: 8,
                        vx: -6,
                        vy: d,
                        owner: 'enemy',
                        damage: 10,
                        ttl: 200,
                    });
                });
                playSound('enemy_shoot');
            } else if (e.type === 'bomber') {
                s.bullets.push({
                    x: e.x,
                    y: e.y,
                    w: 12,
                    h: 12,
                    vx: -3,
                    vy: 0,
                    owner: 'enemy',
                    damage: 15,
                    ttl: 80,
                    isBomb: true,
                });
                playSound('enemy_shoot');
            } else if (e.type !== 'stealth' && e.type !== 'interceptor') {
                s.bullets.push({
                    x: e.x - 10,
                    y: e.y,
                    w: 8,
                    h: 8,
                    vx: -8,
                    vy: 0,
                    owner: 'enemy',
                    damage: 10,
                    ttl: 200,
                });
                playSound('enemy_shoot');
            }
        }

        if (e.type === 'stealth' && Math.random() < 0.02) {
            s.bullets.push({
                x: e.x - 10,
                y: e.y,
                w: 6,
                h: 4,
                vx: -11,
                vy: 0,
                owner: 'enemy',
                damage: 8,
                ttl: 200,
            });
            playSound('shoot');
        }

        // Player-Enemy Collision
        if (checkCollision(s.player, e)) {
            if (s.player.invincibleTimer <= 0) {
                s.player.hp -= 20;
                s.player.invincibleTimer = 60;
                s.shake = 10;
                playSound('hit');
                addParticles(s, s.player.x, s.player.y, '#ff0000', 10);
            }
        }

        if (e.x < -150) s.enemies.splice(i, 1);
    }

    // Powerups
    for (let i = s.powerups.length - 1; i >= 0; i--) {
        const p = s.powerups[i]!;
        p.x += p.vx;
        if (checkCollision(s.player, p)) {
            playSound('powerup');
            if (p.type === 'weapon') {
                s.player.weaponLevel = Math.min(5, s.player.weaponLevel + 1);
                let wName = 'NORMAL';
                if (s.player.weaponLevel === 1) wName = 'RAPID';
                if (s.player.weaponLevel === 2) wName = 'SPREAD';
                if (s.player.weaponLevel === 3) wName = 'LASER';
                if (s.player.weaponLevel === 4) wName = 'WAVE';
                if (s.player.weaponLevel === 5) wName = 'PLASMA';
                s.weaponName = wName;
                hud.setHudWeapon(wName);
                addFloatingText(
                    s,
                    s.player.x,
                    s.player.y - 20,
                    'WEAPON UP!',
                    '#00ff00'
                );
            } else if (p.type === 'health') {
                s.player.hp = Math.min(100, s.player.hp + 30);
                addFloatingText(
                    s,
                    s.player.x,
                    s.player.y - 20,
                    'HP +30',
                    '#ff0000'
                );
            } else if (p.type === 'shield') {
                s.player.invincibleTimer = 300;
                addFloatingText(
                    s,
                    s.player.x,
                    s.player.y - 20,
                    'SHIELD',
                    '#00ffff'
                );
            } else if (p.type === 'missile') {
                s.player.hasMissiles = true;
                hud.setHudHasMissiles(true);
                addFloatingText(
                    s,
                    s.player.x,
                    s.player.y - 20,
                    'MISSILES!',
                    '#ffaa00'
                );
            }
            s.powerups.splice(i, 1);
        } else if (p.x < -50) s.powerups.splice(i, 1);
    }

    // Particles Update
    for (let i = s.particles.length - 1; i >= 0; i--) {
        const p = s.particles[i]!;
        p.x += p.vx;
        p.y += p.vy;
        p.life--;
        if (p.life <= 0) s.particles.splice(i, 1);
    }

    // Floating Text Update
    for (let i = s.floatingTexts.length - 1; i >= 0; i--) {
        const t = s.floatingTexts[i]!;
        t.y += t.vy;
        t.life--;
        if (t.life <= 0) s.floatingTexts.splice(i, 1);
    }

    // Check Player Death
    if (s.player.hp <= 0 && gameState === 'playing') {
        if (s.lives > 1) {
            s.lives -= 1;
            hud.setHudLives(s.lives);
            hud.setPlayerHp(100);
            s.player.hp = 100;
            s.player.x = 100;
            s.player.y = 300;
            s.player.invincibleTimer = 180;
            s.player.vx = 0;
            s.player.vy = 0;

            s.bossActive = false;
            hud.setBossHp(null);
            hud.setBossMaxHp(1);
            hud.setBossProgress(0);

            s.enemies = [];
            s.bullets = [];
            playSound('explosion');
        } else {
            hud.setHudLives(0);
            hud.setGameState('gameover');
        }
    }
};
