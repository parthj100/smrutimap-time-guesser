
import React from 'react';
import Game from '@/components/Game';

const Index = () => {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-[#eee9da] overflow-x-hidden">
      <div className="w-full max-w-7xl mx-auto px-8 lg:px-6 md:px-4 sm:px-4">
        <Game />
      </div>
    </div>
  );
};

export default Index;
