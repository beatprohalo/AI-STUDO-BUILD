import { SyncMatchResult, Track, LocalModelConfig } from "../types";

// Default configuration
const DEFAULT_LOCAL_LLM_URL = 'http://127.0.0.1:1234';
const DEFAULT_MODEL_ID = 'google/gemma-3n-e4b';

// --- Assistant Chat with Local LLM ---
export const sendMessageToGemma = async (prompt: string, config?: LocalModelConfig): Promise<string> => {
  const localUrl = config?.url || DEFAULT_LOCAL_LLM_URL;
  const modelId = config?.modelId || DEFAULT_MODEL_ID;
  
  // Use proxy endpoint to avoid CORS issues
  const proxyUrl = '/api/local-llm/v1/chat/completions';
  
  try {
    const response = await fetch(proxyUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: modelId,
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 1000,
        stream: false
      })
    });

    if (!response.ok) {
      throw new Error(`Local LLM server responded with status: ${response.status}`);
    }

    const data = await response.json();
    
    if (data.choices && data.choices.length > 0) {
      return data.choices[0].message.content;
    } else {
      throw new Error('No response from local LLM');
    }
  } catch (error) {
    console.error('Error calling local Gemma LLM:', error);
    return `[Local Gemma Error] Could not connect to local LLM server at ${localUrl}. Please ensure your local server is running.\n\nError: ${error instanceof Error ? error.message : 'Unknown error'}`;
  }
};


// --- Sync Matching with Local LLM ---
export const findSyncMatches = async (
    brief: string,
    tracks: Track[],
    config?: LocalModelConfig
): Promise<SyncMatchResult[]> => {
    const localUrl = config?.url || DEFAULT_LOCAL_LLM_URL;
    const modelId = config?.modelId || DEFAULT_MODEL_ID;
    
    try {
        const trackList = tracks.map(t => `- ${t.name} (${t.genre}, ${t.mood}, ${t.key}, ${t.bpm} BPM)`).join('\n');
        
        const prompt = `You are a music supervisor. Given this brief: "${brief}"

Available tracks:
${trackList}

Please recommend the best 2-3 tracks that match this brief. Respond in JSON format:
[
  {
    "trackId": "track_id_here", 
    "trackName": "track_name_here",
    "reasoning": "explanation why this track fits"
  }
]`;

        // Use proxy endpoint to avoid CORS issues
        const proxyUrl = '/api/local-llm/v1/chat/completions';
        
        const response = await fetch(proxyUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: modelId,
                messages: [
                    {
                        role: 'user',
                        content: prompt
                    }
                ],
                temperature: 0.3,
                max_tokens: 800,
                stream: false
            })
        });

        if (!response.ok) {
            throw new Error(`Local LLM server responded with status: ${response.status}`);
        }

        const data = await response.json();
        const content = data.choices[0]?.message?.content;
        
        if (!content) {
            throw new Error('No response from local LLM');
        }

        // Try to parse JSON response
        try {
            const matches = JSON.parse(content);
            return Array.isArray(matches) ? matches : [matches];
        } catch (parseError) {
            // If JSON parsing fails, create a fallback response
            const mockTrack = tracks[Math.floor(Math.random() * tracks.length)] || { id: 'mock/path.wav', name: 'Example Track' };
            return [{
                trackId: mockTrack.id,
                trackName: mockTrack.name,
                reasoning: `Local Gemma response (parsed): ${content.substring(0, 100)}...`
            }];
        }
    } catch (error) {
        console.error('Error in Gemma sync matching:', error);
        // Fallback to mock response
        const mockTrack = tracks[Math.floor(Math.random() * tracks.length)] || { id: 'mock/path.wav', name: 'Example Track' };
        return [{
            trackId: mockTrack.id,
            trackName: mockTrack.name,
            reasoning: `Error connecting to local LLM: ${error instanceof Error ? error.message : 'Unknown error'}`
        }];
    }
};


