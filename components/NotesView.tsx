import React from 'react';
import { Track, Note } from '../types';
import { IconEdit, IconUser, IconClock, IconMusic } from './Icon';

interface NotesViewProps {
    tracks: Track[];
    notes: Note[];
    onAddNote: (trackId: string, text: string) => void;
}

export const NotesView: React.FC<NotesViewProps> = ({ tracks, notes, onAddNote }) => {
    const [selectedTrackId, setSelectedTrackId] = React.useState<string>('');
    const [noteText, setNoteText] = React.useState('');

    const handleAddNote = (e: React.FormEvent) => {
        e.preventDefault();
        if (!noteText.trim() || !selectedTrackId) return;
        onAddNote(selectedTrackId, noteText);
        setNoteText('');
    };

    const trackNotes = React.useMemo(() => {
        if (!selectedTrackId) return [];
        return notes
            .filter(note => note.trackId === selectedTrackId)
            .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    }, [notes, selectedTrackId]);
    
    const selectedTrackName = React.useMemo(() => {
        return tracks.find(t => t.id === selectedTrackId)?.name || '...';
    }, [tracks, selectedTrackId]);

    return (
        <div className="bg-white/50 dark:bg-black/30 backdrop-blur-md border border-purple-300 dark:border-purple-500/20 rounded-2xl p-6 animate-fade-in flex flex-col h-[calc(100vh-140px)]">
            <h2 className="font-orbitron text-xl font-bold text-purple-600 dark:text-purple-300 flex items-center gap-3 mb-4">
                <IconEdit className="w-6 h-6" />
                Track Notes
            </h2>

            {/* Track Selector */}
            <div className="mb-4">
                <label htmlFor="track-selector" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Select a Track</label>
                <select
                    id="track-selector"
                    value={selectedTrackId}
                    onChange={(e) => setSelectedTrackId(e.target.value)}
                    className="w-full bg-gray-100 dark:bg-gray-800/50 border-2 border-gray-300 dark:border-gray-700 rounded-lg p-3 text-gray-800 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                    <option value="" disabled>-- Choose a track --</option>
                    {tracks.map(track => (
                        <option key={track.id} value={track.id}>{track.name}</option>
                    ))}
                </select>
            </div>
            
            <div className="border-t border-purple-300 dark:border-purple-500/20 my-2"></div>
            
            {/* Notes Section */}
            {selectedTrackId ? (
                <div className="flex flex-col flex-1 min-h-0">
                    <h3 className="font-semibold text-lg text-gray-800 dark:text-gray-200 mb-4 truncate">Notes for: <span className="font-bold text-purple-600 dark:text-purple-300">{selectedTrackName}</span></h3>
                    
                    {/* Note History */}
                    <div className="flex-1 overflow-y-auto pr-2 space-y-4 mb-4">
                        {trackNotes.length > 0 ? trackNotes.map(note => (
                            <div key={note.id} className="bg-gray-100 dark:bg-gray-800/50 p-4 rounded-lg">
                                <p className="text-gray-800 dark:text-gray-200 whitespace-pre-wrap">{note.text}</p>
                                <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400 mt-2 border-t border-gray-200 dark:border-gray-700 pt-2">
                                    <span className="flex items-center gap-1"><IconUser className="w-3 h-3"/> {note.author}</span>
                                    <span className="flex items-center gap-1"><IconClock className="w-3 h-3"/> {new Date(note.timestamp).toLocaleString()}</span>
                                </div>
                            </div>
                        )) : (
                            <div className="text-center py-10 text-gray-500">
                                <p>No notes for this track yet. Add one below!</p>
                            </div>
                        )}
                    </div>

                    {/* Add Note Form */}
                    <form onSubmit={handleAddNote} className="flex-shrink-0">
                        <textarea
                            value={noteText}
                            onChange={(e) => setNoteText(e.target.value)}
                            placeholder="Add a new note..."
                            rows={3}
                            className="w-full bg-gray-100 dark:bg-gray-800/50 border-2 border-gray-300 dark:border-gray-700 rounded-lg p-3 text-gray-800 dark:text-gray-300 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
                        />
                        <button type="submit" disabled={!noteText.trim()} className="mt-2 w-full bg-purple-600 hover:bg-purple-500 text-white font-bold py-2 px-4 rounded-lg transition-colors disabled:opacity-50">
                            Add Note
                        </button>
                    </form>
                </div>
            ) : (
                 <div className="flex-1 flex flex-col items-center justify-center text-center text-gray-500">
                    <IconMusic className="w-12 h-12 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold">Please select a track</h3>
                    <p>Choose a track from the dropdown to view or add notes.</p>
                </div>
            )}
        </div>
    );
};
