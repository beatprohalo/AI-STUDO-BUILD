import { GoogleGenAI, Type, Chat } from "@google/genai";
import { MusicalIdea, SyncMatchResult, Track, SmartSearchResult, ProjectEvent } from "../types";
import { dataRetentionService } from './dataRetentionService';

const getGeminiClient = (apiKey: string) => {
  if (!apiKey) {
    throw new Error("Gemini API key is required");
  }
  return new GoogleGenAI({ apiKey });
};

const getSystemInstruction = () => {
  return `You are a world-class musical idea generator. Your purpose is to provide creative sparks to music producers.
  - Analyze the user's prompt, which may include text, voice commands, or context from uploaded files (MIDI, audio).
  - Generate a complete musical idea including a title, description, genre, mood, BPM, key, a 4-chord progression, and descriptions for a suitable melody and rhythm.
  - Most importantly, you MUST provide a base64 encoded MIDI file that represents the chord progression and a simple melody. The MIDI should be simple, usable, and inspiring.
  - Your response must be a single, valid JSON object that adheres to the provided schema. Do not include any text or markdown formatting outside of the JSON object.`;
};

const responseSchema = {
    type: Type.OBJECT,
    properties: {
        title: { type: Type.STRING, description: "A creative title for the musical idea." },
        description: { type: Type.STRING, description: "A brief, inspiring description of the idea's vibe." },
        genre: { type: Type.STRING, description: "The primary genre of the idea (e.g., Lo-fi, Trap, House)." },
        mood: { type: Type.STRING, description: "The primary mood of the idea (e.g., Melancholy, Energetic, Dreamy)." },
        bpm: { type: Type.INTEGER, description: "The tempo in beats per minute." },
        key: { type: Type.STRING, description: "The musical key (e.g., C minor, F# major)." },
        chordProgression: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: "An array of four strings, each representing a chord in the progression (e.g., ['Am', 'G', 'C', 'F'])."
        },
        melodyDescription: { type: Type.STRING, description: "A short description of a potential melody that fits the chords." },
        rhythmDescription: { type: Type.STRING, description: "A short description of a fitting drum pattern or rhythm." },
        midiBase64: { type: Type.STRING, description: "A base64 encoded string of the generated MIDI file." }
    },
    required: ["title", "description", "genre", "mood", "bpm", "key", "chordProgression", "melodyDescription", "rhythmDescription", "midiBase64"]
};


export const generateMusicalIdea = async (
    prompt: string,
    fileContext: { midi: string | null; audio: string[] },
    midiBase64: string | null,
    apiKey: string
): Promise<MusicalIdea> => {

    let fullPrompt = `User Prompt: "${prompt}"\n\n`;

    if (fileContext.midi) {
        fullPrompt += `The user uploaded a MIDI file named "${fileContext.midi}". Use its implied style, key, or complexity as inspiration. The base64 content of the MIDI is provided in the contents for analysis.\n`;
    }
    if (fileContext.audio.length > 0) {
        fullPrompt += `The user uploaded the following audio files: ${fileContext.audio.join(', ')}. Use their names to infer the desired mood or genre.\n`;
    }
    if (!fileContext.midi && fileContext.audio.length === 0 && !prompt) {
        fullPrompt += "The user didn't provide a specific prompt. Please generate a completely random but musically interesting idea.\n";
    }

    // FIX: Explicitly type `contents` as `any[]` to allow pushing different object shapes (text and inlineData).
    const contents: any[] = [{ text: fullPrompt }];
    if(midiBase64) {
        contents.push({
            inlineData: {
                mimeType: 'audio/midi',
                data: midiBase64
            }
        });
    }

  try {
    const ai = getGeminiClient(apiKey);
    const model = ai.getGenerativeModel({ 
      model: "gemini-1.5-flash",
      systemInstruction: getSystemInstruction()
    });
    
    const response = await model.generateContent({
      contents: contents,
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: responseSchema,
        temperature: 0.8,
      },
    });

    const jsonText = response.text.trim();
    const idea: MusicalIdea = JSON.parse(jsonText);
    
    // Basic validation
    if (!idea.title || idea.chordProgression.length === 0 || !idea.midiBase64) {
        throw new Error("AI returned an incomplete musical idea.");
    }

    // Retain ML analysis data
    dataRetentionService.retainMLAnalysis(
        'gemini_musical_idea_generation',
        { prompt, fileContext },
        idea,
        'gemini',
        0.9
    );

    return idea;

  } catch (error) {
    console.error("Error calling Gemini API for idea generation:", error);
    if (error instanceof Error) {
        throw new Error(`Gemini API Error: ${error.message}`);
    }
    throw new Error("An unexpected error occurred while communicating with the AI.");
  }
};

