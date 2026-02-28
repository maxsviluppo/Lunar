import React, { useState, useCallback } from 'react';
import { Rocket, Plane, Wind, RotateCcw, Play, Pause, Info, ChevronLeft, ChevronRight, Truck } from 'lucide-react';
import GameCanvas from './GameCanvas';
import { VehicleType, VEHICLE_CONFIGS } from './types';
import { motion, AnimatePresence } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export default function App() {
  const [vehicleType, setVehicleType] = useState<VehicleType>('UFO');
  const [isPaused, setIsPaused] = useState(false);
  const [gameKey, setGameKey] = useState(0);
  const [gameOver, setGameOver] = useState<{ success: boolean; speed: number } | null>(null);
  const [touchControls, setTouchControls] = useState({
    thrusting: false,
    leftThrusting: false,
    rightThrusting: false,
  });

  const handleGameOver = useCallback((success: boolean, speed: number) => {
    setGameOver({ success, speed });
  }, []);

  const resetGame = () => {
    setGameKey(prev => prev + 1);
    setGameOver(null);
    setIsPaused(false);
    setTouchControls({ thrusting: false, leftThrusting: false, rightThrusting: false });
  };

  const togglePause = () => {
    setIsPaused(prev => !prev);
  };

  return (
    <div className="fixed inset-0 bg-[#050505] text-white font-sans overflow-hidden select-none">
      {/* Game Layer - Full Screen Background */}
      <div className="absolute inset-0 z-0">
        <GameCanvas 
          key={gameKey}
          vehicleType={vehicleType} 
          onGameOver={handleGameOver}
          isPaused={isPaused}
          externalControls={touchControls}
        />
      </div>

      {/* UI Layer - Overlay */}
      <div className="relative z-10 h-full flex flex-col pointer-events-none">
        {/* Header - Transparent & Refined */}
        <header className="p-3 sm:p-4 flex justify-between items-center border-b border-white/5 bg-black/20 backdrop-blur-md pointer-events-auto">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-500 flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <Rocket size={18} className="text-black" />
            </div>
            <h1 className="text-xl sm:text-2xl font-black tracking-tighter uppercase italic leading-none">
              Lunar <span className="text-emerald-500">Odyssey</span>
            </h1>
          </div>

          <div className="flex gap-2">
            <button 
              onClick={togglePause}
              title={isPaused ? "Resume" : "Pause"}
              className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-all border border-white/10 active:scale-90 flex items-center justify-center"
            >
              {isPaused ? <Play size={16} fill="currentColor" /> : <Pause size={16} fill="currentColor" />}
            </button>
            <button 
              onClick={resetGame}
              title="Restart Mission"
              className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-all border border-white/10 active:scale-90 flex items-center justify-center"
            >
              <RotateCcw size={16} />
            </button>
          </div>
        </header>

        <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
          {/* Sidebar / Vehicle Selector - Semi-transparent */}
          <div className="lg:w-72 p-3 sm:p-4 border-b lg:border-b-0 lg:border-r border-white/5 bg-black/20 backdrop-blur-sm overflow-x-auto lg:overflow-y-auto pointer-events-auto scrollbar-hide">
            <div className="flex lg:flex-col gap-2 min-w-max lg:min-w-0">
              <div className="hidden lg:block mb-4">
                <h2 className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/40 mb-2 px-2">Select Vessel</h2>
              </div>
              {(['UFO', 'SHUTTLE', 'BALLOON', 'ROVER'] as VehicleType[]).map((type) => (
                <button
                  key={type}
                  onClick={() => {
                    setVehicleType(type);
                    resetGame();
                  }}
                  className={cn(
                    "flex items-center gap-3 p-2 sm:p-3 rounded-xl border transition-all duration-300 text-left active:scale-95 group relative overflow-hidden",
                    vehicleType === type 
                      ? "bg-emerald-500/10 border-emerald-500/40 text-emerald-400 shadow-lg shadow-emerald-500/5" 
                      : "bg-white/5 border-white/10 text-white/50 hover:bg-white/10 hover:border-white/20"
                  )}
                >
                  <div className={cn(
                    "p-2 rounded-lg transition-transform duration-300 group-hover:scale-110",
                    vehicleType === type ? "bg-emerald-500 text-black shadow-lg shadow-emerald-500/20" : "bg-white/5 text-white"
                  )}>
                    {type === 'UFO' && <Rocket size={16} />}
                    {type === 'SHUTTLE' && <Plane size={16} />}
                    {type === 'BALLOON' && <Wind size={16} />}
                    {type === 'ROVER' && <Truck size={16} />}
                  </div>
                  <div className="flex flex-col">
                    <div className="font-bold text-xs sm:text-sm uppercase tracking-tight">{VEHICLE_CONFIGS[type].name}</div>
                    <div className="hidden lg:block text-[10px] opacity-50 mt-0.5">
                      {type === 'UFO' ? 'High agility, low fuel' : 
                       type === 'SHUTTLE' ? 'Heavy, powerful thrust' : 
                       type === 'BALLOON' ? 'Low gravity, slow descent' : 
                       'Sturdy, high impact tolerance'}
                    </div>
                  </div>
                  {vehicleType === type && (
                    <motion.div 
                      layoutId="active-indicator"
                      className="absolute left-0 top-0 bottom-0 w-1 bg-emerald-500"
                    />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Game Area Overlay - Just for controls and overlays */}
          <div className="flex-1 relative pointer-events-none">
            {/* Touch Controls Overlay - Responsive Positioning */}
            <div className="absolute bottom-6 sm:bottom-10 left-0 right-0 px-4 sm:px-10 flex justify-between items-end pointer-events-none z-20">
              {/* Left/Right Controls */}
              <div className="flex gap-3 sm:gap-6 pointer-events-auto">
                <button
                  onMouseDown={() => setTouchControls(t => ({ ...t, leftThrusting: true }))}
                  onMouseUp={() => setTouchControls(t => ({ ...t, leftThrusting: false }))}
                  onMouseLeave={() => setTouchControls(t => ({ ...t, leftThrusting: false }))}
                  onTouchStart={(e) => { e.preventDefault(); setTouchControls(t => ({ ...t, leftThrusting: true })) }}
                  onTouchEnd={(e) => { e.preventDefault(); setTouchControls(t => ({ ...t, leftThrusting: false })) }}
                  onTouchCancel={(e) => { e.preventDefault(); setTouchControls(t => ({ ...t, leftThrusting: false })) }}
                  className={cn(
                    "w-12 h-12 sm:w-16 sm:h-16 rounded-2xl border-2 flex items-center justify-center transition-all active:scale-90 shadow-2xl touch-none select-none backdrop-blur-md",
                    touchControls.leftThrusting ? "bg-emerald-500 border-emerald-400 text-black" : "bg-black/40 border-white/20 text-white"
                  )}
                >
                  <ChevronLeft size={24} className="sm:hidden" />
                  <ChevronLeft size={32} className="hidden sm:block" />
                </button>
                <button
                  onMouseDown={() => setTouchControls(t => ({ ...t, rightThrusting: true }))}
                  onMouseUp={() => setTouchControls(t => ({ ...t, rightThrusting: false }))}
                  onMouseLeave={() => setTouchControls(t => ({ ...t, rightThrusting: false }))}
                  onTouchStart={(e) => { e.preventDefault(); setTouchControls(t => ({ ...t, rightThrusting: true })) }}
                  onTouchEnd={(e) => { e.preventDefault(); setTouchControls(t => ({ ...t, rightThrusting: false })) }}
                  onTouchCancel={(e) => { e.preventDefault(); setTouchControls(t => ({ ...t, rightThrusting: false })) }}
                  className={cn(
                    "w-12 h-12 sm:w-16 sm:h-16 rounded-2xl border-2 flex items-center justify-center transition-all active:scale-90 shadow-2xl touch-none select-none backdrop-blur-md",
                    touchControls.rightThrusting ? "bg-emerald-500 border-emerald-400 text-black" : "bg-black/40 border-white/20 text-white"
                  )}
                >
                  <ChevronRight size={24} className="sm:hidden" />
                  <ChevronRight size={32} className="hidden sm:block" />
                </button>
              </div>

              {/* Main Thrust Control */}
              <div className="pointer-events-auto">
                <button
                  onMouseDown={() => setTouchControls(t => ({ ...t, thrusting: true }))}
                  onMouseUp={() => setTouchControls(t => ({ ...t, thrusting: false }))}
                  onMouseLeave={() => setTouchControls(t => ({ ...t, thrusting: false }))}
                  onTouchStart={(e) => { e.preventDefault(); setTouchControls(t => ({ ...t, thrusting: true })) }}
                  onTouchEnd={(e) => { e.preventDefault(); setTouchControls(t => ({ ...t, thrusting: false })) }}
                  onTouchCancel={(e) => { e.preventDefault(); setTouchControls(t => ({ ...t, thrusting: false })) }}
                  className={cn(
                    "w-20 h-20 sm:w-28 sm:h-28 rounded-full border-4 flex flex-col items-center justify-center transition-all active:scale-95 shadow-2xl relative overflow-hidden group touch-none select-none backdrop-blur-md",
                    touchControls.thrusting 
                      ? "bg-emerald-400 border-white text-black scale-105 shadow-emerald-500/50" 
                      : "bg-emerald-600/20 border-emerald-500/40 text-emerald-500"
                  )}
                >
                  {touchControls.thrusting && (
                    <motion.div 
                      initial={{ opacity: 0 }}
                      animate={{ opacity: [0.2, 0.4, 0.2] }}
                      transition={{ repeat: Infinity, duration: 0.5 }}
                      className="absolute inset-0 bg-emerald-400"
                    />
                  )}
                  <div className="relative z-10 flex flex-col items-center">
                    <Rocket size={28} className={cn("transition-transform sm:hidden", touchControls.thrusting && "-translate-y-1")} />
                    <Rocket size={40} className={cn("transition-transform hidden sm:block", touchControls.thrusting && "-translate-y-1")} />
                    <span className="text-[8px] sm:text-[10px] font-black uppercase tracking-widest mt-1 opacity-60">Thrust</span>
                  </div>
                </button>
              </div>
            </div>

            {/* Game Over Overlay */}
            <AnimatePresence>
              {gameOver && (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-[2px] z-50 pointer-events-none"
                >
                  <motion.div 
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.5 }}
                    className="text-center p-8 max-w-sm pointer-events-auto"
                  >
                    <div className={cn(
                      "text-3xl sm:text-5xl font-black uppercase italic tracking-tighter mb-2 drop-shadow-2xl",
                      gameOver.success ? "text-emerald-400/90" : "text-red-500/90"
                    )}>
                      {gameOver.success ? "Perfect Landing" : "Mission Failed"}
                    </div>
                    <p className="text-white/80 mb-6 text-sm font-medium drop-shadow-md">
                      {gameOver.success 
                        ? `Safe touchdown at ${Math.abs(gameOver.speed).toFixed(2)} m/s.`
                        : `Impact at ${Math.abs(gameOver.speed).toFixed(2)} m/s.`}
                    </p>
                    <button 
                      onClick={resetGame}
                      className="w-full py-4 bg-white/10 hover:bg-white/20 text-white border border-white/20 backdrop-blur-md font-bold uppercase tracking-widest rounded-xl transition-all active:scale-95"
                    >
                      Try Again
                    </button>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}
