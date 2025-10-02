import { Track } from "../types";
import { dataRetentionService } from './dataRetentionService';

// Audio analysis using Web Audio API
export class AudioAnalyzer {
  private audioContext: AudioContext | null = null;

  constructor() {
    // Initialize audio context
    if (typeof window !== 'undefined') {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
  }

  async analyzeAudioFile(file: File): Promise<{
    bpm: number;
    key: string;
    genre: string;
    mood: string;
    tags: string[];
  }> {
    if (!this.audioContext) {
      throw new Error('Audio context not available');
    }

    const arrayBuffer = await file.arrayBuffer();
    const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
    
    // Extract audio features
    const bpm = await this.detectBPM(audioBuffer);
    const key = await this.detectKey(audioBuffer);
    const genre = this.inferGenreFromFilename(file.name);
    const mood = this.inferMoodFromFilename(file.name);
    const tags = this.generateTagsFromFilename(file.name, bpm, key);

    const result = { bpm, key, genre, mood, tags };
    
    // Retain ML analysis data
    dataRetentionService.retainMLAnalysis(
        'algorithmic_audio_analysis',
        { fileName: file.name, fileSize: file.size },
        result,
        'algorithmic_analyzer',
        0.75
    );

    return result;
  }

  private async detectBPM(audioBuffer: AudioBuffer): Promise<number> {
    // Simple BPM detection using onset detection
    const channelData = audioBuffer.getChannelData(0);
    const sampleRate = audioBuffer.sampleRate;
    const windowSize = 1024;
    const hopSize = 512;
    
    let onsets: number[] = [];
    
    // Calculate spectral flux for onset detection
    for (let i = 0; i < channelData.length - windowSize; i += hopSize) {
      const window = channelData.slice(i, i + windowSize);
      const magnitude = this.calculateMagnitude(window);
      
      if (magnitude > 0.1) { // Threshold for onset detection
        onsets.push(i / sampleRate);
      }
    }
    
    // Calculate BPM from onset intervals
    if (onsets.length < 2) return 120; // Default BPM
    
    const intervals: number[] = [];
    for (let i = 1; i < onsets.length; i++) {
      intervals.push(onsets[i] - onsets[i - 1]);
    }
    
    // Find most common interval
    const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
    const bpm = Math.round(60 / avgInterval);
    
    // Clamp to reasonable BPM range
    return Math.max(60, Math.min(200, bpm));
  }

  private async detectKey(audioBuffer: AudioBuffer): Promise<string> {
    // Simple key detection using chroma features
    const channelData = audioBuffer.getChannelData(0);
    const sampleRate = audioBuffer.sampleRate;
    
    // Extract chroma features (simplified)
    const chroma = this.calculateChromaFeatures(channelData, sampleRate);
    
    // Map chroma to key
    const keys = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    const majorKeys = ['C', 'G', 'D', 'A', 'E', 'B', 'F#', 'C#', 'F', 'Bb', 'Eb', 'Ab'];
    const minorKeys = ['Am', 'Em', 'Bm', 'F#m', 'C#m', 'G#m', 'D#m', 'A#m', 'Dm', 'Gm', 'Cm', 'Fm'];
    
    // Find dominant chroma
    const maxChroma = Math.max(...chroma);
    const dominantChroma = chroma.indexOf(maxChroma);
    
    // Simple heuristic for major/minor
    const isMinor = chroma[3] > chroma[0]; // D vs C comparison
    
    const key = isMinor ? minorKeys[dominantChroma] : majorKeys[dominantChroma];
    return key || 'C';
  }

  private calculateMagnitude(samples: Float32Array): number {
    let sum = 0;
    for (let i = 0; i < samples.length; i++) {
      sum += samples[i] * samples[i];
    }
    return Math.sqrt(sum / samples.length);
  }

  private calculateChromaFeatures(samples: Float32Array, sampleRate: number): number[] {
    // Simplified chroma calculation
    const chroma = new Array(12).fill(0);
    const fftSize = 2048;
    
    for (let i = 0; i < samples.length - fftSize; i += fftSize) {
      const window = samples.slice(i, i + fftSize);
      const fft = this.simpleFFT(window);
      
      // Map frequencies to chroma bins
      for (let j = 0; j < fft.length; j++) {
        const freq = (j * sampleRate) / fftSize;
        if (freq > 80 && freq < 5000) { // Focus on musical range
          const chromaIndex = Math.round(12 * Math.log2(freq / 440)) % 12;
          if (chromaIndex >= 0 && chromaIndex < 12) {
            chroma[chromaIndex] += Math.abs(fft[j]);
          }
        }
      }
    }
    
    return chroma;
  }

  private simpleFFT(samples: Float32Array): Float32Array {
    // Simplified FFT implementation
    const N = samples.length;
    const fft = new Float32Array(N);
    
    for (let k = 0; k < N; k++) {
      let real = 0;
      let imag = 0;
      
      for (let n = 0; n < N; n++) {
        const angle = -2 * Math.PI * k * n / N;
        real += samples[n] * Math.cos(angle);
        imag += samples[n] * Math.sin(angle);
      }
      
      fft[k] = Math.sqrt(real * real + imag * imag);
    }
    
    return fft;
  }

  private inferGenreFromFilename(filename: string): string {
    const name = filename.toLowerCase();
    
    // Genre detection based on filename patterns
    if (name.includes('bass') || name.includes('808') || name.includes('trap')) {
      return 'Hip Hop';
    } else if (name.includes('kick') || name.includes('drum') || name.includes('perc')) {
      return 'Electronic';
    } else if (name.includes('guitar') || name.includes('acoustic')) {
      return 'Rock';
    } else if (name.includes('piano') || name.includes('keys')) {
      return 'Classical';
    } else if (name.includes('synth') || name.includes('pad')) {
      return 'Electronic';
    } else if (name.includes('vocal') || name.includes('voice')) {
      return 'Vocal';
    } else if (name.includes('ambient') || name.includes('atmospheric')) {
      return 'Ambient';
    } else if (name.includes('jazz') || name.includes('blues')) {
      return 'Jazz';
    } else if (name.includes('reggae') || name.includes('ska')) {
      return 'Reggae';
    } else if (name.includes('metal') || name.includes('heavy')) {
      return 'Metal';
    } else if (name.includes('country') || name.includes('folk')) {
      return 'Country';
    } else if (name.includes('funk') || name.includes('soul')) {
      return 'Funk';
    } else if (name.includes('disco') || name.includes('dance')) {
      return 'Disco';
    } else if (name.includes('techno') || name.includes('house')) {
      return 'Techno';
    } else if (name.includes('lo-fi') || name.includes('lofi')) {
      return 'Lo-fi';
    } else if (name.includes('chill') || name.includes('relax')) {
      return 'Chill';
    } else {
      return 'Unknown';
    }
  }

  private inferMoodFromFilename(filename: string): string {
    const name = filename.toLowerCase();
    
    // Mood detection based on filename patterns
    if (name.includes('dark') || name.includes('heavy') || name.includes('aggressive')) {
      return 'Dark';
    } else if (name.includes('happy') || name.includes('bright') || name.includes('uplifting')) {
      return 'Happy';
    } else if (name.includes('sad') || name.includes('melancholy') || name.includes('depressed')) {
      return 'Sad';
    } else if (name.includes('energetic') || name.includes('pump') || name.includes('intense')) {
      return 'Energetic';
    } else if (name.includes('chill') || name.includes('relax') || name.includes('calm')) {
      return 'Chill';
    } else if (name.includes('mysterious') || name.includes('haunting') || name.includes('eerie')) {
      return 'Mysterious';
    } else if (name.includes('romantic') || name.includes('love') || name.includes('passionate')) {
      return 'Romantic';
    } else if (name.includes('dreamy') || name.includes('ethereal') || name.includes('floating')) {
      return 'Dreamy';
    } else if (name.includes('aggressive') || name.includes('angry') || name.includes('fierce')) {
      return 'Aggressive';
    } else if (name.includes('peaceful') || name.includes('serene') || name.includes('tranquil')) {
      return 'Peaceful';
    } else {
      return 'Neutral';
    }
  }

  private generateTagsFromFilename(filename: string, bpm: number, key: string): string[] {
    const tags: string[] = [];
    const name = filename.toLowerCase();
    
    // Instrument tags
    if (name.includes('kick')) tags.push('kick', 'drum');
    if (name.includes('snare')) tags.push('snare', 'drum');
    if (name.includes('hihat') || name.includes('hi-hat')) tags.push('hihat', 'drum');
    if (name.includes('crash')) tags.push('crash', 'cymbal');
    if (name.includes('bass')) tags.push('bass');
    if (name.includes('808')) tags.push('808', 'sub-bass');
    if (name.includes('guitar')) tags.push('guitar');
    if (name.includes('piano') || name.includes('keys')) tags.push('piano', 'keys');
    if (name.includes('synth')) tags.push('synthesizer', 'synth');
    if (name.includes('pad')) tags.push('pad', 'atmospheric');
    if (name.includes('lead')) tags.push('lead', 'melody');
    if (name.includes('vocal') || name.includes('voice')) tags.push('vocal', 'voice');
    if (name.includes('choir')) tags.push('choir', 'vocal');
    if (name.includes('string')) tags.push('strings', 'orchestral');
    if (name.includes('brass')) tags.push('brass', 'horn');
    if (name.includes('flute')) tags.push('flute', 'woodwind');
    if (name.includes('sax')) tags.push('saxophone', 'brass');
    
    // Style tags
    if (name.includes('trap')) tags.push('trap');
    if (name.includes('house')) tags.push('house');
    if (name.includes('techno')) tags.push('techno');
    if (name.includes('dubstep')) tags.push('dubstep');
    if (name.includes('drum') && name.includes('bass')) tags.push('drum and bass', 'dnb');
    if (name.includes('ambient')) tags.push('ambient');
    if (name.includes('lo-fi') || name.includes('lofi')) tags.push('lo-fi');
    if (name.includes('jazz')) tags.push('jazz');
    if (name.includes('funk')) tags.push('funk');
    if (name.includes('reggae')) tags.push('reggae');
    if (name.includes('rock')) tags.push('rock');
    if (name.includes('metal')) tags.push('metal');
    if (name.includes('country')) tags.push('country');
    if (name.includes('blues')) tags.push('blues');
    
    // Processing tags
    if (name.includes('distorted') || name.includes('dist')) tags.push('distorted');
    if (name.includes('reverb')) tags.push('reverb');
    if (name.includes('delay')) tags.push('delay');
    if (name.includes('chorus')) tags.push('chorus');
    if (name.includes('flanger')) tags.push('flanger');
    if (name.includes('phaser')) tags.push('phaser');
    if (name.includes('compressed') || name.includes('comp')) tags.push('compressed');
    if (name.includes('saturated') || name.includes('sat')) tags.push('saturated');
    if (name.includes('filtered') || name.includes('filter')) tags.push('filtered');
    if (name.includes('sidechain')) tags.push('sidechain');
    
    // Tempo tags
    if (bpm < 80) tags.push('slow', 'downtempo');
    if (bpm >= 80 && bpm < 120) tags.push('mid-tempo');
    if (bpm >= 120 && bpm < 140) tags.push('up-tempo');
    if (bpm >= 140) tags.push('fast', 'high-energy');
    
    // Key tags
    if (key.includes('m')) tags.push('minor');
    else tags.push('major');
    
    // Quality tags
    if (name.includes('clean')) tags.push('clean');
    if (name.includes('dirty') || name.includes('gritty')) tags.push('dirty', 'gritty');
    if (name.includes('punchy')) tags.push('punchy');
    if (name.includes('soft')) tags.push('soft');
    if (name.includes('hard')) tags.push('hard');
    if (name.includes('warm')) tags.push('warm');
    if (name.includes('cold')) tags.push('cold');
    if (name.includes('bright')) tags.push('bright');
    if (name.includes('dark')) tags.push('dark');
    
    // Remove duplicates and return
    return [...new Set(tags)];
  }
}

// Main algorithmic tagging service
export class AlgorithmicTaggingService {
  private analyzer: AudioAnalyzer;