export const createChatSession = (apiKey: string): Chat | null => {
    if (!apiKey) {
        console.warn("Gemini API key is not provided. Chat session not initialized.");
        return null;
    }
    const ai = getGeminiClient(apiKey);
    const chat = ai.getGenerativeModel({
        model: 'gemini-1.5-flash',
        systemInstruction: "You are a helpful and creative assistant for a music producer. Be concise, encouraging, and provide actionable advice. If the user provides an image, use it as creative inspiration.",
    });
    return chat.startChat();
}


export const findSyncMatches = async (brief: string, tracks: Track[], apiKey: string): Promise<SyncMatchResult[]> => {
    const systemInstruction = `You are an expert music supervisor's assistant. Your task is to analyze a creative sync brief and a list of available music tracks.
- You must identify the top 3 best-matching tracks from the list.
- For each match, you must provide a concise, compelling reason explaining why the track is a good fit for the brief.
- Your response MUST be a valid JSON array of objects, containing exactly 3 items, adhering to the provided schema. Do not include any text or markdown outside the JSON object.`;
    
    const formattedTracks = tracks.map(t =>
        `[ID: ${t.id}] Name: ${t.name} | Genre: ${t.genre} | Mood: ${t.mood} | Key: ${t.key} | BPM: ${t.bpm} | Notes: ${t.notes || 'N/A'}`
    ).join('\n');

    if (tracks.length === 0) {
        return [];
    }

    const prompt = `Sync Brief:\n"${brief}"\n\nAvailable Tracks:\n${formattedTracks}`;

    const matchSchema = {
        type: Type.ARRAY,
        items: {
            type: Type.OBJECT,
            properties: {
                trackId: { type: Type.STRING, description: "The unique ID of the matched track." },
                trackName: { type: Type.STRING, description: "The name of the matched track." },
                reasoning: { type: Type.STRING, description: "A brief explanation of why this track matches the brief." }
            },
            required: ["trackId", "trackName", "reasoning"]
        }
    };
    
    try {
        const ai = getGeminiClient(apiKey);
        const model = ai.getGenerativeModel({ 
            model: "gemini-1.5-flash",
            systemInstruction: systemInstruction
        });
        
        const response = await model.generateContent({
            contents: prompt,
            generationConfig: {
                responseMimeType: "application/json",
                responseSchema: matchSchema,
                temperature: 0.5,
            },
        });

        const jsonText = response.text.trim();
        const matches: SyncMatchResult[] = JSON.parse(jsonText);

        if (!Array.isArray(matches) || matches.some(m => !m.trackId || !m.reasoning)) {
            throw new Error("AI returned data in an unexpected format.");
        }

        return matches;

    } catch (error) {
        console.error("Error calling Gemini API for sync matching:", error);
        if (error instanceof Error) {
            throw new Error(`Gemini API Error: ${error.message}`);
        }
        throw new Error("An unexpected error occurred while communicating with the AI for sync matching.");
    }
};

