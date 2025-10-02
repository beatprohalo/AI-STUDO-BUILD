import { SyncMatchResult, Track } from "../types";
import { dataRetentionService } from './dataRetentionService';

export const sendMessageToOpenAI = async (
  prompt: string,
  apiKey: string,
): Promise<string> => {
  console.log(`Routing to OpenAI. Key provided: ${!!apiKey}`);
  if (!apiKey) {
    return "OpenAI API key is missing. Please add it in the ⚙️ Settings view.";
  }

  // This is a stub. In a real scenario, you'd use the OpenAI SDK here.
  await new Promise(resolve => setTimeout(resolve, 800)); // Simulate network latency

  return `[Stub Response from OpenAI]\n\nThanks for the prompt: "${prompt}". I'm just a placeholder for now, but soon I'll be powered by a real OpenAI model!`;
};

export const findSyncMatches = async (
    brief: string,
    tracks: Track[],
    apiKey: string
): Promise<SyncMatchResult[]> => {
    if (!apiKey) {
        throw new Error("OpenAI API key is missing. Please add it in the ⚙️ Settings view.");
    }
    // This is a stub. In a real scenario, you'd make the API call here.
    await new Promise(resolve => setTimeout(resolve, 1000));
    console.log("Called OpenAI stub for sync matching");
    // Return a mock response that looks real but indicates it's a stub
    const mockTrack = tracks[0] || { id: 'mock/path.wav', name: 'Example Track' };
    const result = [
        {
            trackId: mockTrack.id,
            trackName: mockTrack.name,
            reasoning: "This is a mock response from the OpenAI stub. The full feature is enabled when using the Gemini backend.",
        },
    ];
    
    // Retain ML analysis data
    dataRetentionService.retainMLAnalysis(
        'openai_sync_matching',
        { brief, trackCount: tracks.length },
        result,
        'openai',
        0.8
    );
    
    return result;
};

export const autoTagTrack = async (fileName: string, apiKey: string): Promise<Partial<Track>> => {
    if (!apiKey) {
        throw new Error("OpenAI API key is missing.");
    }
    await new Promise(resolve => setTimeout(resolve, 1000));
    console.log(`Called OpenAI stub for track tagging: ${fileName}`);
    const result = {
        genre: 'Synthwave (OpenAI Stub)',
        mood: 'Nostalgic',
        key: 'C minor',
        bpm: 100,
        tags: ['stub', 'openai', 'retro', '80s'],
    };
    
    // Retain ML analysis data
    dataRetentionService.retainMLAnalysis(
        'openai_track_tagging',
        { fileName },
        result,
        'openai',
        0.85
    );
    
    return result;
};

export const autoTagSample = async (fileName: string, apiKey: string): Promise<string[]> => {
    if (!apiKey) {
        throw new Error("OpenAI API key is missing.");
    }
    await new Promise(resolve => setTimeout(resolve, 500));
    console.log(`Called OpenAI stub for sample tagging: ${fileName}`);
    const result = ['stub', 'openai', 'sample-tag'];
    
    // Retain ML analysis data
    dataRetentionService.retainMLAnalysis(
        'openai_sample_tagging',
        { fileName },
        result,
        'openai',
        0.8
    );
    
    return result;
};
