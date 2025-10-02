import React, { useState, useEffect } from 'react';
import { AppSettings, AIProvider } from '../types';
import { IconSettings, IconTrash } from './Icon';
import { PurgeSettingsView } from './PurgeSettingsView';

interface SettingsViewProps {
  settings: AppSettings;
  onUpdateSettings: (settings: AppSettings) => void;
}

const elevenLabsVoices = [
    { id: '21m00Tcm4TlvDq8ikWAM', name: 'Rachel (Calm, American)' },
    { id: 'AZnzlk1XvdvUeBnXmlld', name: 'Domi (Youthful, American)' },
    { id: 'EXAVITQu4vr4xnSDxMaL', name: 'Bella (Soft, American)' },
    { id: 'ErXwobaYiN019PkySvjV', name: 'Antoni (Well-spoken, British)' },
    { id: 'yoZ06aM1_IF52iSmNuok', name: 'Elli (Expressive, American)' },
];

export const SettingsView: React.FC<SettingsViewProps> = ({ settings, onUpdateSettings }) => {
  const [localLlmStatus, setLocalLlmStatus] = useState<'checking' | 'online' | 'offline' | 'disabled'>('checking');
  const [activeTab, setActiveTab] = useState<'general' | 'purge'>('general');
  const [isTestingConnection, setIsTestingConnection] = useState(false);

  // Check local LLM status
  useEffect(() => {
    const checkLocalLlm = async () => {
      if (!settings.localModel?.enabled) {
        setLocalLlmStatus('disabled');
        return;
      }
      
      try {
        // Use proxy endpoint to avoid CORS issues
        const response = await fetch('/api/local-llm/v1/models', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        });
        
        if (response.ok) {
          setLocalLlmStatus('online');
        } else {
          setLocalLlmStatus('offline');
        }
      } catch (error) {
        setLocalLlmStatus('offline');
      }
    };

    checkLocalLlm();
    // Check every 30 seconds
    const interval = setInterval(checkLocalLlm, 30000);
    return () => clearInterval(interval);
  }, [settings.localModel?.enabled, settings.localModel?.url]);

  const handleProviderChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onUpdateSettings({ ...settings, aiProvider: e.target.value as AIProvider });
  };
  
  const handleApiKeyChange = (provider: AIProvider.GEMINI | AIProvider.OPENAI | AIProvider.ANTHROPIC, value: string) => {
      onUpdateSettings({
          ...settings,
          apiKeys: {
              ...settings.apiKeys,
              [provider]: value
          }
      });
  };

  const handleToggleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onUpdateSettings({ ...settings, enableVoiceReplies: e.target.checked });
  };

  const handleElevenLabsKeyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onUpdateSettings({ ...settings, elevenLabsApiKey: e.target.value });
  };

  const handleThemeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onUpdateSettings({ ...settings, theme: e.target.value as 'light' | 'dark' });
  };

  const handleVoiceChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onUpdateSettings({ ...settings, elevenLabsVoiceId: e.target.value });
  };
  
  const handleIntervalChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = parseInt(e.target.value, 10);
      onUpdateSettings({ ...settings, reminderInterval: isNaN(value) ? 0 : value });
  };


  const testLocalConnection = async () => {
    setIsTestingConnection(true);
    setLocalLlmStatus('checking');
    
    try {
      // Use proxy endpoint to avoid CORS issues
      const response = await fetch('/api/local-llm/v1/models', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (response.ok) {
        setLocalLlmStatus('online');
      } else {
        setLocalLlmStatus('offline');
      }
    } catch (error) {
      setLocalLlmStatus('offline');
    } finally {
      setIsTestingConnection(false);
    }
  };

  const handleDataPurged = () => {
    // This will be called when data is purged to refresh the app
    window.location.reload();
  };

  return (
    <div className="bg-white/50 dark:bg-black/30 backdrop-blur-md border border-purple-300 dark:border-purple-500/20 rounded-2xl p-6 animate-fade-in">
      <h2 className="font-orbitron text-xl font-bold text-purple-600 dark:text-purple-300 flex items-center gap-3 mb-6">
        <IconSettings className="w-6 h-6" />
        Settings
      </h2>

      {/* Tab Navigation */}
      <div className="flex gap-2 mb-6 border-b border-gray-300 dark:border-gray-700">
        <button
          onClick={() => setActiveTab('general')}
          className={`px-4 py-2 font-semibold text-sm transition-colors ${
            activeTab === 'general'
              ? 'text-purple-600 dark:text-purple-300 border-b-2 border-purple-600 dark:border-purple-300'
              : 'text-gray-600 dark:text-gray-400 hover:text-purple-600 dark:hover:text-purple-300'
          }`}
        >
          General Settings
        </button>
        <button
          onClick={() => setActiveTab('purge')}
          className={`px-4 py-2 font-semibold text-sm transition-colors flex items-center gap-2 ${
            activeTab === 'purge'
              ? 'text-red-600 dark:text-red-300 border-b-2 border-red-600 dark:border-red-300'
              : 'text-gray-600 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-300'
          }`}
        >
          <IconTrash className="w-4 h-4" />
          Data Purge
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'general' && (
        <div className="space-y-8">

       {/* Appearance */}
      <div className="space-y-2">
        <label htmlFor="theme-selector" className="block font-semibold text-gray-800 dark:text-gray-300">
          Appearance
        </label>
        <p className="text-sm text-gray-500 dark:text-gray-500">Choose the application theme.</p>
        <select
          id="theme-selector"
          value={settings.theme}
          onChange={handleThemeChange}
          className="w-full sm:w-1/2 bg-gray-100 dark:bg-gray-800/50 border-2 border-gray-300 dark:border-gray-700 rounded-lg p-3 text-gray-800 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-purple-500"
        >
          <option value="dark">Dark</option>
          <option value="light">Light</option>
        </select>
      </div>

      {/* AI Model Selection */}
      <div className="space-y-4">
        <h3 className="font-semibold text-gray-800 dark:text-gray-300">AI Model Configuration</h3>
        <p className="text-sm text-gray-500 dark:text-gray-500">Choose between local and cloud-based AI models for the assistant.</p>
        
        {/* Two Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* Local Models Column */}
          <div className="space-y-4">
            <div className="border-2 border-purple-300 dark:border-purple-500/30 rounded-xl p-4 bg-gradient-to-br from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20">
              <h4 className="font-semibold text-gray-800 dark:text-gray-300 mb-3 flex items-center gap-2">
                <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                Local Models
              </h4>
              
              {/* Local Model Selection */}
              <div className="space-y-3">
                <label className="flex items-center space-x-3 cursor-pointer">
                  <input
                    type="radio"
                    name="aiProvider"
                    value={AIProvider.GEMMA}
                    checked={settings.aiProvider === AIProvider.GEMMA}
                    onChange={handleProviderChange}
                    className="w-4 h-4 text-purple-600 focus:ring-purple-500 focus:ring-2"
                  />
                  <div className="flex-1">
                    <span className="font-medium text-gray-800 dark:text-gray-300">Local Gemma</span>
                    <div className="flex items-center gap-2 mt-1">
                      <div className={`w-2 h-2 rounded-full ${
                        localLlmStatus === 'online' ? 'bg-green-500 animate-pulse' : 
                        localLlmStatus === 'offline' ? 'bg-red-500' : 
                        localLlmStatus === 'disabled' ? 'bg-gray-400' :
                        'bg-yellow-500 animate-pulse'
                      }`}></div>
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {localLlmStatus === 'online' ? 'Connected' : 
                         localLlmStatus === 'offline' ? 'Disconnected' : 
                         localLlmStatus === 'disabled' ? 'Disabled' :
                         'Checking...'}
                      </span>
                    </div>
                  </div>
                </label>
              </div>

              {/* Local Model Configuration */}
              {settings.aiProvider === AIProvider.GEMMA && (
                <div className="mt-4 space-y-3 p-3 bg-white/50 dark:bg-black/20 rounded-lg border border-purple-200 dark:border-purple-500/20">
                  <div>
                    <label htmlFor="local-model-url" className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                      Network Link (Server URL)
                    </label>
                    <input
                      type="text"
                      id="local-model-url"
                      placeholder="http://127.0.0.1:1234"
                      value={settings.localModel?.url || 'http://127.0.0.1:1234'}
                      onChange={(e) => onUpdateSettings({
                        ...settings,
                        localModel: {
                          ...settings.localModel,
                          url: e.target.value,
                          modelId: settings.localModel?.modelId || 'google/gemma-3n-e4b',
                          enabled: settings.localModel?.enabled || true
                        }
                      })}
                      className="w-full text-sm bg-gray-100 dark:bg-gray-800/50 border border-gray-300 dark:border-gray-700 rounded-md p-2 text-gray-800 dark:text-gray-300 focus:outline-none focus:ring-1 focus:ring-purple-500"
                    />
                  </div>
                  
                  <div>
                    <label htmlFor="local-model-id" className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                      Model Identifier
                    </label>
                    <input
                      type="text"
                      id="local-model-id"
                      placeholder="google/gemma-3n-e4b"
                      value={settings.localModel?.modelId || 'google/gemma-3n-e4b'}
                      onChange={(e) => onUpdateSettings({
                        ...settings,
                        localModel: {
                          ...settings.localModel,
                          url: settings.localModel?.url || 'http://127.0.0.1:1234',
                          modelId: e.target.value,
                          enabled: settings.localModel?.enabled || true
                        }
                      })}
                      className="w-full text-sm bg-gray-100 dark:bg-gray-800/50 border border-gray-300 dark:border-gray-700 rounded-md p-2 text-gray-800 dark:text-gray-300 focus:outline-none focus:ring-1 focus:ring-purple-500"
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      {localLlmStatus === 'online' && (
                        <div className="p-2 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-md">
                          <p className="text-xs text-green-700 dark:text-green-300 font-medium">✓ Local server connected</p>
                          <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                            Server is running and accessible at {settings.localModel?.url || 'http://127.0.0.1:1234'}
                          </p>
                        </div>
                      )}
                      
                      {localLlmStatus === 'offline' && settings.localModel?.enabled && (
                        <div className="p-2 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-700 rounded-md">
                          <p className="text-xs text-orange-700 dark:text-orange-300 font-medium">⚠️ Local server not reachable</p>
                          <p className="text-xs text-orange-600 dark:text-orange-400 mt-1">
                            Make sure your local LLM server is running and accessible.
                          </p>
                        </div>
                      )}
                      
                      {localLlmStatus === 'checking' && (
                        <div className="p-2 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-md">
                          <p className="text-xs text-blue-700 dark:text-blue-300 font-medium">🔄 Checking connection...</p>
                        </div>
                      )}
                    </div>
                    
                    <button
                      onClick={testLocalConnection}
                      disabled={isTestingConnection}
                      className="ml-3 px-3 py-1.5 bg-purple-600 hover:bg-purple-500 disabled:bg-gray-400 text-white text-xs font-medium rounded-md transition-colors flex items-center gap-1"
                    >
                      {isTestingConnection ? (
                        <>
                          <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          Testing...
                        </>
                      ) : (
                        <>
                          <span>🔄</span>
                          Test Connection
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Cloud Models Column */}
          <div className="space-y-4">
            <div className="border-2 border-blue-300 dark:border-blue-500/30 rounded-xl p-4 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20">
              <h4 className="font-semibold text-gray-800 dark:text-gray-300 mb-3 flex items-center gap-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                Cloud Models
              </h4>
              
              {/* Cloud Model Selection */}
              <div className="space-y-3">
                <label className="flex items-center space-x-3 cursor-pointer">
                  <input
                    type="radio"
                    name="aiProvider"
                    value={AIProvider.GEMINI}
                    checked={settings.aiProvider === AIProvider.GEMINI}
                    onChange={handleProviderChange}
                    className="w-4 h-4 text-blue-600 focus:ring-blue-500 focus:ring-2"
                  />
                  <span className="font-medium text-gray-800 dark:text-gray-300">Google Gemini</span>
                </label>
                
                <label className="flex items-center space-x-3 cursor-pointer">
                  <input
                    type="radio"
                    name="aiProvider"
                    value={AIProvider.OPENAI}
                    checked={settings.aiProvider === AIProvider.OPENAI}
                    onChange={handleProviderChange}
                    className="w-4 h-4 text-blue-600 focus:ring-blue-500 focus:ring-2"
                  />
                  <span className="font-medium text-gray-800 dark:text-gray-300">OpenAI</span>
                </label>
                
                <label className="flex items-center space-x-3 cursor-pointer">
                  <input
                    type="radio"
                    name="aiProvider"
                    value={AIProvider.ANTHROPIC}
                    checked={settings.aiProvider === AIProvider.ANTHROPIC}
                    onChange={handleProviderChange}
                    className="w-4 h-4 text-blue-600 focus:ring-blue-500 focus:ring-2"
                  />
                  <span className="font-medium text-gray-800 dark:text-gray-300">Anthropic</span>
                </label>
              </div>

              {/* API Key Configuration */}
              <div className="mt-4 space-y-3 p-3 bg-white/50 dark:bg-black/20 rounded-lg border border-blue-200 dark:border-blue-500/20">
                {settings.aiProvider === AIProvider.GEMINI && (
                  <div>
                    <label htmlFor="gemini-key" className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                      Google Gemini API Key
                    </label>
                    <input
                      type="password"
                      id="gemini-key"
                      placeholder="AIza..."
                      value={settings.apiKeys[AIProvider.GEMINI]}
                      onChange={(e) => handleApiKeyChange(AIProvider.GEMINI, e.target.value)}
                      className="w-full text-sm bg-gray-100 dark:bg-gray-800/50 border border-gray-300 dark:border-gray-700 rounded-md p-2 text-gray-800 dark:text-gray-300 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                    {settings.apiKeys[AIProvider.GEMINI] && (
                      <div className="mt-1 flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
                        <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                        Connected
                      </div>
                    )}
                  </div>
                )}
                
                {settings.aiProvider === AIProvider.OPENAI && (
                  <div>
                    <label htmlFor="openai-key" className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                      OpenAI API Key
                    </label>
                    <input
                      type="password"
                      id="openai-key"
                      placeholder="sk-..."
                      value={settings.apiKeys[AIProvider.OPENAI]}
                      onChange={(e) => handleApiKeyChange(AIProvider.OPENAI, e.target.value)}
                      className="w-full text-sm bg-gray-100 dark:bg-gray-800/50 border border-gray-300 dark:border-gray-700 rounded-md p-2 text-gray-800 dark:text-gray-300 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                    {settings.apiKeys[AIProvider.OPENAI] && (
                      <div className="mt-1 flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
                        <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                        Connected
                      </div>
                    )}
                  </div>
                )}
                
                {settings.aiProvider === AIProvider.ANTHROPIC && (
                  <div>
                    <label htmlFor="anthropic-key" className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                      Anthropic API Key
                    </label>
                    <input
                      type="password"
                      id="anthropic-key"
                      placeholder="sk-ant-..."
                      value={settings.apiKeys[AIProvider.ANTHROPIC]}
                      onChange={(e) => handleApiKeyChange(AIProvider.ANTHROPIC, e.target.value)}
                      className="w-full text-sm bg-gray-100 dark:bg-gray-800/50 border border-gray-300 dark:border-gray-700 rounded-md p-2 text-gray-800 dark:text-gray-300 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                    {settings.apiKeys[AIProvider.ANTHROPIC] && (
                      <div className="mt-1 flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
                        <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                        Connected
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Voice & Speech */}
      <div className="space-y-4">
         <h3 className="font-semibold text-gray-800 dark:text-gray-300">Voice & Speech</h3>
         <label htmlFor="voice-toggle" className="flex items-center justify-between cursor-pointer">
            <div>
                <p className="font-medium text-gray-800 dark:text-gray-300">Enable Voice Replies</p>
                <p className="text-sm text-gray-500 dark:text-gray-500">The assistant will speak its responses aloud.</p>
            </div>
            <div className="relative">
                <input
                    type="checkbox"
                    id="voice-toggle"
                    className="sr-only"
                    checked={settings.enableVoiceReplies}
                    onChange={handleToggleChange}
                />
                <div className={`block w-14 h-8 rounded-full ${settings.enableVoiceReplies ? 'bg-purple-600' : 'bg-gray-400 dark:bg-gray-600'}`}></div>
                <div className={`dot absolute left-1 top-1 bg-white w-6 h-6 rounded-full transition-transform ${settings.enableVoiceReplies ? 'transform translate-x-6' : ''}`}></div>
            </div>
         </label>
          <div className="pt-2 space-y-3">
            <div>
                <label htmlFor="elevenlabs-key" className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">ElevenLabs API Key</label>
                <input
                    type="password"
                    id="elevenlabs-key"
                    placeholder="Optional: For higher quality TTS"
                    value={settings.elevenLabsApiKey}
                    onChange={handleElevenLabsKeyChange}
                    className="w-full bg-gray-100 dark:bg-gray-800/50 border-2 border-gray-300 dark:border-gray-700 rounded-lg p-3 text-gray-800 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
            </div>
             <div>
                <label htmlFor="elevenlabs-voice" className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">ElevenLabs Voice</label>
                 <select
                    id="elevenlabs-voice"
                    value={settings.elevenLabsVoiceId}
                    onChange={handleVoiceChange}
                    disabled={!settings.elevenLabsApiKey}
                    className="w-full sm:w-1/2 bg-gray-100 dark:bg-gray-800/50 border-2 border-gray-300 dark:border-gray-700 rounded-lg p-3 text-gray-800 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-50"
                    >
                    {elevenLabsVoices.map(voice => (
                        <option key={voice.id} value={voice.id}>
                        {voice.name}
                        </option>
                    ))}
                </select>
            </div>
          </div>
      </div>

       {/* Reminders */}
      <div className="space-y-2">
        <label htmlFor="reminder-interval" className="block font-semibold text-gray-800 dark:text-gray-300">
          Reminders
        </label>
        <p className="text-sm text-gray-500 dark:text-gray-500">Set the frequency for automated task reminders. Set to 0 to disable.</p>
        <div className="relative w-full sm:w-1/2">
            <input
                type="number"
                id="reminder-interval"
                min="0"
                step="1"
                value={settings.reminderInterval}
                onChange={handleIntervalChange}
                className="w-full bg-gray-100 dark:bg-gray-800/50 border-2 border-gray-300 dark:border-gray-700 rounded-lg p-3 text-gray-800 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-purple-500 pr-20"
            />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500">minutes</span>
        </div>
      </div>
        </div>
      )}

      {activeTab === 'purge' && (
        <PurgeSettingsView onDataPurged={handleDataPurged} />
      )}
    </div>
  );
};