export const smartSearchTracks = async (query: string, tracks: Track[], apiKey: string): Promise<SmartSearchResult[]> => {
    const systemInstruction = `You are a smart search assistant for a music producer's library.
- Your task is to analyze a natural language search query and find the most relevant tracks from the provided list.
- Consider genre, mood, instrumentation, BPM, key, and any abstract concepts mentioned in the query. Match these against the track metadata (name, genre, mood, notes, etc.).
- Return a JSON array of up to the top 5 most relevant track objects.
- For each track, you MUST provide its original 'trackId' and a concise 'reasoning' for why it's a good match.
- Your response must be a valid JSON array adhering to the schema. Do not include any text outside the JSON.`;

    const formattedTracks = tracks.map(t => ({
        trackId: t.id,
        name: t.name,
        genre: t.genre,
        mood: t.mood,
        key: t.key,
        bpm: t.bpm,
        notes: t.notes || 'N/A'
    }));

    if (tracks.length === 0) return [];

    const prompt = `Search Query: "${query}"\n\nTrack Library (JSON):\n${JSON.stringify(formattedTracks, null, 2)}`;

    const searchSchema = {
        type: Type.ARRAY,
        items: {
            type: Type.OBJECT,
            properties: {
                trackId: { type: Type.STRING, description: "The original ID of the matched track." },
                reasoning: { type: Type.STRING, description: "A brief explanation for the match." }
            },
            required: ["trackId", "reasoning"]
        }
    };

    try {
        const ai = getGeminiClient(apiKey);
        const model = ai.getGenerativeModel({ 
            model: "gemini-1.5-flash",
            systemInstruction
        });
        
        const response = await model.generateContent({
            contents: prompt,
            generationConfig: {
                responseMimeType: "application/json",
                responseSchema: searchSchema,
                temperature: 0.3
            },
        });

        const jsonText = response.text.trim();
        const results: SmartSearchResult[] = JSON.parse(jsonText);
        
        if (!Array.isArray(results) || results.some(r => !r.trackId || !r.reasoning)) {
            throw new Error("AI search returned data in an unexpected format.");
        }

        return results;

    } catch (error) {
        console.error("Error calling Gemini API for smart search:", error);
        if (error instanceof Error) {
            throw new Error(`Gemini API Error: ${error.message}`);
        }
        throw new Error("An unexpected error occurred during smart search.");
    }
};

export const summarizeUpcomingEvents = async (events: ProjectEvent[], apiKey: string): Promise<string> => {
    const systemInstruction = `You are an expert project management assistant for a music producer.
- Your task is to analyze a list of upcoming project events.
- Provide a concise, helpful summary that highlights the most important deadlines, releases, and tasks.
- Group events logically (e.g., by week or urgency).
- The tone should be encouraging but clear about what needs to be done.
- Your response must be a single block of text, formatted with markdown for readability (e.g., using headers and bullet points).`;

    const upcomingEvents = events
        .filter(event => new Date(event.date) >= new Date())
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    if (upcomingEvents.length === 0) {
        return "There are no upcoming events on your timeline. It's a good time to plan ahead!";
    }

    const formattedEvents = upcomingEvents.map(e =>
        `- Event: "${e.title}"\n  - Type: ${e.type}\n  - Due Date: ${new Date(e.date).toLocaleDateString()}`
    ).join('\n');

    const prompt = `Here is a list of upcoming events:\n\n${formattedEvents}\n\nPlease provide a summary.`;

    try {
        const ai = getGeminiClient(apiKey);
        const model = ai.getGenerativeModel({ 
            model: "gemini-1.5-flash",
            systemInstruction
        });
        
        const response = await model.generateContent({
            contents: prompt,
            generationConfig: {
                temperature: 0.6,
            },
        });

        return response.text;

    } catch (error) {
        console.error("Error calling Gemini API for event summarization:", error);
        if (error instanceof Error) {
            throw new Error(`Gemini API Error: ${error.message}`);
        }
        throw new Error("An unexpected error occurred while summarizing events.");
    }
};

export const autoTagTrack = async (fileName: string, apiKey: string): Promise<Partial<Track>> => {
    const systemInstruction = `You are an expert music librarian AI. Your task is to analyze a music track's filename and generate accurate metadata for it.
- Based on the filename, infer the genre, mood, musical key, BPM, and a list of 5-7 descriptive tags.
- The tags should be specific and useful (e.g., 'analog synth', 'punchy drums', 'female vocal chop', '808 bass').
- Your response MUST be a single, valid JSON object adhering to the provided schema. Do not include any text or markdown outside the JSON object.`;

    const tagTrackSchema = {
        type: Type.OBJECT,
        properties: {
            genre: { type: Type.STRING, description: "The most likely genre (e.g., 'Lo-fi Hip Hop', 'Future Bass', 'Techno')." },
            mood: { type: Type.STRING, description: "The primary mood (e.g., 'Energetic', 'Melancholic', 'Uplifting')." },
            key: { type: Type.STRING, description: "The musical key, if inferable (e.g., 'C# minor')." },
            bpm: { type: Type.INTEGER, description: "The tempo in beats per minute, if inferable." },
            tags: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: "An array of 5-7 descriptive tags."
            }
        },
        required: ["genre", "mood", "key", "bpm", "tags"]
    };

    const prompt = `Analyze the following music track filename and generate metadata:\n\nFilename: "${fileName}"`;

    try {
        const ai = getGeminiClient(apiKey);
        const model = ai.getGenerativeModel({ 
            model: "gemini-1.5-flash",
            systemInstruction
        });
        
        const response = await model.generateContent({
            contents: prompt,
            generationConfig: {
                responseMimeType: "application/json",
                responseSchema: tagTrackSchema,
                temperature: 0.4,
            },
        });

        const jsonText = response.text.trim();
        const result: Partial<Track> = JSON.parse(jsonText);
        
        if (!result.genre || !result.tags || result.tags.length === 0) {
             throw new Error("AI returned incomplete track metadata.");
        }
        return result;

    } catch (error) {
        console.error("Error calling Gemini API for track auto-tagging:", error);
        throw new Error(error instanceof Error ? `Gemini API Error: ${error.message}` : "An unexpected error occurred during track tagging.");
    }
};

