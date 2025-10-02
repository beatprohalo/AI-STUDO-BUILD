import React, { useMemo, useRef } from 'react';
import { Track } from '../types';
import { IconFolder, IconSearch, IconMusic, IconX, IconBrain, IconLoader, IconTag, IconKey, IconClock, IconCheckCircle } from './Icon';

interface LibraryViewProps {
  tracks: Track[];
  selectedTrackId: string | null;
  searchTerm: string;
  isScanning: boolean;
  isAnalyzing: boolean;
  saveStatus: 'idle' | 'saving' | 'saved';
  onSearchTermChange: (term: string) => void;
  onDirectoryChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onSelectTrack: (id: string) => void;
  onDeselectTrack: () => void;
  onUpdateTrack: (track: Track) => void;
  onAutoAnalyze: (track: Track) => void;
}

export const LibraryView: React.FC<LibraryViewProps> = ({
  tracks,
  selectedTrackId,
  searchTerm,
  isScanning,
  isAnalyzing,
  saveStatus,
  onSearchTermChange,
  onDirectoryChange,
  onSelectTrack,
  onDeselectTrack,
  onUpdateTrack,
  onAutoAnalyze,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const filteredTracks = useMemo(() => {
    return tracks.filter(track =>
      track.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      track.genre?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      track.mood?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [tracks, searchTerm]);

  const selectedTrack = useMemo(() => {
    return tracks.find(t => t.id === selectedTrackId);
  }, [tracks, selectedTrackId]);

  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 animate-fade-in">
      <div className={`bg-white/50 dark:bg-black/30 backdrop-blur-md border border-purple-300 dark:border-purple-500/20 rounded-2xl p-6 transition-all duration-300 ${selectedTrack ? 'xl:col-span-1' : 'xl:col-span-2'}`}>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
          <h2 className="font-orbitron text-xl font-bold text-purple-600 dark:text-purple-300">Track Catalog ({filteredTracks.length})</h2>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="relative flex-grow">
              <IconSearch className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-500" />
              <input type="text" placeholder="Search..." value={searchTerm} onChange={e => onSearchTermChange(e.target.value)} className="bg-gray-200/50 dark:bg-gray-800/50 border-2 border-gray-300 dark:border-gray-700 rounded-full py-2 pl-10 pr-4 text-gray-800 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-purple-500 w-full" />
            </div>
            <button onClick={() => fileInputRef.current?.click()} disabled={isScanning} className="p-2 bg-purple-600 hover:bg-purple-500 text-white rounded-full transition-all disabled:opacity-50" aria-label="Scan Music Folder">
              <IconFolder className="w-5 h-5" />
            </button>
            <input type="file" ref={fileInputRef} onChange={onDirectoryChange} {...({ webkitdirectory: '', directory: '' } as any)} multiple className="hidden" />
          </div>
        </div>
        {isScanning && (
          <div className="space-y-2 py-2 animate-fade-in">
            <div className="w-full bg-gray-300 dark:bg-gray-700/50 rounded-full h-2 overflow-hidden"><div className="bg-purple-500 h-2 rounded-full animate-pulse"></div></div>
            <p className="text-center text-xs text-purple-600 dark:text-purple-300">Searching for new tracks...</p>
          </div>
        )}
        <div className="overflow-auto max-h-[70vh] pr-2">
          {filteredTracks.length > 0 ? (
            <ul className="space-y-3">
              {filteredTracks.map(track => {
                const completion = Object.values(track.status).filter(Boolean).length;
                return (
                  <li key={track.id} onClick={() => onSelectTrack(track.id)} className={`flex items-center justify-between p-3 rounded-lg cursor-pointer transition-all duration-200 ease-in-out group ${selectedTrackId === track.id ? 'bg-purple-600/40' : 'bg-gray-200 dark:bg-gray-800/60 hover:bg-gray-300 dark:hover:bg-gray-700/80'}`}>
                    <div className="flex items-center gap-4 truncate"><IconMusic className={`w-6 h-6 ${selectedTrackId === track.id ? 'text-purple-600 dark:text-purple-300' : 'text-gray-500 dark:text-gray-400 group-hover:text-purple-500 dark:group-hover:text-purple-400'}`} />
                      <div className="truncate"><p className="font-semibold text-black dark:text-white truncate">{track.name}</p><p className="text-sm text-gray-500 dark:text-gray-400 truncate">{track.genre || 'No Genre'}</p></div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-24 h-2 bg-gray-300 dark:bg-gray-700 rounded-full overflow-hidden hidden sm:block"><div className="h-full bg-green-500 transition-all duration-500" style={{ width: `${(completion / 4) * 100}%` }}></div></div>
                      <span className="text-xs font-mono text-gray-600 dark:text-gray-500 hidden sm:block">{completion}/4</span>
                    </div>
                  </li>);
              })}
            </ul>
          ) : (<div className="text-center py-16 text-gray-600 dark:text-gray-500"><IconMusic className="w-12 h-12 mx-auto mb-4" /><h3 className="text-lg font-semibold">No Tracks Found</h3><p>Scan your music folder to get started.</p></div>)}
        </div>
      </div>
      {selectedTrack && (<div className="xl:col-span-1 bg-white/50 dark:bg-black/30 backdrop-blur-md border border-purple-300 dark:border-purple-500/20 rounded-2xl p-6 space-y-4 overflow-auto max-h-[80vh] animate-fade-in"><div className="flex justify-between items-start"><div><h3 className="font-orbitron text-xl font-bold text-purple-600 dark:text-purple-300">Metadata Editor</h3><p className="text-sm text-gray-600 dark:text-gray-500 break-all">{selectedTrack.name}</p></div><div className="flex items-center gap-2"><button onClick={() => onAutoAnalyze(selectedTrack)} disabled={isAnalyzing} className="flex items-center gap-2 bg-purple-600 hover:bg-purple-500 text-white font-bold py-2 px-3 rounded-lg transition-all duration-300 disabled:opacity-50 disabled:cursor-wait" title="Auto-analyze BPM and Key">{isAnalyzing ? <IconLoader className="w-5 h-5 animate-spin" /> : <IconBrain className="w-5 h-5" />}<span className="hidden sm:inline">{isAnalyzing ? 'Analyzing...' : 'Auto-Analyze'}</span></button><button onClick={onDeselectTrack} className="p-2 text-gray-500 dark:text-gray-400 hover:text-black dark:hover:text-white hover:bg-gray-300 dark:hover:bg-gray-700 rounded-full flex-shrink-0"><IconX className="w-5 h-5" /></button></div></div><div className="h-6"><div className="flex items-center gap-2">{saveStatus === 'saving' && <><IconLoader className="w-4 h-4 animate-spin text-yellow-500 dark:text-yellow-400" /><p className="text-sm text-yellow-600 dark:text-yellow-400">Saving...</p></>}{saveStatus === 'saved' && <p className="text-sm text-green-600 dark:text-green-400 animate-fade-in">Saved to database ✅</p>}</div></div><div className="grid grid-cols-1 sm:grid-cols-2 gap-4"><MetadataInput label="Genre" icon={<IconTag />} value={selectedTrack.genre || ''} onChange={e => onUpdateTrack({ ...selectedTrack, genre: e.target.value })} /><MetadataInput label="Mood" icon={<IconTag />} value={selectedTrack.mood || ''} onChange={e => onUpdateTrack({ ...selectedTrack, mood: e.target.value })} /><MetadataInput label="Key" icon={<IconKey />} value={selectedTrack.key || ''} onChange={e => onUpdateTrack({ ...selectedTrack, key: e.target.value })} /><MetadataInput label="BPM" icon={<IconClock />} type="number" value={selectedTrack.bpm || 120} onChange={e => onUpdateTrack({ ...selectedTrack, bpm: parseInt(e.target.value) || 0 })} /></div><textarea value={selectedTrack.notes || ''} onChange={e => onUpdateTrack({ ...selectedTrack, notes: e.target.value })} placeholder="Notes (e.g., sample info, licensing...)" rows={4} className="w-full bg-gray-200/50 dark:bg-gray-800/50 border-2 border-gray-300 dark:border-gray-700 rounded-lg p-3 text-gray-800 dark:text-gray-300 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all"></textarea><div><h3 className="font-orbitron text-lg font-bold text-purple-600 dark:text-purple-300 mb-3">Project Status</h3><div className="space-y-3"><TaskCheckbox label="Mixed" checked={selectedTrack.status.mixed} onChange={e => onUpdateTrack({ ...selectedTrack, status: { ...selectedTrack.status, mixed: e.target.checked } })} /><TaskCheckbox label="Mastered" checked={selectedTrack.status.mastered} onChange={e => onUpdateTrack({ ...selectedTrack, status: { ...selectedTrack.status, mastered: e.target.checked } })} /><TaskCheckbox label="Tagged" checked={selectedTrack.status.tagged} onChange={e => onUpdateTrack({ ...selectedTrack, status: { ...selectedTrack.status, tagged: e.target.checked } })} /><TaskCheckbox label="Registered" checked={selectedTrack.status.registered} onChange={e => onUpdateTrack({ ...selectedTrack, status: { ...selectedTrack.status, registered: e.target.checked } })} /></div></div></div>)}
    </div>
  );
};

const MetadataInput: React.FC<{label: string, icon: React.ReactNode, value: string | number, onChange: (e: React.ChangeEvent<HTMLInputElement>) => void, type?: string}> = ({label, icon, value, onChange, type = 'text'}) => (
    <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-500 dark:text-gray-400">{icon}</div>
        <input type={type} placeholder={label} value={value} onChange={onChange} className="w-full bg-gray-200/50 dark:bg-gray-800/50 border-2 border-gray-300 dark:border-gray-700 rounded-lg py-2 pl-10 pr-4 text-gray-800 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-purple-500" />
    </div>
);

const TaskCheckbox: React.FC<{label: string, checked: boolean, onChange: (e: React.ChangeEvent<HTMLInputElement>) => void}> = ({label, checked, onChange}) => (
    <label className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all ${checked ? 'bg-green-500/20' : 'bg-gray-200 dark:bg-gray-800/60'}`}>
        <div className="w-6 h-6 flex items-center justify-center">
            {checked && <IconCheckCircle className="w-6 h-6 text-green-500 dark:text-green-400" />}
        </div>
        <span className={`font-semibold ${checked ? 'text-green-700 dark:text-green-300' : 'text-gray-800 dark:text-gray-300'}`}>{label}</span>
        <input type="checkbox" checked={checked} onChange={onChange} className="sr-only" />
    </label>
);