import React, { useEffect, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ArrowLeft, ArrowRight, SkipForward, Lightbulb } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { TutorialStep } from '@/types/tutorial';
import { useFocusManagement } from '@/hooks/useAccessibility';

interface TutorialOverlayProps {
  step: TutorialStep;
  isVisible: boolean;
  isFirstStep: boolean;
  isLastStep: boolean;
  onNext: () => void;
  onPrev: () => void;
  onSkip: () => void;
  onExit: () => void;
  currentStepNumber: number;
  totalSteps: number;
}

const TutorialOverlay: React.FC<TutorialOverlayProps> = ({
  step,
  isVisible,
  isFirstStep,
  isLastStep,
  onNext,
  onPrev,
  onSkip,
  onExit,
  currentStepNumber,
  totalSteps,
}) => {
  const [targetElement, setTargetElement] = useState<HTMLElement | null>(null);
  const [spotlightPosition, setSpotlightPosition] = useState({ x: 0, y: 0, width: 0, height: 0 });
  const overlayRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  const { trapFocus, restoreFocus } = useFocusManagement();

  // Find and highlight target element
  useEffect(() => {
    if (step.targetElement && isVisible) {
      // Add a small delay to ensure elements are rendered
      const timeout = setTimeout(() => {
        const element = document.querySelector(step.targetElement!) as HTMLElement;
        console.log('Looking for element:', step.targetElement, 'Found:', element); // Debug log
        
        if (element) {
          setTargetElement(element);
          
          // Calculate spotlight position with padding
          const rect = element.getBoundingClientRect();
          const padding = 15;
          
          setSpotlightPosition({
            x: rect.left - padding,
            y: rect.top - padding,
            width: rect.width + (padding * 2),
            height: rect.height + (padding * 2),
          });

          console.log('Spotlight position:', {
            x: rect.left - padding,
            y: rect.top - padding,
            width: rect.width + (padding * 2),
            height: rect.height + (padding * 2),
          }); // Debug log

          // Scroll element into view if needed
          element.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'center',
            inline: 'center' 
          });

          // Add highlight class for extra emphasis
          element.classList.add('tutorial-highlight');
        } else {
          console.warn('Tutorial target element not found:', step.targetElement);
        }
      }, 100); // Small delay to ensure DOM is ready

      return () => {
        clearTimeout(timeout);
        if (targetElement) {
          targetElement.classList.remove('tutorial-highlight');
        }
      };
    }

    return () => {
      if (targetElement) {
        targetElement.classList.remove('tutorial-highlight');
      }
    };
  }, [step.targetElement, isVisible, targetElement]);

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isVisible) return;
      
      switch (e.key) {
        case 'ArrowRight':
        case 'Enter':
          if (!isLastStep) onNext();
          break;
        case 'ArrowLeft':
          if (!isFirstStep) onPrev();
          break;
        case 'Escape':
          onExit();
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isVisible, isFirstStep, isLastStep, onNext, onPrev, onExit]);

  // Focus management and body class for tutorial overlay
  useEffect(() => {
    if (isVisible) {
      // Add tutorial-active class to body
      document.body.classList.add('tutorial-active');
      
      if (tooltipRef.current) {
        // Store the currently focused element
        previousFocusRef.current = document.activeElement as HTMLElement;
        
        // Trap focus within the tooltip
        const cleanup = trapFocus(tooltipRef.current);
        
        return () => {
          cleanup();
          // Remove tutorial-active class and restore focus when tutorial closes
          document.body.classList.remove('tutorial-active');
          if (!isVisible) {
            restoreFocus(previousFocusRef.current);
          }
        };
      }
    }
    
    return () => {
      // Cleanup: remove tutorial-active class
      document.body.classList.remove('tutorial-active');
    };
  }, [isVisible, trapFocus, restoreFocus]);

  if (!isVisible) return null;

  // Calculate responsive positioning
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  const isMobileView = viewportWidth < 768; // Mobile breakpoint

  return createPortal(
    <AnimatePresence>
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 99999, // Increased z-index to ensure it's above everything
          pointerEvents: 'auto'
        }}
      >
        {/* Four overlay divs to create spotlight effect */}
        {step.targetElement && spotlightPosition.width > 0 && (
          <>
            {/* Top overlay */}
            <div
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                height: `${spotlightPosition.y}px`,
                backgroundColor: 'rgba(0, 0, 0, 0.85)', // Slightly darker overlay
                pointerEvents: 'none',
                zIndex: 99990
              }}
            />
            
            {/* Bottom overlay */}
            <div
              style={{
                position: 'absolute',
                top: `${spotlightPosition.y + spotlightPosition.height}px`,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: 'rgba(0, 0, 0, 0.85)', // Slightly darker overlay
                pointerEvents: 'none',
                zIndex: 99990
              }}
            />
            
            {/* Left overlay */}
            <div
              style={{
                position: 'absolute',
                top: `${spotlightPosition.y}px`,
                left: 0,
                width: `${spotlightPosition.x}px`,
                height: `${spotlightPosition.height}px`,
                backgroundColor: 'rgba(0, 0, 0, 0.85)', // Slightly darker overlay
                pointerEvents: 'none',
                zIndex: 99990
              }}
            />
            
            {/* Right overlay */}
            <div
              style={{
                position: 'absolute',
                top: `${spotlightPosition.y}px`,
                left: `${spotlightPosition.x + spotlightPosition.width}px`,
                right: 0,
                height: `${spotlightPosition.height}px`,
                backgroundColor: 'rgba(0, 0, 0, 0.85)', // Slightly darker overlay
                pointerEvents: 'none',
                zIndex: 99990
              }}
            />

            {/* Glowing border around spotlight */}
            <div
              style={{
                position: 'absolute',
                left: `${spotlightPosition.x - 4}px`,
                top: `${spotlightPosition.y - 4}px`,
                width: `${spotlightPosition.width + 8}px`,
                height: `${spotlightPosition.height + 8}px`,
                border: '4px solid #ea384c',
                borderRadius: '12px',
                boxShadow: '0 0 20px rgba(234, 56, 76, 0.8), 0 0 40px rgba(234, 56, 76, 0.4)',
                pointerEvents: 'none',
                background: 'transparent',
                zIndex: 99995
              }}
            />
          </>
        )}

        {/* Fallback dark overlay when no spotlight */}
        {(!step.targetElement || spotlightPosition.width === 0) && (
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.85)', // Slightly darker overlay
              pointerEvents: 'none',
              zIndex: 99990
            }}
          />
        )}

        {/* Tutorial tooltip - FIXED STATIONARY POSITION */}
        <motion.div
          ref={tooltipRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby="tutorial-title"
          aria-describedby="tutorial-description"
          style={{
            position: 'fixed',
            // Responsive positioning - top-right on desktop, top-center on mobile
            top: '20px',
            ...(isMobileView ? {
              left: '20px',
              right: '20px',
              width: 'auto'
            } : {
              right: '20px',
              width: '400px'
            }),
            maxWidth: 'calc(100vw - 40px)',
            backgroundColor: 'white',
            borderRadius: '16px',
            padding: isMobileView ? '20px' : '24px',
            border: '3px solid #ea384c',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35), 0 0 0 1px rgba(255, 255, 255, 0.1)',
            zIndex: 99999,
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)'
          }}
          initial={{ 
            scale: 0.8, 
            opacity: 0, 
            x: isMobileView ? 0 : 50,
            y: isMobileView ? -20 : 0
          }}
          animate={{ 
            scale: 1, 
            opacity: 1, 
            x: 0,
            y: 0
          }}
          transition={{ duration: 0.4, delay: 0.1, ease: "easeOut" }}
        >
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{
                width: '36px',
                height: '36px',
                backgroundColor: '#ea384c',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                fontSize: '16px',
                fontWeight: 'bold'
              }}>
                {currentStepNumber + 1}
              </div>
              <div>
                <h3 id="tutorial-title" style={{ fontWeight: 'bold', fontSize: isMobileView ? '18px' : '20px', color: '#1f2937', margin: 0 }}>{step.title}</h3>
                {step.targetElement && (
                  <p style={{ fontSize: '12px', color: '#6b7280', margin: '2px 0 0 0', fontStyle: 'italic' }}>
                    Look for the highlighted element ↗
                  </p>
                )}
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onExit}
              className="text-gray-500 hover:text-gray-700"
              aria-label="Close tutorial"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>

          {/* Content */}
          <div style={{ marginBottom: '24px' }}>
            <p id="tutorial-description" style={{ 
              color: '#4b5563', 
              lineHeight: '1.7',
              margin: 0, 
              fontSize: isMobileView ? '14px' : '16px'
            }}>
              {step.description}
            </p>
            
            {step.hint && (
              <div style={{
                marginTop: '16px',
                padding: '16px', // More padding
                backgroundColor: '#fefce8',
                border: '1px solid #fde047',
                borderRadius: '10px',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '12px'
              }}>
                <Lightbulb style={{ width: '18px', height: '18px', color: '#ca8a04', marginTop: '2px', flexShrink: 0 }} />
                <p style={{ fontSize: '15px', color: '#92400e', margin: 0, lineHeight: '1.6' }}>{step.hint}</p>
              </div>
            )}
          </div>

          {/* Progress bar */}
          <div style={{ marginBottom: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: '#6b7280', marginBottom: '8px' }}>
              <span>Tutorial Progress</span>
              <span>{currentStepNumber + 1} of {totalSteps}</span>
            </div>
            
            {/* Step indicators */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              {Array.from({ length: totalSteps }, (_, index) => (
                <div
                  key={index}
                  style={{
                    width: '24px',
                    height: '24px',
                    borderRadius: '50%',
                    backgroundColor: index < currentStepNumber ? '#10b981' : index === currentStepNumber ? '#ea384c' : '#e5e7eb',
                    color: 'white',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '12px',
                    fontWeight: 'bold',
                    transition: 'all 0.3s ease'
                  }}
                >
                  {index < currentStepNumber ? '✓' : index + 1}
                </div>
              ))}
            </div>
            
            <div style={{ width: '100%', backgroundColor: '#e5e7eb', borderRadius: '999px', height: '10px' }}> {/* Slightly taller progress bar */}
              <motion.div
                style={{
                  backgroundColor: '#ea384c',
                  height: '10px',
                  borderRadius: '999px',
                }}
                initial={{ width: 0 }}
                animate={{ width: `${((currentStepNumber + 1) / totalSteps) * 100}%` }}
                transition={{ duration: 0.5 }}
              />
            </div>
          </div>

          {/* Navigation buttons */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', gap: '10px' }}>
              {!isFirstStep && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onPrev}
                  className="flex items-center gap-1 px-4 py-2" // Slightly larger buttons
                >
                  <ArrowLeft className="w-4 h-4" />
                  Previous
                </Button>
              )}
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              {step.showSkip !== false && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onSkip}
                  className="text-gray-500 hover:text-gray-700 flex items-center gap-1 px-4 py-2"
                >
                  <SkipForward className="w-4 h-4" />
                  Skip Tutorial
                </Button>
              )}
              
              <Button
                onClick={onNext}
                size="sm"
                className="bg-[#ea384c] hover:bg-red-600 text-white flex items-center gap-1 px-4 py-2"
              >
                {isLastStep ? 'Complete' : 'Next'}
                {!isLastStep && <ArrowRight className="w-4 h-4" />}
              </Button>
            </div>
          </div>
        </motion.div>

        {/* Navigation hint at bottom - improved positioning */}
        <div 
          style={{
            position: 'fixed', // Changed to fixed for better positioning
            bottom: '15px', // Closer to bottom
            left: '50%',
            transform: 'translateX(-50%)',
            textAlign: 'center',
            zIndex: 99998, // High z-index but below tooltip
            pointerEvents: 'none' // Allow clicks to pass through
          }}
        >
          <p style={{
            color: 'white',
            fontSize: '12px',
            backgroundColor: 'rgba(0, 0, 0, 0.7)', // Slightly more opaque
            padding: '6px 12px', // More padding
            borderRadius: '9999px',
            margin: 0,
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3)' // Add subtle shadow
          }}>
            Use arrow keys or buttons to navigate
          </p>
        </div>
      </div>

      {/* Enhanced CSS for highlighted elements */}
      <style>{`
        .tutorial-highlight {
          position: relative !important;
          z-index: 99996 !important;
          box-shadow: 0 0 30px rgba(255, 255, 255, 0.7) !important;
          border-radius: 8px !important;
          overflow: visible !important;
        }
        
        /* Ensure tutorial elements don't interfere with game elements */
        .tutorial-overlay * {
          box-sizing: border-box;
        }
        
        /* Prevent any background elements from appearing above tutorial */
        body.tutorial-active {
          overflow: hidden;
        }
        
        body.tutorial-active > * {
          z-index: 1 !important;
        }
        
        body.tutorial-active .tutorial-highlight {
          z-index: 99996 !important;
        }
      `}</style>
    </AnimatePresence>,
    document.body
  );
};

export default TutorialOverlay; 