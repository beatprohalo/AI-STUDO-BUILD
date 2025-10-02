import React from 'react';
import { Track } from '../types';
import { IconMusic, IconClipboardCheck, IconClock, IconFolder, IconMessageSquare, IconVolume2, IconBell, IconRefresh, IconLoader, IconTag, IconKey, IconTrendingUp } from './Icon';

interface DashboardProps {
  tracks: Track[];
  summaryText: string | null;
  onPlaySummary: () => void;
  onCheckReminders: () => void;
  isSpeaking: boolean;
  onRefresh: () => void;
  isRefreshing: boolean;
}

const StatCard: React.FC<{ icon: React.ReactNode; label: string; value: string | number; color: string }> = ({ icon, label, value, color }) => (
  <div className={`bg-white/50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700/50 rounded-xl p-4 flex items-center gap-4 transition-all hover:border-purple-400 dark:hover:border-purple-500/50 hover:bg-gray-50 dark:hover:bg-gray-800`}>
    <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${color}`}>
      {icon}
    </div>
    <div>
      <p className="text-2xl font-bold font-orbitron text-gray-900 dark:text-white">{value}</p>
      <p className="text-sm text-gray-600 dark:text-gray-400">{label}</p>
    </div>
  </div>
);


export const Dashboard: React.FC<DashboardProps> = ({ tracks, summaryText, onPlaySummary, onCheckReminders, isSpeaking, onRefresh, isRefreshing }) => {
  const totalTracks = tracks.length;
  
  const { completed, inProgress, unstarted } = tracks.reduce(
    (acc, track) => {
      const statuses = Object.values(track.status);
      const completedCount = statuses.filter(Boolean).length;

      if (completedCount === 4) {
        acc.completed += 1;
      } else if (completedCount === 0) {
        acc.unstarted += 1;
      } else {
        acc.inProgress += 1;
      }
      return acc;
    },
    { completed: 0, inProgress: 0, unstarted: 0 }
  );

  // Calculate additional statistics
  const completionRate = totalTracks > 0 ? Math.round((completed / totalTracks) * 100) : 0;
  const averageBpm = tracks.length > 0 ? Math.round(tracks.reduce((sum, track) => sum + track.bpm, 0) / tracks.length) : 0;
  
  // Get genre distribution
  const genreCounts = tracks.reduce((acc, track) => {
    const genre = track.genre || 'Unknown';
    acc[genre] = (acc[genre] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  const topGenres = Object.entries(genreCounts)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 3);

  // Get mood distribution
  const moodCounts = tracks.reduce((acc, track) => {
    const mood = track.mood || 'Unknown';
    acc[mood] = (acc[mood] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  const topMoods = Object.entries(moodCounts)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 3);

  return (
    <div className="animate-fade-in space-y-6">
        <div>
            <div className="flex justify-between items-center mb-4">
                <h2 className="font-orbitron text-xl font-bold text-purple-600 dark:text-purple-300">Dashboard Overview</h2>
                <button 
                    onClick={onRefresh} 
                    disabled={isRefreshing}
                    className="flex items-center gap-2 bg-gray-200 hover:bg-gray-300 text-gray-800 dark:bg-gray-700 dark:hover:bg-gray-600 dark:text-white font-bold py-2 px-3 rounded-lg transition-colors duration-300 disabled:opacity-50 disabled:cursor-wait"
                >
                    {isRefreshing ? <IconLoader className="w-4 h-4 animate-spin"/> : <IconRefresh className="w-4 h-4" />}
                    <span>{isRefreshing ? 'Refreshing...' : 'Refresh'}</span>
                </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                <StatCard icon={<IconMusic className="w-6 h-6 text-white"/>} label="Total Tracks" value={totalTracks} color="bg-blue-600" />
                <StatCard icon={<IconClipboardCheck className="w-6 h-6 text-white"/>} label="Completed" value={completed} color="bg-green-600" />
                <StatCard icon={<IconClock className="w-6 h-6 text-white"/>} label="In Progress" value={inProgress} color="bg-yellow-500" />
                <StatCard icon={<IconFolder className="w-6 h-6 text-white"/>} label="Unstarted" value={unstarted} color="bg-red-600" />
            </div>
        </div>

        {/* Enhanced Statistics */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Completion Rate */}
            <div className="bg-white/50 dark:bg-black/30 backdrop-blur-md border border-purple-300 dark:border-purple-500/20 rounded-2xl p-6">
                <div className="flex items-center gap-3 mb-4">
                    <IconTrendingUp className="w-6 h-6 text-purple-600 dark:text-purple-300" />
                    <h3 className="font-orbitron text-lg font-bold text-purple-600 dark:text-purple-300">Completion Rate</h3>
                </div>
                <div className="text-center">
                    <div className="text-4xl font-bold text-gray-900 dark:text-white mb-2">{completionRate}%</div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 mb-2">
                        <div 
                            className="bg-gradient-to-r from-purple-500 to-blue-500 h-3 rounded-full transition-all duration-1000"
                            style={{ width: `${completionRate}%` }}
                        ></div>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">{completed} of {totalTracks} tracks completed</p>
                </div>
            </div>

            {/* Average BPM */}
            <div className="bg-white/50 dark:bg-black/30 backdrop-blur-md border border-purple-300 dark:border-purple-500/20 rounded-2xl p-6">
                <div className="flex items-center gap-3 mb-4">
                    <IconClock className="w-6 h-6 text-purple-600 dark:text-purple-300" />
                    <h3 className="font-orbitron text-lg font-bold text-purple-600 dark:text-purple-300">Average BPM</h3>
                </div>
                <div className="text-center">
                    <div className="text-4xl font-bold text-gray-900 dark:text-white mb-2">{averageBpm}</div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Beats per minute</p>
                </div>
            </div>

            {/* Top Genres */}
            <div className="bg-white/50 dark:bg-black/30 backdrop-blur-md border border-purple-300 dark:border-purple-500/20 rounded-2xl p-6">
                <div className="flex items-center gap-3 mb-4">
                    <IconTag className="w-6 h-6 text-purple-600 dark:text-purple-300" />
                    <h3 className="font-orbitron text-lg font-bold text-purple-600 dark:text-purple-300">Top Genres</h3>
                </div>
                <div className="space-y-2">
                    {topGenres.length > 0 ? topGenres.map(([genre, count], index) => (
                        <div key={genre} className="flex justify-between items-center">
                            <span className="text-sm text-gray-700 dark:text-gray-300">{genre}</span>
                            <div className="flex items-center gap-2">
                                <div className="w-16 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                                    <div 
                                        className="bg-gradient-to-r from-purple-500 to-blue-500 h-2 rounded-full"
                                        style={{ width: `${(count / totalTracks) * 100}%` }}
                                    ></div>
                                </div>
                                <span className="text-sm font-semibold text-gray-900 dark:text-white w-8 text-right">{count}</span>
                            </div>
                        </div>
                    )) : (
                        <p className="text-sm text-gray-500 dark:text-gray-400 text-center">No genres assigned</p>
                    )}
                </div>
            </div>
        </div>

        {summaryText && (
            <div className="bg-white/50 dark:bg-black/30 backdrop-blur-md border border-purple-300 dark:border-purple-500/20 rounded-2xl p-6 animate-fade-in">
                <div className="flex items-center gap-3 mb-3">
                    <IconMessageSquare className="w-6 h-6 text-purple-600 dark:text-purple-300" />
                    <h3 className="font-orbitron text-lg font-bold text-purple-600 dark:text-purple-300">Today's Summary</h3>
                </div>
                <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap pl-9">{summaryText}</p>
            </div>
        )}

        <div className="bg-white/50 dark:bg-black/30 backdrop-blur-md border border-purple-300 dark:border-purple-500/20 rounded-2xl p-6">
            <h2 className="font-orbitron text-xl font-bold text-purple-600 dark:text-purple-300 mb-4">Actions</h2>
            <div className="flex flex-col sm:flex-row gap-4">
                <button onClick={onPlaySummary} disabled={isSpeaking} className="flex-1 flex items-center justify-center gap-2 bg-gray-200 hover:bg-gray-300 text-gray-800 dark:bg-gray-700 dark:hover:bg-gray-600 dark:text-white font-bold py-3 px-4 rounded-lg transition-colors duration-300 disabled:opacity-50">
                    <IconVolume2 className="w-5 h-5" />
                    {isSpeaking ? 'Speaking...' : '📢 Play Daily Summary'}
                </button>
                <button onClick={onCheckReminders} disabled={isSpeaking} className="flex-1 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 px-4 rounded-lg transition-colors duration-300 disabled:opacity-50">
                    <IconBell className="w-5 h-5" />
                    Check Reminders
                </button>
            </div>
        </div>
    </div>
  );
};