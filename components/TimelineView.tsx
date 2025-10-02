import React, { useState } from 'react';
import { ProjectEvent, ProjectEventType } from '../types';
import { IconCalendar, IconLoader, IconBrain, IconFlag, IconFileText as IconBrief, IconCheckCircle, IconBell } from './Icon';

interface TimelineViewProps {
    events: ProjectEvent[];
    onAddEvent: (event: Omit<ProjectEvent, 'id'>) => void;
    onSummarize: () => void;
    summary: string | null;
    isSummarizing: boolean;
    summaryError: string | null;
}

const eventTypeDetails: { [key in ProjectEventType]: { icon: React.ReactNode; color: string; label: string } } = {
    [ProjectEventType.RELEASE]: { icon: <IconFlag className="w-5 h-5 text-white" />, color: 'bg-green-500', label: 'Release' },
    [ProjectEventType.BRIEF]: { icon: <IconBrief className="w-5 h-5 text-white" />, color: 'bg-blue-500', label: 'Brief' },
    [ProjectEventType.TASK]: { icon: <IconCheckCircle className="w-5 h-5 text-white" />, color: 'bg-yellow-500', label: 'Task' },
    [ProjectEventType.REMINDER]: { icon: <IconBell className="w-5 h-5 text-white" />, color: 'bg-purple-500', label: 'Reminder' },
};

export const TimelineView: React.FC<TimelineViewProps> = ({ events, onAddEvent, onSummarize, summary, isSummarizing, summaryError }) => {
    const [title, setTitle] = useState('');
    const [date, setDate] = useState('');
    const [type, setType] = useState<ProjectEventType>(ProjectEventType.TASK);
    const [notes, setNotes] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!title || !date) return;
        onAddEvent({ title, date, type, notes });
        setTitle('');
        setDate('');
        setNotes('');
        setType(ProjectEventType.TASK);
    };

    const sortedEvents = [...events].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    return (
        <div className="animate-fade-in grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-140px)]">
            {/* Left Column: Form and AI Summary */}
            <div className="lg:col-span-1 flex flex-col gap-6">
                <div className="bg-white/50 dark:bg-black/30 backdrop-blur-md border border-purple-300 dark:border-purple-500/20 rounded-2xl p-6">
                    <h3 className="font-orbitron text-lg font-bold text-purple-600 dark:text-purple-300 mb-4">Add New Event</h3>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label htmlFor="event-title" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Title</label>
                            <input type="text" id="event-title" value={title} onChange={e => setTitle(e.target.value)} required className="mt-1 w-full bg-gray-100 dark:bg-gray-800/50 border-2 border-gray-300 dark:border-gray-700 rounded-lg p-2 text-gray-800 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-purple-500" />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label htmlFor="event-date" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Date</label>
                                <input type="date" id="event-date" value={date} onChange={e => setDate(e.target.value)} required className="mt-1 w-full bg-gray-100 dark:bg-gray-800/50 border-2 border-gray-300 dark:border-gray-700 rounded-lg p-2 text-gray-800 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-purple-500" />
                            </div>
                             <div>
                                <label htmlFor="event-type" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Type</label>
                                <select id="event-type" value={type} onChange={e => setType(e.target.value as ProjectEventType)} className="mt-1 w-full bg-gray-100 dark:bg-gray-800/50 border-2 border-gray-300 dark:border-gray-700 rounded-lg p-2 text-gray-800 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-purple-500">
                                    {Object.values(ProjectEventType).map(key => <option key={key} value={key} className="capitalize">{eventTypeDetails[key].label}</option>)}
                                </select>
                            </div>
                        </div>
                        <div>
                            <label htmlFor="event-notes" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Notes</label>
                            <textarea id="event-notes" value={notes} onChange={e => setNotes(e.target.value)} rows={3} className="mt-1 w-full bg-gray-100 dark:bg-gray-800/50 border-2 border-gray-300 dark:border-gray-700 rounded-lg p-2 text-gray-800 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-purple-500" />
                        </div>
                        <button type="submit" className="w-full bg-purple-600 hover:bg-purple-500 text-white font-bold py-2 px-4 rounded-lg transition-colors">Add Event</button>
                    </form>
                </div>

                <div className="bg-white/50 dark:bg-black/30 backdrop-blur-md border border-purple-300 dark:border-purple-500/20 rounded-2xl p-6">
                    <h3 className="font-orbitron text-lg font-bold text-purple-600 dark:text-purple-300 mb-2">AI Summary</h3>
                     <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">Get a quick overview of your upcoming deadlines and tasks.</p>
                    <button onClick={onSummarize} disabled={isSummarizing} className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-bold py-2 px-4 rounded-lg transition-colors duration-300 disabled:opacity-50">
                        {isSummarizing ? <IconLoader className="w-5 h-5 animate-spin" /> : <IconBrain className="w-5 h-5" />}
                        {isSummarizing ? 'Analyzing...' : 'Summarize Upcoming Events'}
                    </button>
                    {summaryError && <p className="mt-2 text-sm text-red-600 dark:text-red-400">Error: {summaryError}</p>}
                    {summary && (
                        <div className="mt-4 p-3 bg-gray-100 dark:bg-gray-800/50 rounded-lg text-sm text-gray-700 dark:text-gray-300 prose prose-sm dark:prose-invert max-w-none">
                           <p className="whitespace-pre-wrap">{summary}</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Right Column: Timeline */}
            <div className="lg:col-span-2 bg-white/50 dark:bg-black/30 backdrop-blur-md border border-purple-300 dark:border-purple-500/20 rounded-2xl p-6">
                <h2 className="font-orbitron text-xl font-bold text-purple-600 dark:text-purple-300 flex items-center gap-3 mb-4">
                    <IconCalendar className="w-6 h-6" />
                    Project Timeline
                </h2>
                <div className="overflow-y-auto h-[calc(100%-40px)] pr-4">
                   {sortedEvents.length > 0 ? (
                    <div className="relative pl-6 border-l-2 border-purple-200 dark:border-purple-500/20">
                        {sortedEvents.map(event => {
                            const details = eventTypeDetails[event.type];
                            const eventDate = new Date(event.date);
                            const isPast = eventDate < new Date();
                            return (
                                <div key={event.id} className={`relative mb-8 transition-opacity ${isPast ? 'opacity-50' : ''}`}>
                                    <div className={`absolute -left-[34px] top-1 w-8 h-8 rounded-full flex items-center justify-center ${details.color} border-4 border-gray-100 dark:border-gray-900`}>
                                        {details.icon}
                                    </div>
                                    <p className="text-sm font-semibold text-gray-500 dark:text-gray-400">
                                        {eventDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                                    </p>
                                    <h4 className="font-bold text-lg text-gray-800 dark:text-gray-200">{event.title}</h4>
                                    {event.notes && <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">{event.notes}</p>}
                                </div>
                            );
                        })}
                    </div>
                   ) : (
                    <div className="text-center py-16 text-gray-500 dark:text-gray-500">
                        <IconCalendar className="w-12 h-12 mx-auto mb-4" />
                        <h3 className="text-lg font-semibold">Timeline is empty</h3>
                        <p>Add an event to get started.</p>
                    </div>
                   )}
                </div>
            </div>
        </div>
    );
};
