import React from 'react';
import { InputMode } from '../types';
import { IconMicrophone, IconUpload } from './Icon';

interface PromptInputProps {
  mode: InputMode;
  prompt: string;
  onPromptChange: (value: string) => void;
  onFileChange: (file: File | null) => void;
  isListening: boolean;
  onStartListening: () => void;
  onStopListening: () => void;
}

export const PromptInput: React.FC<PromptInputProps> = ({
  mode,
  prompt,
  onPromptChange,
  onFileChange,
  isListening,
  onStartListening,
  onStopListening,
}) => {
  const placeholderText = {
    [InputMode.TEXT]: "e.g., Make me a moody trap loop at 120 bpm...",
    [InputMode.VOICE]: "Click the mic and start speaking...",
    [InputMode.MIDI]: "Add an optional text prompt for your MIDI...",
    [InputMode.CONTEXT]: "Paste text from a brief, notes, or website...",
  };

  const renderInput = () => {
    switch (mode) {
      case InputMode.VOICE:
        return (
          <div className="flex items-center gap-4">
            <input
              type="text"
              readOnly
              value={prompt || "Listening..."}
              className="w-full bg-gray-800/50 border-2 border-transparent rounded-lg p-4 text-gray-300 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all"
            />
            <button
              onClick={isListening ? onStopListening : onStartListening}
              className={`p-4 rounded-full transition-colors duration-300 ${isListening ? 'bg-red-600 animate-pulse' : 'bg-purple-600'}`}
            >
              <IconMicrophone className="w-6 h-6 text-white" />
            </button>
          </div>
        );
      case InputMode.MIDI:
        return (
          <div className="space-y-4">
             <div className="relative flex items-center justify-center w-full">
                <label htmlFor="midi-upload" className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-600 border-dashed rounded-lg cursor-pointer bg-gray-800/50 hover:bg-gray-800/80 transition-colors">
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                        <IconUpload className="w-8 h-8 mb-2 text-gray-400" />
                        <p className="mb-2 text-sm text-gray-400"><span className="font-semibold">Click to upload</span> or drag and drop</p>
                        <p className="text-xs text-gray-500">MIDI file (.mid)</p>
                    </div>
                    <input id="midi-upload" type="file" className="hidden" accept=".mid,.midi" onChange={(e) => onFileChange(e.target.files ? e.target.files[0] : null)} />
                </label>
            </div>
            <input
              type="text"
              value={prompt}
              onChange={(e) => onPromptChange(e.target.value)}
              placeholder={placeholderText[mode]}
              className="w-full bg-gray-800/50 border-2 border-transparent rounded-lg p-4 text-gray-300 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all"
            />
          </div>
        );
      case InputMode.CONTEXT:
         const isContextActive = mode === InputMode.CONTEXT;
         return (
            <textarea
                value={prompt}
                onChange={(e) => onPromptChange(e.target.value)}
                placeholder={placeholderText[mode]}
                rows={6}
                className={`w-full bg-gray-800/50 border-2 rounded-lg p-4 text-gray-300 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all duration-300 ${isContextActive ? 'border-purple-500 shadow-lg shadow-purple-500/20' : 'border-transparent'}`}
            />
        );
      case InputMode.TEXT:
      default:
        return (
          <input
            type="text"
            value={prompt}
            onChange={(e) => onPromptChange(e.target.value)}
            placeholder={placeholderText[mode]}
            className="w-full bg-gray-800/50 border-2 border-transparent rounded-lg p-4 text-gray-300 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all"
          />
        );
    }
  };

  return <div className="w-full">{renderInput()}</div>;
};
