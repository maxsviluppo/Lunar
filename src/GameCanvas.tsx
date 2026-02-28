import React, { useEffect, useRef, useState, useCallback } from 'react';
import { GameState, VehicleType, VEHICLE_CONFIGS } from './types';

interface GameCanvasProps {
  vehicleType: VehicleType;
  onGameOver: (success: boolean, speed: number) => void;
  isPaused: boolean;
  externalControls?: {
    thrusting: boolean;
    leftThrusting: boolean;
    rightThrusting: boolean;
  };
}

const GameCanvas: React.FC<GameCanvasProps> = ({ 
  vehicleType, 
  onGameOver, 
  isPaused,
  externalControls 
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const requestRef = useRef<number>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  const config = VEHICLE_CONFIGS[vehicleType];

  const stars = React.useMemo(() => {
    return Array.from({ length: 200 }).map((_, i) => ({
      x: Math.random() * 3000,
      y: Math.random() * 3000,
      size: Math.random() * 1.8 + 0.2,
      depth: Math.pow(Math.random(), 2) * 0.9 + 0.1, // Exponential distribution for more distant stars
      twinkleSpeed: Math.random() * 0.004 + 0.001,
      secondaryTwinkleSpeed: Math.random() * 0.01 + 0.005,
      twinkleOffset: Math.random() * Math.PI * 2,
      twinkleType: Math.random(), // Used to vary the twinkle pattern
      color: Math.random() > 0.8 ? (Math.random() > 0.5 ? '#93c5fd' : '#fca5a5') : '#ffffff', // Some blue/red stars
    }));
  }, []);

  const gameOverTriggeredRef = useRef(false);
  
  // Use a Ref for the actual game state to avoid React render lag in the game loop
  const gameStateRef = useRef<GameState>({
    x: 0,
    y: 50,
    vx: 2,
    vy: 0,
    angle: 0,
    fuel: config.fuelCapacity,
    isLanded: false,
    isCrashed: false,
    impactVelocity: 0,
    thrusting: false,
    leftThrusting: false,
    rightThrusting: false,
    zoom: 1,
  });

  // Keep track of keyboard state separately
  const keysRef = useRef({
    thrusting: false,
    leftThrusting: false,
    rightThrusting: false,
  });

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (isPaused) return;
    switch (e.key) {
      case 'ArrowUp':
      case ' ':
        keysRef.current.thrusting = true;
        break;
      case 'ArrowLeft':
        keysRef.current.leftThrusting = true;
        break;
      case 'ArrowRight':
        keysRef.current.rightThrusting = true;
        break;
    }
  }, [isPaused]);

  const handleKeyUp = useCallback((e: KeyboardEvent) => {
    switch (e.key) {
      case 'ArrowUp':
      case ' ':
        keysRef.current.thrusting = false;
        break;
      case 'ArrowLeft':
        keysRef.current.leftThrusting = false;
        break;
      case 'ArrowRight':
        keysRef.current.rightThrusting = false;
        break;
    }
  }, []);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [handleKeyDown, handleKeyUp]);

  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        setDimensions({ width, height });
      }
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  // Reset state when vehicle changes or dimensions change
  useEffect(() => {
    gameStateRef.current = {
      x: dimensions.width / 2,
      y: 120, // Start lower to be below the header
      vx: 1 + Math.random() * 2,
      vy: 0,
      angle: 0,
      fuel: config.fuelCapacity,
      isLanded: false,
      isCrashed: false,
      impactVelocity: 0,
      thrusting: false,
      leftThrusting: false,
      rightThrusting: false,
      zoom: 1,
    };
  }, [vehicleType, config, dimensions]);

  const update = useCallback(() => {
    const s = gameStateRef.current;
    if (isPaused || s.isLanded || s.isCrashed) return;

    // Effective controls for this frame (keyboard OR touch)
    const isThrusting = keysRef.current.thrusting || (externalControls?.thrusting ?? false);
    const isLeftThrusting = keysRef.current.leftThrusting || (externalControls?.leftThrusting ?? false);
    const isRightThrusting = keysRef.current.rightThrusting || (externalControls?.rightThrusting ?? false);

    // Update thrusting state for drawing
    s.thrusting = isThrusting && s.fuel > 0;
    s.leftThrusting = isLeftThrusting && s.fuel > 0;
    s.rightThrusting = isRightThrusting && s.fuel > 0;

    if (s.fuel <= 0) {
      s.fuel = 0;
    }

    // Physics
    let ax = 0;
    let ay = config.gravity;

    if (s.thrusting) {
      ay -= config.thrust;
      s.fuel -= config.fuelConsumption;
    }
    if (s.leftThrusting) {
      ax -= config.lateralThrust;
      s.fuel -= config.fuelConsumption * 0.5;
    }
    if (s.rightThrusting) {
      ax += config.lateralThrust;
      s.fuel -= config.fuelConsumption * 0.5;
    }

    s.vx += ax;
    s.vy += ay;

    // Drag
    s.vx *= config.drag;
    s.vy *= config.drag;

    s.x += s.vx;
    s.y += s.vy;

    // Zoom animation on landing
    if (s.isLanded) {
      const targetZoom = 2.2;
      s.zoom += (targetZoom - s.zoom) * 0.04;
    } else {
      s.zoom = 1;
    }

    // Screen wrap / bounds
    if (s.x < 0) s.x = dimensions.width;
    if (s.x > dimensions.width) s.x = 0;

    // Collision detection
    const groundY = dimensions.height - 60;
    const padWidth = 200;
    const padHeight = 10;
    const padElevation = 30;
    const padX = dimensions.width / 2 - padWidth / 2;
    const padY = groundY - padHeight - padElevation;

    const isOnPad = s.x >= padX && s.x <= padX + padWidth;
    const collisionY = isOnPad ? padY : groundY;

    if (s.y + config.height / 2 >= collisionY) {
      s.y = collisionY - config.height / 2;
      
      const isSlowEnough = Math.abs(s.vy) < config.safeLandingSpeed && Math.abs(s.vx) < 1.0;

      if (!gameOverTriggeredRef.current) {
        gameOverTriggeredRef.current = true;
        
        if (isOnPad && isSlowEnough) {
          s.isLanded = true;
          s.impactVelocity = s.vy;
          s.vx = 0;
          s.vy = 0;
          setTimeout(() => onGameOver(true, s.impactVelocity), 5000);
        } else {
          s.isCrashed = true;
          s.impactVelocity = s.vy;
          s.vx = 0;
          s.vy = 0;
          setTimeout(() => onGameOver(false, s.impactVelocity), 5000);
        }
      }
    }
  }, [config, isPaused, onGameOver, externalControls, dimensions]);

  const draw = useCallback((ctx: CanvasRenderingContext2D) => {
    const { x, y, thrusting, leftThrusting, rightThrusting, isCrashed, isLanded, fuel, vy, vx, zoom } = gameStateRef.current;
    const canvas = ctx.canvas;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw Background (Stars) - 3D Parallax & Twinkle
    ctx.fillStyle = '#050505';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    const now = Date.now();
    stars.forEach(star => {
      // Parallax effect: deeper stars move slower relative to the camera
      // We use the vehicle position to simulate camera movement
      const parallaxX = x * star.depth * 0.2;
      const parallaxY = y * star.depth * 0.2;
      
      let sx = (star.x - parallaxX) % canvas.width;
      let sy = (star.y - parallaxY) % canvas.height;
      
      if (sx < 0) sx += canvas.width;
      if (sy < 0) sy += canvas.height;

      // Enhanced Twinkle effect: multi-frequency modulation
      let twinkle;
      if (star.twinkleType > 0.6) {
        // Smooth interference pattern
        twinkle = (Math.sin(now * star.twinkleSpeed + star.twinkleOffset) * 0.6 + 
                   Math.sin(now * star.secondaryTwinkleSpeed) * 0.4) * 0.5 + 0.5;
      } else if (star.twinkleType > 0.3) {
        // Sharp pulsing
        twinkle = Math.pow(Math.sin(now * star.twinkleSpeed + star.twinkleOffset) * 0.5 + 0.5, 3);
      } else {
        // Standard sine
        twinkle = Math.sin(now * star.twinkleSpeed + star.twinkleOffset) * 0.5 + 0.5;
      }

      const opacity = (0.05 + twinkle * 0.95) * star.depth;
      
      ctx.fillStyle = star.color || '#ffffff';
      ctx.globalAlpha = opacity;
      
      // Occasional "flare" for larger stars
      const flare = (star.size > 1.5 && Math.random() > 0.99) ? 1.5 : 1.0;
      
      ctx.beginPath();
      ctx.arc(sx, sy, star.size * star.depth * flare, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.globalAlpha = 1.0;

    ctx.save();
    
    if (isLanded && zoom > 1) {
      // Zoom into the vehicle
      ctx.translate(canvas.width / 2, canvas.height / 2);
      ctx.scale(zoom, zoom);
      // We want the vehicle to be at the center, but slightly above the ground
      ctx.translate(-x, -y + 20);
    }

    // Draw Ground
    const groundY = canvas.height - 60;
    const groundGradient = ctx.createLinearGradient(0, groundY, 0, canvas.height);
    groundGradient.addColorStop(0, '#262626');
    groundGradient.addColorStop(1, '#171717');
    ctx.fillStyle = groundGradient;
    ctx.fillRect(0, groundY, canvas.width, 60);

    // Draw Craters/Texture
    ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
    for (let i = 0; i < 20; i++) {
      const cx = (Math.sin(i * 987.65) * 0.5 + 0.5) * canvas.width;
      const cy = groundY + (Math.cos(i * 456.78) * 0.5 + 0.5) * 40 + 10;
      const radiusX = 10 + Math.abs(Math.sin(i)) * 20;
      const radiusY = 3 + Math.abs(Math.cos(i)) * 5;
      ctx.beginPath();
      ctx.ellipse(cx, cy, radiusX, radiusY, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    // Draw some small rocks
    ctx.fillStyle = '#404040';
    for (let i = 0; i < 30; i++) {
      const rx = (Math.sin(i * 123.45) * 0.5 + 0.5) * canvas.width;
      const ry = groundY + (Math.cos(i * 678.90) * 0.5 + 0.5) * 50 + 5;
      const size = 1 + Math.abs(Math.sin(i)) * 3;
      ctx.fillRect(rx, ry, size, size);
    }

    // Draw Landing Pad
    const padWidth = 200;
    const padHeight = 10;
    const padElevation = 30;
    const padX = canvas.width / 2 - padWidth / 2;
    const padY = canvas.height - 60 - padHeight - padElevation;

    ctx.fillStyle = '#10b981';
    ctx.fillRect(padX, padY, padWidth, padHeight);

    // Draw Blinking Lights
    const blink = Math.floor(Date.now() / 500) % 2 === 0;
    if (blink) {
      // Calculate proximity intensity
      const distToPad = Math.hypot(x - canvas.width / 2, y - padY);
      const proximityFactor = Math.max(0, 1 - distToPad / 300); // 0 at 300px, 1 at 0px
      
      ctx.fillStyle = '#6ee7b7';
      // Left light
      ctx.beginPath();
      ctx.arc(padX + 10, padY + padHeight / 2, 3, 0, Math.PI * 2);
      ctx.fill();
      // Right light
      ctx.beginPath();
      ctx.arc(padX + padWidth - 10, padY + padHeight / 2, 3, 0, Math.PI * 2);
      ctx.fill();
      
      // Dynamic Glow effect
      ctx.shadowBlur = 15 + proximityFactor * 35; // Glow increases from 15 to 50
      ctx.shadowColor = '#10b981';
      ctx.stroke();
      ctx.shadowBlur = 0;
    }
    
    // Draw Ramps/Supports
    const supportPulse = Math.sin(Date.now() / 800) * 0.5 + 0.5;
    ctx.strokeStyle = `rgba(75, 85, 99, ${0.8 + supportPulse * 0.2})`;
    ctx.lineWidth = 3 + supportPulse;
    
    // Add a subtle glow to the supports
    ctx.shadowBlur = 5 + supportPulse * 10;
    ctx.shadowColor = '#4b5563';
    
    ctx.beginPath();
    // Left Ramp
    ctx.moveTo(padX - 40, canvas.height - 60);
    ctx.lineTo(padX, padY);
    ctx.lineTo(padX, canvas.height - 60);
    // Left Support Pillar
    ctx.moveTo(padX - 20, canvas.height - 60);
    ctx.lineTo(padX - 20, padY + 5);
    
    // Right Ramp
    ctx.moveTo(padX + padWidth + 40, canvas.height - 60);
    ctx.lineTo(padX + padWidth, padY);
    ctx.lineTo(padX + padWidth, canvas.height - 60);
    // Right Support Pillar
    ctx.moveTo(padX + padWidth + 20, canvas.height - 60);
    ctx.lineTo(padX + padWidth + 20, padY + 5);
    ctx.stroke();
    
    // Reset shadow for next drawings
    ctx.shadowBlur = 0;

    // Draw Vehicle
    ctx.save();
    ctx.translate(x, y);

    if (isCrashed) {
      // Explosion
      ctx.fillStyle = '#ef4444';
      for (let i = 0; i < 8; i++) {
        ctx.beginPath();
        ctx.arc((Math.random() - 0.5) * 40, (Math.random() - 0.5) * 40, Math.random() * 10, 0, Math.PI * 2);
        ctx.fill();
      }
    } else {
      // Draw Thrusters
      if (thrusting) {
        ctx.fillStyle = '#fbbf24';
        ctx.beginPath();
        ctx.moveTo(-config.width / 4, config.height / 2);
        ctx.lineTo(config.width / 4, config.height / 2);
        ctx.lineTo(0, config.height / 2 + 10 + Math.random() * 5);
        ctx.fill();
      }
      if (leftThrusting) {
        ctx.fillStyle = '#fbbf24';
        ctx.beginPath();
        ctx.moveTo(config.width / 2, -config.height / 4);
        ctx.lineTo(config.width / 2, config.height / 4);
        ctx.lineTo(config.width / 2 + 8 + Math.random() * 3, 0);
        ctx.fill();
      }
      if (rightThrusting) {
        ctx.fillStyle = '#fbbf24';
        ctx.beginPath();
        ctx.moveTo(-config.width / 2, -config.height / 4);
        ctx.lineTo(-config.width / 2, config.height / 4);
        ctx.lineTo(-config.width / 2 - 8 - Math.random() * 3, 0);
        ctx.fill();
      }

      // Draw Vehicle Body based on type
      ctx.fillStyle = isLanded ? '#4ade80' : '#cbd5e1';
      ctx.strokeStyle = '#94a3b8';
      ctx.lineWidth = 2;

      // Landing Legs (Ramps/Supports)
      if (isLanded || y > ctx.canvas.height - 100) {
        ctx.strokeStyle = '#64748b';
        ctx.beginPath();
        ctx.moveTo(-config.width / 2, config.height / 2);
        ctx.lineTo(-config.width / 2 - 5, config.height / 2 + 5);
        ctx.moveTo(config.width / 2, config.height / 2);
        ctx.lineTo(config.width / 2 + 5, config.height / 2 + 5);
        ctx.stroke();
      }

      if (vehicleType === 'UFO') {
        // UFO Shape
        ctx.beginPath();
        ctx.ellipse(0, 0, config.width / 2, config.height / 2, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        // Cockpit
        ctx.fillStyle = '#93c5fd';
        ctx.beginPath();
        ctx.arc(0, -5, 10, Math.PI, 0);
        ctx.fill();
      } else if (vehicleType === 'SHUTTLE') {
        // Shuttle Shape
        ctx.beginPath();
        ctx.moveTo(-15, config.height / 2);
        ctx.lineTo(15, config.height / 2);
        ctx.lineTo(15, -config.height / 2 + 20);
        ctx.lineTo(0, -config.height / 2);
        ctx.lineTo(-15, -config.height / 2 + 20);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        // Wings
        ctx.beginPath();
        ctx.moveTo(-15, 0);
        ctx.lineTo(-30, 20);
        ctx.lineTo(-15, 20);
        ctx.fill();
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(15, 0);
        ctx.lineTo(30, 20);
        ctx.lineTo(15, 20);
        ctx.fill();
        ctx.stroke();
      } else if (vehicleType === 'BALLOON') {
        // Balloon Shape
        ctx.beginPath();
        ctx.arc(0, -20, 25, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        // Basket
        ctx.fillStyle = '#78350f';
        ctx.fillRect(-10, 20, 20, 15);
        // Ropes
        ctx.strokeStyle = '#a8a29e';
        ctx.beginPath();
        ctx.moveTo(-10, 20);
        ctx.lineTo(-15, 0);
        ctx.moveTo(10, 20);
        ctx.lineTo(15, 0);
        ctx.stroke();
      } else if (vehicleType === 'ROVER') {
        // Rover Body
        ctx.beginPath();
        ctx.roundRect(-config.width / 2, -config.height / 4, config.width, config.height / 2, 5);
        ctx.fill();
        ctx.stroke();
        // Wheels
        ctx.fillStyle = '#171717';
        ctx.beginPath();
        ctx.arc(-config.width / 3, config.height / 4, 6, 0, Math.PI * 2);
        ctx.arc(config.width / 3, config.height / 4, 6, 0, Math.PI * 2);
        ctx.fill();
        // Antenna
        ctx.strokeStyle = '#94a3b8';
        ctx.beginPath();
        ctx.moveTo(0, -config.height / 4);
        ctx.lineTo(5, -config.height / 2);
        ctx.stroke();
      }
    }

    ctx.restore(); // Restore vehicle local transform
    ctx.restore(); // Restore global zoom transform

    // Draw HUD - Responsive Positioning
    const isSmallScreen = canvas.width < 640;
    const hudX = isSmallScreen ? 15 : 25;
    const hudY = isSmallScreen ? 85 : 100; // Adjusted to be below the header
    const barWidth = isSmallScreen ? 80 : 120;
    const barHeight = isSmallScreen ? 6 : 8;
    const fuelPercentage = fuel / config.fuelCapacity;

    // Fuel Label
    ctx.fillStyle = 'white';
    ctx.font = `bold ${isSmallScreen ? '10px' : '12px'} monospace`;
    ctx.textAlign = 'left';
    ctx.fillText('FUEL', hudX, hudY);

    // Fuel Bar Background
    ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.fillRect(hudX + (isSmallScreen ? 35 : 45), hudY - (isSmallScreen ? 8 : 10), barWidth, barHeight);

    // Fuel Bar Fill
    const barColor = fuelPercentage > 0.5 ? '#10b981' : fuelPercentage > 0.2 ? '#f59e0b' : '#ef4444';
    ctx.fillStyle = barColor;
    ctx.fillRect(hudX + (isSmallScreen ? 35 : 45), hudY - (isSmallScreen ? 8 : 10), barWidth * Math.max(0, fuelPercentage), barHeight);
    
    // Fuel Bar Border
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.lineWidth = 1;
    ctx.strokeRect(hudX + (isSmallScreen ? 35 : 45), hudY - (isSmallScreen ? 8 : 10), barWidth, barHeight);

    // Other Stats
    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.font = `${isSmallScreen ? '9px' : '11px'} monospace`;
    ctx.fillText(`V-SPEED: ${vy.toFixed(2)} m/s`, hudX, hudY + (isSmallScreen ? 15 : 20));
    ctx.fillText(`H-SPEED: ${vx.toFixed(2)} m/s`, hudX, hudY + (isSmallScreen ? 30 : 40));

  }, [vehicleType, config]);

  const loop = useCallback(() => {
    update();
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) draw(ctx);
    }
    requestRef.current = requestAnimationFrame(loop);
  }, [update, draw]);

  useEffect(() => {
    requestRef.current = requestAnimationFrame(loop);
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [loop]);

  return (
    <div ref={containerRef} className="relative w-full h-full bg-black overflow-hidden">
      <canvas
        ref={canvasRef}
        width={dimensions.width}
        height={dimensions.height}
        className="w-full h-full block"
      />
      {isPaused && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="text-white text-4xl font-bold tracking-widest uppercase italic">Paused</div>
        </div>
      )}
    </div>
  );
};

export default GameCanvas;
