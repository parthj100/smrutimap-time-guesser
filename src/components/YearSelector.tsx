import React, { useState, useEffect } from 'react';
import { Label } from '@/components/ui/label';
import { formatYear } from '@/utils/gameUtils';
import { GAME_CONSTANTS } from '@/constants/gameConstants';

interface YearSelectorProps {
  onYearSelected: (year: number) => void;
  minYear?: number;
  maxYear?: number;
  isDisabled?: boolean;
  actualYear?: number | null;
  guessedYear?: number | null;
}

const YearSelector: React.FC<YearSelectorProps> = ({
  onYearSelected,
  minYear = GAME_CONSTANTS.YEAR_RANGE.MIN,
  maxYear = GAME_CONSTANTS.YEAR_RANGE.MAX,
  isDisabled = false,
  actualYear = null,
  guessedYear = null
}) => {
  const [selectedYear, setSelectedYear] = useState<number>(Math.floor((minYear + maxYear) / 2));

  const handleYearChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newYear = parseInt(e.target.value);
    setSelectedYear(newYear);
    onYearSelected(newYear);
  };

  const getSliderBackground = () => {
    const percentage = ((selectedYear - minYear) / (maxYear - minYear)) * 100;
    return `linear-gradient(to right, #ea384c ${percentage}%, #ea384c ${percentage}%, #ccc ${percentage}%)`;
  };

  useEffect(() => {
    // Reset year when component remounts for a new round
    if (!actualYear && !guessedYear) {
      setSelectedYear(Math.floor((minYear + maxYear) / 2));
    }
  }, [actualYear, guessedYear, minYear, maxYear]);

  return (
    <div className="w-full">
      {/* Year display */}
      <div className="bg-[#ea384c] text-white py-3 px-6 text-center rounded-lg">
        <div className="text-5xl font-bold font-space">{selectedYear}</div>
      </div>
      
      {/* Slider */}
      <div className="relative mt-2">
        <input
          type="range"
          min={minYear}
          max={maxYear}
          value={selectedYear}
          onChange={handleYearChange}
          disabled={isDisabled}
          className="w-full h-10 appearance-none bg-transparent cursor-pointer"
          style={{ 
            background: getSliderBackground(),
            height: '12px',
            borderRadius: '6px',
          }}
        />
        <div className="flex justify-between text-sm text-gray-600 mt-2 font-inter">
          <span>{minYear}</span>
          <span>{maxYear}</span>
        </div>
      </div>
      
      {/* Year comparison (shown only when both years are available) */}
      {actualYear !== null && guessedYear !== null && (
        <div className="mt-3 bg-gray-100 p-3 rounded-md">
          <div className="flex justify-between text-sm font-inter">
            <div>
              <span className="font-semibold">Your guess: </span>
              <span className="font-space">{guessedYear}</span>
            </div>
            <div>
              <span className="font-semibold">Actual: </span>
              <span className="font-space">{actualYear}</span>
            </div>
            <div>
              <span className="font-semibold">Difference: </span>
              <span className="font-space">{Math.abs(actualYear - guessedYear)} years</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default YearSelector;
