import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Track, MusicalIdea, ChatMessage, AppSettings, AIProvider, SyncMatchResult, Sample, Plugin, SmartSearchResult, ProjectEvent, ProjectEventType, Note } from './types';
import { Header } from './components/Header';
import { IconFolder, IconTag, IconKey, IconClock, IconMusic, IconCheckCircle, IconSearch, IconX, IconLayoutDashboard, IconBulb, IconClipboardCheck, IconList, IconLoader, IconMessageSquare, IconSettings, IconBrain, IconLink, IconFileText, IconCalendar, IconWand, IconEdit, IconSortAsc, IconBox, IconCpu, IconEye } from './components/Icon';
import { useTextToSpeech } from './hooks/useTextToSpeech';
import { generateMusicalIdea, createChatSession, findSyncMatches, smartSearchTracks, summarizeUpcomingEvents, autoTagTrack as autoTagTrackGemini, autoTagSample as autoTagSampleGemini } from './services/geminiService';
import { Dashboard } from './components/Dashboard';
import { LibraryView } from './components/LibraryView';
import { CreativeEngine } from './components/CreativeEngine';
import { Loader } from './components/Loader';
import { OutputDisplay } from './components/OutputDisplay';
import { Roadmap } from './components/Roadmap';
import { TasksView } from './components/TasksView';
import { AssistantView } from './components/AssistantView';
import { SettingsView } from './components/SettingsView';
import { SyncMatchView } from './components/SyncMatchView';
import { ExportView } from './components/ExportView';
import { SearchView } from './components/SearchView';
import { TimelineView } from './components/TimelineView';
import { AutoTaggerView } from './components/AutoTaggerView';
import { NotesView } from './components/NotesView';
import { Player } from './components/Player';
import { AutoSorterView } from './components/AutoSorterView';
import { ScreenInfoView } from './components/ScreenInfoView';
import { yieldToUI, processInBatches } from './utils/asyncUtils';
import { MemoryManager, createTrackWithMemoryManagement } from './utils/memoryUtils';
import { initDB, getTracks, addTracks, updateTrack, getNotes, addNote, addNotes, getSamples, addSamples, getPlugins, addPlugins, getProjectEvents, addProjectEvents, getAllDataForBackup, restoreDataFromBackup } from './services/dbService';
import { dataRetentionService } from './services/dataRetentionService';
import { exportToCSV, exportToJSON } from './services/exportService';
import { Chat } from '@google/genai';
import { sendMessageToOpenAI, findSyncMatches as findSyncMatchesOpenAI, autoTagTrack as autoTagTrackOpenAI, autoTagSample as autoTagSampleOpenAI } from './services/openaiService';
import { sendMessageToAnthropic, findSyncMatches as findSyncMatchesAnthropic, autoTagTrack as autoTagTrackAnthropic, autoTagSample as autoTagSampleAnthropic } from './services/anthropicService';
import { sendMessageToGemma, findSyncMatches as findSyncMatchesGemma, autoTagTrack as autoTagTrackGemma, autoTagSample as autoTagSampleGemma } from './services/gemmaService';
import { algorithmicTaggingService } from './services/algorithmicTaggingService';
import { BackupRestoreView } from './components/BackupRestoreView';
import { AIModelStudioView } from './components/AIModelStudioView';
import { MemoryMonitor } from './components/MemoryMonitor';

// Development state persistence for hot reloads
const DEV_STATE_KEY = 'aistudio_dev_state';

// State persistence utilities for development
const saveDevState = (state: any) => {
  if (process.env.NODE_ENV === 'development') {
    try {
      localStorage.setItem(DEV_STATE_KEY, JSON.stringify(state));
    } catch (error) {
      console.warn('Failed to save dev state:', error);
    }
  }
};

const loadDevState = () => {
  if (process.env.NODE_ENV === 'development') {
    try {
      const saved = localStorage.getItem(DEV_STATE_KEY);
      return saved ? JSON.parse(saved) : null;
    } catch (error) {
      console.warn('Failed to load dev state:', error);
      return null;
    }
  }
  return null;
};

// Check if we're running in a Tauri environment
const isTauri = () => {
  try {
    return typeof window !== 'undefined' && (window as any).__TAURI__ !== undefined;
  } catch {
    return false;
  }
};

// Tauri API functions with fallbacks for web environment
const saveFile = async (path: string, content: Uint8Array): Promise<void> => {
  if (isTauri()) {
    try {
      const { invoke } = await import('@tauri-apps/api/core');
      await invoke('save_file', { path, content });
    } catch (error) {
      console.warn('Tauri save_file not available:', error);
    }
  } else {
    console.warn('File save not available in web environment');
  }
};

const captureScreenshot = async (): Promise<string> => {
  if (isTauri()) {
    try {
      const { invoke } = await import('@tauri-apps/api/core');
      return await invoke('capture_screenshot');
    } catch (error) {
      console.warn('Tauri screenshot not available:', error);
      return '';
    }
  } else {
    console.warn('Screenshot not available in web environment');
    return '';
  }
};

const toBase64 = (file: File): Promise<string> => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string); // Return the full data URL
    reader.onerror = error => reject(error);
});

type View = 'dashboard' | 'library' | 'creative' | 'tasks' | 'roadmap' | 'assistant' | 'settings' | 'sync' | 'export' | 'search' | 'timeline' | 'auto-tagger' | 'notes' | 'auto-sorter' | 'backup-restore' | 'ai-model-studio' | 'screen-info';
type SaveStatus = 'idle' | 'saving' | 'saved';
type ExportStatus = { message: string; error: boolean } | null;
type PlaybackStatus = 'playing' | 'paused' | 'stopped';
type BackupRestoreStatus = { message: string; error: boolean } | null;


