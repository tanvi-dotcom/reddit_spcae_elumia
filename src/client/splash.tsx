import './index.css';

import { StrictMode, useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { requestExpandedMode } from '@devvit/web/client';

const SplashScreen = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [highScore, setHighScore] = useState<number | null>(null);

  // Animated starfield background on canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const stars: { x: number; y: number; size: number; speed: number; brightness: number }[] = [];
    const resize = () => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    for (let i = 0; i < 80; i++) {
      stars.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        size: Math.random() * 2 + 0.5,
        speed: Math.random() * 2 + 0.5,
        brightness: Math.random(),
      });
    }

    let animId: number;
    const draw = () => {
      ctx.fillStyle = '#050510';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      stars.forEach((s) => {
        ctx.fillStyle = `rgba(255, 255, 255, ${s.brightness * 0.9})`;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
        ctx.fill();
        s.x -= s.speed;
        if (s.x < 0) {
          s.x = canvas.width;
          s.y = Math.random() * canvas.height;
        }
      });
      animId = requestAnimationFrame(draw);
    };
    draw();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', resize);
    };
  }, []);

  // Try to fetch high score
  useEffect(() => {
    const fetchScore = async () => {
      try {
        const res = await fetch('/api/leaderboard');
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data.leaderboard) && data.leaderboard.length > 0) {
            setHighScore(data.leaderboard[0].score);
          }
        }
      } catch {
        // Silent fallback
        try {
          const stored = localStorage.getItem('space_Elumia_lb');
          if (stored) {
            const lb = JSON.parse(stored);
            if (Array.isArray(lb) && lb.length > 0) {
              setHighScore(lb[0].score);
            }
          }
        } catch {
          // ignore
        }
      }
    };
    void fetchScore();
  }, []);

  return (
    <div
      className="relative w-full h-full flex flex-col items-center justify-center overflow-hidden"
      style={{ background: '#050510' }}
    >
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full pointer-events-none"
      />

      <div className="relative z-10 flex flex-col items-center text-center px-4">
        <h1
          className="text-3xl sm:text-5xl font-bold mb-1 animate-pulse-glow"
          style={{
            fontFamily: "'Orbitron', sans-serif",
            background: 'linear-gradient(to bottom, #60a5fa, #a855f7)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            filter: 'drop-shadow(0 0 20px rgba(59,130,246,0.4))',
          }}
        >
          SPACE ELUMIA
        </h1>
        <p
          className="text-xs sm:text-sm tracking-[0.3em] mb-6 sm:mb-8"
          style={{ fontFamily: "'Share Tech Mono', monospace", color: '#6b7280' }}
        >
          REMASTERED
        </p>

        {highScore !== null && (
          <div className="mb-4 text-xs sm:text-sm" style={{ fontFamily: "'Share Tech Mono', monospace", color: '#facc15' }}>
            🏆 TOP SCORE: {highScore}
          </div>
        )}

        <button
          onClick={(e) => requestExpandedMode(e.nativeEvent, 'game')}
          className="relative overflow-hidden group px-6 sm:px-8 py-3 sm:py-4 font-bold tracking-wider text-sm sm:text-base transition-all hover:scale-105 active:scale-95 cursor-pointer"
          style={{
            fontFamily: "'Orbitron', sans-serif",
            background: 'linear-gradient(135deg, #2563eb, #7c3aed)',
            color: 'white',
            borderRadius: '4px',
            boxShadow: '0 0 25px rgba(37,99,235,0.4), inset 0 1px 0 rgba(255,255,255,0.1)',
            clipPath: 'polygon(8% 0, 100% 0, 100% 75%, 92% 100%, 0 100%, 0 25%)',
          }}
        >
          TAP TO PLAY
          <div
            className="absolute inset-0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700 skew-x-12"
            style={{ background: 'linear-gradient(to right, transparent, rgba(255,255,255,0.2), transparent)' }}
          />
        </button>

        <p className="mt-4 text-[10px] sm:text-xs" style={{ fontFamily: "'Share Tech Mono', monospace", color: '#4b5563' }}>
          KEYBOARD & TOUCH SUPPORTED
        </p>
      </div>
    </div>
  );
};

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <SplashScreen />
  </StrictMode>
);