  constructor() {
    this.analyzer = new AudioAnalyzer();
  }

  async autoTagTrack(file: File): Promise<Partial<Track>> {
    try {
      const analysis = await this.analyzer.analyzeAudioFile(file);
      
      return {
        genre: analysis.genre,
        mood: analysis.mood,
        key: analysis.key,
        bpm: analysis.bpm,
        tags: analysis.tags
      };
    } catch (error) {
      console.error('Error in algorithmic auto-tagging:', error);
      
      // Fallback to filename-based tagging
      return this.fallbackTagging(file.name);
    }
  }

  async autoTagSample(file: File): Promise<string[]> {
    try {
      const analysis = await this.analyzer.analyzeAudioFile(file);
      return analysis.tags;
    } catch (error) {
      console.error('Error in algorithmic sample tagging:', error);
      
      // Fallback to filename-based tagging
      return this.fallbackSampleTagging(file.name);
    }
  }

  private fallbackTagging(filename: string): Partial<Track> {
    const name = filename.toLowerCase();
    
    return {
      genre: this.inferGenreFromFilename(name),
      mood: this.inferMoodFromFilename(name),
      key: 'C', // Default key
      bpm: 120, // Default BPM
      tags: this.generateTagsFromFilename(name, 120, 'C')
    };
  }