export const autoTagSample = async (fileName: string, apiKey: string): Promise<string[]> => {
    const systemInstruction = `You are an expert audio sample librarian AI. Your task is to analyze an audio sample's filename and generate a list of accurate, descriptive tags.
- Infer the instrument type, processing, and any other relevant characteristics from the name.
- Your response MUST be a single, valid JSON array of strings adhering to the provided schema. Do not include any text or markdown outside the JSON object.`;

    const tagSampleSchema = {
        type: Type.ARRAY,
        items: { type: Type.STRING },
        description: "An array of 5-10 descriptive tags for the audio sample (e.g., 'kick', 'trap', '808', 'punchy', 'distorted')."
    };

    const prompt = `Analyze the following audio sample filename and generate descriptive tags:\n\nFilename: "${fileName}"`;
     try {
        const ai = getGeminiClient(apiKey);
        const model = ai.getGenerativeModel({ 
            model: "gemini-1.5-flash",
            systemInstruction
        });
        
        const response = await model.generateContent({
            contents: prompt,
            generationConfig: {
                responseMimeType: "application/json",
                responseSchema: tagSampleSchema,
                temperature: 0.3,
            },
        });

        const jsonText = response.text.trim();
        const tags: string[] = JSON.parse(jsonText);
        
        if (!Array.isArray(tags) || tags.length === 0) {
             throw new Error("AI returned invalid data for sample tags.");
        }
        return tags;

    } catch (error) {
        console.error("Error calling Gemini API for sample auto-tagging:", error);
        throw new Error(error instanceof Error ? `Gemini API Error: ${error.message}` : "An unexpected error occurred during sample tagging.");
    }
};

export const generateMidiInStyle = async (prompt: string, trainingFileNames: string[], apiKey: string): Promise<{ fileName: string; midiBase64: string }> => {
    const systemInstruction = `You are a specialized MIDI generation AI. Your task is to create a new MIDI file based on a user's prompt and the stylistic context of files they have provided for training.
- The user has "trained" a model on a set of MIDI files.
- You must generate a new, short (4-8 bars) MIDI file that reflects the user's prompt while being stylistically similar to the provided file list.
- Your response must be a single, valid JSON object that adheres to the provided schema. Do not include any text or markdown formatting outside of the JSON object.`;

    const midiResponseSchema = {
        type: Type.OBJECT,
        properties: {
            fileName: { type: Type.STRING, description: "A creative and descriptive filename for the generated MIDI (e.g., 'funky_bassline_in_style.mid')." },
            midiBase64: { type: Type.STRING, description: "A base64 encoded string of the generated MIDI file." }
        },
        required: ["fileName", "midiBase64"]
    };

    const fullPrompt = `User Prompt: "${prompt}"\n\nStyle Context from Training Files:\n- ${trainingFileNames.join('\n- ')}\n\nGenerate a new MIDI based on this context.`;

    try {
        const ai = getGeminiClient(apiKey);
        const model = ai.getGenerativeModel({ 
            model: "gemini-1.5-flash",
            systemInstruction
        });
        
        const response = await model.generateContent({
            contents: fullPrompt,
            generationConfig: {
                responseMimeType: "application/json",
                responseSchema: midiResponseSchema,
                temperature: 0.7,
            },
        });

        const jsonText = response.text.trim();
        const result = JSON.parse(jsonText);

        if (!result.fileName || !result.midiBase64) {
            throw new Error("AI returned incomplete MIDI data.");
        }

        return result;
    } catch (error) {
        console.error("Error calling Gemini API for styled MIDI generation:", error);
        if (error instanceof Error) {
            throw new Error(`Gemini API Error: ${error.message}`);
        }
        throw new Error("An unexpected error occurred while generating styled MIDI.");
    }
};