import { CANVAS_WIDTH, CANVAS_HEIGHT } from './constants';
import type { GameState } from './constants';

// --- Main Draw Function ---
export const draw = (ctx: CanvasRenderingContext2D, s: GameState) => {
    ctx.fillStyle = '#111';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Shine helper
    const drawShine = (w: number, h: number, isRect = false) => {
        const cycle = 30;
        const t = s.frames % cycle;
        const duration = 15;
        if (t < duration) {
            ctx.save();
            if (isRect) {
                ctx.beginPath();
                ctx.rect(-w / 2, -h / 2, w, h);
            }
            ctx.clip();
            const progress = t / duration;
            const offset = progress * (w * 3) - w * 1.5;
            const grad = ctx.createLinearGradient(offset, -h, offset + w * 0.5, h);
            grad.addColorStop(0, 'rgba(255,255,255,0)');
            grad.addColorStop(0.5, 'rgba(255,255,255,0.8)');
            grad.addColorStop(1, 'rgba(255,255,255,0)');
            ctx.fillStyle = grad;
            ctx.globalCompositeOperation = 'source-atop';
            ctx.fillRect(-w, -h, w * 2, h * 2);
            ctx.restore();
        }
    };

    ctx.save();
    if (s.shake > 0) {
        const dx = (Math.random() - 0.5) * s.shake;
        const dy = (Math.random() - 0.5) * s.shake;
        ctx.translate(dx, dy);
    }

    // Stars
    s.stars.forEach((star) => {
        ctx.fillStyle = `rgba(255, 255, 255, ${star.brightness})`;
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
        ctx.fill();
    });

    // Player
    if (s.player.invincibleTimer % 4 < 2) {
        ctx.save();
        ctx.translate(s.player.x, s.player.y);

        const tilt = s.player.vy * 0.05;
        ctx.rotate(tilt);

        ctx.shadowBlur = 15;
        ctx.shadowColor = '#3b82f6';

        // Wings
        ctx.fillStyle = '#1e3a8a';
        ctx.beginPath();
        ctx.moveTo(-18, -8);
        ctx.lineTo(-28, -14);
        ctx.lineTo(-24, 0);
        ctx.lineTo(-28, 14);
        ctx.lineTo(-18, 8);
        ctx.fill();

        // Main Body Gradient
        const grad = ctx.createLinearGradient(-20, 0, 20, 0);
        grad.addColorStop(0, '#1d4ed8');
        grad.addColorStop(0.5, '#60a5fa');
        grad.addColorStop(1, '#1d4ed8');
        ctx.fillStyle = grad;

        ctx.beginPath();
        ctx.moveTo(22, 0);
        ctx.lineTo(-14, -10);
        ctx.lineTo(-14, 10);
        ctx.closePath();
        ctx.fill();

        // Detail lines
        ctx.strokeStyle = 'rgba(255,255,255,0.2)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(-10, -8);
        ctx.lineTo(10, -2);
        ctx.moveTo(-10, 8);
        ctx.lineTo(10, 2);
        ctx.stroke();

        // Cockpit
        ctx.fillStyle = '#111';
        ctx.beginPath();
        ctx.ellipse(2, 0, 6, 3, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = 'rgba(100, 240, 255, 0.9)';
        ctx.beginPath();
        ctx.ellipse(1, -1, 3, 1.5, 0, 0, Math.PI * 2);
        ctx.fill();

        // Thruster Flame
        const isDashingDraw = s.player.dashDuration > 0;
        const flicker = Math.random() * 5;

        ctx.fillStyle = isDashingDraw ? '#ffffff' : '#f59e0b';
        ctx.shadowColor = isDashingDraw ? '#ffffff' : '#f59e0b';
        ctx.beginPath();
        ctx.moveTo(-15, -3);
        ctx.lineTo(-25 - flicker - (isDashingDraw ? 25 : 0), 0);
        ctx.lineTo(-15, 3);
        ctx.fill();

        ctx.fillStyle = isDashingDraw
            ? 'rgba(59, 130, 246, 0.5)'
            : 'rgba(239, 68, 68, 0.4)';
        ctx.beginPath();
        ctx.moveTo(-14, -5);
        ctx.lineTo(-28 - flicker - (isDashingDraw ? 30 : 0), 0);
        ctx.lineTo(-14, 5);
        ctx.fill();

        // Missile Indicators
        if (s.player.hasMissiles) {
            ctx.fillStyle = '#ff6600';
            ctx.fillRect(-6, -11, 8, 2);
            ctx.fillRect(-6, 9, 8, 2);
        }

        ctx.restore();
    }

    // Shield
    if (s.player.invincibleTimer > 60) {
        ctx.strokeStyle = `rgba(0, 255, 255, ${Math.abs(Math.sin(s.frames / 10))})`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(s.player.x, s.player.y, 25, 0, Math.PI * 2);
        ctx.stroke();
    }

    // Enemies
    s.enemies.forEach((e) => {
        ctx.save();
        ctx.translate(e.x, e.y);

        if (e.hasDrop) {
            ctx.shadowColor = '#fbbf24';
            ctx.shadowBlur = 40;
        }

        if (e.isBoss) {
            drawBoss(ctx, e, s, drawShine);
        } else if (e.type === 'fighter') {
            drawFighter(ctx, e, s, drawShine);
        } else if (e.type === 'drone') {
            drawDrone(ctx, e, s, drawShine);
        } else if (e.type === 'tank') {
            drawTank(ctx, e, s, drawShine);
        } else if (e.type === 'kamikaze') {
            drawKamikaze(ctx, e, s, drawShine);
        } else if (e.type === 'interceptor') {
            drawInterceptor(ctx, e, drawShine);
        } else if (e.type === 'turret') {
            drawTurret(ctx, e, s, drawShine);
        } else if (e.type === 'stealth') {
            drawStealth(ctx, e, drawShine);
        } else if (e.type === 'bomber') {
            drawBomber(ctx, e, drawShine);
        } else {
            ctx.fillStyle = '#ef4444';
            ctx.fillRect(-e.w / 2, -e.h / 2, e.w, e.h);
        }
        ctx.restore();
    });

    // Powerups
    s.powerups.forEach((p) => {
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.fillStyle =
            p.type === 'weapon'
                ? '#7fffbf'
                : p.type === 'health'
                    ? '#ff6b6b'
                    : p.type === 'shield'
                        ? '#9fbfd6'
                        : '#ffd37a';
        ctx.beginPath();
        ctx.arc(10, 10, 8, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#111';
        ctx.font = 'bold 10px monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const label =
            p.type === 'weapon'
                ? 'W'
                : p.type === 'health'
                    ? '+'
                    : p.type === 'shield'
                        ? 'S'
                        : 'M';
        ctx.fillText(label, 10, 10);
        ctx.restore();
    });

    // Bullets
    s.bullets.forEach((b) => {
        if (b.isBeam) {
            drawBeam(ctx, b, s);
            return;
        }

        if (b.isMissile) {
            drawMissile(ctx, b, s);
        } else {
            const isPlayer = b.owner === 'player';
            if (isPlayer) {
                ctx.fillStyle = b.isPlasma
                    ? '#a855f7'
                    : b.isWave
                        ? '#00ffcc'
                        : b.isLaser
                            ? '#00ffff'
                            : '#bfe7ff';
                if (b.isLaser) {
                    ctx.shadowBlur = 10;
                    ctx.shadowColor = '#00ffff';
                    ctx.fillRect(b.x, b.y - b.h / 2, b.w, b.h);
                    ctx.shadowBlur = 0;
                } else if (b.isPlasma) {
                    ctx.beginPath();
                    ctx.arc(b.x + b.w / 2, b.y + b.h / 2, 8, 0, Math.PI * 2);
                    ctx.fill();
                } else if (b.isBomb) {
                    ctx.fillStyle = '#ff00ff';
                    ctx.beginPath();
                    ctx.arc(
                        b.x + b.w / 2,
                        b.y + b.h / 2,
                        6 + Math.sin(s.frames * 0.5) * 2,
                        0,
                        Math.PI * 2
                    );
                    ctx.fill();
                } else {
                    ctx.fillRect(b.x - b.w / 2, b.y - b.h / 2, b.w, b.h);
                }
            } else {
                ctx.fillStyle = '#ef4444';
                ctx.shadowColor = '#dc2626';
                ctx.shadowBlur = 8;
                ctx.beginPath();
                ctx.arc(b.x, b.y, b.w / 2 + 1, 0, Math.PI * 2);
                ctx.fill();
                ctx.fillStyle = '#fecaca';
                ctx.beginPath();
                ctx.arc(b.x, b.y, b.w / 4, 0, Math.PI * 2);
                ctx.fill();
                ctx.shadowBlur = 0;
            }
        }
    });

    // Particles
    s.particles.forEach((p) => {
        ctx.globalAlpha = p.life / p.maxLife;
        ctx.fillStyle = p.color;
        if (p.w > 0) {
            ctx.fillRect(p.x - p.w / 2, p.y - p.h / 2, p.w, p.h);
        } else {
            ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
        }
    });
    ctx.globalAlpha = 1;

    // Floating Texts
    ctx.font = 'bold 16px "Share Tech Mono"';
    ctx.textAlign = 'center';
    s.floatingTexts.forEach((t) => {
        ctx.fillStyle = t.color;
        ctx.globalAlpha = t.life / 60;
        ctx.fillText(t.text, t.x, t.y);
    });
    ctx.globalAlpha = 1;

    ctx.restore();
};

// --- Enemy Renderers ---
type ShineFunc = (w: number, h: number, isRect?: boolean) => void;
type EnemyLike = {
    x: number;
    y: number;
    w: number;
    h: number;
    hasDrop: boolean;
    phase?: number;
    isCharging?: boolean;
    isFiring?: boolean;
    isBoss?: boolean;
};

const drawFighter = (
    ctx: CanvasRenderingContext2D,
    e: EnemyLike,
    _s: GameState,
    drawShine: ShineFunc
) => {
    ctx.save();
    ctx.scale(-1, 1);
    ctx.strokeStyle = '#3b82f6';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(15, 0);
    ctx.quadraticCurveTo(0, -10, -10, -15);
    ctx.lineTo(-5, 0);
    ctx.lineTo(-10, 15);
    ctx.quadraticCurveTo(0, 10, 15, 0);
    ctx.stroke();
    ctx.fillStyle = '#60a5fa';
    ctx.beginPath();
    ctx.arc(-2, 0, 3, 0, Math.PI * 2);
    ctx.fill();
    if (e.hasDrop) drawShine(20, 20);
    ctx.restore();
};

const drawDrone = (
    ctx: CanvasRenderingContext2D,
    e: EnemyLike,
    s: GameState,
    drawShine: ShineFunc
) => {
    ctx.save();
    ctx.rotate(s.frames * 0.1);
    ctx.strokeStyle = '#9ca3af';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, 0, 12, 0.5, Math.PI * 1.8);
    ctx.stroke();
    ctx.restore();
    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    ctx.arc(0, 0, 4, 0, Math.PI * 2);
    ctx.fill();
    if (e.hasDrop) drawShine(20, 20);
};

const drawTank = (
    ctx: CanvasRenderingContext2D,
    e: EnemyLike,
    s: GameState,
    drawShine: ShineFunc
) => {
    ctx.fillStyle = '#166534';
    ctx.beginPath();
    ctx.arc(0, 0, 12, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#14532d';
    ctx.lineWidth = 3;
    const legOffset = Math.sin(s.frames * 0.1) * 3;
    for (let i = 0; i < 4; i++) {
        const angle = Math.PI / 4 + (Math.PI / 2) * i;
        ctx.beginPath();
        ctx.moveTo(Math.cos(angle) * 10, Math.sin(angle) * 10);
        ctx.lineTo(
            Math.cos(angle) * 22,
            Math.sin(angle) * 22 + legOffset * (i % 2 === 0 ? 1 : -1)
        );
        ctx.stroke();
    }
    ctx.fillStyle = '#22c55e';
    ctx.beginPath();
    ctx.arc(0, -5, 6, 0, Math.PI * 2);
    ctx.fill();
    if (e.hasDrop) drawShine(30, 30);
};

const drawKamikaze = (
    ctx: CanvasRenderingContext2D,
    e: EnemyLike,
    s: GameState,
    drawShine: ShineFunc
) => {
    ctx.fillStyle = '#991b1b';
    ctx.beginPath();
    ctx.arc(0, 0, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ef4444';
    for (let k = 0; k < 8; k++) {
        const a = s.frames * 0.05 + (Math.PI / 4) * k;
        ctx.beginPath();
        ctx.moveTo(Math.cos(a) * 10, Math.sin(a) * 10);
        ctx.lineTo(Math.cos(a) * 18, Math.sin(a) * 18);
        ctx.lineTo(Math.cos(a + 0.1) * 10, Math.sin(a + 0.1) * 10);
        ctx.fill();
    }
    ctx.fillStyle = `rgba(255, 100, 100, ${0.5 + Math.sin(s.frames * 0.2) * 0.5})`;
    ctx.beginPath();
    ctx.arc(0, 0, 5, 0, Math.PI * 2);
    ctx.fill();
    if (e.hasDrop) drawShine(20, 20);
};

const drawInterceptor = (
    ctx: CanvasRenderingContext2D,
    e: EnemyLike,
    drawShine: ShineFunc
) => {
    ctx.save();
    ctx.scale(-1, 1);
    ctx.strokeStyle = '#d946ef';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(20, 0);
    ctx.lineTo(-5, -8);
    ctx.lineTo(0, 0);
    ctx.lineTo(-5, 8);
    ctx.closePath();
    ctx.stroke();
    ctx.fillStyle = '#f0abfc';
    ctx.fill();
    if (e.hasDrop) drawShine(20, 20);
    ctx.restore();
};

const drawTurret = (
    ctx: CanvasRenderingContext2D,
    e: EnemyLike,
    s: GameState,
    drawShine: ShineFunc
) => {
    ctx.fillStyle = '#4b5563';
    ctx.beginPath();
    ctx.arc(0, 0, 20, 0, Math.PI * 2);
    ctx.fill();
    ctx.save();
    ctx.rotate(Math.sin(s.frames * 0.05));
    ctx.fillStyle = '#1f2937';
    ctx.fillRect(-10, -10, 20, 20);
    ctx.fillStyle = '#ef4444';
    ctx.fillRect(-25, -6, 20, 4);
    ctx.fillRect(-25, 2, 20, 4);
    ctx.restore();
    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    ctx.arc(0, 0, 4, 0, Math.PI * 2);
    ctx.fill();
    if (e.hasDrop) drawShine(30, 30);
};

const drawStealth = (
    ctx: CanvasRenderingContext2D,
    e: EnemyLike,
    drawShine: ShineFunc
) => {
    ctx.save();
    ctx.scale(-1, 1);
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.moveTo(20, 0);
    ctx.lineTo(-15, -20);
    ctx.lineTo(-5, 0);
    ctx.lineTo(-15, 20);
    ctx.fill();
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 1;
    ctx.stroke();
    if (e.hasDrop) drawShine(20, 20);
    ctx.restore();
};

const drawBomber = (
    ctx: CanvasRenderingContext2D,
    e: EnemyLike,
    drawShine: ShineFunc
) => {
    ctx.save();
    ctx.scale(-1, 1);
    ctx.strokeStyle = '#78350f';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(25, -15);
    ctx.lineTo(-25, -15);
    ctx.lineTo(-25, 15);
    ctx.lineTo(25, 15);
    ctx.stroke();
    ctx.fillStyle = '#b45309';
    ctx.fillRect(-15, -5, 30, 10);
    ctx.fillStyle = '#f59e0b';
    ctx.beginPath();
    ctx.arc(-28, -15, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(-28, 15, 3, 0, Math.PI * 2);
    ctx.fill();
    if (e.hasDrop) drawShine(40, 30, true);
    ctx.restore();
};

// --- Boss Renderer ---
const drawBoss = (
    ctx: CanvasRenderingContext2D,
    e: EnemyLike,
    s: GameState,
    _drawShine: ShineFunc
) => {
    const phase = e.phase !== undefined ? e.phase : (s.level - 1) % 5;
    const pulse = Math.sin(s.frames * 0.1) * 5;
    ctx.shadowBlur = 20 + pulse;
    ctx.shadowColor =
        phase === 0
            ? '#ef4444'
            : phase === 1
                ? '#8b5cf6'
                : phase === 2
                    ? '#10b981'
                    : '#f59e0b';

    if (phase === 0) {
        // THE WATCHER
        ctx.fillStyle = '#7f1d1d';
        ctx.beginPath();
        for (let i = 0; i < 8; i++) {
            const ang = ((Math.PI * 2) / 8) * i;
            const rad = e.w / 2 + Math.sin(s.frames * 0.2 + i) * 10;
            ctx.lineTo(Math.cos(ang) * rad, Math.sin(ang) * rad);
        }
        ctx.closePath();
        ctx.fill();
        for (let i = 0; i < 5; i++) {
            const ex = Math.cos(i * 1.2) * (e.w / 4);
            const ey = Math.sin(i * 1.2) * (e.h / 4);
            ctx.fillStyle = '#fff';
            ctx.beginPath();
            ctx.arc(ex, ey, 10 + Math.sin(s.frames * 0.3 + i) * 2, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#000';
            ctx.beginPath();
            ctx.arc(
                ex + Math.sin(s.frames * 0.1) * 2,
                ey,
                4,
                0,
                Math.PI * 2
            );
            ctx.fill();
        }
        ctx.fillStyle = '#fbbf24';
        ctx.beginPath();
        ctx.arc(0, 0, 25, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#b45309';
        ctx.beginPath();
        ctx.ellipse(0, 0, 5, 18, 0, 0, Math.PI * 2);
        ctx.fill();
    } else if (phase === 1) {
        // THE KRAKEN
        ctx.fillStyle = '#312e81';
        ctx.beginPath();
        ctx.arc(0, 0, e.w / 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#4c1d95';
        ctx.lineWidth = 8;
        for (let i = 0; i < 6; i++) {
            const angle = ((Math.PI * 2) / 6) * i + s.frames * 0.02;
            ctx.beginPath();
            ctx.moveTo(Math.cos(angle) * 20, Math.sin(angle) * 20);
            const cp1x = Math.cos(angle) * 80 + Math.sin(s.frames * 0.1) * 20;
            const cp1y = Math.sin(angle) * 80 + Math.cos(s.frames * 0.1) * 20;
            const endx = Math.cos(angle + 0.2) * (e.w / 2 + 20);
            const endy = Math.sin(angle + 0.2) * (e.h / 2 + 20);
            ctx.quadraticCurveTo(cp1x, cp1y, endx, endy);
            ctx.stroke();
        }
        ctx.fillStyle = '#8b5cf6';
        ctx.beginPath();
        ctx.arc(0, 0, 20, 0, Math.PI * 2);
        ctx.fill();
    } else if (phase === 2) {
        // THE HIVE
        ctx.fillStyle = '#064e3b';
        ctx.beginPath();
        ctx.ellipse(0, 0, e.w / 2, e.h / 3, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#10b981';
        for (let i = 0; i < 8; i++) {
            const px = (Math.random() - 0.5) * e.w * 0.6;
            const py = (Math.random() - 0.5) * e.h * 0.4;
            ctx.beginPath();
            ctx.arc(px, py, 5 + Math.random() * 5, 0, Math.PI * 2);
            ctx.fill();
        }
    } else if (phase === 3) {
        // THE DEVOURER
        ctx.fillStyle = '#450a0a';
        ctx.beginPath();
        ctx.arc(0, 0, e.w / 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#fef3c7';
        for (let i = 0; i < 12; i++) {
            const a = ((Math.PI * 2) / 12) * i + s.frames * 0.05;
            ctx.beginPath();
            ctx.moveTo(Math.cos(a) * 40, Math.sin(a) * 40);
            ctx.lineTo(Math.cos(a) * 60, Math.sin(a) * 60);
            ctx.lineTo(Math.cos(a + 0.3) * 40, Math.sin(a + 0.3) * 40);
            ctx.fill();
        }
        ctx.fillStyle = '#000';
        ctx.beginPath();
        ctx.arc(0, 0, 30, 0, Math.PI * 2);
        ctx.fill();
    } else {
        // THE SERAPHIM
        if (e.isCharging) {
            ctx.save();
            ctx.globalCompositeOperation = 'lighter';
            ctx.strokeStyle = `rgba(255, 255, 255, ${Math.random()})`;
            ctx.lineWidth = 3;
            for (let k = 0; k < 12; k++) {
                const dist = 150 + Math.sin(s.frames * 0.5 + k) * 50;
                const ang = ((Math.PI * 2) / 12) * k - s.frames * 0.1;
                ctx.beginPath();
                ctx.moveTo(Math.cos(ang) * dist, Math.sin(ang) * dist);
                ctx.lineTo(0, 0);
                ctx.stroke();
            }
            ctx.fillStyle = 'rgba(255, 200, 0, 0.3)';
            ctx.beginPath();
            ctx.arc(0, 0, 100 + Math.sin(s.frames) * 12, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }

        const ringSpeed = e.isCharging ? 0.2 : 0.05;
        ctx.save();
        ctx.strokeStyle = '#fcd34d';
        ctx.lineWidth = 6;
        for (let i = 0; i < 3; i++) {
            ctx.beginPath();
            ctx.ellipse(
                0,
                0,
                150 - i * 25,
                50 + Math.sin(s.frames * ringSpeed + i) * 25,
                s.frames * (ringSpeed / 2) * (i % 2 == 0 ? 1 : -1),
                0,
                Math.PI * 2
            );
            ctx.stroke();
        }
        ctx.restore();

        ctx.fillStyle = '#fff';
        ctx.shadowColor = e.isCharging ? '#ffffff' : '#fbbf24';
        ctx.shadowBlur = e.isCharging ? 100 + Math.random() * 40 : 60;
        ctx.beginPath();
        ctx.arc(0, 0, 40, 0, Math.PI * 2);
        ctx.fill();

        ctx.shadowBlur = 20;
        ctx.fillStyle = '#fbbf24';
        for (let i = 0; i < 6; i++) {
            const a = ((Math.PI * 2) / 6) * i + s.frames * 0.01;
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(Math.cos(a) * 200, Math.sin(a) * 200);
            ctx.lineTo(Math.cos(a + 0.2) * 150, Math.sin(a + 0.2) * 150);
            ctx.fill();
        }
    }
    ctx.shadowBlur = 0;
};

// --- Beam Renderer ---
const drawBeam = (
    ctx: CanvasRenderingContext2D,
    b: { x: number; y: number; w: number; h: number },
    s: GameState
) => {
    ctx.save();
    const pulse = Math.sin(s.frames * 0.8) * 0.2 + 1;
    const beamHeight = b.h * pulse;
    ctx.globalCompositeOperation = 'lighter';

    const gradGlow = ctx.createLinearGradient(
        0,
        b.y - beamHeight * 2,
        0,
        b.y + beamHeight * 2
    );
    gradGlow.addColorStop(0, 'rgba(255, 160, 0, 0)');
    gradGlow.addColorStop(0.5, 'rgba(255, 160, 0, 0.5)');
    gradGlow.addColorStop(1, 'rgba(255, 160, 0, 0)');
    ctx.fillStyle = gradGlow;
    ctx.fillRect(b.x, b.y - beamHeight * 2, b.w, beamHeight * 4);

    ctx.fillStyle = 'rgba(255, 200, 0, 0.8)';
    ctx.shadowColor = '#fbbf24';
    ctx.shadowBlur = 0;
    ctx.fillRect(b.x, b.y - beamHeight / 2, b.w, beamHeight);

    ctx.fillStyle = '#ffffff';
    ctx.shadowBlur = 0;
    const coreHeight = beamHeight * 0.3 + Math.random() * 4;
    ctx.fillRect(b.x, b.y - coreHeight / 2, b.w, coreHeight);

    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const segments = 12;
    const step = b.w / segments;
    if (Math.random() < 0.8) {
        ctx.beginPath();
        for (let i = 0; i <= segments; i++) {
            const lx = b.x + i * step;
            let ly: number;
            if (i === segments) {
                ly = b.y;
            } else {
                ly = b.y + (Math.random() - 0.5) * beamHeight * 3;
            }
            if (i === 0) ctx.moveTo(lx, ly);
            else ctx.lineTo(lx, ly);
        }
        ctx.lineWidth = 6;
        ctx.strokeStyle = 'rgba(0, 255, 255, 0.3)';
        ctx.stroke();
        ctx.lineWidth = 2;
        ctx.strokeStyle = '#00ffff';
        ctx.stroke();
    }

    for (let k = 0; k < 5; k++) {
        const sx = b.x + Math.random() * b.w;
        const sy = b.y + (Math.random() - 0.5) * beamHeight * 4;
        ctx.fillStyle = '#e0f2fe';
        ctx.beginPath();
        ctx.arc(sx, sy, Math.random() * 3, 0, Math.PI * 2);
        ctx.fill();
    }
    ctx.restore();
    ctx.restore();
};

// --- Missile Renderer ---
const drawMissile = (
    ctx: CanvasRenderingContext2D,
    b: { x: number; y: number; vx: number; vy: number; w: number; h: number },
    s: GameState
) => {
    const angle = Math.atan2(b.vy, b.vx);
    ctx.save();
    ctx.translate(b.x, b.y);
    ctx.rotate(angle);

    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    ctx.moveTo(10, 0);
    ctx.lineTo(4, -3);
    ctx.lineTo(4, 3);
    ctx.fill();

    ctx.fillStyle = '#e5e7eb';
    ctx.fillRect(-4, -3, 8, 6);

    ctx.fillStyle = '#fbbf24';
    ctx.fillRect(0, -3, 2, 6);

    ctx.fillStyle = '#4b5563';
    ctx.beginPath();
    ctx.moveTo(-4, 0);
    ctx.lineTo(-8, -6);
    ctx.lineTo(-2, 0);
    ctx.lineTo(-8, 6);
    ctx.fill();

    ctx.fillStyle = '#9ca3af';
    ctx.fillRect(-6, -2, 2, 4);

    const flicker = Math.random() * 8;
    ctx.fillStyle = '#3b82f6';
    ctx.shadowColor = '#60a5fa';
    ctx.shadowBlur = 15;
    ctx.beginPath();
    ctx.moveTo(-6, 0);
    ctx.lineTo(-20 - flicker, 0);
    ctx.lineTo(-6, 2);
    ctx.fill();

    ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.beginPath();
    ctx.moveTo(-6, 0);
    ctx.lineTo(-15 - flicker, 0);
    ctx.lineTo(-6, 1);
    ctx.fill();

    ctx.shadowBlur = 0;
    ctx.restore();

    if (s.frames % 2 === 0) {
        ctx.fillStyle = 'rgba(200, 200, 200, 0.3)';
        ctx.beginPath();
        ctx.arc(
            b.x - b.vx * 2,
            b.y - b.vy * 2,
            3 + Math.random(),
            0,
            Math.PI * 2
        );
        ctx.fill();
        ctx.beginPath();
        ctx.arc(
            b.x - b.vx * 4,
            b.y - b.vy * 4,
            2 + Math.random(),
            0,
            Math.PI * 2
        );
        ctx.fill();
    }
};
