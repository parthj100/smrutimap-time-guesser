import { useState, useCallback, useEffect } from 'react';
import { TutorialState, TutorialStep, TutorialProgress } from '@/types/tutorial';

export const useTutorial = (steps: TutorialStep[]) => {
  const [tutorialState, setTutorialState] = useState<TutorialState>({
    isActive: false,
    currentStep: 0,
    totalSteps: steps.length,
    hasCompletedBefore: false,
    canSkip: true,
    isInteractive: false,
    practiceMode: false,
  });

  const [progress, setProgress] = useState<TutorialProgress[]>([]);

  // Check if user has completed tutorial before
  useEffect(() => {
    const completed = localStorage.getItem('smrutimap_tutorial_completed');
    if (completed) {
      setTutorialState(prev => ({ ...prev, hasCompletedBefore: true }));
    }
  }, []);

  const startTutorial = useCallback(() => {
    setTutorialState(prev => ({
      ...prev,
      isActive: true,
      currentStep: 0,
      isInteractive: true,
    }));
  }, []);

  const nextStep = useCallback(() => {
    setTutorialState(prev => {
      if (prev.currentStep < prev.totalSteps - 1) {
        return { ...prev, currentStep: prev.currentStep + 1 };
      }
      return prev;
    });
  }, []);

  const prevStep = useCallback(() => {
    setTutorialState(prev => {
      if (prev.currentStep > 0) {
        return { ...prev, currentStep: prev.currentStep - 1 };
      }
      return prev;
    });
  }, []);

  const skipTutorial = useCallback(() => {
    setTutorialState(prev => ({ ...prev, isActive: false }));
    localStorage.setItem('smrutimap_tutorial_skipped', 'true');
  }, []);

  const completeTutorial = useCallback(() => {
    setTutorialState(prev => ({ 
      ...prev, 
      isActive: false, 
      hasCompletedBefore: true 
    }));
    localStorage.setItem('smrutimap_tutorial_completed', 'true');
  }, []);

  const exitTutorial = useCallback(() => {
    setTutorialState(prev => ({ ...prev, isActive: false }));
  }, []);

  const startPracticeMode = useCallback(() => {
    setTutorialState(prev => ({ 
      ...prev, 
      practiceMode: true,
      isInteractive: true 
    }));
  }, []);

  const endPracticeMode = useCallback(() => {
    setTutorialState(prev => ({ ...prev, practiceMode: false }));
  }, []);

  const recordProgress = useCallback((stepId: string, userAction?: string) => {
    const progressEntry: TutorialProgress = {
      stepId,
      completed: true,
      timestamp: Date.now(),
      userAction,
    };
    setProgress(prev => [...prev, progressEntry]);
  }, []);

  const getCurrentStep = useCallback(() => {
    return steps[tutorialState.currentStep];
  }, [steps, tutorialState.currentStep]);

  const isLastStep = tutorialState.currentStep === tutorialState.totalSteps - 1;
  const isFirstStep = tutorialState.currentStep === 0;

  return {
    tutorialState,
    progress,
    startTutorial,
    nextStep,
    prevStep,
    skipTutorial,
    completeTutorial,
    exitTutorial,
    startPracticeMode,
    endPracticeMode,
    recordProgress,
    getCurrentStep,
    isLastStep,
    isFirstStep,
  };
}; 