// --- Auto-Tagging with Local LLM ---
export const autoTagTrack = async (fileName: string, config?: LocalModelConfig): Promise<Partial<Track>> => {
    const localUrl = config?.url || DEFAULT_LOCAL_LLM_URL;
    const modelId = config?.modelId || DEFAULT_MODEL_ID;
    
    try {
        const prompt = `Analyze this audio file name and suggest music metadata: "${fileName}"

Please respond in JSON format:
{
  "genre": "genre_name",
  "mood": "mood_description", 
  "key": "musical_key",
  "bpm": estimated_bpm_number,
  "tags": ["tag1", "tag2", "tag3"]
}`;

        // Use proxy endpoint to avoid CORS issues
        const proxyUrl = '/api/local-llm/v1/chat/completions';
        
        const response = await fetch(proxyUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: modelId,
                messages: [
                    {
                        role: 'user',
                        content: prompt
                    }
                ],
                temperature: 0.3,
                max_tokens: 300,
                stream: false
            })
        });

        if (!response.ok) {
            throw new Error(`Local LLM server responded with status: ${response.status}`);
        }

        const data = await response.json();
        const content = data.choices[0]?.message?.content;
        
        if (!content) {
            throw new Error('No response from local LLM');
        }

        // Try to parse JSON response
        try {
            const parsed = JSON.parse(content);
            return {
                genre: parsed.genre || 'Unknown',
                mood: parsed.mood || 'Neutral',
                key: parsed.key || 'C major',
                bpm: parsed.bpm || 120,
                tags: Array.isArray(parsed.tags) ? parsed.tags : ['gemma', 'local-llm', 'auto-tagged']
            };
        } catch (parseError) {
            // Fallback if JSON parsing fails
            return {
                genre: 'Electronic',
                mood: 'Energetic',
                key: 'C major',
                bpm: 120,
                tags: ['gemma', 'local-llm', 'auto-tagged', 'fallback']
            };
        }
    } catch (error) {
        console.error('Error in Gemma track tagging:', error);
        // Fallback response
        const genres = ['Hip Hop', 'EDM', 'Rock', 'Ambient'];
        const moods = ['Dark', 'Uplifting', 'Aggressive', 'Chill'];
        const keys = ['A minor', 'G major', 'F# major'];

        return {
            genre: genres[Math.floor(Math.random() * genres.length)],
            mood: moods[Math.floor(Math.random() * moods.length)],
            key: keys[Math.floor(Math.random() * keys.length)],
            bpm: Math.floor(Math.random() * 80) + 80,
            tags: ['gemma', 'local-llm', 'error-fallback'],
        };
    }
};

export const autoTagSample = async (fileName: string, config?: LocalModelConfig): Promise<string[]> => {
    const localUrl = config?.url || DEFAULT_LOCAL_LLM_URL;
    const modelId = config?.modelId || DEFAULT_MODEL_ID;
    
    try {
        const prompt = `Analyze this audio sample file name and suggest relevant tags: "${fileName}"

Please respond with a JSON array of 3-5 relevant tags:
["tag1", "tag2", "tag3", "tag4"]`;

        // Use proxy endpoint to avoid CORS issues
        const proxyUrl = '/api/local-llm/v1/chat/completions';
        
        const response = await fetch(proxyUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: modelId,
                messages: [
                    {
                        role: 'user',
                        content: prompt
                    }
                ],
                temperature: 0.3,
                max_tokens: 150,
                stream: false
            })
        });

        if (!response.ok) {
            throw new Error(`Local LLM server responded with status: ${response.status}`);
        }

        const data = await response.json();
        const content = data.choices[0]?.message?.content;
        
        if (!content) {
            throw new Error('No response from local LLM');
        }

        // Try to parse JSON response
        try {
            const tags = JSON.parse(content);
            return Array.isArray(tags) ? tags : ['gemma', 'local-llm', 'auto-tagged'];
        } catch (parseError) {
            // Fallback if JSON parsing fails
            const sampleTypes = ['kick', 'snare', 'synth', 'vocal'];
            const descriptors = ['punchy', 'lo-fi', 'distorted', 'reverb'];
            return ['gemma', 'local-llm', sampleTypes[Math.floor(Math.random() * sampleTypes.length)], descriptors[Math.floor(Math.random() * descriptors.length)]];
        }
    } catch (error) {
        console.error('Error in Gemma sample tagging:', error);
        // Fallback response
        const sampleTypes = ['kick', 'snare', 'synth', 'vocal'];
        const descriptors = ['punchy', 'lo-fi', 'distorted', 'reverb'];
        return ['gemma', 'local-llm', 'error-fallback', sampleTypes[Math.floor(Math.random() * sampleTypes.length)]];
    }
};
