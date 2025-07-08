import React from 'react';
import { SimpleMultiplayerContainer } from '../SimpleMultiplayerContainer';

interface MultiplayerGameProps {
  onBack: () => void;
  onHome: () => void;
}

export default function MultiplayerGame({ onBack, onHome }: MultiplayerGameProps) {
  return <SimpleMultiplayerContainer onBack={onBack} onHome={onHome} />;
} 