  private fallbackSampleTagging(filename: string): string[] {
    const name = filename.toLowerCase();
    return this.generateTagsFromFilename(name, 120, 'C');
  }

  private inferGenreFromFilename(name: string): string {
    if (name.includes('bass') || name.includes('808') || name.includes('trap')) {
      return 'Hip Hop';
    } else if (name.includes('kick') || name.includes('drum') || name.includes('perc')) {
      return 'Electronic';
    } else if (name.includes('guitar') || name.includes('acoustic')) {
      return 'Rock';
    } else if (name.includes('piano') || name.includes('keys')) {
      return 'Classical';
    } else if (name.includes('synth') || name.includes('pad')) {
      return 'Electronic';
    } else if (name.includes('vocal') || name.includes('voice')) {
      return 'Vocal';
    } else if (name.includes('ambient') || name.includes('atmospheric')) {
      return 'Ambient';
    } else {
      return 'Unknown';
    }
  }

  private inferMoodFromFilename(name: string): string {
    if (name.includes('dark') || name.includes('heavy') || name.includes('aggressive')) {
      return 'Dark';
    } else if (name.includes('happy') || name.includes('bright') || name.includes('uplifting')) {
      return 'Happy';
    } else if (name.includes('sad') || name.includes('melancholy') || name.includes('depressed')) {
      return 'Sad';
    } else if (name.includes('energetic') || name.includes('pump') || name.includes('intense')) {
      return 'Energetic';
    } else if (name.includes('chill') || name.includes('relax') || name.includes('calm')) {
      return 'Chill';
    } else {
      return 'Neutral';
    }
  }

