import React, { useState } from 'react';
import { IconTrash, IconAlertTriangle, IconDatabase, IconMusic, IconWaveform, IconEdit, IconCalendar, IconCpu, IconFolder } from './Icon';
import { dataRetentionService, PurgeOptions } from '../services/dataRetentionService';
import { purgeAllData, purgeTracks, purgeSamples, purgeNotes, purgePlugins, purgeProjectEvents, purgeMLData, purgeScanResults } from '../services/dbService';

interface PurgeSettingsViewProps {
  onDataPurged: () => void;
}

export const PurgeSettingsView: React.FC<PurgeSettingsViewProps> = ({ onDataPurged }) => {
  const [purgeOptions, setPurgeOptions] = useState<PurgeOptions>({
    purgeAll: false,
    purgeTracks: false,
    purgeSamples: false,
    purgeNotes: false,
    purgePlugins: false,
    purgeProjectEvents: false,
    purgeMLData: false,
    purgeScanResults: false,
  });

  const [isPurging, setIsPurging] = useState(false);
  const [purgeStatus, setPurgeStatus] = useState<{ message: string; error: boolean } | null>(null);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [retentionStats, setRetentionStats] = useState(dataRetentionService.getRetentionStats());

  const handleOptionChange = (option: keyof PurgeOptions) => {
    if (option === 'purgeAll') {
      setPurgeOptions({
        purgeAll: true,
        purgeTracks: false,
        purgeSamples: false,
        purgeNotes: false,
        purgePlugins: false,
        purgeProjectEvents: false,
        purgeMLData: false,
        purgeScanResults: false,
      });
    } else {
      setPurgeOptions(prev => ({
        ...prev,
        [option]: !prev[option],
        purgeAll: false, // Uncheck "purge all" if individual options are selected
      }));
    }
  };

  const handlePurge = async () => {
    setIsPurging(true);
    setPurgeStatus(null);

    try {
      let purgedCount = 0;
      const purgedTypes: string[] = [];

      if (purgeOptions.purgeAll) {
        await purgeAllData();
        purgedCount = retentionStats.totalItems;
        purgedTypes.push('all data');
      } else {
        // Purge individual data types
        if (purgeOptions.purgeTracks) {
          await purgeTracks();
          purgedTypes.push('tracks');
        }
        if (purgeOptions.purgeSamples) {
          await purgeSamples();
          purgedTypes.push('samples');
        }
        if (purgeOptions.purgeNotes) {
          await purgeNotes();
          purgedTypes.push('notes');
        }
        if (purgeOptions.purgePlugins) {
          await purgePlugins();
          purgedTypes.push('plugins');
        }
        if (purgeOptions.purgeProjectEvents) {
          await purgeProjectEvents();
          purgedTypes.push('project events');
        }
        if (purgeOptions.purgeMLData) {
          await purgeMLData();
          purgedTypes.push('ML analysis data');
        }
        if (purgeOptions.purgeScanResults) {
          await purgeScanResults();
          purgedTypes.push('scan results');
        }
      }

      setPurgeStatus({
        message: `Successfully purged ${purgedTypes.join(', ')}. ${purgeOptions.purgeAll ? 'All data has been removed.' : 'Selected data types have been removed.'}`,
        error: false
      });

      // Reset options
      setPurgeOptions({
        purgeAll: false,
        purgeTracks: false,
        purgeSamples: false,
        purgeNotes: false,
        purgePlugins: false,
        purgeProjectEvents: false,
        purgeMLData: false,
        purgeScanResults: false,
      });

      // Update stats and notify parent
      setRetentionStats(dataRetentionService.getRetentionStats());
      onDataPurged();

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
      setPurgeStatus({
        message: `Failed to purge data: ${errorMessage}`,
        error: true
      });
    } finally {
      setIsPurging(false);
      setShowConfirmation(false);
    }
  };

  const hasSelection = Object.values(purgeOptions).some(Boolean);

  return (
    <div className="bg-white/50 dark:bg-black/30 backdrop-blur-md border border-red-300 dark:border-red-500/20 rounded-2xl p-6 animate-fade-in">
      <div className="flex items-center gap-3 mb-6">
        <IconTrash className="w-6 h-6 text-red-600 dark:text-red-400" />
        <h2 className="font-orbitron text-xl font-bold text-red-600 dark:text-red-400">
          Data Purge Settings
        </h2>
      </div>

      {/* Data Retention Statistics */}
      <div className="mb-6 p-4 bg-gray-100 dark:bg-gray-800/50 rounded-lg">
        <h3 className="font-semibold text-gray-800 dark:text-gray-300 mb-3 flex items-center gap-2">
          <IconDatabase className="w-5 h-5" />
          Data Retention Statistics
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <span className="text-gray-600 dark:text-gray-400">Total Items:</span>
            <span className="ml-2 font-semibold text-gray-800 dark:text-gray-300">{retentionStats.totalItems}</span>
          </div>
          <div>
            <span className="text-gray-600 dark:text-gray-400">Oldest:</span>
            <span className="ml-2 font-semibold text-gray-800 dark:text-gray-300">
              {retentionStats.oldestItem ? new Date(retentionStats.oldestItem).toLocaleDateString() : 'N/A'}
            </span>
          </div>
          <div>
            <span className="text-gray-600 dark:text-gray-400">Newest:</span>
            <span className="ml-2 font-semibold text-gray-800 dark:text-gray-300">
              {retentionStats.newestItem ? new Date(retentionStats.newestItem).toLocaleDateString() : 'N/A'}
            </span>
          </div>
          <div>
            <span className="text-gray-600 dark:text-gray-400">ML Data:</span>
            <span className="ml-2 font-semibold text-gray-800 dark:text-gray-300">
              {retentionStats.byType['ml_analysis'] || 0}
            </span>
          </div>
        </div>
      </div>

      {/* Purge Options */}
      <div className="space-y-4 mb-6">
        <h3 className="font-semibold text-gray-800 dark:text-gray-300 mb-4">
          Select Data Types to Purge
        </h3>

        {/* Purge All Option */}
        <div className="p-4 border-2 border-red-300 dark:border-red-500/30 rounded-lg bg-red-50 dark:bg-red-900/10">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={purgeOptions.purgeAll}
              onChange={() => handleOptionChange('purgeAll')}
              className="w-5 h-5 text-red-600 focus:ring-red-500 focus:ring-2"
            />
            <div className="flex items-center gap-2">
              <IconAlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
              <span className="font-semibold text-red-800 dark:text-red-300">
                Purge All Data (Complete System Reset)
              </span>
            </div>
          </label>
          <p className="text-sm text-red-700 dark:text-red-400 mt-2 ml-8">
            This will remove ALL data from the system including tracks, samples, notes, plugins, project events, ML analysis data, and scan results.
          </p>
        </div>

        {/* Individual Data Type Options */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-3 border border-gray-300 dark:border-gray-600 rounded-lg">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={purgeOptions.purgeTracks}
                onChange={() => handleOptionChange('purgeTracks')}
                disabled={purgeOptions.purgeAll}
                className="w-4 h-4 text-purple-600 focus:ring-purple-500 focus:ring-2 disabled:opacity-50"
              />
              <IconMusic className="w-4 h-4 text-purple-500" />
              <span className="font-medium text-gray-800 dark:text-gray-300">Tracks</span>
            </label>
            <p className="text-xs text-gray-500 dark:text-gray-400 ml-7 mt-1">
              Remove all track data and metadata
            </p>
          </div>

          <div className="p-3 border border-gray-300 dark:border-gray-600 rounded-lg">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={purgeOptions.purgeSamples}
                onChange={() => handleOptionChange('purgeSamples')}
                disabled={purgeOptions.purgeAll}
                className="w-4 h-4 text-blue-600 focus:ring-blue-500 focus:ring-2 disabled:opacity-50"
              />
              <IconWaveform className="w-4 h-4 text-blue-500" />
              <span className="font-medium text-gray-800 dark:text-gray-300">Samples</span>
            </label>
            <p className="text-xs text-gray-500 dark:text-gray-400 ml-7 mt-1">
              Remove all sample data and tags
            </p>
          </div>

          <div className="p-3 border border-gray-300 dark:border-gray-600 rounded-lg">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={purgeOptions.purgeNotes}
                onChange={() => handleOptionChange('purgeNotes')}
                disabled={purgeOptions.purgeAll}
                className="w-4 h-4 text-green-600 focus:ring-green-500 focus:ring-2 disabled:opacity-50"
              />
              <IconEdit className="w-4 h-4 text-green-500" />
              <span className="font-medium text-gray-800 dark:text-gray-300">Notes</span>
            </label>
            <p className="text-xs text-gray-500 dark:text-gray-400 ml-7 mt-1">
              Remove all notes and annotations
            </p>
          </div>

          <div className="p-3 border border-gray-300 dark:border-gray-600 rounded-lg">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={purgeOptions.purgeProjectEvents}
                onChange={() => handleOptionChange('purgeProjectEvents')}
                disabled={purgeOptions.purgeAll}
                className="w-4 h-4 text-orange-600 focus:ring-orange-500 focus:ring-2 disabled:opacity-50"
              />
              <IconCalendar className="w-4 h-4 text-orange-500" />
              <span className="font-medium text-gray-800 dark:text-gray-300">Project Events</span>
            </label>
            <p className="text-xs text-gray-500 dark:text-gray-400 ml-7 mt-1">
              Remove all project events and timeline data
            </p>
          </div>

          <div className="p-3 border border-gray-300 dark:border-gray-600 rounded-lg">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={purgeOptions.purgeMLData}
                onChange={() => handleOptionChange('purgeMLData')}
                disabled={purgeOptions.purgeAll}
                className="w-4 h-4 text-purple-600 focus:ring-purple-500 focus:ring-2 disabled:opacity-50"
              />
              <IconCpu className="w-4 h-4 text-purple-500" />
              <span className="font-medium text-gray-800 dark:text-gray-300">ML Analysis Data</span>
            </label>
            <p className="text-xs text-gray-500 dark:text-gray-400 ml-7 mt-1">
              Remove all machine learning analysis results
            </p>
          </div>

          <div className="p-3 border border-gray-300 dark:border-gray-600 rounded-lg">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={purgeOptions.purgeScanResults}
                onChange={() => handleOptionChange('purgeScanResults')}
                disabled={purgeOptions.purgeAll}
                className="w-4 h-4 text-indigo-600 focus:ring-indigo-500 focus:ring-2 disabled:opacity-50"
              />
              <IconFolder className="w-4 h-4 text-indigo-500" />
              <span className="font-medium text-gray-800 dark:text-gray-300">Scan Results</span>
            </label>
            <p className="text-xs text-gray-500 dark:text-gray-400 ml-7 mt-1">
              Remove all file scan results and metadata
            </p>
          </div>
        </div>
      </div>

      {/* Purge Button */}
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div className="text-sm text-gray-600 dark:text-gray-400">
          {hasSelection ? (
            <span className="text-red-600 dark:text-red-400 font-medium">
              ⚠️ {purgeOptions.purgeAll ? 'All data will be permanently deleted' : 'Selected data types will be permanently deleted'}
            </span>
          ) : (
            <span>Select data types to purge</span>
          )}
        </div>

        <button
          onClick={() => setShowConfirmation(true)}
          disabled={!hasSelection || isPurging}
          className="bg-red-600 hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-bold py-3 px-6 rounded-lg transition-all duration-200 flex items-center gap-2 shadow-lg hover:shadow-red-600/25"
        >
          <IconTrash className="w-5 h-5" />
          {isPurging ? 'Purging...' : 'Purge Selected Data'}
        </button>
      </div>

      {/* Status Message */}
      {purgeStatus && (
        <div className={`mt-4 p-3 rounded-lg ${
          purgeStatus.error 
            ? 'bg-red-100 dark:bg-red-900/20 border border-red-300 dark:border-red-700' 
            : 'bg-green-100 dark:bg-green-900/20 border border-green-300 dark:border-green-700'
        }`}>
          <p className={`text-sm font-medium ${
            purgeStatus.error 
              ? 'text-red-800 dark:text-red-300' 
              : 'text-green-800 dark:text-green-300'
          }`}>
            {purgeStatus.message}
          </p>
        </div>
      )}

      {/* Confirmation Modal */}
      {showConfirmation && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 max-w-md mx-4 border border-red-300 dark:border-red-500/20">
            <div className="flex items-center gap-3 mb-4">
              <IconAlertTriangle className="w-6 h-6 text-red-600 dark:text-red-400" />
              <h3 className="font-bold text-red-800 dark:text-red-300">Confirm Data Purge</h3>
            </div>
            <p className="text-gray-700 dark:text-gray-300 mb-6">
              {purgeOptions.purgeAll ? (
                <>This will permanently delete <strong>ALL</strong> data from the system. This action cannot be undone.</>
              ) : (
                <>This will permanently delete the selected data types. This action cannot be undone.</>
              )}
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowConfirmation(false)}
                className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handlePurge}
                className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-lg transition-colors"
              >
                Confirm Purge
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Debug Information Section */}
      <div className="mt-8 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700/30 rounded-lg">
        <h3 className="font-semibold text-blue-800 dark:text-blue-300 mb-3 flex items-center gap-2">
          <IconCpu className="w-5 h-5" />
          Data Retention Debug Info
        </h3>
        <div className="space-y-2 text-sm">
          <button
            onClick={() => {
              const debugInfo = dataRetentionService.getRetentionDebugInfo();
              console.log('Data Retention Debug Info:', debugInfo);
              setRetentionStats(dataRetentionService.getRetentionStats());
              alert(`Debug info logged to console. Total items: ${debugInfo.totalItems}, Storage: ${debugInfo.storageSize}`);
            }}
            className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-xs transition-colors"
          >
            Log Debug Info to Console
          </button>
          <button
            onClick={() => {
              dataRetentionService.forceCleanup();
              setRetentionStats(dataRetentionService.getRetentionStats());
              alert('Data cleanup completed. Check console for details.');
            }}
            className="bg-yellow-600 hover:bg-yellow-700 text-white px-3 py-1 rounded text-xs transition-colors ml-2"
          >
            Force Data Cleanup
          </button>
        </div>
        <div className="mt-3 text-xs text-blue-700 dark:text-blue-300">
          Use these buttons to debug data retention issues. Debug info will be logged to the browser console.
        </div>
      </div>
    </div>
  );
};

