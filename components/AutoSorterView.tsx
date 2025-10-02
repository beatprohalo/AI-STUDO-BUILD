import React, { useState, useMemo } from 'react';
import { Track, Sample } from '../types';
import { IconSortAsc, IconFolder, IconMusic, IconWaveform, IconChevronDown, IconScan, IconBrain, IconLoader } from './Icon';
import { FolderScanner } from './FolderScanner';
import { instrumentDetectionService, InstrumentDetectionResult } from '../services/instrumentDetectionService';

interface AutoSorterViewProps {
    tracks: Track[];
    samples: Sample[];
    onFilesScanned?: (files: { name: string; path: string; file_type: string; size: number }[]) => void;
}

type SortTarget = 'tracks' | 'samples';
type TrackSortBy = 'mood' | 'bpm' | 'key' | 'progress';
type SampleSortBy = 'tags' | 'name' | 'instrument';
type SortedResult = { [key: string]: (Track | Sample)[] } | (Track | Sample)[];

interface InstrumentAnalysis {
  file: File;
  result: InstrumentDetectionResult;
  isAnalyzing: boolean;
  error?: string;
}

export const AutoSorterView: React.FC<AutoSorterViewProps> = ({ tracks, samples, onFilesScanned }) => {
    const [sortTarget, setSortTarget] = useState<SortTarget>('tracks');
    const [trackSortBy, setTrackSortBy] = useState<TrackSortBy>('mood');
    const [sampleSortBy, setSampleSortBy] = useState<SampleSortBy>('tags');
    const [organizeInFolders, setOrganizeInFolders] = useState(true);
    const [sortedResult, setSortedResult] = useState<SortedResult | null>(null);
    const [showFolderScanner, setShowFolderScanner] = useState(false);
    const [instrumentAnalyses, setInstrumentAnalyses] = useState<Map<string, InstrumentAnalysis>>(new Map());
    const [isAnalyzingInstruments, setIsAnalyzingInstruments] = useState(false);
    const [analysisProgress, setAnalysisProgress] = useState<{ current: number; total: number }>({ current: 0, total: 0 });

    const handleSort = () => {
        let result: SortedResult;

        if (sortTarget === 'tracks') {
            if (organizeInFolders) {
                result = tracks.reduce((acc, track) => {
                    let key = 'Uncategorized';
                    if (trackSortBy === 'mood' && track.mood) key = track.mood;
                    if (trackSortBy === 'key' && track.key) key = track.key;
                    if (trackSortBy === 'bpm') {
                         if (track.bpm < 80) key = 'Under 80 BPM';
                         else if (track.bpm <= 90) key = '80-90 BPM';
                         else if (track.bpm <= 100) key = '91-100 BPM';
                         else if (track.bpm <= 110) key = '101-110 BPM';
                         else if (track.bpm <= 120) key = '111-120 BPM';
                         else if (track.bpm <= 130) key = '121-130 BPM';
                         else if (track.bpm <= 140) key = '131-140 BPM';
                         else key = 'Over 140 BPM';
                    }
                    if (trackSortBy === 'progress') {
                        const completedCount = Object.values(track.status).filter(Boolean).length;
                        if (completedCount === 4) key = 'Completed';
                        else if (completedCount === 0) key = 'Unstarted';
                        else key = 'In Progress';
                    }
                    
                    if (!acc[key]) acc[key] = [];
                    acc[key].push(track);
                    return acc;
                }, {} as { [key: string]: Track[] });
            } else {
                 result = [...tracks].sort((a, b) => a.name.localeCompare(b.name));
            }
        } else { // Samples
             if (organizeInFolders && sampleSortBy === 'tags') {
                 result = samples.reduce((acc, sample) => {
                    const key = sample.tags[0] || 'Untagged';
                    const capitalizedKey = key.charAt(0).toUpperCase() + key.slice(1);
                    if (!acc[capitalizedKey]) acc[capitalizedKey] = [];
                    acc[capitalizedKey].push(sample);
                    return acc;
                }, {} as { [key: string]: Sample[] });
             } else if (organizeInFolders && sampleSortBy === 'instrument') {
                 result = samples.reduce((acc, sample) => {
                    const analysis = instrumentAnalyses.get(sample.id);
                    const key = analysis?.result.instrumentType || 'Unknown';
                    const capitalizedKey = key.charAt(0).toUpperCase() + key.slice(1);
                    if (!acc[capitalizedKey]) acc[capitalizedKey] = [];
                    acc[capitalizedKey].push(sample);
                    return acc;
                }, {} as { [key: string]: Sample[] });
             } else {
                 result = [...samples].sort((a, b) => a.name.localeCompare(b.name));
             }
        }
        setSortedResult(result);
    };

    const handleAnalyzeInstruments = async () => {
        setIsAnalyzingInstruments(true);
        setAnalysisProgress({ current: 0, total: samples.length });

        for (let i = 0; i < samples.length; i++) {
            const sample = samples[i];
            setAnalysisProgress({ current: i + 1, total: samples.length });

            // Mark as analyzing
            setInstrumentAnalyses(prev => {
                const newMap = new Map(prev);
                newMap.set(sample.id, {
                    file: new File([], sample.name), // Placeholder file object
                    result: { instrumentType: 'unknown', confidence: 0, characteristics: { frequency: 0, attack: 0, sustain: 0, decay: 0, spectralCentroid: 0, zeroCrossingRate: 0 }, tags: [] },
                    isAnalyzing: true
                });
                return newMap;
            });

            try {
                // In a real implementation, you'd load the actual audio file here
                // For now, we'll use the filename-based detection as a fallback
                const result = await instrumentDetectionService.detectInstrumentFromFile(
                    new File([], sample.name) // Placeholder - in real implementation, load actual file
                );

                setInstrumentAnalyses(prev => {
                    const newMap = new Map(prev);
                    newMap.set(sample.id, {
                        file: new File([], sample.name),
                        result,
                        isAnalyzing: false
                    });
                    return newMap;
                });
            } catch (error) {
                setInstrumentAnalyses(prev => {
                    const newMap = new Map(prev);
                    newMap.set(sample.id, {
                        file: new File([], sample.name),
                        result: { instrumentType: 'unknown', confidence: 0, characteristics: { frequency: 0, attack: 0, sustain: 0, decay: 0, spectralCentroid: 0, zeroCrossingRate: 0 }, tags: [] },
                        isAnalyzing: false,
                        error: error instanceof Error ? error.message : 'Unknown error'
                    });
                    return newMap;
                });
            }
        }

        setIsAnalyzingInstruments(false);
    };
    
    const isGrouped = sortedResult && !Array.isArray(sortedResult);

    return (
        <div className="bg-white/50 dark:bg-black/30 backdrop-blur-md border border-purple-300 dark:border-purple-500/20 rounded-2xl p-6 animate-fade-in flex flex-col h-[calc(100vh-140px)]">
            <h2 className="font-orbitron text-xl font-bold text-purple-600 dark:text-purple-300 flex items-center gap-3 mb-4">
                <IconSortAsc className="w-6 h-6" />
                Auto-Sorter
            </h2>

            {/* Controls */}
            <div className="flex flex-col md:flex-row items-center gap-4 mb-4 p-4 bg-gray-100 dark:bg-gray-800/50 rounded-lg">
                {/* Target Selector */}
                <div className="flex items-center gap-2 p-1 bg-gray-200 dark:bg-gray-900/50 rounded-lg">
                    {(['tracks', 'samples'] as SortTarget[]).map(s => (
                        <button
                            key={s}
                            onClick={() => setSortTarget(s)}
                            className={`px-4 py-1.5 rounded-md font-semibold text-sm capitalize transition-colors ${sortTarget === s ? 'bg-purple-600 text-white' : 'text-gray-600 hover:bg-gray-300/50 dark:text-gray-400 dark:hover:bg-gray-700/50'}`}
                        >
                            {s}
                        </button>
                    ))}
                </div>
                
                {/* Criteria Selector */}
                <div className="flex-1">
                    <label htmlFor="sort-by" className="text-sm font-medium text-gray-700 dark:text-gray-300 mr-2">Sort by:</label>
                    <select
                      id="sort-by"
                      value={sortTarget === 'tracks' ? trackSortBy : sampleSortBy}
                      onChange={(e) => sortTarget === 'tracks' ? setTrackSortBy(e.target.value as TrackSortBy) : setSampleSortBy(e.target.value as SampleSortBy)}
                      className="bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    >
                        {sortTarget === 'tracks' ? (
                            <>
                                <option value="mood">Mood</option>
                                <option value="bpm">BPM</option>
                                <option value="key">Key</option>
                                <option value="progress">Progress</option>
                            </>
                        ) : (
                             <>
                                <option value="tags">Tags</option>
                                <option value="name">Name</option>
                                <option value="instrument">Instrument</option>
                            </>
                        )}
                    </select>
                </div>
                
                {/* Folder Toggle */}
                 <label className="flex items-center gap-2 cursor-pointer p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700/50">
                    <input
                        type="checkbox"
                        checked={organizeInFolders}
                        onChange={(e) => setOrganizeInFolders(e.target.checked)}
                        className="w-4 h-4 accent-purple-500"
                    />
                    <span className={`text-sm font-semibold transition-colors ${organizeInFolders ? 'text-purple-600 dark:text-purple-300' : 'text-gray-600 dark:text-gray-400'}`}>Organize into folders</span>
                </label>

                {sortTarget === 'samples' && (
                    <button 
                        onClick={handleAnalyzeInstruments}
                        disabled={isAnalyzingInstruments || samples.length === 0}
                        className="bg-blue-600 hover:bg-blue-500 disabled:bg-gray-400 text-white font-bold py-2 px-4 rounded-lg transition-colors flex items-center gap-2"
                    >
                        {isAnalyzingInstruments ? <IconLoader className="w-4 h-4 animate-spin" /> : <IconBrain className="w-4 h-4" />}
                        {isAnalyzingInstruments ? `Analyzing... (${analysisProgress.current}/${analysisProgress.total})` : 'Analyze Instruments'}
                    </button>
                )}

                <button 
                    onClick={() => setShowFolderScanner(true)}
                    className="bg-green-600 hover:bg-green-500 text-white font-bold py-2 px-4 rounded-lg transition-colors flex items-center gap-2"
                >
                    <IconScan className="w-4 h-4" />
                    Scan Folder
                </button>

                <button onClick={handleSort} className="bg-purple-600 hover:bg-purple-500 text-white font-bold py-2 px-4 rounded-lg transition-colors">
                    Sort
                </button>
            </div>

            {/* Results */}
            <div className="flex-1 overflow-y-auto pr-2 border-t border-purple-300 dark:border-purple-500/20 pt-4">
                {!sortedResult && (
                    <div className="text-center py-16 text-gray-500">
                        <p>Configure your sorting options and click "Sort" to see the results.</p>
                    </div>
                )}
                {isGrouped && sortedResult && Object.keys(sortedResult).sort().map(groupName => (
                    <details key={groupName} open className="mb-2">
                        <summary className="flex items-center gap-2 font-semibold text-lg text-gray-800 dark:text-gray-200 cursor-pointer p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800/50">
                            <IconChevronDown className="w-5 h-5 transition-transform open:rotate-180" />
                            <IconFolder className="w-5 h-5 text-yellow-500" />
                            {groupName} <span className="text-sm font-normal text-gray-500">({sortedResult[groupName].length})</span>
                        </summary>
                        <ul className="pl-10 mt-2 space-y-1">
                            {sortedResult[groupName].map(item => {
                                const analysis = instrumentAnalyses.get(item.id);
                                return <FileItem key={item.id} item={item} instrumentAnalysis={analysis} />;
                            })}
                        </ul>
                    </details>
                ))}
                 {!isGrouped && Array.isArray(sortedResult) && (
                    <ul className="space-y-1">
                        {sortedResult.map(item => {
                            const analysis = instrumentAnalyses.get(item.id);
                            return <FileItem key={item.id} item={item} instrumentAnalysis={analysis} />;
                        })}
                    </ul>
                )}
            </div>

            {/* Folder Scanner Modal */}
            {showFolderScanner && (
                <FolderScanner
                    onFilesScanned={(files) => {
                        if (onFilesScanned) {
                            onFilesScanned(files);
                        }
                        setShowFolderScanner(false);
                    }}
                    onClose={() => setShowFolderScanner(false)}
                />
            )}
        </div>
    );
};

