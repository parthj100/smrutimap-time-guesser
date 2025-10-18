import React from 'react';
import { motion } from 'framer-motion';
import { Sparkles } from 'lucide-react';

// Sparkle particle component
const SparkleParticle: React.FC<{ delay: number; x: string; y: string }> = ({ delay, x, y }) => (
  <motion.div
    className="absolute"
    style={{ left: x, top: y }}
    initial={{ opacity: 0, scale: 0 }}
    animate={{
      opacity: [0, 1, 0],
      scale: [0, 1, 0],
      rotate: [0, 180, 360],
    }}
    transition={{
      duration: 2,
      repeat: Infinity,
      delay: delay,
      ease: "easeInOut",
    }}
  >
    <Sparkles size={12} className="text-yellow-300" fill="currentColor" />
  </motion.div>
);

// Diya (lamp) component with flame animation
const Diya: React.FC<{ side: 'left' | 'right' }> = ({ side }) => (
  <motion.div
    className="relative"
    animate={{
      y: [0, -8, 0],
    }}
    transition={{
      duration: 2.5,
      repeat: Infinity,
      ease: "easeInOut",
    }}
  >
    {/* Diya lamp base */}
    <div className="relative flex flex-col items-center">
      {/* Flame */}
      <motion.div
        className="relative w-3 h-5 mb-1"
        animate={{
          scale: [1, 1.1, 1],
          opacity: [0.9, 1, 0.9],
        }}
        transition={{
          duration: 1,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      >
        {/* Outer glow */}
        <div className="absolute inset-0 bg-gradient-to-t from-orange-500 via-yellow-400 to-yellow-200 rounded-full blur-sm opacity-70" />
        {/* Inner flame */}
        <div className="absolute inset-1 bg-gradient-to-t from-orange-400 via-yellow-300 to-white rounded-full" />
      </motion.div>
      
      {/* Diya bowl */}
      <div className="relative">
        <svg width="24" height="16" viewBox="0 0 24 16" fill="none" xmlns="http://www.w3.org/2000/svg">
          {/* Main bowl */}
          <ellipse cx="12" cy="8" rx="10" ry="6" fill="url(#diyaGradient)" />
          {/* Bowl rim */}
          <ellipse cx="12" cy="6" rx="11" ry="4" fill="url(#diyaRimGradient)" />
          {/* Highlight */}
          <ellipse cx="8" cy="7" rx="3" ry="2" fill="rgba(255,255,255,0.3)" />
          
          <defs>
            <linearGradient id="diyaGradient" x1="12" y1="2" x2="12" y2="14" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#D97706" />
              <stop offset="100%" stopColor="#92400E" />
            </linearGradient>
            <linearGradient id="diyaRimGradient" x1="12" y1="4" x2="12" y2="8" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#FBBF24" />
              <stop offset="100%" stopColor="#D97706" />
            </linearGradient>
          </defs>
        </svg>
      </div>
      
      {/* Light rays */}
      <motion.div
        className="absolute top-0 left-1/2 transform -translate-x-1/2"
        animate={{
          opacity: [0.3, 0.6, 0.3],
          scale: [1, 1.2, 1],
        }}
        transition={{
          duration: 1.5,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      >
        <div className="w-8 h-8 bg-gradient-radial from-yellow-300 via-orange-300 to-transparent rounded-full blur-md opacity-60" />
      </motion.div>
    </div>
  </motion.div>
);

// Rangoli corner decoration
const RangoliPattern: React.FC<{ side: 'left' | 'right' }> = ({ side }) => (
  <motion.div
    className={`absolute top-0 ${side === 'left' ? 'left-0' : 'right-0'} opacity-30`}
    initial={{ opacity: 0, scale: 0.8 }}
    animate={{ opacity: 0.3, scale: 1 }}
    transition={{ duration: 1, ease: "easeOut" }}
  >
    <svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="20" cy="20" r="3" fill="#F59E0B" />
      <circle cx="20" cy="12" r="2" fill="#EF4444" />
      <circle cx="20" cy="28" r="2" fill="#EF4444" />
      <circle cx="12" cy="20" r="2" fill="#EF4444" />
      <circle cx="28" cy="20" r="2" fill="#EF4444" />
      <circle cx="15" cy="15" r="1.5" fill="#10B981" />
      <circle cx="25" cy="15" r="1.5" fill="#10B981" />
      <circle cx="15" cy="25" r="1.5" fill="#10B981" />
      <circle cx="25" cy="25" r="1.5" fill="#10B981" />
    </svg>
  </motion.div>
);

export const DiwaliBanner: React.FC<{ isMobile?: boolean }> = ({ isMobile = false }) => {
  return (
    <motion.div
      className={`relative ${isMobile ? 'mb-3' : 'mb-6'}`}
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8, ease: "easeOut", delay: 0.3 }}
    >
      {/* Decorative card background */}
      <div className="relative">
        <motion.div
          className="absolute inset-0 bg-gradient-to-br from-orange-50/90 via-yellow-50/90 to-red-50/90 backdrop-blur-sm rounded-2xl shadow-2xl border border-orange-200/50"
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.6, ease: "easeOut", delay: 0.4 }}
        />
        
        {/* Subtle animated border glow */}
        <motion.div
          className="absolute inset-0 rounded-2xl"
          style={{
            background: 'linear-gradient(45deg, #FCD34D, #F97316, #DC2626, #FCD34D)',
            backgroundSize: '300% 300%',
            padding: '2px',
            WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
            WebkitMaskComposite: 'xor',
            maskComposite: 'exclude',
          }}
          animate={{
            backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'],
          }}
          transition={{
            duration: 4,
            repeat: Infinity,
            ease: "linear",
          }}
        />
      
        {/* Container with rangoli border effect */}
        <div className="relative px-8 py-4">
        {/* Rangoli corner patterns */}
        <RangoliPattern side="left" />
        <RangoliPattern side="right" />
        
        {/* Main content container */}
        <div className="relative flex items-center justify-center gap-4">
          {/* Left Diya */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.5 }}
          >
            <Diya side="left" />
          </motion.div>
          
          {/* Happy Diwali Text with shimmer effect */}
          <div className="relative">
            {/* Glow effect behind text */}
            <motion.div
              className="absolute inset-0 blur-xl opacity-50"
              animate={{
                opacity: [0.3, 0.6, 0.3],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            >
              <div className="w-full h-full bg-gradient-to-r from-yellow-400 via-orange-400 to-red-400" />
            </motion.div>
            
            {/* Main text with animated gradient */}
            <motion.div
              className={`relative ${
                isMobile ? 'text-2xl' : 'text-4xl md:text-5xl'
              } font-bold text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 via-orange-400 to-red-500`}
              style={{
                fontFamily: "'Poppins', sans-serif",
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                filter: 'drop-shadow(0 4px 8px rgba(0, 0, 0, 0.35)) drop-shadow(0 2px 4px rgba(0, 0, 0, 0.45))',
              }}
            >
              {/* Shimmer overlay effect */}
              <motion.span
                className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent bg-clip-text"
                style={{
                  WebkitBackgroundClip: 'text',
                  backgroundSize: '200% 100%',
                }}
                animate={{
                  backgroundPosition: ['200% 0', '-200% 0'],
                }}
                transition={{
                  duration: 6,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
              >
                Happy Diwali
              </motion.span>
              Happy Diwali
            </motion.div>
            
            {/* Sparkle particles around the text */}
            <SparkleParticle delay={0} x="0%" y="50%" />
            <SparkleParticle delay={0.5} x="100%" y="50%" />
            <SparkleParticle delay={1} x="50%" y="0%" />
            <SparkleParticle delay={1.5} x="50%" y="100%" />
            <SparkleParticle delay={0.75} x="20%" y="20%" />
            <SparkleParticle delay={1.25} x="80%" y="80%" />
          </div>
          
          {/* Right Diya */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.5 }}
          >
          <Diya side="right" />
        </motion.div>
        </div>
      </div>
      </div>
    </motion.div>
  );
};

export default DiwaliBanner;

