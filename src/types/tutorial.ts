export interface TutorialStep {
  id: string;
  title: string;
  description: string;
  targetElement?: string;
  position?: 'top' | 'bottom' | 'left' | 'right' | 'center';
  showNext?: boolean;
  showPrev?: boolean;
  showSkip?: boolean;
  action?: () => void;
  validation?: () => boolean;
  hint?: string;
}

export interface TutorialState {
  isActive: boolean;
  currentStep: number;
  totalSteps: number;
  hasCompletedBefore: boolean;
  canSkip: boolean;
  isInteractive: boolean;
  practiceMode: boolean;
}

export interface TutorialConfig {
  steps: TutorialStep[];
  practiceImage: {
    id: string;
    image_url: string;
    description: string;
    year: number;
    location: {
      lat: number;
      lng: number;
      name: string;
    };
  };
  onComplete: () => void;
  onSkip: () => void;
  onExit: () => void;
}

export interface TutorialProgress {
  stepId: string;
  completed: boolean;
  timestamp: number;
  userAction?: string;
} 