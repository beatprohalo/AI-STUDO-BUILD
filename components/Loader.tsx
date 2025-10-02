import React from 'react';

export const Loader: React.FC = () => {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-8">
        <div className="flex items-end justify-center h-16 space-x-2">
            <div className="w-3 h-4 bg-purple-400 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
            <div className="w-3 h-8 bg-purple-400 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
            <div className="w-3 h-12 bg-purple-400 rounded-full animate-bounce"></div>
            <div className="w-3 h-8 bg-purple-400 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
            <div className="w-3 h-4 bg-purple-400 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
        </div>
        <p className="font-orbitron text-purple-300 tracking-widest">ANALYZING THE VIBE...</p>
    </div>
  );
};
