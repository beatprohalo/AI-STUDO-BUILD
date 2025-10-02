import { Track, Sample, Note, Plugin, ProjectEvent } from '../types';

export interface RetentionData {
  id: string;
  type: 'track' | 'sample' | 'note' | 'plugin' | 'project_event' | 'ml_analysis' | 'scan_result';
  data: any;
  timestamp: string;
  source: 'scan' | 'ai_analysis' | 'user_input' | 'auto_generated';
  metadata?: {
    filePath?: string;
    analysisType?: string;
    confidence?: number;
    modelUsed?: string;
  };
}

export interface PurgeOptions {
  purgeAll: boolean;
  purgeTracks: boolean;
  purgeSamples: boolean;
  purgeNotes: boolean;
  purgePlugins: boolean;
  purgeProjectEvents: boolean;
  purgeMLData: boolean;
  purgeScanResults: boolean;
}

class DataRetentionService {
  private retentionData: RetentionData[] = [];
  private readonly STORAGE_KEY = 'music_organizer_retention_data';

  constructor() {
    this.loadRetentionData();
  }

  private loadRetentionData(): void {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        this.retentionData = JSON.parse(stored);
      }
    } catch (error) {
      console.error('Failed to load retention data:', error);
      this.retentionData = [];
    }
  }

  private saveRetentionData(): void {
    try {
      const dataString = JSON.stringify(this.retentionData);
      
      // Check localStorage quota before saving - more aggressive limits
      const quotaEstimate = this.estimateStorageSize();
      if (quotaEstimate > 2 * 1024 * 1024) { // 2MB limit (more conservative)
        console.warn('Data retention approaching localStorage limit. Cleaning up old data...');
        this.cleanupOldData();
      }
      
      localStorage.setItem(this.STORAGE_KEY, dataString);
      console.log(`[Data Retention] Saved ${this.retentionData.length} items to storage`);
    } catch (error) {
      if (error instanceof Error && error.name === 'QuotaExceededError') {
        console.error('localStorage quota exceeded. Attempting cleanup...');
        this.cleanupOldData();
        try {
          localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.retentionData));
        } catch (retryError) {
          console.error('Failed to save retention data even after cleanup:', retryError);
        }
      } else {
        console.error('Failed to save retention data:', error);
      }
    }
  }

  private estimateStorageSize(): number {
    return JSON.stringify(this.retentionData).length * 2; // UTF-16 encoding
  }

  private cleanupOldData(): void {
    // More aggressive cleanup: Keep only the most recent 200 items and remove items older than 7 days
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    
    // Filter out old data
    this.retentionData = this.retentionData.filter(item => item.timestamp > sevenDaysAgo);
    
    // If still too many items, keep only the most recent 200
    if (this.retentionData.length > 200) {
      this.retentionData.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
      this.retentionData = this.retentionData.slice(0, 200);
    }
    
    console.log(`[Data Retention] Cleaned up data, now have ${this.retentionData.length} items`);
  }

  // Automatically retain all data that enters the system
  public retainData(
    type: RetentionData['type'],
    data: any,
    source: RetentionData['source'] = 'user_input',
    metadata?: RetentionData['metadata']
  ): void {
    const retentionItem: RetentionData = {
      id: `${type}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type,
      data,
      timestamp: new Date().toISOString(),
      source,
      metadata
    };

    this.retentionData.push(retentionItem);
    this.saveRetentionData();
    
    console.log(`[Data Retention] Retained ${type} data:`, retentionItem.id);
  }

  // Retain track data when scanned or analyzed
  public retainTrack(track: Track, source: RetentionData['source'] = 'scan'): void {
    this.retainData('track', track, source, {
      filePath: track.path,
      analysisType: 'track_metadata'
    });
  }

  // Retain sample data when scanned or analyzed
  public retainSample(sample: Sample, source: RetentionData['source'] = 'scan'): void {
    this.retainData('sample', sample, source, {
      filePath: sample.path,
      analysisType: 'sample_metadata'
    });
  }

  // Retain ML analysis results
  public retainMLAnalysis(
    analysisType: string,
    inputData: any,
    result: any,
    modelUsed?: string,
    confidence?: number
  ): void {
    this.retainData('ml_analysis', {
      analysisType,
      input: inputData,
      result,
      modelUsed,
      confidence
    }, 'ai_analysis', {
      analysisType,
      modelUsed,
      confidence
    });
  }

  // Retain scan results
  public retainScanResult(
    scanType: string,
    files: File[] | { name: string; path: string; file_type: string; size: number }[],
    results: any[]
  ): void {
    this.retainData('scan_result', {
      scanType,
      fileCount: files.length,
      fileNames: files.map(f => 'name' in f ? f.name : (f as File).name),
      results
    }, 'scan', {
      analysisType: scanType
    });
  }

  // Get all retained data
  public getAllRetainedData(): RetentionData[] {
    return [...this.retentionData];
  }

  // Get retained data by type
  public getRetainedDataByType(type: RetentionData['type']): RetentionData[] {
    return this.retentionData.filter(item => item.type === type);
  }

  // Get retained data by source
  public getRetainedDataBySource(source: RetentionData['source']): RetentionData[] {
    return this.retentionData.filter(item => item.source === source);
  }

  // Get data retention statistics
  public getRetentionStats(): {
    totalItems: number;
    byType: Record<string, number>;
    bySource: Record<string, number>;
    oldestItem: string | null;
    newestItem: string | null;
  } {
    const byType: Record<string, number> = {};
    const bySource: Record<string, number> = {};
    let oldestTimestamp: string | null = null;
    let newestTimestamp: string | null = null;

    this.retentionData.forEach(item => {
      byType[item.type] = (byType[item.type] || 0) + 1;
      bySource[item.source] = (bySource[item.source] || 0) + 1;
      
      if (!oldestTimestamp || item.timestamp < oldestTimestamp) {
        oldestTimestamp = item.timestamp;
      }
      if (!newestTimestamp || item.timestamp > newestTimestamp) {
        newestTimestamp = item.timestamp;
      }
    });

    return {
      totalItems: this.retentionData.length,
      byType,
      bySource,
      oldestItem: oldestTimestamp,
      newestItem: newestTimestamp
    };
  }

  // Purge data based on options
  public purgeData(options: PurgeOptions): {
    purgedCount: number;
    purgedTypes: string[];
  } {
    let purgedCount = 0;
    const purgedTypes: string[] = [];

    if (options.purgeAll) {
      purgedCount = this.retentionData.length;
      this.retentionData = [];
      purgedTypes.push('all');
    } else {
      // Filter out data to keep
      const dataToKeep = this.retentionData.filter(item => {
        switch (item.type) {
          case 'track':
            return !options.purgeTracks;
          case 'sample':
            return !options.purgeSamples;
          case 'note':
            return !options.purgeNotes;
          case 'plugin':
            return !options.purgePlugins;
          case 'project_event':
            return !options.purgeProjectEvents;
          case 'ml_analysis':
            return !options.purgeMLData;
          case 'scan_result':
            return !options.purgeScanResults;
          default:
            return true;
        }
      });

      purgedCount = this.retentionData.length - dataToKeep.length;
      this.retentionData = dataToKeep;

      // Track what was purged
      if (options.purgeTracks) purgedTypes.push('tracks');
      if (options.purgeSamples) purgedTypes.push('samples');
      if (options.purgeNotes) purgedTypes.push('notes');
      if (options.purgePlugins) purgedTypes.push('plugins');
      if (options.purgeProjectEvents) purgedTypes.push('project_events');
      if (options.purgeMLData) purgedTypes.push('ml_analysis');
      if (options.purgeScanResults) purgedTypes.push('scan_results');
    }

    this.saveRetentionData();
    
    console.log(`[Data Retention] Purged ${purgedCount} items:`, purgedTypes);
    
    return { purgedCount, purgedTypes };
  }

  // Export retention data for backup
  public exportRetentionData(): string {
    return JSON.stringify({
      retentionData: this.retentionData,
      exportTimestamp: new Date().toISOString(),
      version: '1.0'
    }, null, 2);
  }

  // Import retention data from backup
  public importRetentionData(data: string): boolean {
    try {
      const parsed = JSON.parse(data);
      if (parsed.retentionData && Array.isArray(parsed.retentionData)) {
        this.retentionData = parsed.retentionData;
        this.saveRetentionData();
        return true;
      }
      return false;
    } catch (error) {
      console.error('Failed to import retention data:', error);
      return false;
    }
  }

  // Debug: Get detailed retention information
  public getRetentionDebugInfo(): {
    totalItems: number;
    storageSize: string;
    oldestItem: string | null;
    newestItem: string | null;
    recentActivity: RetentionData[];
    byTypeCount: Record<string, number>;
  } {
    const stats = this.getRetentionStats();
    const storageSize = this.estimateStorageSize();
    const recentActivity = this.retentionData
      .sort((a, b) => b.timestamp.localeCompare(a.timestamp))
      .slice(0, 10);

    return {
      totalItems: stats.totalItems,
      storageSize: `${(storageSize / 1024).toFixed(2)} KB`,
      oldestItem: stats.oldestItem,
      newestItem: stats.newestItem,
      recentActivity,
      byTypeCount: stats.byType
    };
  }

  // Force cleanup for debugging
  public forceCleanup(): void {
    this.cleanupOldData();
    this.saveRetentionData();
  }
}

// Export singleton instance
export const dataRetentionService = new DataRetentionService();

