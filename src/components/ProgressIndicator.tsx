
import React from 'react';
import { Progress } from '@/components/ui/progress';

interface ProgressIndicatorProps {
  currentStep: number;
  totalSteps: number;
  title?: string;
  showNumbers?: boolean;
}

const ProgressIndicator: React.FC<ProgressIndicatorProps> = ({
  currentStep,
  totalSteps,
  title,
  showNumbers = true
}) => {
  const progress = (currentStep / totalSteps) * 100;

  return (
    <div className="w-full">
      {title && (
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-medium text-gray-700">{title}</span>
          {showNumbers && (
            <span className="text-sm text-gray-500">
              {currentStep} of {totalSteps}
            </span>
          )}
        </div>
      )}
      <Progress 
        value={progress} 
        className="h-2 bg-gray-200"
      />
    </div>
  );
};

export default ProgressIndicator;
