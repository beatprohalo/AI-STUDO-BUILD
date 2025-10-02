import React, { useState } from 'react';
import { Track, SyncMatchResult } from '../types';
import { IconLink, IconLoader, IconMusic } from './Icon';

interface SyncMatchViewProps {
  tracks: Track[];
  matches: SyncMatchResult[] | null;
  isMatching: boolean;
  error: string | null;
  onFindMatches: (brief: string) => void;
}

export const SyncMatchView: React.FC<SyncMatchViewProps> = ({ tracks, matches, isMatching, error, onFindMatches }) => {
  const [brief, setBrief] = useState('');

  const handleSubmit = () => {
    if (!brief.trim() || isMatching) return;
    onFindMatches(brief);
  };
  
  const getTrackById = (id: string) => tracks.find(t => t.id === id);

  return (
    <div className="animate-fade-in space-y-6">
      <div className="bg-white/50 dark:bg-black/30 backdrop-blur-md border border-purple-300 dark:border-purple-500/20 rounded-2xl p-6 space-y-4">
        <h2 className="font-orbitron text-xl font-bold text-purple-600 dark:text-purple-300 flex items-center gap-3">
          <IconLink className="w-6 h-6" />
          Sync Brief Matching Engine
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          Paste a creative brief from an email, website, or document. The AI will analyze it and find the best matching tracks from your catalog.
        </p>
        <textarea
          value={brief}
          onChange={(e) => setBrief(e.target.value)}
          placeholder="e.g., 'Looking for a dark, energetic trap beat at 140 BPM with a cinematic vibe for a car commercial...'"
          rows={8}
          className="w-full bg-gray-100 dark:bg-gray-800/50 border-2 border-gray-300 dark:border-gray-700 rounded-lg p-3 text-gray-800 dark:text-gray-300 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all"
          disabled={isMatching}
        />
        <button
          onClick={handleSubmit}
          disabled={isMatching || !brief.trim()}
          className="w-full flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-500 text-white font-bold py-3 px-4 rounded-lg transition-colors duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isMatching ? <IconLoader className="w-5 h-5 animate-spin" /> : <IconLink className="w-5 h-5" />}
          {isMatching ? 'Analyzing...' : 'Find Matches'}
        </button>
      </div>

      {isMatching && (
         <div className="flex flex-col items-center justify-center h-full text-center text-gray-500 dark:text-gray-400 bg-gray-100/30 dark:bg-black/20 rounded-2xl p-8 border border-purple-300/20 dark:border-purple-500/10">
            <IconLoader className="w-16 h-16 mb-4 animate-spin text-purple-500 dark:text-purple-400"/>
            <h3 className="text-xl font-bold font-orbitron text-gray-800 dark:text-gray-300">Finding Best Matches...</h3>
            <p>The AI is analyzing your catalog.</p>
        </div>
      )}

      {error && (
        <div className="bg-red-100 dark:bg-red-900/50 border border-red-300 dark:border-red-500/50 rounded-xl p-4 text-center text-red-800 dark:text-red-200">
            <h3 className="font-bold">An Error Occurred</h3>
            <p>{error}</p>
        </div>
      )}

      {matches && !isMatching && (
        <div className="bg-white/50 dark:bg-black/30 backdrop-blur-md border border-purple-300 dark:border-purple-500/20 rounded-2xl p-6 space-y-4 animate-fade-in">
             <h3 className="font-orbitron text-lg font-bold text-purple-600 dark:text-purple-300">Top 3 Matches</h3>
             {matches.length > 0 ? (
                <div className="space-y-4">
                    {matches.map((match, index) => {
                        const track = getTrackById(match.trackId);
                        return (
                            <div key={match.trackId} className="bg-gray-100 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700/50 rounded-xl p-4 transition-all hover:border-purple-400 dark:hover:border-purple-500/50">
                                <div className="flex items-start gap-4">
                                    <div className="text-3xl font-orbitron font-bold text-purple-500 dark:text-purple-400">#{index + 1}</div>
                                    <div className="flex-1">
                                        <h4 className="font-bold text-lg text-gray-900 dark:text-white">{match.trackName}</h4>
                                        {track && (
                                            <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-gray-600 dark:text-gray-400 mt-1">
                                                <span><strong>Genre:</strong> {track.genre || 'N/A'}</span>
                                                <span><strong>Mood:</strong> {track.mood || 'N/A'}</span>
                                                <span><strong>Key:</strong> {track.key || 'N/A'}</span>
                                                <span><strong>BPM:</strong> {track.bpm}</span>
                                            </div>
                                        )}
                                        <div className="mt-3 bg-gray-200 dark:bg-gray-900/50 p-3 rounded-md">
                                            <p className="text-sm text-purple-700 dark:text-purple-200 font-semibold">AI Reasoning:</p>
                                            <p className="text-sm text-gray-700 dark:text-gray-300">{match.reasoning}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )
                    })}
                </div>
             ) : (
                <p className="text-gray-500 text-center py-8">The AI could not find any suitable matches in your catalog for this brief.</p>
             )}
        </div>
      )}

      {!matches && !isMatching && !error && (
        <div className="flex flex-col items-center justify-center h-full text-center text-gray-600 dark:text-gray-500 bg-gray-100/30 dark:bg-black/20 rounded-2xl p-8 border border-purple-300/20 dark:border-purple-500/10">
            <IconMusic className="w-16 h-16 mb-4 text-purple-500/50 dark:text-purple-600/50"/>
            <h3 className="text-xl font-bold font-orbitron text-gray-800 dark:text-gray-300">Results Will Appear Here</h3>
            <p>Enter a brief above to get started.</p>
        </div>
      )}
    </div>
  );
};