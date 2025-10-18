import React, { useMemo } from 'react';
import { motion } from 'framer-motion';

interface Particle {
  id: number;
  x: number;
  size: number;
  duration: number;
  delay: number;
  opacity: number;
}

export const FloatingParticles: React.FC = () => {
  // Generate random particles
  const particles = useMemo<Particle[]>(() => {
    return Array.from({ length: 25 }, (_, i) => ({
      id: i,
      x: Math.random() * 100, // Random X position (%)
      size: Math.random() * 6 + 3, // Size between 3-9px
      duration: Math.random() * 8 + 10, // Duration between 10-18s
      delay: Math.random() * 5, // Random start delay
      opacity: Math.random() * 0.4 + 0.3, // Opacity between 0.3-0.7
    }));
  }, []);

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-5">
      {particles.map((particle) => (
        <motion.div
          key={particle.id}
          className="absolute rounded-full"
          style={{
            left: `${particle.x}%`,
            width: particle.size,
            height: particle.size,
            background: `radial-gradient(circle, 
              rgba(251, 191, 36, ${particle.opacity}) 0%, 
              rgba(245, 158, 11, ${particle.opacity * 0.8}) 50%, 
              rgba(217, 119, 6, 0) 100%)`,
            boxShadow: `0 0 ${particle.size * 2}px rgba(251, 191, 36, ${particle.opacity * 0.5})`,
          }}
          initial={{
            bottom: '-10%',
            rotate: 0,
          }}
          animate={{
            bottom: '110%',
            x: [0, Math.random() * 40 - 20, Math.random() * 40 - 20, 0], // Drift side to side
            rotate: 360,
            scale: [1, 1.2, 0.8, 1],
          }}
          transition={{
            duration: particle.duration,
            delay: particle.delay,
            repeat: Infinity,
            ease: 'linear',
          }}
        />
      ))}
    </div>
  );
};

export default FloatingParticles;

