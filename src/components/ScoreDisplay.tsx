
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { getScoreFeedback, SCORE_CONSTANTS } from '@/utils/scoringSystem';

interface ScoreDisplayProps {
  yearScore: number; // Display score (0-5000)
  locationScore: number; // Display score (0-5000)
  totalScore: number; // Display score (0-10000+)
  timeBonus?: number; // Time bonus points
  showTimeBonus?: boolean;
}

const ScoreDisplay: React.FC<ScoreDisplayProps> = ({ 
  yearScore, 
  locationScore, 
  totalScore,
  timeBonus = 0,
  showTimeBonus = false
}) => {
  // Convert display scores to percentages for progress bars
  const yearPercentage = Math.min(100, (yearScore / SCORE_CONSTANTS.MAX_DISPLAY_SCORE_PER_CATEGORY) * 100);
  const locationPercentage = Math.min(100, (locationScore / SCORE_CONSTANTS.MAX_DISPLAY_SCORE_PER_CATEGORY) * 100);
  
  // FIXED: Use the total score directly for feedback since it's already the sum
  const feedback = getScoreFeedback(totalScore, true);

  console.log('📊 ScoreDisplay props (FIXED):', {
    yearScore,
    locationScore,
    totalScore,
    timeBonus,
    yearPercentage,
    locationPercentage,
    feedback,
    expectedTotal: yearScore + locationScore + timeBonus,
    actualTotal: totalScore
  });

  return (
    <Card className="w-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-center text-2xl">Round Score</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium">Year Accuracy</span>
            <span className="font-bold">{Math.round(yearScore)}/{SCORE_CONSTANTS.MAX_DISPLAY_SCORE_PER_CATEGORY}</span>
          </div>
          <Progress 
            value={yearPercentage} 
            className={yearPercentage >= 75 ? "bg-green-500/20" : yearPercentage >= 50 ? "bg-yellow-500/20" : "bg-red-500/20"}
          />
        </div>
        
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium">Location Accuracy</span>
            <span className="font-bold">{Math.round(locationScore)}/{SCORE_CONSTANTS.MAX_DISPLAY_SCORE_PER_CATEGORY}</span>
          </div>
          <Progress 
            value={locationPercentage}
            className={locationPercentage >= 75 ? "bg-green-500/20" : locationPercentage >= 50 ? "bg-yellow-500/20" : "bg-red-500/20"}
          />
        </div>
        
        {showTimeBonus && timeBonus > 0 && (
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-blue-600">Time Bonus</span>
              <span className="font-bold text-blue-600">+{Math.round(timeBonus)}</span>
            </div>
          </div>
        )}
        
        <div className="pt-2 border-t">
          <div className="flex justify-between items-center">
            <span className="font-medium">Total Score</span>
            <div className="text-right">
              <div className="text-2xl font-bold">{Math.round(totalScore)}</div>
              <div className="text-sm text-muted-foreground">{feedback}</div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ScoreDisplay;
