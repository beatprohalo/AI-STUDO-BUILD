import React from 'react';
import { IconMusic } from './Icon';

export const Header: React.FC = () => {
  return (
    <header className="text-center">
      <div className="flex items-center justify-center gap-4">
        <IconMusic className="w-10 h-10 text-purple-500 dark:text-purple-400" />
        <h1 className="text-4xl md:text-5xl font-bold font-orbitron tracking-wider bg-clip-text text-transparent bg-gradient-to-r from-purple-500 to-pink-600 dark:from-purple-400 dark:to-pink-500">
          Music Organizer
        </h1>
      </div>
      <p className="mt-2 text-lg text-gray-600 dark:text-gray-400">Your Smart Music Catalog and Task Manager</p>
    </header>
  );
};