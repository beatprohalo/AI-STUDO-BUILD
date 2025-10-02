import React from 'react';

const App: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-100 text-gray-900 dark:bg-gray-900 dark:text-gray-200 p-8">
      <div className="max-w-4xl mx-auto">
        <header className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-4">🎵 Music Organizer Assistant</h1>
          <p className="text-lg text-gray-600 dark:text-gray-400">Debug Mode - Basic Load Test</p>
        </header>
        
        <main className="space-y-6">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-lg">
            <h2 className="text-2xl font-semibold mb-4">App Status</h2>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 bg-green-500 rounded-full"></span>
                <span>React is loading ✓</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 bg-green-500 rounded-full"></span>
                <span>Tailwind CSS is working ✓</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 bg-green-500 rounded-full"></span>
                <span>Dark mode classes detected ✓</span>
              </div>
            </div>
          </div>
          
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-lg">
            <h2 className="text-2xl font-semibold mb-4">Environment Info</h2>
            <div className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
              <p>User Agent: {navigator.userAgent}</p>
              <p>Viewport: {window.innerWidth} x {window.innerHeight}</p>
              <p>Current URL: {window.location.href}</p>
              <p>Tauri Detected: {typeof (window as any).__TAURI__ !== 'undefined' ? 'Yes' : 'No'}</p>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default App;