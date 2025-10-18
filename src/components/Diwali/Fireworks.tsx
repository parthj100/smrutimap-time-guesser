import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface FireworkParticle {
  id: string;
  angle: number;
  color: string;
  distance: number;
}

interface Firework {
  id: string;
  x: number;
  y: number;
  particles: FireworkParticle[];
  color: string;
}

const COLORS = [
  '#FCD34D', // Yellow
  '#FB923C', // Orange
  '#F87171', // Red
  '#FBBF24', // Amber
  '#EF4444', // Bright red
];

const createFirework = (): Firework => {
  const particleCount = 35 + Math.floor(Math.random() * 15); // 35-50 particles
  const color = COLORS[Math.floor(Math.random() * COLORS.length)];
  
  const particles: FireworkParticle[] = Array.from({ length: particleCount }, (_, i) => ({
    id: `particle-${i}`,
    angle: (360 / particleCount) * i,
    color: Math.random() > 0.5 ? color : COLORS[Math.floor(Math.random() * COLORS.length)],
    distance: 120 + Math.random() * 80, // Distance particles travel (120-200px) - MUCH BIGGER
  }));

  return {
    id: `firework-${Date.now()}-${Math.random()}`,
    x: 10 + Math.random() * 80, // X position (10-90% of screen width) - MORE SCATTERED
    y: 10 + Math.random() * 70, // Y position (10-80% of screen height) - MORE SCATTERED
    particles,
    color,
  };
};

export const Fireworks: React.FC = () => {
  const [fireworks, setFireworks] = useState<Firework[]>([]);

  useEffect(() => {
    const launchFireworkBurst = () => {
      // Launch 2-3 fireworks simultaneously
      const burstCount = 2 + Math.floor(Math.random() * 2); // 2-3 fireworks
      
      for (let i = 0; i < burstCount; i++) {
        setTimeout(() => {
          const newFirework = createFirework();
          setFireworks((prev) => [...prev, newFirework]);

          // Remove firework after animation completes
          setTimeout(() => {
            setFireworks((prev) => prev.filter((fw) => fw.id !== newFirework.id));
          }, 2500);
        }, i * 200); // Slight delay between each firework in the burst
      }
    };

    // Launch first burst immediately
    launchFireworkBurst();

    // Then launch bursts every 8-10 seconds
    const interval = setInterval(() => {
      launchFireworkBurst();
    }, 8000 + Math.random() * 2000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-5">
      <AnimatePresence>
        {fireworks.map((firework) => (
          <div
            key={firework.id}
            className="absolute"
            style={{
              left: `${firework.x}%`,
              top: `${firework.y}%`,
            }}
          >
            {/* Central flash - BIGGER */}
            <motion.div
              className="absolute rounded-full"
              style={{
                background: `radial-gradient(circle, ${firework.color} 0%, transparent 70%)`,
                width: 40,
                height: 40,
                left: -20,
                top: -20,
              }}
              initial={{ opacity: 1, scale: 0 }}
              animate={{ opacity: 0, scale: 4 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
            />

            {/* Particles */}
            {firework.particles.map((particle) => {
              const radians = (particle.angle * Math.PI) / 180;
              const x = Math.cos(radians) * particle.distance;
              const y = Math.sin(radians) * particle.distance;

              return (
                <motion.div
                  key={particle.id}
                  className="absolute rounded-full"
                  style={{
                    background: particle.color,
                    width: 6,
                    height: 6,
                    left: -3,
                    top: -3,
                    boxShadow: `0 0 12px ${particle.color}`,
                  }}
                  initial={{
                    x: 0,
                    y: 0,
                    opacity: 1,
                    scale: 0,
                  }}
                  animate={{
                    x,
                    y,
                    opacity: 0,
                    scale: [0, 1.5, 0.5, 0],
                  }}
                  exit={{ opacity: 0 }}
                  transition={{
                    duration: 1.5,
                    ease: [0.22, 1, 0.36, 1], // Custom ease for realistic motion
                  }}
                >
                  {/* Trail effect - BIGGER */}
                  <motion.div
                    className="absolute rounded-full"
                    style={{
                      background: `linear-gradient(to right, ${particle.color}, transparent)`,
                      width: 30,
                      height: 3,
                      left: -15,
                      top: 1.5,
                      transformOrigin: 'left center',
                      rotate: `${particle.angle}deg`,
                    }}
                    initial={{ scaleX: 0, opacity: 0.8 }}
                    animate={{ scaleX: [0, 1, 0], opacity: [0.8, 0.6, 0] }}
                    transition={{ duration: 1.4 }}
                  />
                </motion.div>
              );
            })}

            {/* Secondary ring burst - BIGGER */}
            <motion.div
              className="absolute rounded-full border-4"
              style={{
                borderColor: firework.color,
                width: 80,
                height: 80,
                left: -40,
                top: -40,
              }}
              initial={{ opacity: 0.6, scale: 0 }}
              animate={{ opacity: 0, scale: 3.5 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1.3, ease: 'easeOut' }}
            />
          </div>
        ))}
      </AnimatePresence>
    </div>
  );
};

export default Fireworks;

