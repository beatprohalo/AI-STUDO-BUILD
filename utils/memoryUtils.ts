/**
 * Memory management utilities for the AI Studio Build app
 * Helps prevent memory leaks and manage resource cleanup
 */

import { Track, Sample } from '../types';

export class MemoryManager {
  private static urlCache = new Set<string>();
  private static fileCache = new Map<string, File>();

  /**
   * Create a URL for a file and track it for cleanup
   */
  static createTrackedURL(file: File): string {
    const url = URL.createObjectURL(file);
    this.urlCache.add(url);
    this.fileCache.set(url, file);
    return url;
  }

  /**
   * Revoke a URL and clean up associated resources
   */
  static revokeURL(url: string): void {
    if (this.urlCache.has(url)) {
      URL.revokeObjectURL(url);
      this.urlCache.delete(url);
      this.fileCache.delete(url);
    }
  }

  /**
   * Clean up all tracked URLs
   */
  static cleanupAllURLs(): void {
    this.urlCache.forEach(url => {
      URL.revokeObjectURL(url);
    });
    this.urlCache.clear();
    this.fileCache.clear();
  }

  /**
   * Clean up URLs for tracks that are no longer needed
   */
  static cleanupTracks(tracks: Track[]): void {
    const currentUrls = new Set(tracks.map(t => t.url).filter(Boolean));
    
    // Find URLs that are no longer in use
    const urlsToCleanup = Array.from(this.urlCache).filter(url => !currentUrls.has(url));
    
    urlsToCleanup.forEach(url => {
      this.revokeURL(url);
    });
  }

  /**
   * Get memory usage statistics
   */
  static getMemoryStats(): {
    trackedUrls: number;
    trackedFiles: number;
    estimatedMemoryUsage: string;
  } {
    const totalUrls = this.urlCache.size;
    const totalFiles = this.fileCache.size;
    
    // Rough estimate of memory usage (URLs + file references)
    const estimatedBytes = (totalUrls * 100) + (totalFiles * 1000); // Rough estimates
    const estimatedMB = (estimatedBytes / (1024 * 1024)).toFixed(2);
    
    return {
      trackedUrls: totalUrls,
      trackedFiles: totalFiles,
      estimatedMemoryUsage: `${estimatedMB} MB`
    };
  }

  /**
   * Force garbage collection (if available)
   */
  static forceGC(): void {
    if ('gc' in window && typeof (window as any).gc === 'function') {
      (window as any).gc();
    }
  }

  /**
   * Monitor memory usage and warn if it gets too high
   */
  static monitorMemoryUsage(): void {
    const stats = this.getMemoryStats();
    
    if (stats.trackedUrls > 50) {
      console.warn(`[Memory Manager] High URL count: ${stats.trackedUrls}. Consider cleaning up unused URLs.`);
    }
    
    if (parseFloat(stats.estimatedMemoryUsage) > 25) {
      console.warn(`[Memory Manager] High estimated memory usage: ${stats.estimatedMemoryUsage}. Consider cleanup.`);
    }
  }

  /**
   * Check if memory usage is within acceptable limits
   */
  static isMemoryHealthy(): boolean {
    const stats = this.getMemoryStats();
    return stats.trackedUrls <= 50 && parseFloat(stats.estimatedMemoryUsage) <= 25;
  }

  /**
   * Force cleanup if memory usage is too high
   */
  static autoCleanupIfNeeded(): boolean {
    if (!this.isMemoryHealthy()) {
      console.log('[Memory Manager] Auto-cleanup triggered due to high memory usage');
      this.cleanupAllURLs();
      this.forceGC();
      return true;
    }
    return false;
  }
}

/**
 * Hook for managing memory in React components
 */
export const useMemoryCleanup = () => {
  const cleanup = () => {
    MemoryManager.cleanupAllURLs();
    MemoryManager.forceGC();
  };

  const cleanupTracks = (tracks: Track[]) => {
    MemoryManager.cleanupTracks(tracks);
  };

  const getStats = () => {
    return MemoryManager.getMemoryStats();
  };

  return {
    cleanup,
    cleanupTracks,
    getStats,
    monitor: MemoryManager.monitorMemoryUsage
  };
};

/**
 * Utility to create tracks with proper memory management
 */
export const createTrackWithMemoryManagement = (file: File, trackData: Partial<Track>): Track => {
  const url = MemoryManager.createTrackedURL(file);
  
  return {
    id: trackData.id || file.name,
    name: trackData.name || file.name,
    path: trackData.path || file.name,
    genre: trackData.genre || '',
    mood: trackData.mood || '',
    key: trackData.key || '',
    bpm: trackData.bpm || 120,
    notes: trackData.notes || '',
    tags: trackData.tags || [],
    status: trackData.status || { mixed: false, mastered: false, tagged: false, registered: false },
    url,
    fileObject: file
  };
};
