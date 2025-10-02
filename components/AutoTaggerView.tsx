import React, { useState, useCallback } from 'react';
import { Track } from '../types';
import { IconWand, IconUpload, IconLoader, IconCheckCircle, IconX, IconMusic, IconWaveform } from './Icon';

type TaggingStatus = 'pending' | 'tagging' | 'success' | 'error';

interface QueuedFile {
  file: File;
  status: TaggingStatus;
  result?: Partial<Track> | { tags: string[] };
  error?: string;
}

interface AutoTaggerViewProps {
  onTagFile: (file: File) => Promise<{ file: File; data: Partial<Track> | { tags: string[] } }>;
}

export const AutoTaggerView: React.FC<AutoTaggerViewProps> = ({ onTagFile }) => {
  const [queuedFiles, setQueuedFiles] = useState<QueuedFile[]>([]);
  const [isTagging, setIsTagging] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const handleFileChange = (files: FileList | null) => {
    if (!files) return;
    const newFiles = Array.from(files)
      .filter(file => /\.(wav|mp3|aiff)$/i.test(file.name))
      .map(file => ({ file, status: 'pending' } as QueuedFile));
    
    // Prevent duplicates
    const existingFileNames = new Set(queuedFiles.map(qf => qf.file.name));
    const uniqueNewFiles = newFiles.filter(nf => !existingFileNames.has(nf.file.name));

    setQueuedFiles(prev => [...prev, ...uniqueNewFiles]);
  };

  const handleDragEvents = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDragEnter = (e: React.DragEvent) => {
    handleDragEvents(e);
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    handleDragEvents(e);
    setIsDragging(false);
  };
  
  const handleDrop = (e: React.DragEvent) => {
    handleDragEvents(e);
    setIsDragging(false);
    handleFileChange(e.dataTransfer.files);
  };

  const startTagging = async () => {
    setIsTagging(true);
    for (let i = 0; i < queuedFiles.length; i++) {
        if (queuedFiles[i].status !== 'pending') continue;

        const currentFile = queuedFiles[i];
        setQueuedFiles(prev => prev.map(qf => qf.file.name === currentFile.file.name ? { ...qf, status: 'tagging' } : qf));

        try {
            const { data } = await onTagFile(currentFile.file);
            setQueuedFiles(prev => prev.map(qf => qf.file.name === currentFile.file.name ? { ...qf, status: 'success', result: data } : qf));
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            setQueuedFiles(prev => prev.map(qf => qf.file.name === currentFile.file.name ? { ...qf, status: 'error', error: errorMessage } : qf));
        }
    }
    setIsTagging(false);
  };

  const clearQueue = () => {
      setQueuedFiles([]);
  }
  
  const progress = queuedFiles.filter(f => f.status === 'success' || f.status === 'error').length;
  const total = queuedFiles.length;
  const progressPercentage = total > 0 ? (progress / total) * 100 : 0;

  return (
    <div className="bg-white/50 dark:bg-black/30 backdrop-blur-md border border-purple-300 dark:border-purple-500/20 rounded-2xl p-6 animate-fade-in flex flex-col h-[calc(100vh-140px)]">
        <h2 className="font-orbitron text-xl font-bold text-purple-600 dark:text-purple-300 flex items-center gap-3 mb-4">
            <IconWand className="w-6 h-6" />
            AI Auto-Tagger
        </h2>

        {!isTagging && queuedFiles.length === 0 && (
             <div 
                onDragEnter={handleDragEnter}
                onDragOver={handleDragEnter}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`flex-1 flex flex-col items-center justify-center border-2 border-dashed rounded-lg transition-colors duration-300 ${isDragging ? 'border-purple-500 bg-purple-500/10' : 'border-gray-300 dark:border-gray-600'}`}
            >
                <input
                    id="file-upload"
                    type="file"
                    multiple
                    accept=".wav,.mp3,.aiff"
                    onChange={e => handleFileChange(e.target.files)}
                    className="hidden"
                />
                <label htmlFor="file-upload" className="text-center cursor-pointer p-8">
                    <IconUpload className="w-12 h-12 mx-auto mb-4 text-gray-400 dark:text-gray-500" />
                    <p className="font-semibold text-gray-700 dark:text-gray-300">Drag & drop audio files here</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">or click to browse</p>
                </label>
            </div>
        )}

        {queuedFiles.length > 0 && (
            <>
                <div className="flex justify-between items-center mb-4">
                    <h3 className="font-semibold text-gray-800 dark:text-gray-200">Tagging Queue ({total} files)</h3>
                     <div className="flex items-center gap-2">
                        <button onClick={clearQueue} disabled={isTagging} className="text-sm text-red-500 hover:text-red-700 disabled:opacity-50">Clear Queue</button>
                        <button onClick={startTagging} disabled={isTagging || progress === total} className="flex items-center gap-2 bg-purple-600 hover:bg-purple-500 text-white font-bold py-2 px-4 rounded-lg transition-colors duration-300 disabled:opacity-50 disabled:cursor-not-allowed">
                            {isTagging ? <IconLoader className="w-5 h-5 animate-spin" /> : <IconWand className="w-5 h-5" />}
                            {isTagging ? 'Tagging...' : 'Start Tagging'}
                        </button>
                    </div>
                </div>

                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5 mb-4">
                    <div className="bg-purple-500 h-2.5 rounded-full transition-all duration-500" style={{width: `${progressPercentage}%`}}></div>
                </div>

                <div className="flex-1 overflow-y-auto pr-2 space-y-3">
                    {queuedFiles.map(({file, status, result, error}) => {
                         const isTrack = 'bpm' in (result || {});
                         const tags = isTrack ? (result as Track).tags : (result as {tags: string[]})?.tags;
                        return (
                            <div key={file.name} className="bg-gray-100 dark:bg-gray-800/50 p-3 rounded-lg">
                                <div className="flex items-center gap-4">
                                     {status === 'tagging' && <IconLoader className="w-5 h-5 text-yellow-500 animate-spin flex-shrink-0" />}
                                     {status === 'success' && <IconCheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />}
                                     {status === 'error' && <IconX className="w-5 h-5 text-red-500 flex-shrink-0" />}
                                     {status === 'pending' && ( isTrack ? <IconMusic className="w-5 h-5 text-gray-400 flex-shrink-0" /> : <IconWaveform className="w-5 h-5 text-gray-400 flex-shrink-0" />)}
                                     <p className="font-medium text-gray-800 dark:text-gray-300 truncate">{file.name}</p>
                                </div>
                                {status === 'success' && result && (
                                    <div className="pl-9 pt-2 animate-fade-in">
                                        {isTrack && (
                                            <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-gray-600 dark:text-gray-400">
                                                <span><strong>Genre:</strong> {(result as Track).genre}</span>
                                                <span><strong>Mood:</strong> {(result as Track).mood}</span>
                                                <span><strong>Key:</strong> {(result as Track).key}</span>
                                                <span><strong>BPM:</strong> {(result as Track).bpm}</span>
                                            </div>
                                        )}
                                        <div className="flex flex-wrap gap-1.5 mt-2">
                                            {tags?.map(tag => <span key={tag} className="text-xs bg-purple-200 dark:bg-purple-900/70 text-purple-800 dark:text-purple-200 px-2 py-0.5 rounded-full">{tag}</span>)}
                                        </div>
                                    </div>
                                )}
                                {status === 'error' && <p className="pl-9 pt-1 text-xs text-red-500 dark:text-red-400">{error}</p>}
                            </div>
                        )
                    })}
                </div>
            </>
        )}
    </div>
  );
};
