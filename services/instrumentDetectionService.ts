import { Track, Sample } from "../types";

export interface InstrumentDetectionResult {
  instrumentType: string;
  confidence: number;
  characteristics: {
    frequency: number;
    attack: number;
    sustain: number;
    decay: number;
    spectralCentroid: number;
    zeroCrossingRate: number;
  };
  tags: string[];
}

export interface AudioFeatures {
  spectralCentroid: number;
  spectralRolloff: number;
  zeroCrossingRate: number;
  mfcc: number[];
  chroma: number[];
  tempo: number;
  energy: number;
  attack: number;
  sustain: number;
  decay: number;
}

export class InstrumentDetector {
  private audioContext: AudioContext | null = null;

  constructor() {
    if (typeof window !== 'undefined') {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
  }

  async detectInstrument(file: File): Promise<InstrumentDetectionResult> {
    if (!this.audioContext) {
      throw new Error('Audio context not available');
    }

    const arrayBuffer = await file.arrayBuffer();
    const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
    
    // Extract audio features
    const features = await this.extractAudioFeatures(audioBuffer);
    
    // Classify instrument based on features
    const instrumentType = this.classifyInstrument(features);
    const confidence = this.calculateConfidence(features, instrumentType);
    const characteristics = this.extractCharacteristics(features);
    const tags = this.generateInstrumentTags(instrumentType, features);

    return {
      instrumentType,
      confidence,
      characteristics,
      tags
    };
  }

  private async extractAudioFeatures(audioBuffer: AudioBuffer): Promise<AudioFeatures> {
    const channelData = audioBuffer.getChannelData(0);
    const sampleRate = audioBuffer.sampleRate;
    const fftSize = 2048;
    
    // Calculate spectral features
    const spectralCentroid = this.calculateSpectralCentroid(channelData, sampleRate, fftSize);
    const spectralRolloff = this.calculateSpectralRolloff(channelData, sampleRate, fftSize);
    const zeroCrossingRate = this.calculateZeroCrossingRate(channelData);
    
    // Calculate MFCC features
    const mfcc = this.calculateMFCC(channelData, sampleRate, fftSize);
    
    // Calculate chroma features
    const chroma = this.calculateChromaFeatures(channelData, sampleRate, fftSize);
    
    // Calculate tempo
    const tempo = await this.detectTempo(channelData, sampleRate);
    
    // Calculate energy
    const energy = this.calculateEnergy(channelData);
    
    // Calculate ADSR envelope
    const { attack, sustain, decay } = this.calculateADSR(channelData, sampleRate);

    return {
      spectralCentroid,
      spectralRolloff,
      zeroCrossingRate,
      mfcc,
      chroma,
      tempo,
      energy,
      attack,
      sustain,
      decay
    };
  }

  private classifyInstrument(features: AudioFeatures): string {
    const { spectralCentroid, zeroCrossingRate, energy, attack, sustain, decay } = features;
    
    // Kick drum detection
    if (spectralCentroid < 200 && energy > 0.7 && attack < 0.01) {
      return 'kick';
    }
    
    // Snare drum detection
    if (spectralCentroid > 1000 && spectralCentroid < 4000 && zeroCrossingRate > 0.1 && energy > 0.5) {
      return 'snare';
    }
    
    // Hi-hat detection
    if (spectralCentroid > 3000 && zeroCrossingRate > 0.15 && energy < 0.4) {
      return 'hihat';
    }
    
    // Bass detection
    if (spectralCentroid < 300 && energy > 0.6 && sustain > 0.3) {
      return 'bass';
    }
    
    // Lead/Synth detection
    if (spectralCentroid > 1000 && spectralCentroid < 3000 && sustain > 0.5) {
      return 'lead';
    }
    
    // Pad detection
    if (spectralCentroid > 500 && spectralCentroid < 2000 && sustain > 0.7 && energy < 0.6) {
      return 'pad';
    }
    
    // Vocal detection
    if (spectralCentroid > 1000 && spectralCentroid < 3000 && zeroCrossingRate > 0.05 && zeroCrossingRate < 0.15) {
      return 'vocal';
    }
    
    // Piano detection
    if (spectralCentroid > 500 && spectralCentroid < 2000 && attack < 0.05 && sustain > 0.3) {
      return 'piano';
    }
    
    // Guitar detection
    if (spectralCentroid > 200 && spectralCentroid < 1500 && zeroCrossingRate > 0.08 && energy > 0.4) {
      return 'guitar';
    }
    
    // String detection
    if (spectralCentroid > 500 && spectralCentroid < 2000 && sustain > 0.6 && attack < 0.1) {
      return 'string';
    }
    
    // Brass detection
    if (spectralCentroid > 300 && spectralCentroid < 1500 && energy > 0.5 && sustain > 0.4) {
      return 'brass';
    }
    
    // Default to percussion if it's short and punchy
    if (attack < 0.05 && decay < 0.5 && energy > 0.6) {
      return 'percussion';
    }
    
    return 'unknown';
  }

  private calculateConfidence(features: AudioFeatures, instrumentType: string): number {
    // Simple confidence calculation based on how well features match expected ranges
    const { spectralCentroid, zeroCrossingRate, energy, attack, sustain } = features;
    
    let confidence = 0.5; // Base confidence
    
    switch (instrumentType) {
      case 'kick':
        if (spectralCentroid < 200) confidence += 0.2;
        if (energy > 0.7) confidence += 0.2;
        if (attack < 0.01) confidence += 0.1;
        break;
        
      case 'snare':
        if (spectralCentroid > 1000 && spectralCentroid < 4000) confidence += 0.2;
        if (zeroCrossingRate > 0.1) confidence += 0.2;
        if (energy > 0.5) confidence += 0.1;
        break;
        
      case 'hihat':
        if (spectralCentroid > 3000) confidence += 0.2;
        if (zeroCrossingRate > 0.15) confidence += 0.2;
        if (energy < 0.4) confidence += 0.1;
        break;
        
      case 'bass':
        if (spectralCentroid < 300) confidence += 0.2;
        if (energy > 0.6) confidence += 0.2;
        if (sustain > 0.3) confidence += 0.1;
        break;
        
      default:
        confidence = 0.3; // Lower confidence for unknown
    }
    
    return Math.min(1.0, Math.max(0.0, confidence));
  }

  private extractCharacteristics(features: AudioFeatures) {
    return {
      frequency: features.spectralCentroid,
      attack: features.attack,
      sustain: features.sustain,
      decay: features.decay,
      spectralCentroid: features.spectralCentroid,
      zeroCrossingRate: features.zeroCrossingRate
    };
  }

  private generateInstrumentTags(instrumentType: string, features: AudioFeatures): string[] {
    const tags: string[] = [instrumentType];
    
    // Add frequency-based tags
    if (features.spectralCentroid < 200) tags.push('low-frequency', 'sub-bass');
    else if (features.spectralCentroid < 500) tags.push('bass-range');
    else if (features.spectralCentroid < 1000) tags.push('mid-range');
    else if (features.spectralCentroid < 3000) tags.push('high-mid');
    else tags.push('high-frequency', 'bright');
    
    // Add energy-based tags
    if (features.energy > 0.7) tags.push('high-energy', 'punchy');
    else if (features.energy < 0.3) tags.push('low-energy', 'soft');
    
    // Add envelope-based tags
    if (features.attack < 0.01) tags.push('fast-attack', 'punchy');
    if (features.sustain > 0.6) tags.push('sustained', 'long');
    if (features.decay < 0.3) tags.push('short-decay', 'tight');
    
    // Add instrument-specific tags
    switch (instrumentType) {
      case 'kick':
        tags.push('drum', 'percussion', 'rhythm');
        break;
      case 'snare':
        tags.push('drum', 'percussion', 'rhythm', 'crack');
        break;
      case 'hihat':
        tags.push('drum', 'percussion', 'rhythm', 'cymbal');
        break;
      case 'bass':
        tags.push('low-end', 'foundation');
        break;
      case 'lead':
        tags.push('melody', 'synthesizer', 'synth');
        break;
      case 'pad':
        tags.push('atmospheric', 'ambient', 'texture');
        break;
      case 'vocal':
        tags.push('voice', 'human', 'melody');
        break;
      case 'piano':
        tags.push('keys', 'acoustic', 'melody');
        break;
      case 'guitar':
        tags.push('string', 'acoustic', 'melody');
        break;
      case 'string':
        tags.push('orchestral', 'melody', 'acoustic');
        break;
      case 'brass':
        tags.push('horn', 'orchestral', 'melody');
        break;
    }
    
    return [...new Set(tags)]; // Remove duplicates
  }

  // Audio analysis helper methods
  private calculateSpectralCentroid(channelData: Float32Array, sampleRate: number, fftSize: number): number {
    const fft = this.simpleFFT(channelData.slice(0, fftSize));
    let weightedSum = 0;
    let magnitudeSum = 0;
    
    for (let i = 0; i < fft.length / 2; i++) {
      const frequency = (i * sampleRate) / fftSize;
      const magnitude = fft[i];
      weightedSum += frequency * magnitude;
      magnitudeSum += magnitude;
    }
    
    return magnitudeSum > 0 ? weightedSum / magnitudeSum : 0;
  }

  private calculateSpectralRolloff(channelData: Float32Array, sampleRate: number, fftSize: number): number {
    const fft = this.simpleFFT(channelData.slice(0, fftSize));
    const totalEnergy = fft.reduce((sum, val) => sum + val, 0);
    const threshold = 0.85 * totalEnergy;
    
    let cumulativeEnergy = 0;
    for (let i = 0; i < fft.length / 2; i++) {
      cumulativeEnergy += fft[i];
      if (cumulativeEnergy >= threshold) {
        return (i * sampleRate) / fftSize;
      }
    }
    
    return sampleRate / 2;
  }

  private calculateZeroCrossingRate(channelData: Float32Array): number {
    let crossings = 0;
    for (let i = 1; i < channelData.length; i++) {
      if ((channelData[i] >= 0) !== (channelData[i - 1] >= 0)) {
        crossings++;
      }
    }
    return crossings / channelData.length;
  }

  private calculateMFCC(channelData: Float32Array, sampleRate: number, fftSize: number): number[] {
    // Simplified MFCC calculation
    const fft = this.simpleFFT(channelData.slice(0, fftSize));
    const mfcc: number[] = [];
    
    // Calculate mel-scale filter banks (simplified)
    const numFilters = 13;
    for (let i = 0; i < numFilters; i++) {
      let sum = 0;
      const startFreq = (i * sampleRate) / (2 * numFilters);
      const endFreq = ((i + 1) * sampleRate) / (2 * numFilters);
      
      for (let j = Math.floor(startFreq * fftSize / sampleRate); j < Math.floor(endFreq * fftSize / sampleRate); j++) {
        sum += fft[j];
      }
      mfcc.push(Math.log(sum + 1e-10));
    }
    
    return mfcc;
  }

  private calculateChromaFeatures(channelData: Float32Array, sampleRate: number, fftSize: number): number[] {
    const fft = this.simpleFFT(channelData.slice(0, fftSize));
    const chroma = new Array(12).fill(0);
    
    for (let i = 0; i < fft.length / 2; i++) {
      const frequency = (i * sampleRate) / fftSize;
      if (frequency > 80 && frequency < 5000) {
        const chromaIndex = Math.round(12 * Math.log2(frequency / 440)) % 12;
        if (chromaIndex >= 0 && chromaIndex < 12) {
          chroma[chromaIndex] += fft[i];
        }
      }
    }
    
    return chroma;
  }

  private async detectTempo(channelData: Float32Array, sampleRate: number): Promise<number> {
    // Simple tempo detection using onset detection
    const windowSize = 1024;
    const hopSize = 512;
    let onsets: number[] = [];
    
    for (let i = 0; i < channelData.length - windowSize; i += hopSize) {
      const window = channelData.slice(i, i + windowSize);
      const energy = window.reduce((sum, val) => sum + val * val, 0);
      
      if (energy > 0.1) {
        onsets.push(i / sampleRate);
      }
    }
    
    if (onsets.length < 2) return 120;
    
    const intervals: number[] = [];
    for (let i = 1; i < onsets.length; i++) {
      intervals.push(onsets[i] - onsets[i - 1]);
    }
    
    const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
    return Math.round(60 / avgInterval);
  }

  private calculateEnergy(channelData: Float32Array): number {
    let sum = 0;
    for (let i = 0; i < channelData.length; i++) {
      sum += channelData[i] * channelData[i];
    }
    return Math.sqrt(sum / channelData.length);
  }

  private calculateADSR(channelData: Float32Array, sampleRate: number): { attack: number; sustain: number; decay: number } {
    const envelope = this.calculateEnvelope(channelData);
    
    // Find attack time (time to reach 90% of peak)
    const peak = Math.max(...envelope);
    const attackThreshold = 0.9 * peak;
    let attackTime = 0;
    
    for (let i = 0; i < envelope.length; i++) {
      if (envelope[i] >= attackThreshold) {
        attackTime = i / sampleRate;
        break;
      }
    }
    
    // Find sustain level (average level after attack)
    const sustainStart = Math.floor(attackTime * sampleRate);
    const sustainEnd = Math.floor(envelope.length * 0.8);
    let sustainSum = 0;
    let sustainCount = 0;
    
    for (let i = sustainStart; i < sustainEnd; i++) {
      sustainSum += envelope[i];
      sustainCount++;
    }
    
    const sustainLevel = sustainCount > 0 ? sustainSum / sustainCount : 0;
    
    // Find decay time (time from peak to 50% of peak)
    const decayThreshold = 0.5 * peak;
    let decayTime = 0;
    
    for (let i = 0; i < envelope.length; i++) {
      if (envelope[i] <= decayThreshold) {
        decayTime = i / sampleRate;
        break;
      }
    }
    
    return {
      attack: attackTime,
      sustain: sustainLevel / peak,
      decay: decayTime
    };
  }

  private calculateEnvelope(channelData: Float32Array): Float32Array {
    const windowSize = 1024;
    const hopSize = 512;
    const envelope: number[] = [];
    
    for (let i = 0; i < channelData.length - windowSize; i += hopSize) {
      const window = channelData.slice(i, i + windowSize);
      const energy = window.reduce((sum, val) => sum + val * val, 0);
      envelope.push(Math.sqrt(energy / windowSize));
    }
    
    return new Float32Array(envelope);
  }

  private simpleFFT(samples: Float32Array): Float32Array {
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
}

// Main instrument detection service
export class InstrumentDetectionService {
  private detector: InstrumentDetector;

  constructor() {
    this.detector = new InstrumentDetector();
  }

  async detectInstrumentFromFile(file: File): Promise<InstrumentDetectionResult> {
    return await this.detector.detectInstrument(file);
  }

  async categorizeSamples(samples: Sample[]): Promise<{ [instrumentType: string]: Sample[] }> {
    const categorized: { [instrumentType: string]: Sample[] } = {};
    
    for (const sample of samples) {
      try {
        // For now, we'll use filename-based detection as fallback
        // In a real implementation, you'd analyze the actual audio file
        const instrumentType = this.inferInstrumentFromFilename(sample.name);
        
        if (!categorized[instrumentType]) {
          categorized[instrumentType] = [];
        }
        categorized[instrumentType].push(sample);
      } catch (error) {
        console.error(`Error categorizing sample ${sample.name}:`, error);
        if (!categorized['unknown']) {
          categorized['unknown'] = [];
        }
        categorized['unknown'].push(sample);
      }
    }
    
    return categorized;
  }

  private inferInstrumentFromFilename(filename: string): string {
    const name = filename.toLowerCase();
    
    if (name.includes('kick')) return 'kick';
    if (name.includes('snare')) return 'snare';
    if (name.includes('hihat') || name.includes('hi-hat')) return 'hihat';
    if (name.includes('crash')) return 'crash';
    if (name.includes('bass')) return 'bass';
    if (name.includes('808')) return 'bass';
    if (name.includes('guitar')) return 'guitar';
    if (name.includes('piano') || name.includes('keys')) return 'piano';
    if (name.includes('synth')) return 'lead';
    if (name.includes('pad')) return 'pad';
    if (name.includes('lead')) return 'lead';
    if (name.includes('vocal') || name.includes('voice')) return 'vocal';
    if (name.includes('string')) return 'string';
    if (name.includes('brass')) return 'brass';
    if (name.includes('flute')) return 'flute';
    if (name.includes('sax')) return 'brass';
    
    return 'unknown';
  }
}

// Export singleton instance
export const instrumentDetectionService = new InstrumentDetectionService();