const App: React.FC = () => {
  // Load saved state in development for hot reloads
  const savedDevState = loadDevState();
  
  const [tracks, setTracks] = useState<Track[]>([]);
  const [selectedTrackId, setSelectedTrackId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true); // Start true for DB loading
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [musicalIdea, setMusicalIdea] = useState<MusicalIdea | null>(null);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [scanProgress, setScanProgress] = useState<string>('');
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [activeView, setActiveView] = useState<View>(savedDevState?.activeView || 'dashboard');
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
      { id: '1', role: 'assistant', text: 'Welcome to Music Organizer Assistant! 🎵\n\nTo get started with AI features, please:\n1. Click the ⚙️ Settings button\n2. Add your Gemini API key\n3. Come back here to chat!\n\nOnce configured, I can help you with music production, generate creative ideas, and much more!'}
  ]);
  const [isReplying, setIsReplying] = useState(false);
  const [settings, setSettings] = useState<AppSettings>({
      aiProvider: AIProvider.GEMINI,
      apiKeys: {
          [AIProvider.GEMINI]: '',
          [AIProvider.OPENAI]: '',
          [AIProvider.ANTHROPIC]: '',
      },
      elevenLabsApiKey: '',
      enableVoiceReplies: true,
      theme: 'dark',
      elevenLabsVoiceId: '21m00Tcm4TlvDq8ikWAM', // Default: Rachel
      reminderInterval: 10, // in minutes
      localModel: {
          url: 'http://127.0.0.1:1234',
          modelId: 'google/gemma-3n-e4b',
          enabled: false
      }
  });
  const [dailySummaryText, setDailySummaryText] = useState<string | null>(null);

  const [syncMatches, setSyncMatches] = useState<SyncMatchResult[] | null>(null);
  const [isMatching, setIsMatching] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  
  const [exportStatus, setExportStatus] = useState<ExportStatus>(null);
  const [isExporting, setIsExporting] = useState(false);
  
  const [samples, setSamples] = useState<Sample[]>([]);
  const [plugins, setPlugins] = useState<Plugin[]>([]);
  const [isSearchingAI, setIsSearchingAI] = useState(false);
  const [smartSearchResults, setSmartSearchResults] = useState<SmartSearchResult[] | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);
  
  const [projectEvents, setProjectEvents] = useState<ProjectEvent[]>([]);
  const [eventSummary, setEventSummary] = useState<string | null>(null);
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [summaryError, setSummaryError] = useState<string | null>(null);

  const [notes, setNotes] = useState<Note[]>([]);

  // Audio Player State
  const [currentlyPlaying, setCurrentlyPlaying] = useState<Track | Sample | null>(null);
  const [playbackStatus, setPlaybackStatus] = useState<PlaybackStatus>('stopped');
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Backup & Restore State
  const [isProcessingBackup, setIsProcessingBackup] = useState(false);
  const [backupStatus, setBackupStatus] = useState<BackupRestoreStatus>(null);
  const [restoreStatus, setRestoreStatus] = useState<BackupRestoreStatus>(null);
  const restoreInputRef = useRef<HTMLInputElement>(null);

  const chatRef = useRef<Chat | null>(null);

  const { isSpeaking, speak } = useTextToSpeech();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const saveTimeoutRef = useRef<number | null>(null);

  const loadAllDataFromDB = useCallback(async () => {
    try {
        const [dbTracks, dbNotes, dbSamples, dbPlugins, dbProjectEvents] = await Promise.all([
            getTracks(),
            getNotes(),
            getSamples(),
            getPlugins(),
            getProjectEvents()
        ]);
        setTracks(dbTracks);
        setNotes(dbNotes);
        setSamples(dbSamples);
        setPlugins(dbPlugins);
        setProjectEvents(dbProjectEvents);
    } catch (e) {
         console.error("Failed to load data from database", e);
         setError("Could not load saved data from the database.");
    }
  }, []);

  useEffect(() => {
    const initApp = async () => {
      try {
        await initDB();
        await loadAllDataFromDB();
        // Only initialize chat session if Gemini API key is provided
        if (settings.apiKeys[AIProvider.GEMINI]) {
          chatRef.current = createChatSession(settings.apiKeys[AIProvider.GEMINI]);
        }
      } catch (e) {
        console.error("Failed to initialize application", e);
        setError("Could not initialize the application database.");
      } finally {
        setIsLoading(false);
      }
    };
    initApp();

    return () => {
        if (saveTimeoutRef.current) {
            clearTimeout(saveTimeoutRef.current);
        }
        // Clean up memory on component unmount
        MemoryManager.cleanupAllURLs();
    }
  }, [loadAllDataFromDB]);

  // Persist activeView state during development hot reloads
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      saveDevState({ activeView });
    }
  }, [activeView]);

  useEffect(() => {
    if (settings.theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [settings.theme]);

  // Reinitialize chat session when Gemini API key changes
  useEffect(() => {
    if (settings.apiKeys[AIProvider.GEMINI]) {
      chatRef.current = createChatSession(settings.apiKeys[AIProvider.GEMINI]);
      // Update welcome message when API key is configured
      setChatMessages([
        { id: '1', role: 'assistant', text: 'Hello! 🎵 I\'m ready to help you with music production! Feel free to ask me anything about music, generate creative ideas, or attach an image for inspiration.' }
      ]);
    } else {
      chatRef.current = null;
      // Show setup message when no API key is configured
      setChatMessages([
        { id: '1', role: 'assistant', text: 'Welcome to Music Organizer Assistant! 🎵\n\nTo get started with AI features, please:\n1. Click the ⚙️ Settings button\n2. Add your Gemini API key\n3. Come back here to chat!\n\nOnce configured, I can help you with music production, generate creative ideas, and much more!' }
      ]);
    }
  }, [settings.apiKeys[AIProvider.GEMINI]]);

    const handleReminders = useCallback((isManualTrigger = false) => {
        if (isSpeaking) return;

        const unmixed = tracks.filter(t => !t.status.mixed).length;
        const unmastered = tracks.filter(t => !t.status.mastered).length;
        const untagged = tracks.filter(t => !t.status.tagged).length;
        const unregistered = tracks.filter(t => !t.status.registered).length;

        const totalUnfinished = unmixed + unmastered + untagged + unregistered;

        if (totalUnfinished === 0) {
            if (isManualTrigger) {
                speak("All tasks are complete. Good job!", settings.elevenLabsApiKey, settings.elevenLabsVoiceId);
            }
            return; // Be silent for automated check
        }

        let reminder = "Reminder: ";
        const parts: string[] = [];

        if (unmixed > 0) parts.push(`you have ${unmixed} unmixed ${unmixed === 1 ? 'track' : 'tracks'}`);
        if (unmastered > 0) parts.push(`${unmastered} unmastered ${unmastered === 1 ? 'track' : 'tracks'}`);
        if (untagged > 0) parts.push(`${untagged} untagged ${untagged === 1 ? 'track' : 'tracks'}`);
        if (unregistered > 0) parts.push(`${unregistered} unregistered ${unregistered === 1 ? 'track' : 'tracks'}`);
        
        reminder += parts.join(' and ') + ' requiring attention.';
        
        console.log(`[Task Reminder] ${reminder}`);
        speak(reminder, settings.elevenLabsApiKey, settings.elevenLabsVoiceId);

    }, [tracks, speak, isSpeaking, settings]);

    useEffect(() => {
        if (settings.reminderInterval > 0) {
            const interval = setInterval(() => handleReminders(false), settings.reminderInterval * 60 * 1000);
            return () => clearInterval(interval);
        }
    }, [handleReminders, settings.reminderInterval]);

  // Memory monitoring and cleanup
  useEffect(() => {
    const memoryCleanupInterval = setInterval(() => {
      MemoryManager.monitorMemoryUsage();
      // Auto-cleanup if memory usage is too high
      MemoryManager.autoCleanupIfNeeded();
      // Clean up unused URLs every 5 minutes
      MemoryManager.cleanupTracks(tracks);
    }, 2 * 60 * 1000); // 2 minutes (more frequent)

    return () => clearInterval(memoryCleanupInterval);
  }, [tracks]);

  const handleDirectoryChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setIsScanning(true);
    
    try {
      setScanProgress('Filtering audio files...');
      
      // Yield control to the UI
      await yieldToUI();
      
      const audioFiles = Array.from(files as FileList).filter((file: File) => /\.(wav|mp3|aiff)$/i.test(file.name));
      
      setScanProgress(`Processing ${audioFiles.length} files...`);
      
      // Process files in batches using utility function
      const newTracks = await processInBatches(
        audioFiles,
        50, // batch size
        async (batch) => {
          return batch.map((file: File) => createTrackWithMemoryManagement(file, {
            id: (file as any).webkitRelativePath || file.name,
            name: file.name,
            path: (file as any).webkitRelativePath || file.name,
            genre: '',
            mood: '',
            key: '',
            bpm: 120,
            notes: '',
            tags: [],
            status: { mixed: false, mastered: false, tagged: false, registered: false }
          }));
        },
        (processed, total) => {
          setScanProgress(`Processed ${processed} of ${total} files...`);
        }
      );

      setScanProgress('Checking for duplicates...');
      const existingTrackIds = new Set(tracks.map(t => t.id));
      const uniqueNewTracks = newTracks.flat().filter(t => !existingTrackIds.has(t.id));
      
      if (uniqueNewTracks.length > 0) {
          try {
              setScanProgress(`Adding ${uniqueNewTracks.length} tracks to database...`);
              
              // Process database operations in batches using utility function
              await processInBatches(
                uniqueNewTracks,
                100, // database batch size
                async (batch) => {
                  await addTracks(batch);
                },
                (processed, total) => {
                  setScanProgress(`Added ${processed} of ${total} tracks to database...`);
                }
              );
              
              const updatedTracks = [...tracks, ...uniqueNewTracks];
              setTracks(updatedTracks);
              
              // Retain scan results
              dataRetentionService.retainScanResult(
                'audio_scan',
                audioFiles,
                uniqueNewTracks.map(t => ({ id: t.id, name: t.name, path: t.path }))
              );
          } catch(e) {
              console.error("Failed to add tracks to database", e);
              setError("Could not save new tracks.");
          }
      }

      setScanProgress('Complete!');
    } catch (error) {
      console.error("Error processing files:", error);
      setError("Failed to process files.");
    } finally {
      setIsScanning(false);
      event.target.value = '';
    }
  };

  const handleUpdateTrack = async (updatedTrack: Track) => {
    if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
    }
    setSaveStatus('saving');
    try {
        await updateTrack(updatedTrack);
        setTracks(prevTracks => {
          const updatedTracks = prevTracks.map(t => t.id === updatedTrack.id ? updatedTrack : t);
          // Clean up unused URLs when tracks are updated
          MemoryManager.cleanupTracks(updatedTracks);
          return updatedTracks;
        });
        setSaveStatus('saved');
        saveTimeoutRef.current = window.setTimeout(() => {
            setSaveStatus('idle');
        }, 2000);
    } catch(e) {
        console.error("Failed to update track in database", e);
        setError("Could not save track update.");
        setSaveStatus('idle');
    }
  };

  const handleFilesScanned = async (scannedFiles: { name: string; path: string; file_type: string; size: number }[]) => {
    setIsScanning(true);
    
    try {
      // Step 1: Separate audio and MIDI files
      setScanProgress('Categorizing scanned files...');
      await yieldToUI();
      const audioFileInfos = scannedFiles.filter(f => f.file_type === 'audio');
      const midiFileInfos = scannedFiles.filter(f => f.file_type === 'midi');

      // Step 2: Process and add new tracks in batches
      if (audioFileInfos.length > 0) {
        const existingTrackIds = new Set(tracks.map(t => t.id));
        const uniqueNewAudioInfos = audioFileInfos.filter(info => !existingTrackIds.has(info.path));

        if (uniqueNewAudioInfos.length > 0) {
          const newTracks = await processInBatches(
            uniqueNewAudioInfos,
            50, // batch size for object creation
            async (batch) => batch.map(info => ({
              id: info.path,
              name: info.name,
              path: info.path,
              genre: '',
              mood: '',
              key: '',
              bpm: 120,
              notes: '',
              tags: [],
              status: { mixed: false, mastered: false, tagged: false, registered: false },
            })),
            (processed, total) => setScanProgress(`Creating track objects: ${processed}/${total}`)
          );

          await processInBatches(
            newTracks.flat(),
            100, // batch size for DB operations
            async (batch) => {
              await addTracks(batch);
              setTracks(prev => [...prev, ...batch]);
            },
            (processed, total) => setScanProgress(`Adding tracks to database: ${processed}/${total}`)
          );
        }
      }

      // Step 3: Process and add new samples in batches
      if (midiFileInfos.length > 0) {
        const existingSampleIds = new Set(samples.map(s => s.id));
        const uniqueNewMidiInfos = midiFileInfos.filter(info => !existingSampleIds.has(info.path));

        if (uniqueNewMidiInfos.length > 0) {
          const newSamples = await processInBatches(
            uniqueNewMidiInfos,
            50, // batch size for object creation
            async (batch) => batch.map(info => ({
              id: info.path,
              name: info.name,
              path: info.path,
              tags: [],
            })),
            (processed, total) => setScanProgress(`Creating sample objects: ${processed}/${total}`)
          );

          await processInBatches(
            newSamples.flat(),
            100, // batch size for DB operations
            async (batch) => {
              await addSamples(batch);
              setSamples(prev => [...prev, ...batch]);
            },
            (processed, total) => setScanProgress(`Adding samples to database: ${processed}/${total}`)
          );
        }
      }

      // Step 4: Retain scan results
      setScanProgress('Finalizing scan...');
      await yieldToUI();
      const allNewItems = [...audioFileInfos, ...midiFileInfos].map(item => ({ id: item.path, name: item.name, path: item.path }));
      dataRetentionService.retainScanResult('folder_scan', scannedFiles, allNewItems);

      setScanProgress('Complete!');

    } catch (e) {
      console.error("Failed to process scanned files", e);
      setError("Could not process scanned files.");
    } finally {
      // Add a small delay before hiding the loader to show the "Complete!" message
      setTimeout(() => setIsScanning(false), 500);
    }
  };
  
  const handleDailySummary = () => {
    const untagged = tracks.filter(t => !t.status.tagged).length;
    const unmixed = tracks.filter(t => !t.status.mixed).length;
    const total = tracks.length;

    let summary: string;

    if (total === 0) {
      summary = "Your catalog is empty. Scan a folder to get started.";
    } else {
        summary = `Good morning. You have ${total} ${total === 1 ? 'track' : 'tracks'} in your catalog. `;
        const pendingTasks: string[] = [];
        if (untagged > 0) {
            pendingTasks.push(`${untagged} untagged ${untagged === 1 ? 'track' : 'tracks'}`);
        }
        if (unmixed > 0) {
            pendingTasks.push(`${unmixed} ${unmixed === 1 ? 'track is' : 'tracks are'} unmixed`);
        }
        
        if (pendingTasks.length > 0) {
            summary += `You have ${pendingTasks.join(' and ')} that need attention.`;
        } else {
            summary += "All tasks are complete. Great job!";
        }
    }
    
    setDailySummaryText(summary);
    speak(summary, settings.elevenLabsApiKey, settings.elevenLabsVoiceId);
  };
  
  const handleGenerateIdea = async (prompt: string, files: File[]) => {
    setIsGenerating(true);
    setMusicalIdea(null);
    setError(null);

    const midiFile = files.find(f => f.name.endsWith('.mid') || f.name.endsWith('.midi'));
    const audioFiles = files.filter(f => /\.(wav|mp3|aiff)$/i.test(f.name));

    let midiBase64: string | null = null;
    if (midiFile) {
        try {
             const result = await toBase64(midiFile);
             midiBase64 = result.split(',')[1];
        } catch (e) {
            setError("Could not read MIDI file.");
            setIsGenerating(false);
            return;
        }
    }
    
    const fileContext = {
        midi: midiFile ? midiFile.name : null,
        audio: audioFiles.map(f => f.name),
    };

    try {
        const idea = await generateMusicalIdea(prompt, fileContext, midiBase64, settings.apiKeys[AIProvider.GEMINI]);
        
        let savedIdea = idea;
        if (idea.midiBase64) {
             try {
                const filename = `idea_${Date.now()}.mid`;
                
                const byteCharacters = atob(idea.midiBase64);
                const byteNumbers = new Array(byteCharacters.length);
                for (let i = 0; i < byteCharacters.length; i++) {
                    byteNumbers[i] = byteCharacters.charCodeAt(i);
                }
                const byteArray = new Uint8Array(byteNumbers);

                await saveFile(filename, byteArray);
                
                savedIdea = { ...idea, savedFilePath: filename };
                console.log(`MIDI file saved successfully to ${filename}`);

            } catch (saveError) {
                console.error("Failed to save MIDI file automatically:", saveError);
                setError("Idea generated, but failed to save file automatically. You can still download it manually.");
            }
        }

        setMusicalIdea(savedIdea);
    } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
        console.error(errorMessage);
        setError(`Failed to generate idea. ${errorMessage}`);
    } finally {
        setIsGenerating(false);
    }
  };

  const handleSendMessage = async (text: string, images: { type: string, data: string }[]) => {
    if (!text && images.length === 0) return;
    
    const newUserMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      text,
      images: images.map(img => `data:${img.type};base64,${img.data}`),
    };
    setChatMessages(prev => [...prev, newUserMessage]);
    setIsReplying(true);

    try {
        let responseText = '';

        switch (settings.aiProvider) {
            case AIProvider.GEMINI:
                if (!settings.apiKeys[AIProvider.GEMINI]) {
                    responseText = "🔑 Gemini API key is missing. Please add it in the ⚙️ Settings view to enable AI assistance.";
                    break;
                }
                if (!chatRef.current) {
                    chatRef.current = createChatSession(settings.apiKeys[AIProvider.GEMINI]);
                }
                if (!chatRef.current) {
                    responseText = "❌ Failed to initialize chat session. Please check your API key.";
                    break;
                }
                const parts: any[] = [{ text }];
                images.forEach(image => {
                    parts.push({
                        inlineData: {
                            mimeType: image.type,
                            data: image.data,
                        }
                    });
                });
                const result = await chatRef.current.sendMessage(parts);
                responseText = result.response.text();
                break;
            
            case AIProvider.OPENAI:
                responseText = await sendMessageToOpenAI(text, settings.apiKeys[AIProvider.OPENAI]);
                break;
            
            case AIProvider.ANTHROPIC:
                responseText = await sendMessageToAnthropic(text, settings.apiKeys[AIProvider.ANTHROPIC]);
                break;
            
            case AIProvider.NANO_BANANA:
                await new Promise(resolve => setTimeout(resolve, 500)); // Simulate local processing
                responseText = `🍌 Nano Banana activated! You said: "${text}". I'm the fun, local model!`;
                break;
            
            case AIProvider.GEMMA:
                responseText = await sendMessageToGemma(text, settings.localModel);
                break;

            default:
                throw new Error(`Unsupported AI provider: ${settings.aiProvider}`);
        }
        
        const newAssistantMessage: ChatMessage = {
            id: (Date.now() + 1).toString(),
            role: 'assistant',
            text: responseText,
        };
        setChatMessages(prev => [...prev, newAssistantMessage]);
        
        if (settings.enableVoiceReplies) {
            speak(responseText, settings.elevenLabsApiKey, settings.elevenLabsVoiceId);
        }

    } catch(err) {
        const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
        const newErrorMessage: ChatMessage = {
            id: (Date.now() + 1).toString(),
            role: 'assistant',
            text: `Sorry, I encountered an error: ${errorMessage}`,
        };
        setChatMessages(prev => [...prev, newErrorMessage]);
    } finally {
        setIsReplying(false);
    }
  };

  const handleAutoAnalyze = async (trackToAnalyze: Track) => {
    if (!trackToAnalyze) return;
    setIsAnalyzing(true);

    await new Promise(resolve => setTimeout(resolve, 2500));

    const mockAnalysis = {
        bpm: Math.floor(Math.random() * 70) + 90,
        key: ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'][Math.floor(Math.random() * 12)] + (Math.random() > 0.5 ? ' major' : ' minor'),
    };

    const updatedTrack = {
        ...trackToAnalyze,
        bpm: mockAnalysis.bpm,
        key: mockAnalysis.key,
        notes: (trackToAnalyze.notes ? trackToAnalyze.notes + '\n\n' : '') + `Auto-analyzed on ${new Date().toLocaleDateString()}: BPM set to ${mockAnalysis.bpm}, Key set to ${mockAnalysis.key}.`
    };

    // Retain ML analysis data
    dataRetentionService.retainMLAnalysis(
      'track_analysis',
      { trackId: trackToAnalyze.id, trackName: trackToAnalyze.name },
      mockAnalysis,
      'algorithmic_analyzer',
      0.85
    );

    await handleUpdateTrack(updatedTrack);

    setIsAnalyzing(false);
  };
  
  const handleFindSyncMatches = async (brief: string) => {
    setIsMatching(true);
    setSyncMatches(null);
    setSyncError(null);
    try {
        let matches: SyncMatchResult[] = [];
        switch (settings.aiProvider) {
            case AIProvider.GEMINI:
                matches = await findSyncMatches(brief, tracks, settings.apiKeys[AIProvider.GEMINI]);
                break;
            case AIProvider.OPENAI:
                matches = await findSyncMatchesOpenAI(brief, tracks, settings.apiKeys[AIProvider.OPENAI]);
                break;
            case AIProvider.ANTHROPIC:
                matches = await findSyncMatchesAnthropic(brief, tracks, settings.apiKeys[AIProvider.ANTHROPIC]);
                break;
            case AIProvider.NANO_BANANA:
                 await new Promise(resolve => setTimeout(resolve, 1500));
                 const mockTrack = tracks[0] || { id: 'mock/path.wav', name: 'Example Track' };
                 matches = [{ trackId: mockTrack.id, trackName: mockTrack.name, reasoning: 'Nano Banana mock response: This track feels... banan-a-peel-ing for your brief!' }];
                 break;
            case AIProvider.GEMMA:
                matches = await findSyncMatchesGemma(brief, tracks, settings.localModel);
                break;
            default:
                throw new Error(`Unsupported AI provider: ${settings.aiProvider}`);
        }
        setSyncMatches(matches);
        
        // Retain sync match analysis
        dataRetentionService.retainMLAnalysis(
          'sync_matching',
          { brief, trackCount: tracks.length },
          matches,
          settings.aiProvider,
          0.9
        );
    } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
        setSyncError(errorMessage);
    } finally {
        setIsMatching(false);
    }
  };

  const handleRefreshData = useCallback(async () => {
    setIsRefreshing(true);
    await loadAllDataFromDB();
    setIsRefreshing(false);
  }, [loadAllDataFromDB]);

  const handleExport = async (format: 'csv' | 'xlsx' | 'json') => {
    setIsExporting(true);
    setExportStatus(null);
    try {
        let contentString: string;
        let filename: string;
        
        if (format === 'csv' || format === 'xlsx') {
            contentString = exportToCSV(tracks);
            filename = `catalog_export.${format}`;
        } else {
            contentString = exportToJSON(tracks);
            filename = 'catalog_export.json';
        }

        const contentBytes = new TextEncoder().encode(contentString);
        await saveFile(filename, contentBytes);
        setExportStatus({ message: `Successfully exported to ${filename}`, error: false });

    } catch (err) {
        console.error('Export failed:', err);
        const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
        setExportStatus({ message: `Failed to save file: ${errorMessage}`, error: true });
    } finally {
        setIsExporting(false);
    }
  };

  const handleSmartSearch = async (query: string) => {
    setIsSearchingAI(true);
    setSmartSearchResults(null);
    setSearchError(null);
    try {
        const results = await smartSearchTracks(query, tracks, settings.apiKeys[AIProvider.GEMINI]);
        setSmartSearchResults(results);
    } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred during smart search.';
        setSearchError(errorMessage);
    } finally {
        setIsSearchingAI(false);
    }
  };
  
  const handleAddProjectEvent = async (event: Omit<ProjectEvent, 'id'>) => {
    const newEvent: ProjectEvent = {
      ...event,
      id: `evt_${Date.now()}`,
    };
    await addProjectEvents([newEvent]);
    setProjectEvents(prev => [...prev, newEvent].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()));
  };

  const handleSummarizeEvents = async () => {
    setIsSummarizing(true);
    setEventSummary(null);
    setSummaryError(null);
    try {
      const summary = await summarizeUpcomingEvents(projectEvents, settings.apiKeys[AIProvider.GEMINI]);
      setEventSummary(summary);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
      setSummaryError(errorMessage);
    } finally {
      setIsSummarizing(false);
    }
  };

  const handleAutoTagFile = async (file: File): Promise<{ file: File; data: Partial<Track> | { tags: string[] } }> => {
    const isTrack = /\.(wav|mp3|aiff)$/i.test(file.name);
    
    let resultData;

    try {
        if (isTrack) {
            let trackData: Partial<Track>;
            
            // Use algorithmic tagging instead of LLM-based tagging
            trackData = await algorithmicTaggingService.autoTagTrack(file);
            
            const newTrack: Track = createTrackWithMemoryManagement(file, {
                id: file.name,
                name: file.name,
                path: file.name,
                genre: trackData.genre || '',
                mood: trackData.mood || '',
                key: trackData.key || '',
                bpm: trackData.bpm || 120,
                notes: `Auto-tagged on ${new Date().toLocaleDateString()}`,
                status: { mixed: false, mastered: false, tagged: true, registered: false },
                tags: trackData.tags || []
            });
            await addTracks([newTrack]);
            setTracks(prev => [...prev, newTrack]);
            resultData = newTrack;

        } else { // It's a sample
            // Use algorithmic tagging instead of LLM-based tagging
            const sampleTags = await algorithmicTaggingService.autoTagSample(file);
            const newSample: Sample = {
                id: `smpl_${Date.now()}`,
                name: file.name,
                path: file.name,
                tags: sampleTags,
                url: MemoryManager.createTrackedURL(file),
            };
            await addSamples([newSample]);
            setSamples(prev => [...prev, newSample]);
            resultData = { tags: sampleTags };
        }
        return { file, data: resultData };

    } catch (error) {
        console.error(`Failed to auto-tag file ${file.name}:`, error);
        throw error;
    }
  };

  const handleAddNote = async (trackId: string, text: string) => {
    const newNote: Note = {
      id: `note_${Date.now()}`,
      trackId,
      text,
      author: 'Me',
      timestamp: new Date().toISOString(),
    };
    try {
      await addNote(newNote);
      setNotes(prev => [...prev, newNote]);
    } catch (e) {
      console.error("Failed to add note", e);
      setError("Could not save the new note.");
    }
  };

  const handlePlayRequest = (item: Track | Sample) => {
    if (currentlyPlaying?.id === item.id) {
        if (playbackStatus === 'playing') {
            audioRef.current?.pause();
            setPlaybackStatus('paused');
        } else {
            audioRef.current?.play();
            setPlaybackStatus('playing');
        }
    } else {
        if (audioRef.current) {
            audioRef.current.pause();
        }
        setCurrentlyPlaying(item);
        const audio = new Audio(item.url);
        audioRef.current = audio;
        
        audio.addEventListener('loadedmetadata', () => {
            setDuration(audio.duration);
        });
        audio.addEventListener('timeupdate', () => {
            setCurrentTime(audio.currentTime);
        });
        audio.addEventListener('ended', () => {
            setPlaybackStatus('stopped');
            setCurrentlyPlaying(null);
            setCurrentTime(0);
        });
        
        audio.play();
        setPlaybackStatus('playing');
    }
  };

  const handleStop = () => {
    if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
    }
    setPlaybackStatus('stopped');
    setCurrentlyPlaying(null);
    setCurrentTime(0);
  };

  const handleSeek = (time: number) => {
      if (audioRef.current) {
          audioRef.current.currentTime = time;
          setCurrentTime(time);
      }
  };

  const handleBackup = async () => {
    setIsProcessingBackup(true);
    setBackupStatus(null);
    try {
        const allData = await getAllDataForBackup();
        const jsonString = JSON.stringify(allData, null, 2);
        const contentBytes = new TextEncoder().encode(jsonString);
        const filename = `music_organizer_backup_${Date.now()}.json`;
        
        await saveFile(filename, contentBytes);
        setBackupStatus({ message: `Backup saved to ${filename}`, error: false });
    } catch (err) {
        const message = err instanceof Error ? err.message : 'An unknown error occurred.';
        setBackupStatus({ message: `Backup failed: ${message}`, error: true });
    } finally {
        setIsProcessingBackup(false);
    }
  };

  const handleRestoreRequest = () => {
    restoreInputRef.current?.click();
  };

  const handleRestore = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsProcessingBackup(true);
    setRestoreStatus(null);
    try {
        const content = await file.text();
        const data = JSON.parse(content);

        // Basic validation
        if (!data.tracks || !data.notes) {
            throw new Error("Invalid or corrupted backup file.");
        }

        await restoreDataFromBackup(data);
        await handleRefreshData(); // Reload all data from DB to update UI
        setRestoreStatus({ message: 'Successfully restored data from backup.', error: false });

    } catch (err) {
        const message = err instanceof Error ? err.message : 'An unknown error occurred.';
        setRestoreStatus({ message: `Restore failed: ${message}`, error: true });
    } finally {
        setIsProcessingBackup(false);
        if (event.target) event.target.value = ''; // Reset file input
    }
  };

  const renderView = () => {
    if (isLoading && !isRefreshing) {
      return (
        <div className="flex flex-col items-center justify-center h-full text-center text-gray-500 dark:text-gray-400">
          <IconLoader className="w-16 h-16 mb-4 animate-spin text-purple-500 dark:text-purple-400"/>
          <h3 className="text-xl font-bold font-orbitron text-gray-700 dark:text-gray-300">Initializing Database...</h3>
          <p>Getting your studio ready.</p>
        </div>
      );
    }
      
    switch (activeView) {
        case 'dashboard':
            return (
                <Dashboard 
                    tracks={tracks}
                    summaryText={dailySummaryText}
                    onPlaySummary={handleDailySummary}
                    onCheckReminders={() => handleReminders(true)}
                    isSpeaking={isSpeaking}
                    onRefresh={handleRefreshData}
                    isRefreshing={isRefreshing}
                />
            );
        case 'search':
            return (
                <SearchView
                    tracks={tracks}
                    samples={samples}
                    plugins={plugins}
                    onSmartSearch={handleSmartSearch}
                    isSearchingAI={isSearchingAI}
                    smartSearchResults={smartSearchResults}
                    searchError={searchError}
                    onPlayRequest={handlePlayRequest}
                    currentlyPlaying={currentlyPlaying}
                    playbackStatus={playbackStatus}
                />
            );
        case 'library':
            return (
                <LibraryView
                    tracks={tracks}
                    selectedTrackId={selectedTrackId}
                    searchTerm={searchTerm}
                    isScanning={isScanning}
                    isAnalyzing={isAnalyzing}
                    saveStatus={saveStatus}
                    onSearchTermChange={setSearchTerm}
                    onDirectoryChange={handleDirectoryChange}
                    onSelectTrack={setSelectedTrackId}
                    onDeselectTrack={() => setSelectedTrackId(null)}
                    onUpdateTrack={handleUpdateTrack}
                    onAutoAnalyze={handleAutoAnalyze}
                />
            );
        case 'creative':
            return (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-fade-in">
                    <div className="lg:col-span-4 h-fit">
                        <div className="bg-white/50 dark:bg-black/30 backdrop-blur-md border border-purple-300 dark:border-purple-500/20 rounded-2xl p-6 space-y-4">
                            <CreativeEngine onGenerate={handleGenerateIdea} isLoading={isGenerating} />
                        </div>
                    </div>
                    <div className="lg:col-span-8">
                        {isGenerating && <div className="flex items-center justify-center h-full"><Loader /></div>}
                        {musicalIdea && !isGenerating && <OutputDisplay idea={musicalIdea} onClose={() => setMusicalIdea(null)} />}
                        {!isGenerating && !musicalIdea && (
                            <div className="flex flex-col items-center justify-center h-full text-center text-gray-600 dark:text-gray-500 bg-gray-100/30 dark:bg-black/20 rounded-2xl p-8 border border-purple-300/20 dark:border-purple-500/10">
                                <IconBulb className="w-16 h-16 mb-4 text-purple-500/50 dark:text-purple-600/50"/>
                                <h3 className="text-xl font-bold font-orbitron text-gray-800 dark:text-gray-300">Creative Hub</h3>
                                <p>Generate a new musical idea using the controls.</p>
                            </div>
                        )}
                    </div>
                </div>
            );
        case 'ai-model-studio':
            return <AIModelStudioView settings={settings} />;
        case 'screen-info':
            return <ScreenInfoView onBriefCaptured={(brief) => handleFindSyncMatches(brief)} />;
        case 'tasks':
            return <TasksView tracks={tracks} onUpdateTrack={handleUpdateTrack} saveStatus={saveStatus} />;
        case 'notes':
            return <NotesView tracks={tracks} notes={notes} onAddNote={handleAddNote} />;
        case 'timeline':
            return (
                <TimelineView
                    events={projectEvents}
                    onAddEvent={handleAddProjectEvent}
                    onSummarize={handleSummarizeEvents}
                    summary={eventSummary}
                    isSummarizing={isSummarizing}
                    summaryError={summaryError}
                />
            );
        case 'auto-tagger':
            return <AutoTaggerView onTagFile={handleAutoTagFile} />;
        case 'auto-sorter':
            return <AutoSorterView tracks={tracks} samples={samples} onFilesScanned={handleFilesScanned} />;
        case 'roadmap':
             return <div className="bg-white/50 dark:bg-black/30 backdrop-blur-md border border-purple-300 dark:border-purple-500/20 rounded-2xl p-6 animate-fade-in"><Roadmap /></div>;
        case 'assistant':
             return <AssistantView messages={chatMessages} onSendMessage={handleSendMessage} isReplying={isReplying} />;
        case 'sync':
            return <SyncMatchView tracks={tracks} matches={syncMatches} isMatching={isMatching} error={syncError} onFindMatches={handleFindSyncMatches} />;
        case 'settings':
            return <SettingsView settings={settings} onUpdateSettings={setSettings} />;
        case 'export':
            return <ExportView onExport={handleExport} isExporting={isExporting} exportStatus={exportStatus} />;
        case 'backup-restore':
            return (
                <BackupRestoreView
                    onBackup={handleBackup}
                    onRestore={handleRestoreRequest}
                    isProcessing={isProcessingBackup}
                    backupStatus={backupStatus}
                    restoreStatus={restoreStatus}
                />
            );
        default:
            return null;
    }
  }


  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-100 via-purple-500/10 to-gray-100 dark:from-gray-900 dark:via-purple-900/10 dark:to-gray-900 flex flex-col p-4 selection:bg-purple-500 selection:text-white">
      <Header />
      <div className="flex-grow grid grid-cols-1 lg:grid-cols-12 gap-6 w-full max-w-7xl mx-auto mt-4">

        {/* --- Sidebar --- */}
        <aside className="lg:col-span-2 bg-white/50 dark:bg-black/30 backdrop-blur-md border border-purple-300 dark:border-purple-500/20 rounded-2xl p-4 flex flex-col gap-2 h-fit">
            <NavButton label="Dashboard" icon={<IconLayoutDashboard className="w-5 h-5" />} isActive={activeView === 'dashboard'} onClick={() => setActiveView('dashboard')} />
            <NavButton label="Search" icon={<IconSearch className="w-5 h-5" />} isActive={activeView === 'search'} onClick={() => setActiveView('search')} />
            <NavButton label="Assistant" icon={<IconMessageSquare className="w-5 h-5" />} isActive={activeView === 'assistant'} onClick={() => setActiveView('assistant')} />
            <div className="border-t border-purple-300 dark:border-purple-500/20 my-2"></div>
            <NavButton label="Creative" icon={<IconBulb className="w-5 h-5" />} isActive={activeView === 'creative'} onClick={() => setActiveView('creative')} />
            <NavButton label="AI Model Studio" icon={<IconCpu className="w-5 h-5" />} isActive={activeView === 'ai-model-studio'} onClick={() => setActiveView('ai-model-studio')} />
            <NavButton label="Auto-Tagger" icon={<IconWand className="w-5 h-5" />} isActive={activeView === 'auto-tagger'} onClick={() => setActiveView('auto-tagger')} />
            <NavButton label="Auto-Sorter" icon={<IconSortAsc className="w-5 h-5" />} isActive={activeView === 'auto-sorter'} onClick={() => setActiveView('auto-sorter')} />
            <NavButton label="Screen Info" icon={<IconEye className="w-5 h-5" />} isActive={activeView === 'screen-info'} onClick={() => setActiveView('screen-info')} />
            <NavButton label="Sync Match" icon={<IconLink className="w-5 h-5" />} isActive={activeView === 'sync'} onClick={() => setActiveView('sync')} />
            <div className="border-t border-purple-300 dark:border-purple-500/20 my-2"></div>
            <NavButton label="Library" icon={<IconMusic className="w-5 h-5" />} isActive={activeView === 'library'} onClick={() => setActiveView('library')} />
            <NavButton label="Tasks" icon={<IconClipboardCheck className="w-5 h-5" />} isActive={activeView === 'tasks'} onClick={() => setActiveView('tasks')} />
            <NavButton label="Notes" icon={<IconEdit className="w-5 h-5" />} isActive={activeView === 'notes'} onClick={() => setActiveView('notes')} />
            <NavButton label="Timeline" icon={<IconCalendar className="w-5 h-5" />} isActive={activeView === 'timeline'} onClick={() => setActiveView('timeline')} />
            <NavButton label="Export" icon={<IconFileText className="w-5 h-5" />} isActive={activeView === 'export'} onClick={() => setActiveView('export')} />
            <NavButton label="Backup/Restore" icon={<IconBox className="w-5 h-5" />} isActive={activeView === 'backup-restore'} onClick={() => setActiveView('backup-restore')} />
            <div className="border-t border-purple-300 dark:border-purple-500/20 my-2"></div>
            <NavButton label="Settings" icon={<IconSettings className="w-5 h-5" />} isActive={activeView === 'settings'} onClick={() => setActiveView('settings')} />
            <NavButton label="Roadmap" icon={<IconList className="w-5 h-5" />} isActive={activeView === 'roadmap'} onClick={() => setActiveView('roadmap')} />
        </aside>

        {/* --- Main Content --- */}
        <main className="lg:col-span-10">
          {renderView()}
        </main>
        
        {/* Global Loading Overlay for File Scanning */}
        {isScanning && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 max-w-md mx-4 text-center">
              <Loader />
              <p className="mt-4 text-gray-600 dark:text-gray-300">
                {scanProgress || 'Processing audio and MIDI files...'}
              </p>
            </div>
          </div>
        )}
      </div>
      <Player
        track={currentlyPlaying}
        status={playbackStatus}
        currentTime={currentTime}
        duration={duration}
        onPlayPause={() => handlePlayRequest(currentlyPlaying!)}
        onStop={handleStop}
        onSeek={handleSeek}
      />
      <input type="file" ref={restoreInputRef} onChange={handleRestore} accept=".json" className="hidden" />
      <MemoryMonitor />
    </div>
  );
};

// Sub-components for cleaner JSX
const NavButton: React.FC<{label: string, icon: React.ReactNode, isActive: boolean, onClick: () => void}> = ({ label, icon, isActive, onClick }) => (
    <button
        onClick={onClick}
        className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left font-semibold transition-all duration-200 ${
            isActive
                ? 'bg-purple-600 text-white shadow-md shadow-purple-600/20'
                : 'text-gray-600 hover:bg-gray-200 dark:text-gray-400 dark:hover:bg-gray-700/50 dark:hover:text-white'
        }`}
    >
        {icon}
        <span>{label}</span>
    </button>
);

export default App;