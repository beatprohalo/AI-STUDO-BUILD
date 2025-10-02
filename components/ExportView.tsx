import React from 'react';
import { IconFileText, IconLoader } from './Icon';

type ExportFormat = 'csv' | 'xlsx' | 'json';
type ExportStatus = { message: string; error: boolean } | null;

interface ExportViewProps {
  onExport: (format: ExportFormat) => void;
  isExporting: boolean;
  exportStatus: ExportStatus;
}

const ExportButton: React.FC<{
  label: string;
  format: ExportFormat;
  onExport: (format: ExportFormat) => void;
  disabled: boolean;
}> = ({ label, format, onExport, disabled }) => (
  <button
    onClick={() => onExport(format)}
    disabled={disabled}
    className="flex-1 flex items-center justify-center gap-3 bg-gray-200 hover:bg-gray-300 text-gray-800 dark:bg-gray-700 dark:hover:bg-gray-600 dark:text-white font-bold py-4 px-5 rounded-lg transition-colors duration-300 disabled:opacity-50 disabled:cursor-wait"
  >
    <IconFileText className="w-5 h-5" />
    <span>{label}</span>
  </button>
);

export const ExportView: React.FC<ExportViewProps> = ({ onExport, isExporting, exportStatus }) => {
  return (
    <div className="bg-white/50 dark:bg-black/30 backdrop-blur-md border border-purple-300 dark:border-purple-500/20 rounded-2xl p-6 animate-fade-in space-y-6">
      <h2 className="font-orbitron text-xl font-bold text-purple-600 dark:text-purple-300 flex items-center gap-3">
        <IconFileText className="w-6 h-6" />
        Export & Reports
      </h2>

      <p className="text-gray-600 dark:text-gray-400">
        Export your entire music catalog to various file formats for backups, reporting, or use in other applications.
      </p>

      <div className="flex flex-col sm:flex-row gap-4">
        <ExportButton label="Export CSV" format="csv" onExport={onExport} disabled={isExporting} />
        <ExportButton label="Export Excel" format="xlsx" onExport={onExport} disabled={isExporting} />
        <ExportButton label="Export JSON" format="json" onExport={onExport} disabled={isExporting} />
      </div>

      <div className="h-10 flex items-center justify-center">
        {isExporting && (
          <div className="flex items-center gap-2 text-purple-600 dark:text-purple-300 animate-fade-in">
            <IconLoader className="w-5 h-5 animate-spin" />
            <p className="font-semibold">Exporting your data...</p>
          </div>
        )}
        {exportStatus && !isExporting && (
          <div
            className={`w-full text-center p-3 rounded-lg animate-fade-in ${
              exportStatus.error
                ? 'bg-red-100 dark:bg-red-900/50 text-red-800 dark:text-red-300'
                : 'bg-green-100 dark:bg-green-900/50 text-green-800 dark:text-green-300'
            }`}
          >
             <p>
                {exportStatus.error ? 'Error: ' : 'Success: '} 
                <code className="font-mono bg-black/10 dark:bg-black/30 px-1.5 py-0.5 rounded">{exportStatus.message}</code>
            </p>
          </div>
        )}
      </div>
    </div>
  );
};