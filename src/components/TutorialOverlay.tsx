import React, { useEffect, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ArrowLeft, ArrowRight, SkipForward, ChevronDown, ChevronUp } from 'lucide-react';
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
  const [isExpanded, setIsExpanded] = useState(true);
  const overlayRef = useRef<HTMLDivElement>(null);
  const barRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  const { trapFocus, restoreFocus } = useFocusManagement();

  // Find and highlight target element
  useEffect(() => {
    if (step.targetElement && isVisible) {
      const timeout = setTimeout(() => {
        const element = document.querySelector(step.targetElement!) as HTMLElement;
        
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

          // Scroll element into view if needed
          element.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'center',
            inline: 'center' 
          });

          // Add highlight class for extra emphasis
          element.classList.add('tutorial-highlight');
        }
      }, 100);

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
        case ' ':
          setIsExpanded(!isExpanded);
          e.preventDefault();
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isVisible, isFirstStep, isLastStep, onNext, onPrev, onExit, isExpanded]);

  // Focus management and body class for tutorial overlay
  useEffect(() => {
    if (isVisible) {
      document.body.classList.add('tutorial-active');
      
      if (barRef.current && isExpanded) {
        previousFocusRef.current = document.activeElement as HTMLElement;
        const cleanup = trapFocus(barRef.current);
        
        return () => {
          cleanup();
          document.body.classList.remove('tutorial-active');
          if (!isVisible) {
            restoreFocus(previousFocusRef.current);
          }
        };
      }
    }
    
    return () => {
      document.body.classList.remove('tutorial-active');
    };
  }, [isVisible, isExpanded, trapFocus, restoreFocus]);

  if (!isVisible) return null;

  const viewportWidth = window.innerWidth;
  const isMobileView = viewportWidth < 768;

  return createPortal(
    <AnimatePresence>
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 99999,
          pointerEvents: 'none'
        }}
      >
        {/* Spotlight effect - same as before */}
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
                backgroundColor: 'rgba(0, 0, 0, 0.4)',
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
                backgroundColor: 'rgba(0, 0, 0, 0.4)',
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
                backgroundColor: 'rgba(0, 0, 0, 0.4)',
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
                backgroundColor: 'rgba(0, 0, 0, 0.4)',
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
                border: '3px solid #ea384c',
                borderRadius: '12px',
                boxShadow: '0 0 20px rgba(234, 56, 76, 0.6)',
                pointerEvents: 'none',
                background: 'transparent',
                zIndex: 99995
              }}
            />
          </>
        )}

        {/* Fallback overlay when no spotlight */}
        {(!step.targetElement || spotlightPosition.width === 0) && (
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.4)',
              pointerEvents: 'none',
              zIndex: 99990
            }}
          />
        )}

        {/* NEW: Expandable Bottom Bar */}
        <motion.div
          ref={barRef}
          style={{
            position: 'fixed',
            bottom: 0,
            left: 0,
            right: 0,
            backgroundColor: 'white',
            borderTop: '3px solid #ea384c',
            boxShadow: '0 -4px 12px rgba(0, 0, 0, 0.15)',
            zIndex: 99999,
            pointerEvents: 'auto'
          }}
          initial={{ y: 100 }}
          animate={{ y: 0 }}
          exit={{ y: 100 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
        >
          {/* Collapsed State */}
          {!isExpanded && (
            <div 
              className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-gray-50 transition-colors"
              onClick={() => setIsExpanded(true)}
            >
              <div className="flex items-center gap-3">
                <div className="text-sm font-medium text-gray-600">Tutorial</div>
                
                {/* Progress dots */}
                <div className="flex items-center gap-1">
                  {Array.from({ length: totalSteps }, (_, index) => (
                    <div
                      key={index}
                      className={`w-2 h-2 rounded-full transition-colors ${
                        index <= currentStepNumber ? 'bg-[#ea384c]' : 'bg-gray-300'
                      }`}
                    />
                  ))}
                </div>
                
                <div className="text-sm text-gray-700">
                  Step {currentStepNumber + 1}: {step.title}
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    onNext();
                  }}
                  className="bg-[#ea384c] hover:bg-red-600 text-white px-3 py-1 text-xs"
                >
                  Next
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    onSkip();
                  }}
                  className="text-gray-500 hover:text-gray-700 px-2 py-1 text-xs"
                >
                  Skip
                </Button>
                <ChevronUp className="w-4 h-4 text-gray-400" />
              </div>
            </div>
          )}

          {/* Expanded State */}
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              transition={{ duration: 0.2 }}
              className="px-4 py-4"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-8 h-8 bg-[#ea384c] rounded-full flex items-center justify-center text-white text-sm font-bold">
                      {currentStepNumber + 1}
                    </div>
                    <h3 className="font-semibold text-lg text-gray-900">{step.title}</h3>
                  </div>
                  
                  <p className="text-gray-600 mb-3 max-w-2xl">
                    {step.description}
                  </p>
                  
                  {step.hint && (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4 max-w-2xl">
                      <p className="text-yellow-800 text-sm">💡 {step.hint}</p>
                    </div>
                  )}
                  
                  {/* Progress bar */}
                  <div className="flex items-center gap-4 mb-3">
                    <div className="flex-1 bg-gray-200 rounded-full h-2 max-w-xs">
                      <div 
                        className="bg-[#ea384c] h-2 rounded-full transition-all duration-300"
                        style={{ width: `${((currentStepNumber + 1) / totalSteps) * 100}%` }}
                      />
                    </div>
                    <span className="text-sm text-gray-500">
                      {currentStepNumber + 1} of {totalSteps}
                    </span>
                  </div>
                </div>
                
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsExpanded(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <ChevronDown className="w-4 h-4" />
                </Button>
              </div>
              
              {/* Navigation buttons */}
              <div className="flex items-center justify-between">
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={onSkip}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    <SkipForward className="w-4 h-4 mr-1" />
                    Skip Tutorial
                  </Button>
                </div>
                
                <div className="flex gap-2">
                  {!isFirstStep && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={onPrev}
                      className="flex items-center gap-1"
                    >
                      <ArrowLeft className="w-3 h-3" />
                      Previous
                    </Button>
                  )}
                  
                  <Button
                    onClick={onNext}
                    size="sm"
                    className="bg-[#ea384c] hover:bg-red-600 text-white flex items-center gap-1"
                  >
                    {isLastStep ? 'Complete' : 'Next'}
                    {!isLastStep && <ArrowRight className="w-3 h-3" />}
                  </Button>
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={onExit}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </motion.div>
          )}
        </motion.div>
      </div>

      {/* Enhanced CSS for highlighted elements */}
      <style>{`
        .tutorial-highlight {
          position: relative !important;
          z-index: 99996 !important;
          box-shadow: 0 0 30px rgba(234, 56, 76, 0.4) !important;
          border-radius: 8px !important;
          overflow: visible !important;
        }
        
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