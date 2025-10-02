import React, { useState, useEffect, useRef } from 'react';
import { useVoiceRecognition } from '../hooks/useVoiceRecognition';
import { IconBulb, IconMicrophone, IconUpload, IconLoader, IconWaveform, IconMusic, IconX, IconBrain } from './Icon';
import { AudioAnalysisResult } from '../types';

interface CreativeEngineProps {
  onGenerate: (prompt: string, files: File[]) => void;
  isLoading: boolean;
}

export const CreativeEngine: React.FC<CreativeEngineProps> = ({ onGenerate, isLoading }) => {
  const [prompt, setPrompt] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [analysisResults, setAnalysisResults] = useState<Record<string, AudioAnalysisResult>>({});
  const [isAnalyzingFiles, setIsAnalyzingFiles] = useState(false);
  const { isListening, transcript, startListening, stopListening } = useVoiceRecognition();
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (transcript) {
      setPrompt(transcript);
    }
  }, [transcript]);
  
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      const newFiles = Array.from(event.target.files);
      
      const currentAudioFiles = files.filter(f => f.type.startsWith('audio/') && f.type !== 'audio/midi');
      const currentMidiFile = files.find(f => f.type === 'audio/midi');
      
      const incomingAudio = newFiles.filter((f: File) => f.type.startsWith('audio/') && f.type !== 'audio/midi');
      const incomingMidi = newFiles.find((f: File) => f.type === 'audio/midi');

      const combinedAudio = [...currentAudioFiles, ...incomingAudio];
      const uniqueAudio = Array.from(new Map(combinedAudio.map(f => [f.name, f])).values());
      const finalAudio = uniqueAudio.slice(0, 12);
      
      const finalMidi = incomingMidi || currentMidiFile;
      const finalFiles = finalMidi ? [...finalAudio, finalMidi] : finalAudio;

      setFiles(finalFiles);
    }
  };

  const removeFile = (fileName: string) => {
    setFiles(prevFiles => prevFiles.filter(f => f.name !== fileName));
    setAnalysisResults(prevResults => {
        const newResults = { ...prevResults };
        delete newResults[fileName];
        return newResults;
    });
  };

  const handleAnalyzeAudio = async () => {
    const audioFilesToAnalyze = files.filter(f => 
        (f.type.startsWith('audio/') && f.type !== 'audio/midi') && !analysisResults[f.name]
    );

    if (audioFilesToAnalyze.length === 0) return;

    setIsAnalyzingFiles(true);

    const analysisPromises = audioFilesToAnalyze.map(file => {
        return new Promise<[string, AudioAnalysisResult]>(resolve => {
            // Simulate network latency and analysis time
            setTimeout(() => {
                const result: AudioAnalysisResult = {
                    bpm: Math.floor(Math.random() * 80) + 80, // 80-160 BPM
                    key: ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'][Math.floor(Math.random() * 12)] + (Math.random() > 0.5 ? 'maj' : 'min'),
                    mood: Math.random() > 0.5 ? 'energetic' : 'chill',
                };
                resolve([file.name, result]);
            }, 500 + Math.random() * 1000); 
        });
    });

    const resultsArray = await Promise.all(analysisPromises);
    
    setAnalysisResults(prev => {
        const newResults = { ...prev };
        resultsArray.forEach(([fileName, result]) => {
            newResults[fileName] = result;
        });
        return newResults;
    });

    setIsAnalyzingFiles(false);
  };
  
  const handleGenerate = () => {
    if (!isLoading) {
      onGenerate(prompt, files);
    }
  };

  const handleInspireMe = () => {
    if (!isLoading) {
        setPrompt('');
        setFiles([]);
        setAnalysisResults({});
        onGenerate('Generate a random, inspiring musical idea.', []);
    }
  }

  const hasAudioFiles = files.some(f => f.type.startsWith('audio/') && f.type !== 'audio/midi');

  return (
    <div className="border-t border-purple-300 dark:border-purple-500/20 pt-6 space-y-4">
      <h3 className="font-orbitron text-lg font-bold text-purple-600 dark:text-purple-300 flex items-center gap-2">
        <IconBulb className="w-5 h-5" /> Creative Engine
      </h3>

      <button onClick={handleInspireMe} disabled={isLoading} className="w-full flex items-center justify-center gap-2 bg-yellow-400 hover:bg-yellow-300 text-black font-bold py-2 px-4 rounded-lg transition-colors duration-300 disabled:opacity-50">
          Inspire Me!
      </button>

      <div className="relative">
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Describe a vibe, paste a brief, or use your voice..."
          rows={5}
          className="w-full bg-gray-100 dark:bg-gray-800/50 border-2 border-gray-300 dark:border-gray-700 rounded-lg p-3 pr-12 text-gray-800 dark:text-gray-300 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all"
        />
        <button onClick={isListening ? stopListening : startListening} className={`absolute top-3 right-3 p-2 rounded-full transition-all duration-300 ${isListening ? 'bg-red-500 animate-pulse text-white' : 'bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-300'}`}>
            <IconMicrophone className="w-5 h-5" />
        </button>
      </div>

      <div>
        <button onClick={() => fileInputRef.current?.click()} className="w-full flex items-center justify-center gap-2 text-sm bg-gray-200 hover:bg-gray-300 text-gray-800 dark:bg-gray-700 dark:hover:bg-gray-600 dark:text-white font-bold py-2 px-4 rounded-lg transition-colors duration-300">
          <IconUpload className="w-4 h-4" />
          Upload MIDI (1) & Audio (12)
        </button>
        <input type="file" ref={fileInputRef} onChange={handleFileChange} multiple accept=".mid,.midi,audio/*" className="hidden" />
      </div>

        {files.length > 0 && (
            <div className="space-y-2">
                <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-gray-600 dark:text-gray-400">Attached Files:</p>
                    {hasAudioFiles && (
                         <button onClick={handleAnalyzeAudio} disabled={isLoading || isAnalyzingFiles} className="flex items-center gap-2 text-xs bg-purple-600 hover:bg-purple-500 text-white font-bold py-1.5 px-3 rounded-lg transition-colors duration-300 disabled:opacity-50 disabled:cursor-wait">
                            {isAnalyzingFiles ? <IconLoader className="w-4 h-4 animate-spin" /> : <IconBrain className="w-4 h-4" />}
                            <span>{isAnalyzingFiles ? 'Analyzing...' : 'Analyze Audio'}</span>
                        </button>
                    )}
                </div>
                <ul className="max-h-32 overflow-y-auto space-y-2 pr-2">
                    {files.map(file => {
                        const isAudio = file.type.startsWith('audio/') && file.type !== 'audio/midi';
                        const analysis = analysisResults[file.name];
                        return (
                            <li key={file.name} className="bg-gray-200 dark:bg-gray-700/50 p-2 rounded-md text-sm">
                               <div className="flex items-center justify-between">
                                 <div className="flex items-center gap-2 truncate">
                                   {file.type === 'audio/midi' ? <IconMusic className="w-4 h-4 text-purple-500 dark:text-purple-400 flex-shrink-0" /> : <IconWaveform className="w-4 h-4 text-blue-500 dark:text-blue-400 flex-shrink-0" />}
                                   <span className="truncate text-gray-800 dark:text-gray-300">{file.name}</span>
                                 </div>
                                 <button onClick={() => removeFile(file.name)} className="p-1 text-gray-500 hover:text-black dark:hover:text-white"><IconX className="w-3 h-3"/></button>
                               </div>
                               {isAudio && (
                                    <div className="pl-6 pt-1.5">
                                        {isAnalyzingFiles && !analysis && <p className="text-xs text-yellow-600 dark:text-yellow-400 animate-pulse">Analyzing...</p>}
                                        {analysis && (
                                            <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs animate-fade-in">
                                                <span className="font-mono bg-gray-100 dark:bg-gray-900/50 text-purple-700 dark:text-purple-300 px-1.5 py-0.5 rounded">BPM: {analysis.bpm}</span>
                                                <span className="font-mono bg-gray-100 dark:bg-gray-900/50 text-purple-700 dark:text-purple-300 px-1.5 py-0.5 rounded">Key: {analysis.key}</span>
                                                <span className="font-mono bg-gray-100 dark:bg-gray-900/50 text-purple-700 dark:text-purple-300 px-1.5 py-0.5 rounded">Mood: {analysis.mood}</span>
                                            </div>
                                        )}
                                    </div>
                               )}
                            </li>
                        )
                    })}
                </ul>
            </div>
        )}

      <button onClick={handleGenerate} disabled={isLoading} className="w-full flex items-center justify-center gap-2 bg-green-600 hover:bg-green-500 text-white font-bold py-3 px-4 rounded-lg transition-colors duration-300 disabled:opacity-50 disabled:cursor-not-allowed">
        {isLoading ? <IconLoader className="w-5 h-5 animate-spin" /> : <IconBulb className="w-5 h-5" />}
        {isLoading ? 'Generating...' : 'Generate Idea'}
      </button>
    </div>
  );
};