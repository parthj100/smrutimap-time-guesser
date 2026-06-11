import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Home, PartyPopper, Swords, Users } from 'lucide-react';
import { SimpleMultiplayerContainer } from './SimpleMultiplayerContainer';

interface MultiplayerHubProps {
  onBack: () => void;
  onHome: () => void;
}

/** Chooser between the two multiplayer modes: competitive 1v1 Duels (its own
 *  routes, shareable links) and the original group Party Mode. */
const MultiplayerHub: React.FC<MultiplayerHubProps> = ({ onBack, onHome }) => {
  const navigate = useNavigate();
  const [partyMode, setPartyMode] = useState(false);

  if (partyMode) {
    return (
      <SimpleMultiplayerContainer
        onBack={() => setPartyMode(false)}
        onHome={onHome}
      />
    );
  }

  return (
    <div className="min-h-screen bg-white relative">
      <div className="fixed top-6 left-6 z-10">
        <Button
          onClick={onBack}
          className="bg-brand hover:bg-brand-dark text-white px-6 py-3 rounded-xl text-lg font-bold shadow-xl transition-all hover:scale-105 hover:shadow-2xl"
        >
          <ArrowLeft className="h-5 w-5 mr-2" />
          Back
        </Button>
      </div>
      <div className="fixed top-6 right-6 z-10">
        <Button
          onClick={onHome}
          className="bg-brand hover:bg-brand-dark text-white px-6 py-3 rounded-xl text-lg font-bold shadow-xl transition-all hover:scale-105 hover:shadow-2xl"
        >
          <Home className="h-5 w-5 mr-2" />
          Home
        </Button>
      </div>

      <div className="flex items-center justify-center min-h-screen p-6">
        <div className="max-w-lg w-full space-y-8">
          <div className="text-center space-y-6">
            <div className="w-20 h-20 bg-brand rounded-full flex items-center justify-center mx-auto">
              <Users size={40} className="text-white" />
            </div>
            <div>
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                Multiplayer
              </h2>
              <p className="text-lg text-gray-600 leading-relaxed">
                Pick how you want to play together
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <button
              onClick={() => navigate('/duels')}
              className="group w-full p-6 rounded-2xl border-2 border-brand/40 bg-white hover:border-brand hover:shadow-lg transition-all duration-200 text-left hover:scale-[1.02]"
            >
              <div className="flex items-center space-x-4">
                <Swords className="w-9 h-9 text-brand shrink-0" />
                <div className="flex-1">
                  <h3 className="text-xl font-semibold text-gray-900 group-hover:text-brand transition-colors">
                    Duels
                    <span className="ml-2 align-middle text-[10px] font-bold tracking-wide text-white bg-brand rounded-full px-2 py-0.5">
                      NEW
                    </span>
                  </h3>
                  <p className="text-gray-600 text-sm mt-1">
                    1v1 battle — out-guess your rival to drain their health bar
                  </p>
                </div>
              </div>
            </button>

            <button
              onClick={() => setPartyMode(true)}
              className="group w-full p-6 rounded-2xl border-2 border-gray-200 bg-white hover:border-brand hover:shadow-lg transition-all duration-200 text-left hover:scale-[1.02]"
            >
              <div className="flex items-center space-x-4">
                <PartyPopper className="w-9 h-9 text-gray-500 group-hover:text-brand transition-colors shrink-0" />
                <div className="flex-1">
                  <h3 className="text-xl font-semibold text-gray-900 group-hover:text-brand transition-colors">
                    Party Mode
                  </h3>
                  <p className="text-gray-600 text-sm mt-1">
                    Casual rounds with any number of friends — highest score wins
                  </p>
                </div>
              </div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MultiplayerHub;
