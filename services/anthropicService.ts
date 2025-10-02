import { SyncMatchResult, Track } from "../types";
import { dataRetentionService } from './dataRetentionService';

export const sendMessageToAnthropic = async (
  prompt: string,
  apiKey: string,
): Promise<string> => {
  console.log(`Routing to Anthropic. Key provided: ${!!apiKey}`);
  if (!apiKey) {
    return "Anthropic API key is missing. Please add it in the ⚙️ Settings view.";
  }

  // This is a stub. In a real scenario, you'd use the Anthropic SDK here.
  await new Promise(resolve => setTimeout(resolve, 800)); // Simulate network latency

  return `[Stub Response from Anthropic]\n\nHi there! You asked: "${prompt}". I'm a stub for the Claude model. The real integration is coming soon!`;
};

export const findSyncMatches = async (
    brief: string,
    tracks: Track[],
    apiKey: string
): Promise<SyncMatchResult[]> => {
    if (!apiKey) {
        throw new Error("Anthropic API key is missing. Please add it in the ⚙️ Settings view.");
    }
    // This is a stub. In a real scenario, you'd make the API call here.
    await new Promise(resolve => setTimeout(resolve, 1000));
    console.log("Called Anthropic stub for sync matching");
    const mockTrack = tracks[0] || { id: 'mock/path.wav', name: 'Example Track' };
    const result = [
        {
            trackId: mockTrack.id,
            trackName: mockTrack.name,
            reasoning: "This is a mock response from the Anthropic stub. The full feature is enabled when using the Gemini backend.",
        },
    ];
    
    // Retain ML analysis data
    dataRetentionService.retainMLAnalysis(
        'anthropic_sync_matching',
        { brief, trackCount: tracks.length },
        result,
        'anthropic',
        0.8
    );
    
    return result;
};

export const autoTagTrack = async (fileName: string, apiKey: string): Promise<Partial<Track>> => {
    if (!apiKey) {
        throw new Error("Anthropic API key is missing.");
    }
    await new Promise(resolve => setTimeout(resolve, 1000));
    console.log(`Called Anthropic stub for track tagging: ${fileName}`);
    const result = {
        genre: 'Ambient (Anthropic Stub)',
        mood: 'Calm',
        key: 'A major',
        bpm: 70,
        tags: ['stub', 'anthropic', 'pad', 'ethereal'],
    };
    
    // Retain ML analysis data
    dataRetentionService.retainMLAnalysis(
        'anthropic_track_tagging',
        { fileName },
        result,
        'anthropic',
        0.85
    );
    
    return result;
};

export const autoTagSample = async (fileName: string, apiKey: string): Promise<string[]> => {
    if (!apiKey) {
        throw new Error("Anthropic API key is missing.");
    }
    await new Promise(resolve => setTimeout(resolve, 500));
    console.log(`Called Anthropic stub for sample tagging: ${fileName}`);
    const result = ['stub', 'anthropic', 'sample-tag'];
    
    // Retain ML analysis data
    dataRetentionService.retainMLAnalysis(
        'anthropic_sample_tagging',
        { fileName },
        result,
        'anthropic',
        0.8
    );
    
    return result;
};
