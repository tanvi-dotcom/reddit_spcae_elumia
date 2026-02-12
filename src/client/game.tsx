import './index.css';

import { useState, useEffect, useRef, useCallback, StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { initAudio, resumeAudio, setMuteAudio } from './game/audio';
import {
  MAX_LEVEL,
  setCanvasSize,
  createInitialGameState,
} from './game/constants';
import type { GameScreenState, GameState } from './game/constants';
import { update as gameUpdate, initStars, toggleAutoFire } from './game/engine';
import type { HudCallbacks } from './game/engine';
import { draw } from './game/renderer';
import {
  Play,
  PauseIcon,
  RotateCcw,
  Maximize,
  Minimize,
  Shield,
  Zap,
  Heart,
  AlertTriangle,
  MapPin,
  Wind,
  Crosshair,
  Rocket,
  Volume2,
  VolumeX,
  Trophy,
  Save,
  XIcon,
} from './game/icons';
import { useLeaderboard } from './hooks/useLeaderboard';

// --- Portrait Detection Hook ---
// Returns true if mobile device is held in portrait orientation
const useIsPortrait = () => {
  const [isPortrait, setIsPortrait] = useState(false);

  useEffect(() => {
    const check = () => {
      const isMobile = window.innerWidth < 768 || ('ontouchstart' in window);
      setIsPortrait(isMobile && window.innerHeight > window.innerWidth);
    };
    check();
    window.addEventListener('resize', check);
    window.addEventListener('orientationchange', check);
    return () => {
      window.removeEventListener('resize', check);
      window.removeEventListener('orientationchange', check);
    };
  }, []);

  return isPortrait;
};

// --- Main Game Component ---
const GameEngine = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [gameState, setGameState] = useState<GameScreenState>('start');
  const isPortrait = useIsPortrait();
  // Dimensions for the game logic (Logical Resolution)
  // If portrait, we swap W/H because we are rotating the view 90deg.
  // Logical Width = Physical Height.
  // Logical Height = Physical Width.
  const [dimensions, setDimensions] = useState({
    w: isPortrait ? window.innerHeight : window.innerWidth,
    h: isPortrait ? window.innerWidth : window.innerHeight,
  });

  // Init Audio
  useEffect(() => {
    initAudio();
  }, []);

  // Handle Resize & Orientation
  useEffect(() => {
    const handleResize = () => {
      // Recalculate isPortrait inside to be safe
      const mobile = window.innerWidth < 768 || ('ontouchstart' in window);
      const portrait = mobile && window.innerHeight > window.innerWidth;

      // Calculate Logical Dimensions
      // If portrait, we swap W/H because we are rotating the view 90deg.
      const w = portrait ? window.innerHeight : window.innerWidth;
      const h = portrait ? window.innerWidth : window.innerHeight;

      // Update global constants used by Engine/Renderer
      setCanvasSize(w, h);

      // Update local state for React rendering
      setDimensions({ w, h });
    };

    // Initialize dimensions immediately to fix initial render
    handleResize();

    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
    };
  }, [isPortrait]); // Re-run if isPortrait changes to ensure sync

  // HUD State
  const [hudScore, setHudScore] = useState(0);
  const [hudLives, setHudLives] = useState(3);
  const [hudLevel, setHudLevel] = useState(1);
  const [hudWeapon, setHudWeapon] = useState('NORMAL');
  const [playerHp, setPlayerHp] = useState(100);
  const [dashCooldown, setDashCooldown] = useState(0);
  const [showWarning, setShowWarning] = useState(false);
  const [bossHp, setBossHp] = useState<number | null>(null);
  const [bossMaxHp, setBossMaxHp] = useState(1);
  const [bossProgress, setBossProgress] = useState(0);
  const [hudAutoFire, setHudAutoFire] = useState(false);
  const [hudHasMissiles, setHudHasMissiles] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isHardMode, setIsHardMode] = useState(false);
  const [playerName, setPlayerName] = useState('PILOT');
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [pendingHardMode, setPendingHardMode] = useState<boolean | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Leaderboard
  const {
    leaderboard,
    username,
    submitScore,
  } = useLeaderboard();

  useEffect(() => {
    if (username && username !== 'PILOT') {
      setPlayerName(username);
    }
  }, [username]);

  // Fullscreen
  useEffect(() => {
    const handler = () => {
      setIsFullscreen(
        !!(
          document.fullscreenElement ||
          (document as unknown as { webkitFullscreenElement: Element | null }).webkitFullscreenElement
        )
      );
    };
    ['fullscreenchange', 'webkitfullscreenchange'].forEach((e) =>
      document.addEventListener(e, handler)
    );
    return () => {
      ['fullscreenchange', 'webkitfullscreenchange'].forEach((e) =>
        document.removeEventListener(e, handler)
      );
    };
  }, []);

  const toggleFullScreen = useCallback(() => {
    const doc = document.documentElement;
    if (!isFullscreen) {
      if (doc.requestFullscreen) doc.requestFullscreen();
    } else {
      if (document.exitFullscreen) document.exitFullscreen();
    }
  }, [isFullscreen]);

  // Game state ref
  const state = useRef<GameState>(createInitialGameState());
  const lastHpRef = useRef(100);

  const hudCallbacks: HudCallbacks = {
    setHudScore,
    setHudLives,
    setHudLevel,
    setPlayerHp,
    setHudWeapon,
    setBossHp,
    setBossMaxHp,
    setBossProgress,
    setDashCooldown,
    setShowWarning,
    setHudAutoFire,
    setHudHasMissiles,
    setGameState,
  };

  const startGame = useCallback(() => {
    initAudio();
    resumeAudio();
    setMuteAudio(isMuted);
    initStars(state.current);

    // Reset
    const fresh = createInitialGameState();
    Object.assign(state.current, fresh);
    state.current.stars = fresh.stars.length > 0 ? fresh.stars : state.current.stars;
    initStars(state.current);
    lastHpRef.current = 100;

    setHudScore(0);
    setHudLives(3);
    setHudLevel(1);
    setPlayerHp(100);
    setHudWeapon('NORMAL');
    setBossHp(null);
    setBossMaxHp(1);
    setBossProgress(0);
    setDashCooldown(0);
    setShowWarning(false);
    setHudAutoFire(false);
    setHudHasMissiles(false);

    setGameState('playing');
  }, [isMuted]);

  const handleToggleAutoFire = useCallback(() => {
    toggleAutoFire(state.current, hudCallbacks);
  }, []);

  const toggleMute = useCallback(() => {
    const nextState = !isMuted;
    setIsMuted(nextState);
    setMuteAudio(nextState);
  }, [isMuted]);

  const saveScore = useCallback(async () => {
    await submitScore(playerName, hudScore);
    setGameState('start');
  }, [playerName, hudScore, submitScore]);

  const skipVictory = useCallback(() => {
    setGameState('start');
  }, []);

  const togglePause = useCallback(() => {
    if (gameState === 'playing') setGameState('paused');
    else if (gameState === 'paused') {
      setGameState('playing');
      setPendingHardMode(null);
    }
  }, [gameState]);

  const handleHardModeClick = useCallback(() => {
    if (gameState === 'playing') {
      setPendingHardMode(!isHardMode);
      setGameState('paused');
    } else {
      setIsHardMode(!isHardMode);
    }
  }, [gameState, isHardMode]);

  const handleAbort = useCallback(() => {
    if (pendingHardMode !== null) {
      setIsHardMode(pendingHardMode);
      setPendingHardMode(null);
    }
    setGameState('start');
  }, [pendingHardMode]);

  // Keyboard
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      state.current.keys[e.key] = true;
      state.current.keys[k] = true;
      if (k === 'p') togglePause();
      if (k === 'f') toggleFullScreen();
      if (k === 'm') toggleMute();
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      state.current.keys[e.key] = false;
      state.current.keys[e.key.toLowerCase()] = false;
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [gameState, togglePause, toggleFullScreen, toggleMute]);

  // Game Loop
  useEffect(() => {
    let animationFrameId: number;
    let lastTime = performance.now();
    let accumulator = 0;
    const TIMESTEP = 1000 / 60;

    const render = (currentTime: number) => {
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          const deltaTime = currentTime - lastTime;
          lastTime = currentTime;
          accumulator += deltaTime;
          if (accumulator > 1000) accumulator = 1000;

          while (accumulator >= TIMESTEP) {
            gameUpdate(
              state.current,
              gameState,
              isHardMode,
              lastHpRef,
              hudCallbacks
            );
            accumulator -= TIMESTEP;
          }
          draw(ctx, state.current);
        }
      }
      animationFrameId = requestAnimationFrame(render);
    };
    animationFrameId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animationFrameId);
  }, [gameState, isMuted, isHardMode]);

  // When portrait is detected, CSS-rotate the entire game 90° so it renders
  // in landscape orientation automatically — no user action needed.
  const portraitRotateStyle: React.CSSProperties = isPortrait
    ? {
      position: 'fixed' as const,
      top: 0,
      left: 0,
      width: `${window.innerHeight}px`,
      height: `${window.innerWidth}px`,
      transform: `rotate(90deg) translateY(-100%)`,
      transformOrigin: 'top left',
      overflow: 'hidden',
    }
    : {};

  return (
    <div
      className="relative w-full h-full"
      style={{ background: '#111', ...portraitRotateStyle }}
    >
      <canvas
        ref={canvasRef}
        width={dimensions.w}
        height={dimensions.h}
        className="block w-full h-full"
        style={{ background: '#000' }}
      />

      {/* Boss Warning */}
      {showWarning && (
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center z-40" style={{ background: 'rgba(239,68,68,0.2)', animation: 'pulse 1s infinite' }}>
          <div className="w-full py-4 text-center" style={{ background: 'rgba(0,0,0,0.8)', borderTop: '4px solid #ef4444', borderBottom: '4px solid #ef4444' }}>
            <h2 className="text-2xl sm:text-4xl font-bold flex items-center justify-center gap-4" style={{ fontFamily: "'Orbitron', sans-serif", color: '#ef4444' }}>
              <AlertTriangle className="w-6 h-6 sm:w-8 sm:h-8" /> WARNING: BOSS DETECTED <AlertTriangle className="w-6 h-6 sm:w-8 sm:h-8" />
            </h2>
          </div>
        </div>
      )}

      {/* Touch Controls */}
      {gameState === 'playing' && (
        <div
          className="absolute inset-0 z-30"
          style={{ touchAction: 'none' }}
          onTouchStart={(e) => {
            const t = e.changedTouches[0];
            if (!t) return;
            state.current.touch.active = true;

            // Map coordinates: If portrait, map Y -> X and Invert X -> Y
            if (isPortrait) {
              // Visual Top (0) -> Game Left (0) => X = clientY
              // Visual Left (0) -> Game Bottom (Max Y) => Y = height - clientX
              state.current.touch.x = t.clientY;
              state.current.touch.y = window.innerWidth - t.clientX;
            } else {
              state.current.touch.x = t.clientX;
              state.current.touch.y = t.clientY;
            }
          }}
          onTouchMove={(e) => {
            if (state.current.touch.active) {
              const t = e.changedTouches[0];
              if (!t) return;

              if (isPortrait) {
                state.current.touch.x = t.clientY;
                state.current.touch.y = window.innerWidth - t.clientX;
              } else {
                state.current.touch.x = t.clientX;
                state.current.touch.y = t.clientY;
              }
            }
          }}
          onTouchEnd={() => {
            state.current.touch.active = false;
          }}
        />
      )}

      {/* HUD */}
      {gameState !== 'start' && gameState !== 'victory' && (
        <>
          {/* TOP HUD */}
          <div
            className="hud-top absolute top-0 left-0 w-full p-3 sm:p-6 pointer-events-none uppercase tracking-wider flex justify-between items-start z-50"
            style={{
              fontFamily: "'Share Tech Mono', monospace",
              color: '#bfdbfe',
              fontSize: '14px',
              background: 'linear-gradient(to bottom, rgba(0,0,0,0.9), transparent)',
            }}
          >
            {/* LEFT: Score & Level */}
            <div className="flex gap-4 sm:gap-8 items-start">
              <div className="flex flex-col">
                <span className="text-[10px] sm:text-xs" style={{ color: '#60a5fa', opacity: 0.8 }}>Score</span>
                <span className="score-text text-xl sm:text-3xl font-bold tracking-widest text-white" style={{ textShadow: '0 0 5px rgba(59,130,246,0.5)' }}>
                  {hudScore.toString().padStart(6, '0')}
                </span>
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] sm:text-xs" style={{ color: '#60a5fa', opacity: 0.8 }}>Level</span>
                <span className="level-text text-xl sm:text-3xl" style={{ color: '#facc15', textShadow: '0 0 5px rgba(250,204,21,0.5)' }}>
                  {hudLevel} / {MAX_LEVEL}
                </span>
              </div>
            </div>

            {/* CENTER: Player Status */}
            <div className="flex flex-col items-center gap-1 sm:gap-2" style={{ transform: 'translateY(-3px)' }}>
              <div className="flex items-center gap-2 sm:gap-3 px-2 sm:px-4 py-1 sm:py-2 rounded-full" style={{ background: 'rgba(17,24,39,0.8)', border: '1px solid rgba(75,85,99,0.5)', backdropFilter: 'blur(4px)' }}>
                <Shield className="w-4 h-4 sm:w-5 sm:h-5" style={{ color: '#60a5fa' }} />
                <div className="hp-bar-container w-24 sm:w-48 h-3 sm:h-4 rounded-full overflow-hidden relative" style={{ background: '#1f2937', border: '1px solid #4b5563' }}>
                  <div
                    className="h-full transition-all duration-200"
                    style={{
                      width: `${Math.max(0, playerHp)}%`,
                      background: 'linear-gradient(to right, #ef4444, #eab308, #22c55e)',
                    }}
                  />
                  <div className="absolute inset-0 flex justify-between px-2">
                    {[1, 2, 3, 4].map((i) => (
                      <div key={i} style={{ width: '1px', height: '100%', background: 'rgba(0,0,0,0.3)' }} />
                    ))}
                  </div>
                </div>
                <span className="text-xs sm:text-sm font-bold w-6 sm:w-8 text-right">{Math.ceil(playerHp)}%</span>
              </div>

              <div className="flex gap-2 sm:gap-4 text-xs sm:text-sm">
                <div className="flex items-center gap-1 font-bold px-2 sm:px-3 py-0.5 sm:py-1 rounded" style={{ color: '#4ade80', background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(22,101,52,0.5)' }}>
                  <Zap className="w-3 h-3 sm:w-4 sm:h-4" /> {hudWeapon}
                </div>
                {hudHasMissiles && (
                  <div className="flex items-center gap-1 font-bold animate-pulse px-2 sm:px-3 py-0.5 sm:py-1 rounded" style={{ color: '#fb923c', background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(154,52,18,0.5)' }}>
                    <Rocket className="w-3 h-3 sm:w-4 sm:h-4" /> MISSILES
                  </div>
                )}
              </div>
            </div>

            {/* RIGHT: Controls & Dash & Stats */}
            <div className="flex flex-col items-end gap-2 sm:gap-3 pointer-events-auto">
              <div className="flex items-center gap-4 sm:gap-8">
                <div className="flex items-center gap-1 sm:gap-2">
                  <span className="text-[9px] sm:text-xs font-bold tracking-wider" style={{ color: '#60a5fa', opacity: 0.8 }}>DASH</span>
                  <div className="w-16 sm:w-24 h-1.5 sm:h-2 rounded-full overflow-hidden" style={{ background: '#1f2937', border: '1px solid #374151' }}>
                    <div
                      className="h-full transition-all duration-100"
                      style={{
                        width: `${Math.max(0, (1 - dashCooldown) * 100)}%`,
                        background: '#3b82f6',
                        boxShadow: '0 0 8px rgba(59,130,246,0.8)',
                      }}
                    />
                  </div>
                  <Wind className={`w-3 h-3 sm:w-4 sm:h-4 ${dashCooldown > 0 ? 'text-gray-500' : ''}`} style={{ color: dashCooldown > 0 ? '#6b7280' : '#60a5fa' }} />
                </div>
                <div className="flex items-center gap-1 text-lg sm:text-xl font-bold" style={{ color: '#ef4444' }}>
                  <Heart className="w-5 h-5 sm:w-6 sm:h-6" style={{ fill: 'currentColor' }} />
                  <span className="text-xl sm:text-2xl">x{hudLives}</span>
                </div>
              </div>

              <div className="grid grid-cols-4 gap-1.5 sm:gap-3">
                <button
                  onClick={handleToggleAutoFire}
                  title="Auto Fire"
                  className="control-btn w-10 sm:w-14 h-8 sm:h-10 flex flex-col items-center justify-center rounded border transition-all"
                  style={{
                    background: hudAutoFire ? 'rgba(22,163,74,0.5)' : 'rgba(31,41,55,0.5)',
                    borderColor: hudAutoFire ? '#4ade80' : '#4b5563',
                    color: hudAutoFire ? '#86efac' : '#6b7280',
                    boxShadow: hudAutoFire ? '0 0 10px rgba(34,197,94,0.3)' : 'none',
                  }}
                >
                  <Crosshair className="w-3 h-3 sm:w-4 sm:h-4 mb-0.5" />
                  <span className="control-btn-text text-[8px] sm:text-[9px] font-bold leading-none">AUTO</span>
                </button>

                <button
                  onClick={handleHardModeClick}
                  title="Hard Mode"
                  className="control-btn w-10 sm:w-14 h-8 sm:h-10 flex flex-col items-center justify-center rounded border transition-all"
                  style={{
                    background: isHardMode ? 'rgba(220,38,38,0.5)' : 'rgba(31,41,55,0.5)',
                    borderColor: isHardMode ? '#f87171' : '#4b5563',
                    color: isHardMode ? '#fca5a5' : '#6b7280',
                    boxShadow: isHardMode ? '0 0 10px rgba(220,38,38,0.3)' : 'none',
                  }}
                >
                  <span className="text-[10px] sm:text-xs font-bold leading-none">HARD</span>
                </button>

                <button
                  onClick={toggleMute}
                  title="Mute Audio"
                  className="control-btn w-10 sm:w-14 h-8 sm:h-10 flex items-center justify-center rounded border transition-all"
                  style={{
                    background: isMuted ? 'rgba(127,29,29,0.3)' : 'rgba(31,41,55,0.5)',
                    borderColor: isMuted ? 'rgba(239,68,68,0.5)' : '#4b5563',
                    color: isMuted ? '#f87171' : '#6b7280',
                  }}
                >
                  {isMuted ? <VolumeX className="w-4 h-4 sm:w-5 sm:h-5" /> : <Volume2 className="w-4 h-4 sm:w-5 sm:h-5" />}
                </button>

                <button
                  onClick={togglePause}
                  title="Pause Game"
                  className="control-btn w-10 sm:w-14 h-8 sm:h-10 flex items-center justify-center rounded border transition-all"
                  style={{
                    background: 'rgba(30,58,138,0.3)',
                    borderColor: 'rgba(59,130,246,0.3)',
                    color: '#60a5fa',
                  }}
                >
                  {gameState === 'paused' ? <Play className="w-4 h-4 sm:w-5 sm:h-5" /> : <PauseIcon className="w-4 h-4 sm:w-5 sm:h-5" />}
                </button>
              </div>
            </div>
          </div>

          {/* BOTTOM: Boss HP & Progress */}
          <div className="boss-bar absolute bottom-6 sm:bottom-10 left-1/2 w-full max-w-4xl pointer-events-none px-4" style={{ transform: 'translateX(-50%)' }}>
            {bossHp !== null ? (
              <div className="w-full">
                <div className="flex justify-between items-end mb-2">
                  <div className="flex flex-col">
                    <span className="text-[10px] sm:text-xs font-bold tracking-widest animate-pulse" style={{ color: '#ef4444', letterSpacing: '0.2em' }}>
                      WARNING // BOSS ENTITY DETECTED
                    </span>
                    <span
                      className="text-base sm:text-xl font-bold"
                      style={{ fontFamily: "'Orbitron', sans-serif", color: '#ef4444', textShadow: '0 0 10px rgba(220,38,38,0.8)' }}
                    >
                      {['THE WATCHER', 'THE KRAKEN', 'THE HIVE', 'THE DEVOURER', 'THE SERAPHIM'][(Math.max(1, hudLevel) - 1) % 5]}
                    </span>
                  </div>
                  <span className="text-lg sm:text-2xl font-bold" style={{ color: '#ef4444', fontVariantNumeric: 'tabular-nums' }}>
                    {((bossHp / bossMaxHp) * 100).toFixed(0)}%
                  </span>
                </div>
                <div className="w-full h-4 sm:h-6 rounded-full overflow-hidden p-[2px]" style={{ background: 'rgba(0,0,0,0.6)', border: '2px solid rgba(127,29,29,0.5)', backdropFilter: 'blur(4px)' }}>
                  <div
                    className="h-full rounded-full transition-all duration-200 ease-out relative overflow-hidden"
                    style={{ width: `${Math.max(0, (bossHp / bossMaxHp) * 100)}%`, background: 'linear-gradient(to right, #7f1d1d, #dc2626, #ef4444)', boxShadow: '0 0 15px rgba(220,38,38,0.5)' }}
                  >
                    <div className="absolute inset-0 opacity-30 animate-pulse" style={{ background: 'repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(255,255,255,0.1) 10px, rgba(255,255,255,0.1) 20px)' }} />
                  </div>
                </div>
              </div>
            ) : (
              <div className="w-full opacity-70">
                <div className="flex justify-between text-[10px] sm:text-xs mb-2 font-bold tracking-widest uppercase" style={{ color: '#22d3ee' }}>
                  <div className="flex items-center gap-2">
                    <MapPin className="w-3 h-3 sm:w-4 sm:h-4 animate-bounce" /> Distance to Boss
                  </div>
                  <span>{Math.floor(bossProgress)}%</span>
                </div>
                <div className="w-full h-2 sm:h-3 rounded-full overflow-hidden p-[1px]" style={{ background: 'rgba(17,24,39,0.8)', border: '1px solid rgba(8,145,178,0.5)', backdropFilter: 'blur(4px)' }}>
                  <div
                    className="h-full rounded-full transition-all duration-300 ease-linear relative"
                    style={{
                      width: `${bossProgress}%`,
                      background: 'linear-gradient(to right, #164e63, #22d3ee)',
                      boxShadow: '0 0 10px rgba(34,211,238,0.3)',
                    }}
                  >
                    <div className="absolute right-0 top-0 bottom-0 w-1" style={{ background: 'rgba(255,255,255,0.5)', filter: 'blur(2px)' }} />
                  </div>
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {/* Start Screen code by r i t i k r a j */}
      {gameState === 'start' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center text-white z-50" style={{ background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(4px)' }}>
          <h1
            className="text-4xl sm:text-6xl font-bold mb-2"
            style={{
              fontFamily: "'Orbitron', sans-serif",
              background: 'linear-gradient(to bottom, #60a5fa, #9333ea)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              textShadow: 'none',
              filter: 'drop-shadow(0 0 15px rgba(59,130,246,0.5))',
            }}
          >
            SPACE ELUMIA
          </h1>
          <p className="mb-6 sm:mb-8 tracking-widest text-sm" style={{ fontFamily: "'Share Tech Mono', monospace", color: '#9ca3af' }}>
            REMASTERED
          </p>
          <div className="hidden sm:flex gap-8 text-sm mb-8" style={{ fontFamily: "'Share Tech Mono', monospace", color: '#9ca3af' }}>
            <div className="flex flex-col items-center">
              <div className="flex gap-1 mb-1">
                {['W', 'A', 'S', 'D'].map((k) => (
                  <kbd key={k} className="px-2 py-1 rounded" style={{ background: '#1f2937', border: '1px solid #4b5563' }}>{k}</kbd>
                ))}
              </div>
              <span>MOVE</span>
            </div>
            <div className="flex flex-col items-center">
              <kbd className="px-8 py-1 rounded mb-1" style={{ background: '#1f2937', border: '1px solid #4b5563' }}>SPACE</kbd>
              <span>SHOOT</span>
            </div>
            <div className="flex flex-col items-center">
              <kbd className="px-8 py-1 rounded mb-1" style={{ background: '#1f2937', border: '1px solid #4b5563' }}>SHIFT</kbd>
              <span>DASH</span>
            </div>
          </div>
          <p className="sm:hidden text-xs mb-6 text-center px-8" style={{ fontFamily: "'Share Tech Mono', monospace", color: '#6b7280' }}>
            Touch screen to steer · Auto-fire enabled on mobile
          </p>
          <button
            onClick={startGame}
            className="group relative px-6 sm:px-8 py-3 font-bold tracking-wider transition-all hover:scale-105 active:scale-95"
            style={{
              fontFamily: "'Orbitron', sans-serif",
              background: '#2563eb',
              color: 'white',
              clipPath: 'polygon(10% 0, 100% 0, 100% 70%, 90% 100%, 0 100%, 0 30%)',
            }}
          >
            INITIALIZE MISSION
            <div className="absolute inset-0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-500 skew-x-12" style={{ background: 'rgba(255,255,255,0.2)' }} />
          </button>

          {leaderboard.length > 0 && (
            <div className="mt-6 sm:mt-8 flex flex-col items-center">
              <button
                onClick={() => setShowLeaderboard(!showLeaderboard)}
                className="flex items-center gap-2 text-sm font-bold mb-2 transition"
                style={{ color: '#facc15' }}
              >
                <Trophy className="w-4 h-4" /> {showLeaderboard ? 'HIDE' : 'VIEW'} TOP PILOTS
              </button>
              {showLeaderboard && (
                <div className="p-4 rounded w-64" style={{ background: 'rgba(17,24,39,0.9)', border: '1px solid #374151' }}>
                  <div className="text-xs grid grid-cols-2 gap-x-4 gap-y-2" style={{ color: '#d1d5db' }}>
                    {leaderboard.slice(0, 5).map((e, i) => (
                      <div key={i} className="contents">
                        <div className="text-right truncate">{e.name}</div>
                        <div className="text-left font-mono" style={{ color: '#fef08a' }}>{e.score}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Pause Menu */}
      {gameState === 'paused' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center text-white p-4 sm:p-8 z-50" style={{ background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(4px)' }}>
          <h2 className="text-2xl sm:text-4xl mb-6 sm:mb-8" style={{ fontFamily: "'Orbitron', sans-serif", color: '#facc15' }}>SYSTEM PAUSED</h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-8 mb-6 sm:mb-8 p-4 sm:p-6 rounded" style={{ fontFamily: "'Share Tech Mono', monospace", color: '#d1d5db', background: 'rgba(17,24,39,0.5)', border: '1px solid #374151' }}>
            <div>
              <h3 className="font-bold mb-3 sm:mb-4 pb-2" style={{ color: '#60a5fa', borderBottom: '1px solid rgba(59,130,246,0.3)' }}>CONTROLS</h3>
              <div className="space-y-2 text-xs sm:text-sm">
                <div className="flex justify-between gap-2"><span>MOVEMENT</span><span className="text-white">WASD</span></div>
                <div className="flex justify-between gap-2"><span>FIRE</span><span className="text-white">SPACE</span></div>
                <div className="flex justify-between gap-2"><span>DASH</span><span className="text-white">SHIFT</span></div>
                <div className="flex justify-between gap-2"><span>AUTO-FIRE</span><span className="text-white">E</span></div>
              </div>
            </div>
            <div>
              <h3 className="font-bold mb-3 sm:mb-4 pb-2" style={{ color: '#4ade80', borderBottom: '1px solid rgba(34,197,94,0.3)' }}>STATUS</h3>
              <div className="space-y-2 text-xs sm:text-sm">
                <div className="flex justify-between w-full sm:w-48"><span>CURRENT LEVEL</span><span className="text-white">{hudLevel}</span></div>
                <div className="flex justify-between w-full sm:w-48"><span>SCORE</span><span style={{ color: '#facc15' }}>{hudScore}</span></div>
                <div className="flex justify-between w-full sm:w-48"><span>LIVES</span><span style={{ color: '#f87171' }}>{hudLives}</span></div>
                <div className="flex justify-between w-full sm:w-48"><span>WEAPON</span><span style={{ color: '#86efac' }}>{hudWeapon}</span></div>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-3 sm:gap-4 justify-center">
            <button onClick={togglePause} className="px-4 sm:px-6 py-2 rounded font-bold transition" style={{ background: '#2563eb' }}>RESUME</button>
            <button onClick={handleAbort} className="px-4 sm:px-6 py-2 rounded font-bold transition flex items-center gap-2" style={{ background: '#374151' }}>
              <RotateCcw className="w-4 h-4" /> ABORT
            </button>
            <button onClick={toggleFullScreen} className="px-4 sm:px-6 py-2 rounded font-bold transition flex items-center gap-2" style={{ background: '#374151', border: '1px solid #4b5563' }}>
              {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
              <span className="hidden sm:inline">{isFullscreen ? 'EXIT FULL' : 'FULL SCREEN'}</span>
            </button>
          </div>
        </div>
      )}

      {/* Victory Screen */}
      {gameState === 'victory' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center text-white z-50" style={{ background: 'rgba(30,58,138,0.6)', backdropFilter: 'blur(8px)' }}>
          <h2 className="text-4xl sm:text-6xl mb-2 animate-bounce" style={{ fontFamily: "'Orbitron', sans-serif", color: '#facc15', textShadow: '0 4px 6px rgba(0,0,0,0.5)' }}>
            VICTORY!
          </h2>
          <p className="text-lg sm:text-xl mb-6 sm:mb-8" style={{ fontFamily: "'Share Tech Mono', monospace" }}>
            ALL SYSTEMS SECURED. GALAXY SAFE.
          </p>
          <div className="p-6 sm:p-8 rounded-lg flex flex-col items-center gap-4" style={{ background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(59,130,246,0.5)' }}>
            <div className="text-2xl sm:text-3xl mb-4" style={{ fontFamily: "'Share Tech Mono', monospace" }}>
              FINAL SCORE: <span style={{ color: '#facc15' }}>{hudScore}</span>
            </div>
            <div className="flex flex-col gap-2 w-full">
              <label className="text-xs" style={{ color: '#93c5fd' }}>ENTER PILOT NAME</label>
              <input
                type="text"
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value.toUpperCase().slice(0, 10))}
                className="rounded px-4 py-2 text-center text-white tracking-widest font-bold focus:outline-none"
                style={{ background: '#1f2937', border: '1px solid #4b5563' }}
              />
            </div>
            <div className="flex gap-4 mt-4">
              <button
                onClick={skipVictory}
                className="px-4 sm:px-6 py-3 rounded font-bold transition flex items-center gap-2"
                style={{ fontFamily: "'Orbitron', sans-serif", background: '#374151' }}
              >
                <XIcon className="w-4 h-4" /> SKIP
              </button>
              <button
                onClick={saveScore}
                className="px-6 sm:px-8 py-3 rounded font-bold transition-transform hover:scale-105 flex items-center gap-2"
                style={{ fontFamily: "'Orbitron', sans-serif", background: '#16a34a', boxShadow: '0 10px 15px -3px rgba(22,101,52,0.5)' }}
              >
                <Save className="w-4 h-4" /> SAVE RECORD
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Game Over */}
      {gameState === 'gameover' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center text-white z-50" style={{ background: 'rgba(127,29,29,0.4)', backdropFilter: 'blur(8px)' }}>
          <h2 className="text-3xl sm:text-5xl mb-2" style={{ fontFamily: "'Orbitron', sans-serif", color: '#ef4444', textShadow: '0 4px 6px rgba(0,0,0,0.5)' }}>
            CRITICAL FAILURE
          </h2>
          <div className="text-xl sm:text-2xl mb-4" style={{ fontFamily: "'Share Tech Mono', monospace" }}>
            FINAL SCORE: <span style={{ color: '#facc15' }}>{hudScore}</span>
          </div>

          {/* Save Score */}
          <div className="p-4 sm:p-6 rounded-lg flex flex-col items-center gap-3 mb-4" style={{ background: 'rgba(0,0,0,0.6)', border: '1px solid rgba(239,68,68,0.3)' }}>
            <label className="text-xs" style={{ color: '#fca5a5', fontFamily: "'Share Tech Mono', monospace" }}>ENTER PILOT NAME TO SAVE</label>
            <input
              type="text"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value.toUpperCase().slice(0, 10))}
              className="rounded px-4 py-2 text-center text-white tracking-widest font-bold focus:outline-none w-48"
              style={{ background: '#1f2937', border: '1px solid #4b5563', fontFamily: "'Orbitron', sans-serif" }}
            />
            <div className="flex gap-3">
              <button
                onClick={saveScore}
                className="px-4 sm:px-6 py-2 rounded font-bold transition-transform hover:scale-105 flex items-center gap-2"
                style={{ fontFamily: "'Orbitron', sans-serif", background: '#16a34a', boxShadow: '0 5px 10px rgba(22,101,52,0.4)' }}
              >
                <Save className="w-4 h-4" /> SAVE
              </button>
              <button
                onClick={startGame}
                className="px-4 sm:px-6 py-2 rounded font-bold transition-transform hover:scale-105 flex items-center gap-2"
                style={{ fontFamily: "'Orbitron', sans-serif", background: '#2563eb' }}
              >
                <RotateCcw className="w-4 h-4" /> RETRY
              </button>
            </div>
          </div>

          {/* Leaderboard */}
          {leaderboard.length > 0 && (
            <div className="flex flex-col items-center">
              <button
                onClick={() => setShowLeaderboard(!showLeaderboard)}
                className="flex items-center gap-2 text-sm font-bold mb-2 transition"
                style={{ color: '#facc15', fontFamily: "'Orbitron', sans-serif" }}
              >
                <Trophy className="w-4 h-4" /> {showLeaderboard ? 'HIDE' : 'VIEW'} GLOBAL RANKINGS
              </button>
              {showLeaderboard && (
                <div className="p-4 rounded w-64" style={{ background: 'rgba(17,24,39,0.9)', border: '1px solid #374151' }}>
                  <div className="text-xs grid grid-cols-3 gap-x-3 gap-y-2" style={{ fontFamily: "'Share Tech Mono', monospace", color: '#d1d5db' }}>
                    {leaderboard.slice(0, 5).map((e, i) => (
                      <div key={i} className="contents">
                        <div className="text-right font-bold" style={{ color: i === 0 ? '#facc15' : i === 1 ? '#c0c0c0' : i === 2 ? '#cd7f32' : '#6b7280' }}>#{i + 1}</div>
                        <div className="truncate">{e.name}</div>
                        <div className="text-right font-mono" style={{ color: '#fef08a' }}>{e.score}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// --- App ---
const App = () => (
  <div className="w-full h-screen overflow-hidden" style={{ background: '#000' }}>
    <GameEngine />
  </div>
);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
