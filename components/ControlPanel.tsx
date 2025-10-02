import React from 'react';
import { InputMode } from '../types';
import { IconText, IconMicrophone, IconUpload, IconClipboard } from './Icon';

interface ControlPanelProps {
  activeMode: InputMode;
  onModeChange: (mode: InputMode) => void;
}

const ControlButton: React.FC<{
  label: string;
  isActive: boolean;
  onClick: () => void;
  children: React.ReactNode;
}> = ({ label, isActive, onClick, children }) => {
  const baseClasses = "flex flex-col sm:flex-row items-center justify-center gap-2 px-4 py-3 rounded-lg font-semibold transition-all duration-300 ease-in-out transform hover:-translate-y-1 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-purple-500 w-full";
  const activeClasses = "bg-purple-600 text-white shadow-lg shadow-purple-600/30";
  const inactiveClasses = "bg-gray-700/50 hover:bg-gray-700 text-gray-300";

  return (
    <button
      onClick={onClick}
      className={`${baseClasses} ${isActive ? activeClasses : inactiveClasses}`}
    >
      {children}
      <span>{label}</span>
    </button>
  );
};

export const ControlPanel: React.FC<ControlPanelProps> = ({ activeMode, onModeChange }) => {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <ControlButton
        label="Text Prompt"
        isActive={activeMode === InputMode.TEXT}
        onClick={() => onModeChange(InputMode.TEXT)}
      >
        <IconText className="w-6 h-6" />
      </ControlButton>
      <ControlButton
        label="Voice Command"
        isActive={activeMode === InputMode.VOICE}
        onClick={() => onModeChange(InputMode.VOICE)}
      >
        <IconMicrophone className="w-6 h-6" />
      </ControlButton>
      <ControlButton
        label="Upload MIDI"
        isActive={activeMode === InputMode.MIDI}
        onClick={() => onModeChange(InputMode.MIDI)}
      >
        <IconUpload className="w-6 h-6" />
      </ControlButton>
      <ControlButton
        label="Context Paste"
        isActive={activeMode === InputMode.CONTEXT}
        onClick={() => onModeChange(InputMode.CONTEXT)}
      >
        <IconClipboard className="w-6 h-6" />
      </ControlButton>
    </div>
  );
};
