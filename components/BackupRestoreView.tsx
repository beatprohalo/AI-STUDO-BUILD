import React from 'react';
import { IconBox, IconLoader, IconDownload, IconUpload } from './Icon';

type BackupRestoreStatus = { message: string; error: boolean } | null;

interface BackupRestoreViewProps {
  onBackup: () => void;
  onRestore: () => void;
  isProcessing: boolean;
  backupStatus: BackupRestoreStatus;
  restoreStatus: BackupRestoreStatus;
}

export const BackupRestoreView: React.FC<BackupRestoreViewProps> = ({
  onBackup,
  onRestore,
  isProcessing,
  backupStatus,
  restoreStatus,
}) => {
  return (
    <div className="bg-white/50 dark:bg-black/30 backdrop-blur-md border border-purple-300 dark:border-purple-500/20 rounded-2xl p-6 animate-fade-in space-y-8">
      <h2 className="font-orbitron text-xl font-bold text-purple-600 dark:text-purple-300 flex items-center gap-3">
        <IconBox className="w-6 h-6" />
        Backup & Restore
      </h2>

      {/* Backup Section */}
      <div className="space-y-4 p-4 border border-gray-200 dark:border-gray-700/50 rounded-lg">
        <h3 className="font-semibold text-lg text-gray-800 dark:text-gray-300">Backup</h3>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Save your entire catalog (tracks, notes, samples, plugins, and timeline events) to a single JSON file. Keep this file in a safe place.
        </p>
        <button
          onClick={onBackup}
          disabled={isProcessing}
          className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-bold py-2 px-4 rounded-lg transition-colors duration-300 disabled:opacity-50 disabled:cursor-wait"
        >
          {isProcessing ? <IconLoader className="w-5 h-5 animate-spin" /> : <IconDownload className="w-5 h-5" />}
          {isProcessing ? 'Processing...' : 'Backup Now'}
        </button>
        {backupStatus && (
          <div className={`mt-2 p-2 rounded-md text-sm ${backupStatus.error ? 'bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-200' : 'bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-200'}`}>
            <p className="font-semibold">{backupStatus.error ? 'Error:' : 'Success:'}</p>
            <p>{backupStatus.message}</p>
          </div>
        )}
      </div>

      {/* Restore Section */}
      <div className="space-y-4 p-4 border border-gray-200 dark:border-gray-700/50 rounded-lg">
        <h3 className="font-semibold text-lg text-gray-800 dark:text-gray-300">Restore</h3>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Restore your data from a previously created JSON backup file. This will add the data to your existing catalog, skipping any duplicates.
        </p>
        <button
          onClick={onRestore}
          disabled={isProcessing}
          className="flex items-center justify-center gap-2 bg-gray-200 hover:bg-gray-300 text-gray-800 dark:bg-gray-700 dark:hover:bg-gray-600 dark:text-white font-bold py-2 px-4 rounded-lg transition-colors duration-300 disabled:opacity-50 disabled:cursor-wait"
        >
          {isProcessing ? <IconLoader className="w-5 h-5 animate-spin" /> : <IconUpload className="w-5 h-5" />}
          {isProcessing ? 'Processing...' : 'Restore from File...'}
        </button>
         {restoreStatus && (
          <div className={`mt-2 p-2 rounded-md text-sm ${restoreStatus.error ? 'bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-200' : 'bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-200'}`}>
            <p className="font-semibold">{restoreStatus.error ? 'Error:' : 'Success:'}</p>
            <p>{restoreStatus.message}</p>
          </div>
        )}
      </div>
    </div>
  );
};