const FileItem: React.FC<{ item: Track | Sample; instrumentAnalysis?: InstrumentAnalysis }> = ({ item, instrumentAnalysis }) => {
    const isTrack = 'bpm' in item;
    return (
        <li className="flex items-center gap-3 p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800/50">
            {isTrack ? <IconMusic className="w-4 h-4 text-purple-500 dark:text-purple-400 flex-shrink-0" /> : <IconWaveform className="w-4 h-4 text-blue-500 dark:text-blue-400 flex-shrink-0" />}
            <div className="flex-1 min-w-0">
                <span className="text-gray-700 dark:text-gray-300 truncate block">{item.name}</span>
                {instrumentAnalysis && !isTrack && (
                    <div className="mt-1 flex flex-wrap gap-1">
                        {instrumentAnalysis.isAnalyzing ? (
                            <span className="text-xs text-blue-500 flex items-center gap-1">
                                <IconLoader className="w-3 h-3 animate-spin" />
                                Analyzing...
                            </span>
                        ) : instrumentAnalysis.error ? (
                            <span className="text-xs text-red-500">Analysis failed</span>
                        ) : (
                            <>
                                <span className="text-xs bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-200 px-2 py-0.5 rounded-full">
                                    {instrumentAnalysis.result.instrumentType} ({Math.round(instrumentAnalysis.result.confidence * 100)}%)
                                </span>
                                {instrumentAnalysis.result.tags.slice(0, 3).map(tag => (
                                    <span key={tag} className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-2 py-0.5 rounded-full">
                                        {tag}
                                    </span>
                                ))}
                            </>
                        )}
                    </div>
                )}
            </div>
        </li>
    );
};
