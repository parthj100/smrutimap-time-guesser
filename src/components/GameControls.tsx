import React from 'react';
import EnhancedButton from './EnhancedButton';
import { calculateDistance } from '@/utils/gameUtils';
import { GuessResult, GameImage } from '@/types/game';

interface GameControlsProps {
  hasGuessed: boolean;
  locationGuess: { lat: number; lng: number } | null;
  currentImage: GameImage;
  currentResult?: GuessResult;
  currentRound: number;
  totalRounds: number;
  isTimedMode: boolean;
  onSubmitGuess: () => void;
  onNextRound: () => void;
}

const GameControls: React.FC<GameControlsProps> = ({
  hasGuessed,
  locationGuess,
  currentImage,
  currentResult,
  currentRound,
  totalRounds,
  isTimedMode,
  onSubmitGuess,
  onNextRound
}) => {
  if (hasGuessed) {
    return (
      <div className="flex-shrink-0 mt-4 space-y-4">
        {/* Distance info shown when user has guessed */}
        {locationGuess && (
          <div className="text-xl text-center bg-white p-4 rounded-xl shadow-md">
            Your guess was <span className="font-bold text-red-500">
              {calculateDistance(
                locationGuess.lat, 
                locationGuess.lng, 
                currentImage.location.lat, 
                currentImage.location.lng
              ).toFixed(0)} miles
            </span> from the correct location
          </div>
        )}
        
        {currentResult?.timeUsed && isTimedMode && (
          <div className="text-center text-gray-600 bg-white p-3 rounded-xl">
            Time used: {currentResult.timeUsed}s
          </div>
        )}
        
        <div className="text-center">
          <EnhancedButton 
            onClick={onNextRound} 
            className="bg-[#ea384c] hover:bg-red-600 text-white px-10 py-3 rounded-md text-lg"
          >
            {currentRound >= totalRounds ? "See Final Results" : "Next Round"}
          </EnhancedButton>
        </div>
      </div>
    );
  }

<<<<<<< HEAD
  return (
    <div className="flex-shrink-0">
      {/* Place your pin message when in guessing mode and no location selected */}
      {!locationGuess && (
        <div className="p-3 border border-blue-200 rounded-lg bg-[#ea384c] mb-4">
          <div className="flex items-center text-blue-700">
            <span className="font-medium text-slate-50 text-center w-full">
              Click on the map to place your location guess
            </span>
          </div>
        </div>
      )}
      
      {/* Submit button */}
      <div>
        <EnhancedButton 
          onClick={onSubmitGuess} 
          disabled={!locationGuess} 
          animationType="pulse" 
          className={`px-10 py-4 rounded-md w-full text-xl font-semibold transition-all ${
            locationGuess 
              ? "bg-[#ea384c] hover:bg-red-600 text-white" 
              : "bg-gray-300 text-gray-500 cursor-not-allowed"
          }`}
        >
          {locationGuess ? "Submit Guess" : "Select a location on the map"}
        </EnhancedButton>
      </div>
    </div>
  );
=======
  // When user hasn't guessed yet, don't show any controls since they're now in GameContent
  return null;
>>>>>>> f1c45d3 (feat: add full SmrutiMap game code and assets)
};

export default GameControls;