  private generateTagsFromFilename(name: string, bpm: number, key: string): string[] {
    const tags: string[] = [];
    
    // Instrument tags
    if (name.includes('kick')) tags.push('kick', 'drum');
    if (name.includes('snare')) tags.push('snare', 'drum');
    if (name.includes('hihat') || name.includes('hi-hat')) tags.push('hihat', 'drum');
    if (name.includes('bass')) tags.push('bass');
    if (name.includes('808')) tags.push('808', 'sub-bass');
    if (name.includes('guitar')) tags.push('guitar');
    if (name.includes('piano') || name.includes('keys')) tags.push('piano', 'keys');
    if (name.includes('synth')) tags.push('synthesizer', 'synth');
    if (name.includes('vocal') || name.includes('voice')) tags.push('vocal', 'voice');
    
    // Style tags
    if (name.includes('trap')) tags.push('trap');
    if (name.includes('house')) tags.push('house');
    if (name.includes('techno')) tags.push('techno');
    if (name.includes('ambient')) tags.push('ambient');
    if (name.includes('lo-fi') || name.includes('lofi')) tags.push('lo-fi');
    
    // Tempo tags
    if (bpm < 80) tags.push('slow', 'downtempo');
    if (bpm >= 80 && bpm < 120) tags.push('mid-tempo');
    if (bpm >= 120 && bpm < 140) tags.push('up-tempo');
    if (bpm >= 140) tags.push('fast', 'high-energy');
    
    // Key tags
    if (key.includes('m')) tags.push('minor');
    else tags.push('major');
    
    return [...new Set(tags)];
  }
}

// Export singleton instance
export const algorithmicTaggingService = new AlgorithmicTaggingService();
