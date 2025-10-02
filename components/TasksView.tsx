import React from 'react';
import { Track } from '../types';
import { IconClipboardCheck, IconLoader } from './Icon';

type SaveStatus = 'idle' | 'saving' | 'saved';

interface TasksViewProps {
  tracks: Track[];
  onUpdateTrack: (track: Track) => void;
  saveStatus: SaveStatus;
}

export const TasksView: React.FC<TasksViewProps> = ({ tracks, onUpdateTrack, saveStatus }) => {
  const handleStatusChange = (track: Track, statusKey: keyof Track['status'], checked: boolean) => {
    onUpdateTrack({
      ...track,
      status: {
        ...track.status,
        [statusKey]: checked,
      },
    });
  };

  return (
    <div className="bg-white/50 dark:bg-black/30 backdrop-blur-md border border-purple-300 dark:border-purple-500/20 rounded-2xl p-6 animate-fade-in">
      <div className="flex justify-between items-center mb-4">
        <h2 className="font-orbitron text-xl font-bold text-purple-600 dark:text-purple-300 flex items-center gap-3">
          <IconClipboardCheck className="w-6 h-6" />
          Task Overview
        </h2>
        <div className="h-6 flex items-center gap-2 text-sm">
            {saveStatus === 'saving' && <><IconLoader className="w-4 h-4 animate-spin text-yellow-500 dark:text-yellow-400" /><p className="text-yellow-600 dark:text-yellow-400">Saving...</p></>}
            {saveStatus === 'saved' && <p className="text-green-600 dark:text-green-400 animate-fade-in">All changes saved ✅</p>}
        </div>
      </div>
      <div className="overflow-x-auto max-h-[80vh]">
        {tracks.length > 0 ? (
          <table className="w-full text-left table-auto">
            <thead className="sticky top-0 bg-gray-100/80 dark:bg-gray-900/80 backdrop-blur-sm">
              <tr>
                <th className="p-3 font-semibold text-purple-700 dark:text-purple-300">Track Name</th>
                <th className="p-3 font-semibold text-purple-700 dark:text-purple-300 text-center">Mixed</th>
                <th className="p-3 font-semibold text-purple-700 dark:text-purple-300 text-center">Mastered</th>
                <th className="p-3 font-semibold text-purple-700 dark:text-purple-300 text-center">Tagged</th>
                <th className="p-3 font-semibold text-purple-700 dark:text-purple-300 text-center">Registered</th>
                <th className="p-3 font-semibold text-purple-700 dark:text-purple-300">Progress</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
              {tracks.map(track => {
                const completion = Object.values(track.status).filter(Boolean).length;
                const completionPercentage = (completion / 4) * 100;

                return (
                  <tr key={track.id} className="hover:bg-gray-200/50 dark:hover:bg-gray-800/50 transition-colors">
                    <td className="p-3 font-medium text-gray-900 dark:text-white truncate max-w-xs">{track.name}</td>
                    <td className="p-3 text-center">
                      <input
                        type="checkbox"
                        className="w-5 h-5 accent-green-500 bg-gray-200 dark:bg-gray-700 rounded border-gray-400 dark:border-gray-600 cursor-pointer"
                        checked={track.status.mixed}
                        onChange={(e) => handleStatusChange(track, 'mixed', e.target.checked)}
                      />
                    </td>
                    <td className="p-3 text-center">
                      <input
                        type="checkbox"
                        className="w-5 h-5 accent-green-500 bg-gray-200 dark:bg-gray-700 rounded border-gray-400 dark:border-gray-600 cursor-pointer"
                        checked={track.status.mastered}
                        onChange={(e) => handleStatusChange(track, 'mastered', e.target.checked)}
                      />
                    </td>
                    <td className="p-3 text-center">
                      <input
                        type="checkbox"
                        className="w-5 h-5 accent-green-500 bg-gray-200 dark:bg-gray-700 rounded border-gray-400 dark:border-gray-600 cursor-pointer"
                        checked={track.status.tagged}
                        onChange={(e) => handleStatusChange(track, 'tagged', e.target.checked)}
                      />
                    </td>
                    <td className="p-3 text-center">
                      <input
                        type="checkbox"
                        className="w-5 h-5 accent-green-500 bg-gray-200 dark:bg-gray-700 rounded border-gray-400 dark:border-gray-600 cursor-pointer"
                        checked={track.status.registered}
                        onChange={(e) => handleStatusChange(track, 'registered', e.target.checked)}
                      />
                    </td>
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <div className="w-full bg-gray-300 dark:bg-gray-700 rounded-full h-2.5">
                          <div
                            className="bg-green-500 h-2.5 rounded-full transition-all duration-300"
                            style={{ width: `${completionPercentage}%` }}
                          ></div>
                        </div>
                        <span className="text-sm font-mono text-gray-600 dark:text-gray-400">{completion}/4</span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          <div className="text-center py-16 text-gray-500 dark:text-gray-500">
            <IconClipboardCheck className="w-12 h-12 mx-auto mb-4" />
            <h3 className="text-lg font-semibold">No Tasks Yet</h3>
            <p>Scan your music library to see your project tasks.</p>
          </div>
        )}
      </div>
    </div>
  );
};