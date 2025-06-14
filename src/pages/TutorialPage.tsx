import React from 'react';
import { useNavigate } from 'react-router-dom';
import Tutorial from '@/components/Tutorial';

const TutorialPage: React.FC = () => {
  const navigate = useNavigate();

  const handleTutorialComplete = () => {
    // Navigate to home page after tutorial completion
    navigate('/', { 
      state: { 
        tutorialCompleted: true,
        message: 'Tutorial completed! Ready to play?' 
      } 
    });
  };

  const handleTutorialExit = () => {
    // Navigate back to home page if user exits tutorial
    navigate('/');
  };

  return (
    <Tutorial 
      onComplete={handleTutorialComplete}
      onExit={handleTutorialExit}
    />
  );
};

export default TutorialPage; 