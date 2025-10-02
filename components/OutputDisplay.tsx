import React from 'react';
import { MusicalIdea } from '../types';
import { IconDownload, IconX, IconSave } from './Icon';

interface OutputDisplayProps {
  idea: MusicalIdea;
  onClose: () => void;
}

const InfoPill: React.FC<{ label: string; value: string | number }> = ({ label, value }) => (
  <div className="flex flex-col items-center justify-center bg-purple-100 dark:bg-purple-900/50 rounded-full px-4 py-2 text-center">
    <span className="text-xs font-semibold text-purple-700 dark:text-purple-300 uppercase tracking-wider">{label}</span>
    <span className="text-lg font-bold text-purple-900 dark:text-white">{value}</span>
  </div>
);

export const OutputDisplay: React.FC<OutputDisplayProps> = ({ idea, onClose }) => {
  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = `data:audio/midi;base64,${idea.midiBase64}`;
    const safeTitle = idea.title.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    link.download = `${safeTitle}.mid`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="relative bg-gray-100/40 dark:bg-gray-800/40 border border-purple-300 dark:border-purple-500/20 rounded-xl p-6 space-y-6 animate-fade-in">
      <button onClick={onClose} className="absolute top-4 right-4 p-2 text-gray-500 dark:text-gray-400 hover:text-black dark:hover:text-white hover:bg-gray-300 dark:hover:bg-gray-700 rounded-full transition-colors">
        <IconX className="w-5 h-5"/>
      </button>
      
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
            <h2 className="text-3xl font-orbitron font-bold text-purple-600 dark:text-purple-300">{idea.title}</h2>
            <p className="text-gray-600 dark:text-gray-400 mt-1">{idea.description}</p>
        </div>
        <button
          onClick={handleDownload}
          className="flex items-center gap-2 bg-green-600 hover:bg-green-500 text-white font-bold py-2 px-4 rounded-lg transition-colors duration-300 transform hover:scale-105"
        >
          <IconDownload className="w-5 h-5" />
          Download MIDI
        </button>
      </div>

      {idea.savedFilePath && (
        <div className="bg-gray-200 dark:bg-gray-900/50 p-3 rounded-lg flex items-center gap-3 animate-fade-in">
            <IconSave className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0" />
            <div>
                <p className="text-gray-800 dark:text-gray-300 font-semibold">
                    MIDI file saved successfully
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                    Path: <code className="font-mono bg-gray-300 dark:bg-gray-700 text-green-700 dark:text-green-300 px-1.5 py-0.5 rounded">{idea.savedFilePath}</code>
                </p>
            </div>
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <InfoPill label="Genre" value={idea.genre} />
        <InfoPill label="Mood" value={idea.mood} />
        <InfoPill label="BPM" value={idea.bpm} />
        <InfoPill label="Key" value={idea.key} />
      </div>

      <div className="grid md:grid-cols-2 gap-6 text-gray-800 dark:text-gray-300">
        <div className="bg-gray-200 dark:bg-gray-900/50 p-4 rounded-lg">
          <h3 className="font-semibold text-lg text-purple-600 dark:text-purple-400 mb-2">Chord Progression</h3>
          <div className="flex flex-wrap gap-2">
            {idea.chordProgression.map((chord, index) => (
              <span key={index} className="bg-gray-300 dark:bg-gray-700 px-3 py-1 rounded-md text-sm font-mono">
                {chord}
              </span>
            ))}
          </div>
        </div>
        <div className="bg-gray-200 dark:bg-gray-900/50 p-4 rounded-lg">
          <h3 className="font-semibold text-lg text-purple-600 dark:text-purple-400 mb-2">Melody</h3>
          <p>{idea.melodyDescription}</p>
        </div>
        <div className="bg-gray-200 dark:bg-gray-900/50 p-4 rounded-lg md:col-span-2">
            <h3 className="font-semibold text-lg text-purple-600 dark:text-purple-400 mb-2">Rhythm / Drums</h3>
            <p>{idea.rhythmDescription}</p>
        </div>
      </div>
    </div>
  );
};