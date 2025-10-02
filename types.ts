export interface TaskStatus {
  mixed: boolean;
  mastered: boolean;
  tagged: boolean;
  registered: boolean;
}

export interface Track {
  id: string; // Unique identifier, e.g., file path
  name: string;
  path: string;
  genre: string;
  mood: string;
  key: string;
  bpm: number;
  notes: string;
  status: TaskStatus;
  tags: string[];
  url?: string; // Optional temporary URL for playback
  fileObject?: File; // Reference to original file for cleanup
}

// Fix: Add missing InputMode enum.
export enum InputMode {
  TEXT = 'text',
  VOICE = 'voice',
  MIDI = 'midi',
  CONTEXT = 'context',
}

// Fix: Add missing MusicalIdea interface.
export interface MusicalIdea {
  title: string;
  description: string;
  genre: string;
  mood: string;
  bpm: number;
  key: string;
  chordProgression: string[];
  melodyDescription: string;
  rhythmDescription: string;
  midiBase64: string;
  savedFilePath?: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  images?: string[]; // Array of base64 data URLs
}

export enum AIProvider {
    GEMINI = 'Google Gemini',
    OPENAI = 'OpenAI',
    ANTHROPIC = 'Anthropic',
    NANO_BANANA = 'Nano Banana',
    GEMMA = 'Local Gemma',
}

export interface LocalModelConfig {
    url: string;
    modelId: string;
    enabled: boolean;
}

export interface AppSettings {
    aiProvider: AIProvider;
    apiKeys: {
        [AIProvider.GEMINI]: string;
        [AIProvider.OPENAI]: string;
        [AIProvider.ANTHROPIC]: string;
    };
    elevenLabsApiKey: string;
    enableVoiceReplies: boolean;
    theme: 'light' | 'dark';
    elevenLabsVoiceId: string;
    reminderInterval: number; // in minutes
    localModel: LocalModelConfig;
}

export interface AudioAnalysisResult {
  bpm: number;
  key: string;
  mood: 'energetic' | 'chill';
}

export interface SyncMatchResult {
  trackId: string;
  trackName: string;
  reasoning: string;
}

export interface Sample {
  id: string;
  name: string;
  path: string;
  tags: string[];
  url?: string; // Optional temporary URL for playback
}

export interface Plugin {
  id: string;
  name: string;
  manufacturer: string;
  type: 'Instrument' | 'Effect';
}

export interface SmartSearchResult {
  trackId: string;
  reasoning: string;
}

export enum ProjectEventType {
  RELEASE = 'release',
  BRIEF = 'brief',
  TASK = 'task',
  REMINDER = 'reminder',
}

export interface ProjectEvent {
  id: string;
  type: ProjectEventType;
  title: string;
  date: string; // ISO 8601 format
  notes?: string;
  relatedTrackId?: string; // Optional link to a track
}

export interface Note {
  id: string;
  trackId: string;
  author: string;
  text: string;
  timestamp: string; // ISO 8601 format
}