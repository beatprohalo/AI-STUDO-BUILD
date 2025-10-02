import React from 'react';
import { Track, Sample } from '../types';
import { IconPlay, IconPause, IconStop, IconMusic } from './Icon';

type PlaybackStatus = 'playing' | 'paused' | 'stopped';

interface PlayerProps {
  track: Track | Sample | null;
  status: PlaybackStatus;
  currentTime: number;
  duration: number;
  onPlayPause: () => void;
  onStop: () => void;
  onSeek: (time: number) => void;
}

const formatTime = (seconds: number) => {
  if (isNaN(seconds)) return '0:00';
  const floorSeconds = Math.floor(seconds);
  const min = Math.floor(floorSeconds / 60);
  const sec = floorSeconds % 60;
  return `${min}:${sec < 10 ? '0' : ''}${sec}`;
};

// A simple pseudo-random generator for deterministic waveforms
const mulberry32 = (seed: number) => {
  return () => {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

const generateWaveformData = (seedText: string) => {
  let seed = 0;
  for (let i = 0; i < seedText.length; i++) {
    seed = (seed + seedText.charCodeAt(i)) & 0xffffffff;
  }
  const random = mulberry32(seed);
  return Array.from({ length: 50 }, () => Math.max(0.1, random()));
};


export const Player: React.FC<PlayerProps> = ({ track, status, currentTime, duration, onPlayPause, onStop, onSeek }) => {
  if (!track) return null;

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;
  const waveformData = React.useMemo(() => generateWaveformData(track.name), [track.name]);

  return (
    <div className="fixed bottom-4 left-4 right-4 bg-white/70 dark:bg-black/50 backdrop-blur-lg border border-purple-300 dark:border-purple-500/20 rounded-2xl p-4 shadow-2xl shadow-purple-500/10 animate-fade-in z-50">
      <div className="flex items-center gap-4">
        {/* Controls */}
        <div className="flex items-center gap-2">
            <button
                onClick={onPlayPause}
                className="p-3 bg-purple-600 hover:bg-purple-500 text-white rounded-full transition-colors"
                aria-label={status === 'playing' ? 'Pause' : 'Play'}
            >
                {status === 'playing' ? <IconPause className="w-5 h-5"/> : <IconPlay className="w-5 h-5"/>}
            </button>
             <button
                onClick={onStop}
                className="p-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-full transition-colors"
                aria-label="Stop"
            >
                <IconStop className="w-4 h-4"/>
            </button>
        </div>
        
        {/* Track Info & Progress */}
        <div className="flex-1 flex items-center gap-4">
            <IconMusic className="w-6 h-6 text-purple-600 dark:text-purple-300 flex-shrink-0" />
            <div className="flex-1">
                <div className="flex items-center justify-between">
                    <p className="font-semibold text-gray-800 dark:text-white truncate" title={track.name}>{track.name}</p>
                    <div className="flex items-center gap-2 font-mono text-sm text-gray-500 dark:text-gray-400">
                        <span>{formatTime(currentTime)}</span>
                        <span>/</span>
                        <span>{formatTime(duration)}</span>
                    </div>
                </div>

                {/* Scrubber & Waveform */}
                <div className="relative h-10 group">
                    <div className="absolute inset-0 flex items-center justify-between gap-0.5">
                       {waveformData.map((height, i) => (
                           <div
                            key={i}
                            className={`transition-colors duration-150 ${i / waveformData.length * 100 < progress ? 'bg-purple-500' : 'bg-gray-300 dark:bg-gray-600'}`}
                            style={{
                                width: '1.8%',
                                height: `${height * 100}%`,
                                borderRadius: '2px',
                            }}
                           ></div>
                       ))}
                    </div>
                    <input
                        type="range"
                        min="0"
                        max={duration}
                        value={currentTime}
                        onChange={(e) => onSeek(parseFloat(e.target.value))}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                </div>
            </div>
        </div>
      </div>
    </div>
  );
};
