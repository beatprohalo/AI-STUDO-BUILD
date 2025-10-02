import React from 'react';

const roadmapData = [
  {
    phase: "Phase 1 – Foundation",
    tasks: [
      { id: "001", title: "Initialize Project", completed: true, details: ["Set up the project with React and TypeScript.", "Create main process and renderer process.", "Confirm a blank window opens."] },
      { id: "002", title: "Add Basic UI Layout", completed: true, details: ["Create a sidebar and main content area.", "Add placeholder sections.", "Style with a dark mode default using Tailwind CSS."] },
      { id: "003", title: "Set Up Local Persistence", completed: true, details: ["Use browser localStorage instead of SQLite for simplicity.", "Create data structures for tracks.", "Confirm the app can add and read entries."] },
    ]
  },
  {
    phase: "Phase 2 – Organizer & Assistant",
    tasks: [
      { id: "004", title: "File Scanner", completed: true, details: ["Scan a chosen folder for `.wav`, `.mp3`, `.aiff`.", "Add scanned files to the catalog."] },
      { id: "005", title: "Metadata & Tagging UI", completed: true, details: ["Build an editor form for each track (tempo, genre, key, mood, notes).", "Save/update data in localStorage."] },
      { id: "006", title: "Task Checklist", completed: true, details: ["Add a built-in checklist: Mixed, Mastered, Tagged, Registered.", "Display a visual progress bar for each track."] },
      { id: "007", title: "Reminder System", completed: true, details: ["Implement local reminders via daily summary.", "Integrate Text-to-Speech (Web Speech API)."] },
    ]
  },
  {
    phase: "Phase 3 – Creative Engine",
    tasks: [
      { id: "008", title: "One-Click Idea Generator", completed: true, details: ["Add a button to generate a musical idea.", "Return a chord progression and melody as a downloadable MIDI file."] },
      { id: "009", title: "Voice Command Input", completed: true, details: ["Integrate SpeechRecognition (Web Speech API).", "Allow commands like “make trap at 140 bpm.”"] },
      { id: "010", title: "MIDI Upload & Learning", completed: true, details: ["Allow users to upload `.mid` files as context.", "Parse and use for inspiration."] },
      { id: "011", title: "Audio Analysis", completed: true, details: ["Accept audio input (up to 12 files).", "Use file context to inform generation."] },
    ]
  },
  {
    phase: "Phase 4 – Smart Features",
    tasks: [
      { id: "012", title: "Screen Info Mode", completed: false, details: ["Add a toggle button to “Read Briefs.”", "Highlight a browser window when active.", "Capture sample text and store it in the app."] },
      { id: "013", title: "Sync Matching AI", completed: false, details: ["Compare text briefs with track metadata.", "Suggest the best matches in the dashboard."] },
      { id: "014", title: "Daily Voice Assistant", completed: true, details: ["Have the app speak a daily summary: untagged tracks, etc."] },
    ]
  },
  {
    phase: "Phase 5 – Polish & Release",
    tasks: [
      { id: "015", title: "UI Polish", completed: false, details: ["Add light/dark mode.", "Improve dashboard visuals (more charts, filters)."] },
      { id: "016", title: "Packaging", completed: false, details: ["Use a tool like Electron Forge to package the app for distributions.", "Test on target machines."] },
      { id: "017", title: "Stretch Features", completed: false, details: ["Implement AI auto-tagging for genre and mood.", "Integrate a local-only ML model for brief matching.", "Add sync export to spreadsheets or DAWs."] },
    ]
  }
];

export const Roadmap: React.FC = () => {
    return (
        <div className="space-y-6 overflow-y-auto max-h-[calc(100vh-200px)] pr-2 animate-fade-in">
            <h2 className="font-orbitron text-xl font-bold text-purple-600 dark:text-purple-300">Development Roadmap</h2>
            <div className="relative space-y-8 pl-6 border-l-2 border-purple-300 dark:border-purple-500/20">
                {roadmapData.map((phaseData, phaseIndex) => (
                    <div key={phaseIndex} className="relative">
                        <div className="absolute -left-[34px] top-1 w-4 h-4 bg-purple-500 rounded-full border-4 border-gray-100 dark:border-gray-900"></div>
                        <h3 className="font-orbitron text-lg font-semibold text-purple-500 dark:text-purple-400 mb-4">{phaseData.phase}</h3>
                        <ul className="space-y-4">
                            {phaseData.tasks.map((task, taskIndex) => (
                                <li key={taskIndex} className={`transition-opacity ${task.completed ? 'opacity-60' : 'opacity-100'}`}>
                                    <h4 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                                        <span className={`text-xl ${task.completed ? 'text-green-500 dark:text-green-400' : 'text-gray-400 dark:text-gray-500'}`}>{task.completed ? '✅' : '⚪️'}</span>
                                        {task.id} – {task.title}
                                    </h4>
                                    <ul className="list-disc pl-10 mt-1 text-sm text-gray-600 dark:text-gray-400 space-y-1">
                                        {task.details.map((detail, detailIndex) => (
                                            <li key={detailIndex} className={task.completed ? 'line-through' : ''}>{detail}</li>
                                        ))}
                                    </ul>
                                </li>
                            ))}
                        </ul>
                    </div>
                ))}
            </div>
        </div>
    );
};