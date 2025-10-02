/**
 * Utility functions for handling async operations without blocking the UI
 */

/**
 * Yields control to the browser's event loop, allowing the UI to remain responsive
 * @param ms - Optional delay in milliseconds (default: 0)
 */
export const yieldToUI = (ms: number = 0): Promise<void> => {
  return new Promise(resolve => {
    if (window.requestIdleCallback && ms === 0) {
      window.requestIdleCallback(resolve);
    } else {
      setTimeout(resolve, ms);
    }
  });
};

/**
 * Processes an array in batches with UI yielding between batches
 * @param items - Array of items to process
 * @param batchSize - Number of items to process per batch
 * @param processor - Function to process each batch
 * @param onProgress - Optional callback for progress updates
 */
export const processInBatches = async <T, R>(
  items: T[],
  batchSize: number,
  processor: (batch: T[]) => R | Promise<R>,
  onProgress?: (processed: number, total: number) => void
): Promise<R[]> => {
  const results: R[] = [];
  
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    const result = await processor(batch);
    results.push(result);
    
    // Yield control to the UI between batches
    await yieldToUI(10);
    
    // Update progress if callback provided
    if (onProgress) {
      onProgress(Math.min(i + batchSize, items.length), items.length);
    }
  }
  
  return results;
};

/**
 * Creates a debounced version of a function that yields to the UI
 * @param func - Function to debounce
 * @param delay - Delay in milliseconds
 */
export const debounceWithYield = <T extends (...args: any[]) => any>(
  func: T,
  delay: number
): ((...args: Parameters<T>) => Promise<ReturnType<T>>) => {
  let timeoutId: NodeJS.Timeout;
  
  return async (...args: Parameters<T>): Promise<ReturnType<T>> => {
    return new Promise((resolve) => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(async () => {
        await yieldToUI();
        const result = func(...args);
        resolve(result);
      }, delay);
    });
  };
};

/**
 * Processes files with proper error handling and UI yielding
 * @param files - FileList or File array to process
 * @param processor - Function to process each file
 * @param batchSize - Number of files to process per batch (default: 25)
 */
export const processFilesAsync = async <T>(
  files: FileList | File[],
  processor: (file: File) => T | Promise<T>,
  batchSize: number = 25
): Promise<T[]> => {
  const fileArray = Array.from(files);
  const results: T[] = [];
  
  for (let i = 0; i < fileArray.length; i += batchSize) {
    const batch = fileArray.slice(i, i + batchSize);
    
    // Process batch
    const batchResults = await Promise.all(
      batch.map(file => processor(file))
    );
    
    results.push(...batchResults);
    
    // Yield control to the UI between batches
    await yieldToUI(10);
  }
  
  return results;
};
