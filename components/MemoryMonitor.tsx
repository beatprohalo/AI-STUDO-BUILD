import React, { useState, useEffect } from 'react';
import { MemoryManager } from '../utils/memoryUtils';
import { dataRetentionService } from '../services/dataRetentionService';
import { IconCpu, IconTrash, IconAlertTriangle, IconCheckCircle } from './Icon';

interface MemoryStats {
  trackedUrls: number;
  trackedFiles: number;
  estimatedMemoryUsage: string;
  retentionItems: number;
  retentionSize: string;
  isHealthy: boolean;
}

export const MemoryMonitor: React.FC = () => {
  const [stats, setStats] = useState<MemoryStats | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [isCleaning, setIsCleaning] = useState(false);

  const updateStats = () => {
    const memoryStats = MemoryManager.getMemoryStats();
    const retentionStats = dataRetentionService.getRetentionStats();
    
    const estimatedMB = parseFloat(memoryStats.estimatedMemoryUsage);
    const retentionMB = parseFloat(retentionStats.totalItems.toString()) * 0.01; // Rough estimate
    
    const isHealthy = estimatedMB < 50 && retentionStats.totalItems < 100;
    
    setStats({
      trackedUrls: memoryStats.trackedUrls,
      trackedFiles: memoryStats.trackedFiles,
      estimatedMemoryUsage: memoryStats.estimatedMemoryUsage,
      retentionItems: retentionStats.totalItems,
      retentionSize: `${retentionMB.toFixed(2)} MB`,
      isHealthy
    });
  };

  useEffect(() => {
    updateStats();
    const interval = setInterval(updateStats, 10000); // Update every 10 seconds
    return () => clearInterval(interval);
  }, []);

  const handleCleanup = async () => {
    setIsCleaning(true);
    try {
      // Clean up unused URLs
      MemoryManager.cleanupAllURLs();
      
      // Force cleanup of retention data
      dataRetentionService.forceCleanup();
      
      // Force garbage collection if available
      MemoryManager.forceGC();
      
      updateStats();
    } catch (error) {
      console.error('Memory cleanup failed:', error);
    } finally {
      setIsCleaning(false);
    }
  };

  if (!stats) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {/* Toggle Button */}
      <button
        onClick={() => setIsVisible(!isVisible)}
        className={`p-3 rounded-full shadow-lg transition-all ${
          stats.isHealthy 
            ? 'bg-green-500 hover:bg-green-600 text-white' 
            : 'bg-red-500 hover:bg-red-600 text-white'
        }`}
        title="Memory Monitor"
      >
        <IconCpu className="w-5 h-5" />
      </button>

      {/* Monitor Panel */}
      {isVisible && (
        <div className="absolute bottom-16 right-0 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 p-4 w-80">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-gray-800 dark:text-gray-200 flex items-center gap-2">
              <IconCpu className="w-4 h-4" />
              Memory Monitor
            </h3>
            <button
              onClick={() => setIsVisible(false)}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              ×
            </button>
          </div>

          {/* Status Indicator */}
          <div className={`flex items-center gap-2 mb-3 p-2 rounded ${
            stats.isHealthy 
              ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200' 
              : 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200'
          }`}>
            {stats.isHealthy ? (
              <IconCheckCircle className="w-4 h-4" />
            ) : (
              <IconAlertTriangle className="w-4 h-4" />
            )}
            <span className="text-sm font-medium">
              {stats.isHealthy ? 'Memory Healthy' : 'High Memory Usage'}
            </span>
          </div>

          {/* Memory Stats */}
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">Tracked URLs:</span>
              <span className="font-mono">{stats.trackedUrls}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">Tracked Files:</span>
              <span className="font-mono">{stats.trackedFiles}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">Memory Usage:</span>
              <span className="font-mono">{stats.estimatedMemoryUsage}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">Retention Items:</span>
              <span className="font-mono">{stats.retentionItems}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">Retention Size:</span>
              <span className="font-mono">{stats.retentionSize}</span>
            </div>
          </div>

          {/* Cleanup Button */}
          <button
            onClick={handleCleanup}
            disabled={isCleaning}
            className="w-full mt-3 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 text-white font-medium py-2 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            {isCleaning ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Cleaning...
              </>
            ) : (
              <>
                <IconTrash className="w-4 h-4" />
                Clean Up Memory
              </>
            )}
          </button>

          {/* Recommendations */}
          {!stats.isHealthy && (
            <div className="mt-3 p-2 bg-yellow-100 dark:bg-yellow-900/30 rounded text-xs text-yellow-800 dark:text-yellow-200">
              <strong>Recommendations:</strong>
              <ul className="mt-1 list-disc list-inside">
                <li>Click "Clean Up Memory" to free unused resources</li>
                <li>Consider reducing the number of loaded tracks</li>
                <li>Close unused browser tabs</li>
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
