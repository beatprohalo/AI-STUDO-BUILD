import React, { useState, useMemo } from 'react';
import { Track, Sample, Plugin, SmartSearchResult } from '../types';
import { IconSearch, IconMusic, IconWaveform, IconSliders, IconLoader, IconBolt, IconPlay, IconPause } from './Icon';

type PlaybackStatus = 'playing' | 'paused' | 'stopped';

interface SearchViewProps {
    tracks: Track[];
    samples: Sample[];
    plugins: Plugin[];
    onSmartSearch: (query: string) => void;
    isSearchingAI: boolean;
    smartSearchResults: SmartSearchResult[] | null;
    searchError: string | null;
    onPlayRequest: (item: Track | Sample) => void;
    currentlyPlaying: Track | Sample | null;
    playbackStatus: PlaybackStatus;
}

type SearchScope = 'tracks' | 'samples' | 'plugins';

export const SearchView: React.FC<SearchViewProps> = ({
    tracks,
    samples,
    plugins,
    onSmartSearch,
    isSearchingAI,
    smartSearchResults,
    searchError,
    onPlayRequest,
    currentlyPlaying,
    playbackStatus,
}) => {
    const [query, setQuery] = useState('');
    const [scope, setScope] = useState<SearchScope>('tracks');
    const [useAI, setUseAI] = useState(false);

    const handleSearch = () => {
        if (useAI && scope === 'tracks' && query.trim()) {
            onSmartSearch(query);
        }
    };

    const filteredTracks = useMemo(() => {
        if (!query.trim() || (useAI && scope === 'tracks')) return [];
        const q = query.toLowerCase();
        return tracks.filter(t =>
            t.name.toLowerCase().includes(q) ||
            t.genre.toLowerCase().includes(q) ||
            t.mood.toLowerCase().includes(q) ||
            t.key.toLowerCase().includes(q) ||
            t.bpm.toString().includes(q) ||
            t.notes.toLowerCase().includes(q)
        );
    }, [query, tracks, useAI, scope]);

    const filteredSamples = useMemo(() => {
        if (!query.trim()) return [];
        const q = query.toLowerCase();
        return samples.filter(s =>
            s.name.toLowerCase().includes(q) ||
            s.tags.some(tag => tag.toLowerCase().includes(q))
        );
    }, [query, samples]);

    const filteredPlugins = useMemo(() => {
        if (!query.trim()) return [];
        const q = query.toLowerCase();
        return plugins.filter(p =>
            p.name.toLowerCase().includes(q) ||
            p.manufacturer.toLowerCase().includes(q) ||
            p.type.toLowerCase().includes(q)
        );
    }, [query, plugins]);
    
    const getTrackById = (id: string) => tracks.find(t => t.id === id);

    const renderResults = () => {
        if (isSearchingAI) {
            return (
                <div className="flex flex-col items-center justify-center text-center text-gray-500 dark:text-gray-400 py-16">
                    <IconLoader className="w-12 h-12 mb-4 animate-spin text-purple-500 dark:text-purple-400" />
                    <h3 className="text-lg font-bold font-orbitron text-gray-700 dark:text-gray-300">AI Analyzing Your Query...</h3>
                    <p>Searching for semantic matches.</p>
                </div>
            );
        }

        if (searchError) {
             return (
                <div className="bg-red-100 dark:bg-red-900/50 border border-red-300 dark:border-red-500/50 rounded-xl p-4 text-center text-red-800 dark:text-red-200 mt-4">
                    <h3 className="font-bold">Search Error</h3>
                    <p>{searchError}</p>
                </div>
             );
        }

        if (scope === 'tracks') {
            const resultsToShow = (useAI && smartSearchResults)
                ? smartSearchResults.map(r => ({ ...r, track: getTrackById(r.trackId) })).filter(r => r.track)
                : filteredTracks;

            if (resultsToShow.length === 0) return <div className="text-center py-10 text-gray-500">No tracks found.</div>;
            
            return (
                <ul className="space-y-3">
                    {useAI ? (smartSearchResults || []).map(result => {
                        const track = getTrackById(result.trackId);
                        if (!track) return null;
                        const isPlaying = currentlyPlaying?.id === track.id && playbackStatus === 'playing';
                        return (
                            <li key={track.id} className="bg-gray-100 dark:bg-gray-800/50 p-4 rounded-lg border border-transparent hover:border-purple-400 dark:hover:border-purple-500/50">
                                <div className="flex items-center gap-4">
                                    <button onClick={() => onPlayRequest(track)} className="p-2 rounded-full bg-purple-100 dark:bg-purple-900/50 text-purple-600 dark:text-purple-300 hover:bg-purple-200 dark:hover:bg-purple-800 transition-colors">
                                        {isPlaying ? <IconPause className="w-5 h-5"/> : <IconPlay className="w-5 h-5"/>}
                                    </button>
                                    <div className="flex-1">
                                        <p className="font-semibold text-black dark:text-white">{track.name}</p>
                                        <p className="text-sm text-gray-500 dark:text-gray-400">{track.genre} &bull; {track.mood}</p>
                                    </div>
                                </div>
                                <div className="mt-2 pl-14 text-sm bg-purple-100/50 dark:bg-purple-900/20 p-2 rounded-md">
                                    <p className="font-semibold text-purple-700 dark:text-purple-300">AI Reasoning:</p>
                                    <p className="text-gray-600 dark:text-gray-300">{result.reasoning}</p>
                                </div>
                            </li>
                        );
                    }) : filteredTracks.map(track => {
                        const isPlaying = currentlyPlaying?.id === track.id && playbackStatus === 'playing';
                        return (
                             <li key={track.id} className="bg-gray-100 dark:bg-gray-800/50 p-3 rounded-lg flex items-center gap-4">
                                <button onClick={() => onPlayRequest(track)} className="p-2 rounded-full bg-purple-100 dark:bg-purple-900/50 text-purple-600 dark:text-purple-300 hover:bg-purple-200 dark:hover:bg-purple-800 transition-colors">
                                    {isPlaying ? <IconPause className="w-5 h-5"/> : <IconPlay className="w-5 h-5"/>}
                                </button>
                                <div>
                                     <p className="font-semibold text-black dark:text-white">{track.name}</p>
                                     <p className="text-sm text-gray-500 dark:text-gray-400">{track.genre} &bull; {track.mood} &bull; {track.bpm} BPM</p>
                                </div>
                             </li>
                        )
                    })}
                </ul>
            );
        }

        if (scope === 'samples') {
             if (filteredSamples.length === 0) return <div className="text-center py-10 text-gray-500">No samples found.</div>;
             return (
                <ul className="space-y-3">
                    {filteredSamples.map(sample => {
                        const isPlaying = currentlyPlaying?.id === sample.id && playbackStatus === 'playing';
                        return (
                        <li key={sample.id} className="bg-gray-100 dark:bg-gray-800/50 p-3 rounded-lg">
                           <div className="flex items-center gap-4">
                             <button onClick={() => onPlayRequest(sample)} className="p-2 rounded-full bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-800 transition-colors">
                                {isPlaying ? <IconPause className="w-5 h-5"/> : <IconPlay className="w-5 h-5"/>}
                            </button>
                             <div>
                                 <p className="font-semibold text-black dark:text-white">{sample.name}</p>
                                 <div className="flex flex-wrap gap-1.5 mt-1">
                                     {sample.tags.map(tag => <span key={tag} className="text-xs bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-2 py-0.5 rounded-full">{tag}</span>)}
                                 </div>
                             </div>
                            </div>
                        </li>
                    )})}
                </ul>
            );
        }

        if (scope === 'plugins') {
            if (filteredPlugins.length === 0) return <div className="text-center py-10 text-gray-500">No plugins found.</div>;
            return (
                 <ul className="space-y-3">
                    {filteredPlugins.map(plugin => (
                        <li key={plugin.id} className="bg-gray-100 dark:bg-gray-800/50 p-3 rounded-lg flex items-center gap-4">
                            <IconSliders className="w-6 h-6 text-green-500 dark:text-green-400 flex-shrink-0" />
                            <div>
                                <p className="font-semibold text-black dark:text-white">{plugin.name}</p>
                                <p className="text-sm text-gray-500 dark:text-gray-400">{plugin.manufacturer} &bull; {plugin.type}</p>
                            </div>
                        </li>
                    ))}
                </ul>
            )
        }
        return null;
    };


    return (
        <div className="bg-white/50 dark:bg-black/30 backdrop-blur-md border border-purple-300 dark:border-purple-500/20 rounded-2xl p-6 animate-fade-in flex flex-col h-[calc(100vh-140px)]">
            <h2 className="font-orbitron text-xl font-bold text-purple-600 dark:text-purple-300 flex items-center gap-3 mb-4">
                <IconSearch className="w-6 h-6" />
                Universal Search
            </h2>

            {/* Search Input and Controls */}
            <div className="space-y-4">
                <div className="relative">
                    <IconSearch className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
                    <input
                        type="text"
                        placeholder="Search tracks, samples, plugins..."
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        onKeyDown={(e) => { if(e.key === 'Enter') handleSearch(); }}
                        className="w-full bg-gray-100 dark:bg-gray-800/50 border-2 border-gray-300 dark:border-gray-700 rounded-lg py-3 pl-12 pr-4 text-gray-800 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                </div>
                <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                    <div className="flex items-center gap-2 p-1 bg-gray-200 dark:bg-gray-900/50 rounded-lg">
                        {(['tracks', 'samples', 'plugins'] as SearchScope[]).map(s => (
                            <button
                                key={s}
                                onClick={() => setScope(s)}
                                className={`px-4 py-1.5 rounded-md font-semibold text-sm capitalize transition-colors ${scope === s ? 'bg-purple-600 text-white' : 'text-gray-600 hover:bg-gray-300/50 dark:text-gray-400 dark:hover:bg-gray-700/50'}`}
                            >
                                {s}
                            </button>
                        ))}
                    </div>
                     {scope === 'tracks' && (
                        <label className="flex items-center gap-2 cursor-pointer p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700/50">
                            <input
                                type="checkbox"
                                checked={useAI}
                                onChange={(e) => setUseAI(e.target.checked)}
                                className="w-4 h-4 accent-purple-500"
                            />
                            <IconBolt className={`w-4 h-4 transition-colors ${useAI ? 'text-yellow-400' : 'text-gray-400'}`} />
                            <span className={`text-sm font-semibold transition-colors ${useAI ? 'text-purple-600 dark:text-purple-300' : 'text-gray-600 dark:text-gray-400'}`}>AI Smart Search</span>
                        </label>
                    )}
                </div>
            </div>
            
            <div className="border-t border-purple-300 dark:border-purple-500/20 my-4"></div>

            {/* Results */}
            <div className="flex-1 overflow-y-auto pr-2">
                {query.trim() || (useAI && smartSearchResults) ? (
                    renderResults()
                ) : (
                    <div className="text-center py-16 text-gray-500">
                        <p>Enter a query to begin searching.</p>
                    </div>
                )}
            </div>
        </div>
    );
};