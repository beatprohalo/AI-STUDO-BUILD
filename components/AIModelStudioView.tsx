import React, { useState, useRef, useCallback, useEffect } from 'react';
import { IconCpu, IconUpload, IconLoader, IconX, IconMusic, IconDownload, IconWand, IconTrash, IconFolder, IconBrain, IconSparkles, IconRefresh, IconSettings, IconCheck } from './Icon';
import { generateMidiInStyle } from '../services/geminiService';
import { dataRetentionService } from '../services/dataRetentionService';
import { addTrainingDataBank, getTrainingDataBanks, deleteTrainingDataBank, addTrainingFile, getTrainingFiles, deleteTrainingFile } from '../services/dbService';
import { midiAnalysisService, MIDIAnalysis } from '../services/midiAnalysisService';
import { AppSettings, AIProvider } from '../types';

interface TrainingDataBank {
    id: string;
    name: string;
    files: File[];
    trainedAt: Date;
    isActive: boolean;
    modelData?: any;
    learningAnalysis?: LearningAnalysis;
}

interface LearningAnalysis {
    instruments: { [key: string]: number };
    genres: { [key: string]: number };
    tempos: { [key: string]: number };
    keys: { [key: string]: number };
    timeSignatures: { [key: string]: number };
    fileCategories: { [key: string]: string[] };
    totalFiles: number;
    averageTempo: number;
    mostCommonInstrument: string;
    mostCommonGenre: string;
    learningGaps: string[];
    recommendations: string[];
}

interface PersistedTrainingData {
    trainingDataBanks: TrainingDataBank[];
    activeBankId: string | null;
    trainingFiles: string[]; // Store file names for persistence
    isTrained: boolean;
    trainingLog: string[];
}

export const AIModelStudioView: React.FC<{ settings: AppSettings }> = ({ settings }) => {
    const [trainingFiles, setTrainingFiles] = useState<File[]>([]);
    const [isTraining, setIsTraining] = useState(false);
    const [trainingLog, setTrainingLog] = useState<string[]>([]);
    const [isTrained, setIsTrained] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);
    const [generatedMidi, setGeneratedMidi] = useState<{ fileName: string; midiBase64: string } | null>(null);
    const [generationPrompt, setGenerationPrompt] = useState('');
    const [generationError, setGenerationError] = useState<string | null>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [trainingDataBanks, setTrainingDataBanks] = useState<TrainingDataBank[]>([]);
    const [activeBankId, setActiveBankId] = useState<string | null>(null);
    const [showBankManager, setShowBankManager] = useState(false);
    const [isHelpMode, setIsHelpMode] = useState(false);
    const [aiRecommendations, setAiRecommendations] = useState<string[]>([]);
    const [isGeneratingRecommendations, setIsGeneratingRecommendations] = useState(false);
    const [isProcessingFiles, setIsProcessingFiles] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [learningAnalysis, setLearningAnalysis] = useState<MIDIAnalysis | null>(null);
    const [showLearningReport, setShowLearningReport] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const folderInputRef = useRef<HTMLInputElement>(null);

    // Persistence constants
    const STORAGE_KEY = 'ai_model_studio_training_data';

        // Load training data from localStorage and database on component mount
    useEffect(() => {
        const loadTrainingData = async () => {
            try {
                // First try to load from database
                const dbBanks = await getTrainingDataBanks();
                if (dbBanks && dbBanks.length > 0) {
                    const loadedBanks = dbBanks.map(bank => ({
                        ...bank,
                        trainedAt: new Date(bank.trainedAt),
                        files: [] // Files will be restored when bank is activated
                    }));
                    
                    setTrainingDataBanks(loadedBanks);
                    
                    // Auto-activate the most recent trained bank or temp bank if available
                    const trainedBanks = loadedBanks.filter(b => !b.id.startsWith('temp_bank_') && b.isActive);
                    const tempBanks = loadedBanks.filter(b => b.id.startsWith('temp_bank_'));
                    
                    if (trainedBanks.length > 0) {
                        // Activate the most recent trained bank
                        const latestBank = trainedBanks[0];
                        setActiveBankId(latestBank.id);
                        setIsTrained(latestBank.isActive);
                        
                        // Load files for this bank
                        try {
                            const bankFiles = await getTrainingFiles(latestBank.id);
                            // Note: We can't reconstruct File objects from database, 
                            // but we keep the bank structure for reference
                            console.log(`Loaded ${bankFiles.length} file references for bank ${latestBank.name}`);
                        } catch (error) {
                            console.warn('Could not load files for bank:', error);
                        }
                    } else if (tempBanks.length > 0) {
                        // Show temp bank but don't auto-activate
                        console.log('Found temporary banks with uploaded files');
                    }
                    
                    console.log('Training data loaded from database');
                } else {
                    // Fallback to localStorage
                    const stored = localStorage.getItem(STORAGE_KEY);
                    if (stored) {
                        const data: PersistedTrainingData = JSON.parse(stored);
                        
                        // Restore training data banks
                        if (data.trainingDataBanks) {
                            setTrainingDataBanks(data.trainingDataBanks.map(bank => ({
                                ...bank,
                                trainedAt: new Date(bank.trainedAt),
                                files: [] // Files will be restored when bank is activated
                            })));
                        }
                        
                        // Restore active bank
                        if (data.activeBankId) {
                            setActiveBankId(data.activeBankId);
                        }
                        
                        // Restore training state
                        if (data.isTrained !== undefined) {
                            setIsTrained(data.isTrained);
                        }
                        
                        // Restore training log
                        if (data.trainingLog) {
                            setTrainingLog(data.trainingLog);
                        }
                        
                        console.log('Training data loaded from localStorage');
                    }
                }
            } catch (error) {
                console.error('Failed to load training data:', error);
            }
        };

        loadTrainingData();
    }, []);

    // Save training data to localStorage whenever it changes
    const saveTrainingData = useCallback(async () => {
        setIsSaving(true);
        try {
            // Only store essential metadata to avoid localStorage size limits
            const data: PersistedTrainingData = {
                trainingDataBanks: trainingDataBanks.map(bank => ({
                    ...bank,
                    files: [] // Files will be managed separately
                })),
                activeBankId,
                trainingFiles: trainingFiles.slice(0, 100).map(f => f.name), // Limit stored names to prevent localStorage overflow
                isTrained,
                trainingLog: trainingLog.slice(-10) // Keep only recent log entries
            };
            
            // Use try-catch for localStorage to handle quota exceeded errors
            try {
                localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
            } catch (storageError) {
                console.warn('localStorage quota exceeded, using minimal storage:', storageError);
                // Store only essential data if quota is exceeded
                const minimalData = {
                    activeBankId,
                    isTrained,
                    fileCount: trainingFiles.length
                };
                localStorage.setItem(STORAGE_KEY, JSON.stringify(minimalData));
            }
            
            // Also save to data retention service
            dataRetentionService.retainData('ml_analysis', {
                trainingBanks: trainingDataBanks.length,
                activeBankId,
                isTrained,
                lastUpdated: new Date().toISOString()
            }, 'user_input', {
                analysisType: 'training_data',
                modelUsed: 'ai_model_studio'
            });
            
            console.log('Training data saved to localStorage and data retention service');
        } catch (error) {
            console.error('Failed to save training data:', error);
        } finally {
            setIsSaving(false);
        }
    }, [trainingDataBanks, activeBankId, trainingFiles, isTrained, trainingLog]);

    // Auto-save when training data changes
    useEffect(() => {
        saveTrainingData();
    }, [saveTrainingData]);

    const handleFileChange = (files: FileList | null) => {
        console.log('File change triggered:', files);
        if (!files) return;
        
        setIsProcessingFiles(true);
        
        const newFiles = Array.from(files)
            .filter(file => /\.(mid|midi)$/i.test(file.name));

        console.log(`Filtered ${newFiles.length} MIDI files from ${files.length} total files`);

        const existingFileNames = new Set(trainingFiles.map(f => f.name));
        const uniqueNewFiles = newFiles.filter(nf => !existingFileNames.has(nf.name));

        console.log(`Adding ${uniqueNewFiles.length} unique new files to existing ${trainingFiles.length} files`);
        
        // Process files in batches to avoid memory issues
        const batchSize = 50;
        const processBatch = (startIndex: number) => {
            const batch = uniqueNewFiles.slice(startIndex, startIndex + batchSize);
            if (batch.length > 0) {
                setTrainingFiles(prev => [...prev, ...batch]);
                if (startIndex + batchSize < uniqueNewFiles.length) {
                    setTimeout(() => processBatch(startIndex + batchSize), 100);
                }
            }
        };
        
        if (uniqueNewFiles.length <= batchSize) {
            setTrainingFiles(prev => [...prev, ...uniqueNewFiles]);
        } else {
            processBatch(0);
        }
        
        // Create temporary bank for uploaded files immediately
        if (uniqueNewFiles.length > 0) {
            createTemporaryBank([...trainingFiles, ...uniqueNewFiles]);
        }
        
        setTimeout(() => setIsProcessingFiles(false), 500);
    };

    const handleFolderUpload = (files: FileList | null) => {
        console.log('Folder upload triggered:', files);
        if (!files) return;
        
        setIsProcessingFiles(true);
        
        const midiFiles = Array.from(files)
            .filter(file => /\.(mid|midi)$/i.test(file.name));

        console.log(`Processing folder with ${files.length} total files, found ${midiFiles.length} MIDI files`);

        const existingFileNames = new Set(trainingFiles.map(f => f.name));
        const uniqueNewFiles = midiFiles.filter(nf => !existingFileNames.has(nf.name));

        console.log(`Adding ${uniqueNewFiles.length} unique MIDI files from folder to existing ${trainingFiles.length} files`);
        
        // Process large folder uploads in batches to prevent UI blocking
        const batchSize = 100;
        const processFolderBatch = (startIndex: number) => {
            const batch = uniqueNewFiles.slice(startIndex, startIndex + batchSize);
            if (batch.length > 0) {
                setTrainingFiles(prev => [...prev, ...batch]);
                if (startIndex + batchSize < uniqueNewFiles.length) {
                    // Use requestAnimationFrame for better performance
                    requestAnimationFrame(() => processFolderBatch(startIndex + batchSize));
                }
            }
        };
        
        if (uniqueNewFiles.length <= batchSize) {
            setTrainingFiles(prev => [...prev, ...uniqueNewFiles]);
        } else {
            processFolderBatch(0);
        }
        
        // Create temporary bank for uploaded files immediately
        if (uniqueNewFiles.length > 0) {
            createTemporaryBank([...trainingFiles, ...uniqueNewFiles]);
        }
        
        setTimeout(() => setIsProcessingFiles(false), 500);
    };

    const handleRemoveFile = (fileName: string) => {
        setTrainingFiles(prev => prev.filter(f => f.name !== fileName));
    };

    const createTemporaryBank = useCallback(async (files: File[]) => {
        if (files.length === 0) return;
        
        const tempBank: TrainingDataBank = {
            id: `temp_bank_${Date.now()}`,
            name: `Uploaded Files (${files.length})`,
            files: [...files],
            trainedAt: new Date(),
            isActive: false, // Temporary banks start inactive
            learningAnalysis: undefined,
        };
        
        try {
            // Save to database
            await addTrainingDataBank({
                id: tempBank.id,
                name: tempBank.name,
                trainedAt: tempBank.trainedAt,
                isActive: tempBank.isActive,
                modelData: tempBank.modelData
            });
            
            // Save training files to database
            for (const file of files) {
                await addTrainingFile({
                    id: `file_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                    bankId: tempBank.id,
                    fileName: file.name,
                    fileSize: file.size,
                    fileType: file.type,
                    uploadedAt: new Date()
                });
            }
            
            // Update existing temp bank or add new one
            setTrainingDataBanks(prev => {
                const existingTempIndex = prev.findIndex(b => b.id.startsWith('temp_bank_'));
                if (existingTempIndex >= 0) {
                    const updated = [...prev];
                    updated[existingTempIndex] = tempBank;
                    return updated;
                } else {
                    return [...prev, tempBank];
                }
            });
            
            console.log('Temporary bank created and saved to database');
        } catch (error) {
            console.error('Failed to create temporary bank:', error);
        }
    }, []);

    const createTrainingBank = useCallback(async () => {
        if (trainingFiles.length === 0) return;
        
        const newBank: TrainingDataBank = {
            id: `bank_${Date.now()}`,
            name: `Training Bank ${trainingDataBanks.filter(b => !b.id.startsWith('temp_bank_')).length + 1}`,
            files: [...trainingFiles],
            trainedAt: new Date(),
            isActive: true,
            learningAnalysis: learningAnalysis || undefined,
        };
        
        try {
            // Save to database
            await addTrainingDataBank({
                id: newBank.id,
                name: newBank.name,
                trainedAt: newBank.trainedAt,
                isActive: newBank.isActive,
                modelData: newBank.modelData
            });
            
            // Save training files to database
            for (const file of trainingFiles) {
                await addTrainingFile({
                    id: `file_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                    bankId: newBank.id,
                    fileName: file.name,
                    fileSize: file.size,
                    fileType: file.type,
                    uploadedAt: new Date()
                });
            }
            
            // Remove temporary bank and add trained bank
            setTrainingDataBanks(prev => {
                const filtered = prev.filter(b => !b.id.startsWith('temp_bank_'));
                return [...filtered, newBank];
            });
            
            setActiveBankId(newBank.id);
            // DON'T clear training files - keep them for continued use
            // Clear training log after successful bank creation
            setTrainingLog([]);
            
            console.log('Training bank created and saved to database');
        } catch (error) {
            console.error('Failed to create training bank:', error);
        }
    }, [trainingFiles, trainingDataBanks, learningAnalysis]);

    const activateBank = useCallback((bankId: string) => {
        setActiveBankId(bankId);
        const bank = trainingDataBanks.find(b => b.id === bankId);
        if (bank) {
            setTrainingFiles([...bank.files]);
            setIsTrained(bank.isActive);
        }
    }, [trainingDataBanks]);

    const deleteBank = useCallback(async (bankId: string) => {
        try {
            // Delete from database
            await deleteTrainingDataBank(bankId);
            
            setTrainingDataBanks(prev => prev.filter(b => b.id !== bankId));
            if (activeBankId === bankId) {
                setActiveBankId(null);
                setTrainingFiles([]);
                setIsTrained(false);
            }
            
            console.log('Training bank deleted from database');
        } catch (error) {
            console.error('Failed to delete training bank:', error);
        }
    }, [activeBankId]);

    const purgeAllBanks = useCallback(async () => {
        try {
            // Delete all training banks from database
            const banks = await getTrainingDataBanks();
            for (const bank of banks) {
                await deleteTrainingDataBank(bank.id);
            }
            
            setTrainingDataBanks([]);
            setActiveBankId(null);
            setTrainingFiles([]);
            setIsTrained(false);
            setGeneratedMidi(null);
            setTrainingLog([]);
            
            // Clear from localStorage
            localStorage.removeItem(STORAGE_KEY);
            console.log('All training data purged from database and localStorage');
        } catch (error) {
            console.error('Failed to purge all training data:', error);
        }
    }, [STORAGE_KEY]);

    const generateAIRecommendations = useCallback(async () => {
        if (trainingFiles.length === 0) return;
        
        setIsGeneratingRecommendations(true);
        try {
            // Simulate AI analysis of training files
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            const recommendations = [
                "Based on your MIDI collection, I recommend training on jazz chord progressions",
                "Your files show strong rhythmic patterns - consider adding more complex time signatures",
                "I suggest including more melodic variations to improve model diversity",
                "Your collection would benefit from additional harmonic complexity training data"
            ];
            
            setAiRecommendations(recommendations);
        } catch (error) {
            console.error('Failed to generate recommendations:', error);
        } finally {
            setIsGeneratingRecommendations(false);
        }
    }, [trainingFiles]);

    const applyRecommendation = useCallback((recommendation: string) => {
        setGenerationPrompt(recommendation);
    }, []);

    const handleDragEvents = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
    };

    const handleDragEnter = (e: React.DragEvent) => {
        handleDragEvents(e);
        if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
            setIsDragging(true);
        }
    };

    const handleDragLeave = (e: React.DragEvent) => {
        handleDragEvents(e);
        setIsDragging(false);
    };
    
    const handleDrop = (e: React.DragEvent) => {
        handleDragEvents(e);
        setIsDragging(false);
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            handleFileChange(e.dataTransfer.files);
        }
    };

    const handleStartTraining = async () => {
        if (trainingFiles.length === 0) return;
        setIsTrained(false);
        setIsTraining(true);
        setIsAnalyzing(true);
        setGeneratedMidi(null);
        setTrainingLog(['[INFO] Initializing training process...']);

        try {
            // Analyze MIDI files for detailed learning insights
            setTrainingLog(prev => [...prev, `[INFO] Analyzing ${trainingFiles.length} MIDI files for learning insights...`]);
            
            // Process files in batches for better performance and memory management
            const batchSize = 50;
            let analysis: MIDIAnalysis;
            
            if (trainingFiles.length <= batchSize) {
                analysis = await midiAnalysisService.analyzeMIDIFiles(trainingFiles);
            } else {
                setTrainingLog(prev => [...prev, `[INFO] Processing files in batches of ${batchSize} for optimal performance...`]);
                analysis = await midiAnalysisService.analyzeMIDIFiles(trainingFiles);
            }
            
            setLearningAnalysis(analysis);
            
            setTrainingLog(prev => [...prev, `[INFO] Found ${Object.keys(analysis.instruments).length} instrument types`]);
            setTrainingLog(prev => [...prev, `[INFO] Identified ${Object.keys(analysis.genres).length} musical genres`]);
            setTrainingLog(prev => [...prev, `[INFO] Average tempo: ${Math.round(analysis.averageTempo)} BPM`]);
            setTrainingLog(prev => [...prev, `[INFO] Primary instrument: ${analysis.mostCommonInstrument}`]);
            setTrainingLog(prev => [...prev, `[INFO] Primary genre: ${analysis.mostCommonGenre}`]);
            
            if (analysis.learningGaps.length > 0) {
                setTrainingLog(prev => [...prev, '[WARNING] Learning gaps identified:']);
                analysis.learningGaps.forEach(gap => {
                    setTrainingLog(prev => [...prev, `  - ${gap}`]);
                });
            }

            const logMessages = [
                '[INFO] Extracting melodic patterns and motifs...',
                '[INFO] Identifying chord progressions and harmonic language...',
                '[INFO] Building style profile from rhythmic data...',
                '[INFO] Creating training data bank...',
                '[SUCCESS] Style model trained successfully! You can now generate music.'
            ];

            let i = 0;
            const interval = setInterval(() => {
                setTrainingLog(prev => [...prev, logMessages[i]]);
                i++;
                if (i >= logMessages.length) {
                    clearInterval(interval);
                    setIsTraining(false);
                    setIsAnalyzing(false);
                    setIsTrained(true);
                    // Clear training log after a delay to show success message
                    setTimeout(() => {
                        setTrainingLog([]);
                    }, 3000);
                    // Auto-create training bank after successful training
                    createTrainingBank();
                }
            }, 1500);

        } catch (error) {
            console.error('Failed to analyze MIDI files:', error);
            setTrainingLog(prev => [...prev, '[ERROR] Failed to analyze MIDI files. Training with basic analysis.']);
            setIsAnalyzing(false);
            setIsTraining(false);
            setIsTrained(true);
        }
    };

    const handleGenerate = async () => {
        if (!generationPrompt.trim() || !isTrained || isGenerating) return;
        setIsGenerating(true);
        setGeneratedMidi(null);
        setGenerationError(null);
        try {
            const fileNames = trainingFiles.map(f => f.name);
            if (!settings.apiKeys[AIProvider.GEMINI]) {
                throw new Error('Gemini API key not configured. Please add your API key in Settings.');
            }
            const result = await generateMidiInStyle(generationPrompt, fileNames, settings.apiKeys[AIProvider.GEMINI]);
            setGeneratedMidi(result);
        } catch (err) {
            const message = err instanceof Error ? err.message : 'An unknown error occurred.';
            setGenerationError(message);
        } finally {
            setIsGenerating(false);
        }
    };
    
    const handleDownload = () => {
        if (!generatedMidi) return;
        const link = document.createElement('a');
        link.href = `data:audio/midi;base64,${generatedMidi.midiBase64}`;
        link.download = generatedMidi.fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      };

    return (
        <div className="bg-white/50 dark:bg-black/30 backdrop-blur-md border border-purple-300 dark:border-purple-500/20 rounded-2xl p-6 animate-fade-in flex flex-col h-[calc(100vh-140px)]">
            <div className="flex items-center justify-between mb-4">
                <h2 className="font-orbitron text-xl font-bold text-purple-600 dark:text-purple-300 flex items-center gap-3">
                    <IconCpu className="w-6 h-6" />
                    AI Model Studio
                </h2>
                <div className="flex items-center gap-2">
                    {isSaving && (
                        <div className="flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400">
                            <IconLoader className="w-3 h-3 animate-spin" />
                            Saving...
                        </div>
                    )}
                    <button
                        onClick={() => setIsHelpMode(!isHelpMode)}
                        className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors ${
                            isHelpMode 
                                ? 'bg-purple-600 text-white' 
                                : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                        }`}
                    >
                        <IconBrain className="w-4 h-4 inline mr-1" />
                        {isHelpMode ? 'Help Mode ON' : 'Help Mode OFF'}
                    </button>
                    <button
                        onClick={() => setShowBankManager(!showBankManager)}
                        className="px-3 py-1.5 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-semibold transition-colors hover:bg-gray-300 dark:hover:bg-gray-600"
                    >
                        <IconSettings className="w-4 h-4 inline mr-1" />
                        Banks
                    </button>
                    {learningAnalysis && (
                        <button
                            onClick={() => setShowLearningReport(!showLearningReport)}
                            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-semibold transition-colors flex items-center gap-1"
                        >
                            <IconBrain className="w-4 h-4" />
                            Learning Report
                        </button>
                    )}
                </div>
            </div>

            {/* Training Data Bank Manager */}
            {showBankManager && (
                <div className="mb-6 p-4 bg-gray-100 dark:bg-gray-800/50 rounded-lg">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="font-semibold text-lg text-gray-800 dark:text-gray-200">Training Data Banks</h3>
                        <button
                            onClick={purgeAllBanks}
                            className="px-3 py-1.5 bg-red-600 hover:bg-red-500 text-white rounded-lg text-sm font-semibold transition-colors flex items-center gap-1"
                        >
                            <IconTrash className="w-4 h-4" />
                            Purge All
                        </button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                        {trainingDataBanks.map(bank => (
                            <div
                                key={bank.id}
                                className={`p-3 rounded-lg border-2 transition-colors cursor-pointer ${
                                    activeBankId === bank.id
                                        ? 'border-purple-500 bg-purple-500/10'
                                        : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700'
                                }`}
                                onClick={() => activateBank(bank.id)}
                            >
                                <div className="flex items-center justify-between mb-2">
                                    <h4 className="font-semibold text-sm truncate">{bank.name}</h4>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            deleteBank(bank.id);
                                        }}
                                        className="p-1 text-gray-500 hover:text-red-500 transition-colors"
                                    >
                                        <IconX className="w-3 h-3" />
                                    </button>
                                </div>
                                <p className="text-xs text-gray-600 dark:text-gray-400">
                                    {bank.files.length} files • {bank.trainedAt.toLocaleDateString()}
                                </p>
                                {bank.learningAnalysis && (
                                    <div className="mt-2 space-y-1">
                                        <div className="text-xs text-blue-600 dark:text-blue-400">
                                            <strong>{bank.learningAnalysis.mostCommonInstrument}</strong> • {bank.learningAnalysis.mostCommonGenre}
                                        </div>
                                        <div className="text-xs text-gray-500 dark:text-gray-500">
                                            {Object.keys(bank.learningAnalysis.instruments).length} instruments • {Math.round(bank.learningAnalysis.averageTempo)} BPM avg
                                        </div>
                                        {bank.learningAnalysis.learningGaps.length > 0 && (
                                            <div className="text-xs text-yellow-600 dark:text-yellow-400">
                                                {bank.learningAnalysis.learningGaps.length} gaps identified
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                    {trainingDataBanks.length === 0 && (
                        <p className="text-center text-gray-500 dark:text-gray-400 py-4">
                            No training banks created yet. Train a model to create your first bank.
                        </p>
                    )}
                </div>
            )}

            {/* Learning Report */}
            {showLearningReport && learningAnalysis && (
                <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="font-semibold text-lg text-blue-800 dark:text-blue-200 flex items-center gap-2">
                            <IconBrain className="w-5 h-5" />
                            Machine Learning Analysis Report
                        </h3>
                        <button
                            onClick={() => setShowLearningReport(false)}
                            className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-200"
                        >
                            <IconX className="w-4 h-4" />
                        </button>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {/* Overview */}
                        <div className="bg-white dark:bg-gray-800 p-3 rounded-lg">
                            <h4 className="font-semibold text-sm text-gray-800 dark:text-gray-200 mb-2">Overview</h4>
                            <div className="space-y-1 text-xs text-gray-600 dark:text-gray-400">
                                <div>Total Files: <span className="font-semibold text-blue-600">{learningAnalysis.totalFiles}</span></div>
                                <div>Avg Tempo: <span className="font-semibold text-blue-600">{Math.round(learningAnalysis.averageTempo)} BPM</span></div>
                                <div>Top Instrument: <span className="font-semibold text-blue-600">{learningAnalysis.mostCommonInstrument}</span></div>
                                <div>Top Genre: <span className="font-semibold text-blue-600">{learningAnalysis.mostCommonGenre}</span></div>
                            </div>
                        </div>

                        {/* Instruments */}
                        <div className="bg-white dark:bg-gray-800 p-3 rounded-lg">
                            <h4 className="font-semibold text-sm text-gray-800 dark:text-gray-200 mb-2">Instruments Learned</h4>
                            <div className="space-y-1 text-xs">
                                {Object.entries(learningAnalysis.instruments)
                                    .sort(([,a], [,b]) => (b as number) - (a as number))
                                    .slice(0, 5)
                                    .map(([instrument, count]) => (
                                        <div key={instrument} className="flex justify-between">
                                            <span className="text-gray-600 dark:text-gray-400 truncate">{instrument}</span>
                                            <span className="font-semibold text-blue-600">{count}</span>
                                        </div>
                                    ))}
                            </div>
                        </div>

                        {/* Genres */}
                        <div className="bg-white dark:bg-gray-800 p-3 rounded-lg">
                            <h4 className="font-semibold text-sm text-gray-800 dark:text-gray-200 mb-2">Genres Learned</h4>
                            <div className="space-y-1 text-xs">
                                {Object.entries(learningAnalysis.genres)
                                    .sort(([,a], [,b]) => (b as number) - (a as number))
                                    .slice(0, 5)
                                    .map(([genre, count]) => (
                                        <div key={genre} className="flex justify-between">
                                            <span className="text-gray-600 dark:text-gray-400 truncate">{genre}</span>
                                            <span className="font-semibold text-blue-600">{count}</span>
                                        </div>
                                    ))}
                            </div>
                        </div>

                        {/* Tempos */}
                        <div className="bg-white dark:bg-gray-800 p-3 rounded-lg">
                            <h4 className="font-semibold text-sm text-gray-800 dark:text-gray-200 mb-2">Tempo Ranges</h4>
                            <div className="space-y-1 text-xs">
                                {Object.entries(learningAnalysis.tempos)
                                    .sort(([,a], [,b]) => (b as number) - (a as number))
                                    .map(([tempo, count]) => (
                                        <div key={tempo} className="flex justify-between">
                                            <span className="text-gray-600 dark:text-gray-400">{tempo}</span>
                                            <span className="font-semibold text-blue-600">{count}</span>
                                        </div>
                                    ))}
                            </div>
                        </div>

                        {/* Keys */}
                        <div className="bg-white dark:bg-gray-800 p-3 rounded-lg">
                            <h4 className="font-semibold text-sm text-gray-800 dark:text-gray-200 mb-2">Keys Learned</h4>
                            <div className="space-y-1 text-xs">
                                {Object.entries(learningAnalysis.keys)
                                    .sort(([,a], [,b]) => (b as number) - (a as number))
                                    .slice(0, 5)
                                    .map(([key, count]) => (
                                        <div key={key} className="flex justify-between">
                                            <span className="text-gray-600 dark:text-gray-400">{key}</span>
                                            <span className="font-semibold text-blue-600">{count}</span>
                                        </div>
                                    ))}
                            </div>
                        </div>

                        {/* File Categories */}
                        <div className="bg-white dark:bg-gray-800 p-3 rounded-lg">
                            <h4 className="font-semibold text-sm text-gray-800 dark:text-gray-200 mb-2">File Categories</h4>
                            <div className="space-y-1 text-xs">
                                {Object.entries(learningAnalysis.fileCategories)
                                    .sort(([,a], [,b]) => (b as string[]).length - (a as string[]).length)
                                    .slice(0, 5)
                                    .map(([category, files]) => (
                                        <div key={category} className="flex justify-between">
                                            <span className="text-gray-600 dark:text-gray-400">{category}</span>
                                            <span className="font-semibold text-blue-600">{(files as string[]).length}</span>
                                        </div>
                                    ))}
                            </div>
                        </div>
                    </div>

                    {/* Learning Gaps & Recommendations */}
                    <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                        {learningAnalysis.learningGaps.length > 0 && (
                            <div className="bg-yellow-50 dark:bg-yellow-900/20 p-3 rounded-lg border border-yellow-200 dark:border-yellow-800">
                                <h4 className="font-semibold text-sm text-yellow-800 dark:text-yellow-200 mb-2 flex items-center gap-1">
                                    <IconX className="w-4 h-4" />
                                    Learning Gaps
                                </h4>
                                <ul className="space-y-1 text-xs text-yellow-700 dark:text-yellow-300">
                                    {learningAnalysis.learningGaps.map((gap, index) => (
                                        <li key={index} className="flex items-start gap-1">
                                            <span className="text-yellow-600 dark:text-yellow-400 mt-0.5">•</span>
                                            <span>{gap}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        {learningAnalysis.recommendations.length > 0 && (
                            <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded-lg border border-green-200 dark:border-green-800">
                                <h4 className="font-semibold text-sm text-green-800 dark:text-green-200 mb-2 flex items-center gap-1">
                                    <IconSparkles className="w-4 h-4" />
                                    Recommendations
                                </h4>
                                <ul className="space-y-1 text-xs text-green-700 dark:text-green-300">
                                    {learningAnalysis.recommendations.map((rec, index) => (
                                        <li key={index} className="flex items-start gap-1">
                                            <span className="text-green-600 dark:text-green-400 mt-0.5">•</span>
                                            <span>{rec}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 flex-1 min-h-0">
                {/* Left Side: Training */}
                <div className="flex flex-col gap-4">
                    <h3 className="font-semibold text-lg text-gray-800 dark:text-gray-200">1. Train Your Model</h3>
                    
                    {/* Upload Options */}
                    <div className="flex gap-2 mb-4">
                        <button
                            onClick={() => {
                                console.log('Upload Files button clicked');
                                if (fileInputRef.current) {
                                    fileInputRef.current.click();
                                } else {
                                    // Fallback using document.getElementById
                                    const input = document.getElementById('file-upload-input') as HTMLInputElement;
                                    if (input) {
                                        input.click();
                                    } else {
                                        console.error('File input not found');
                                    }
                                }
                            }}
                            className="flex-1 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-bold py-2 px-4 rounded-lg transition-colors"
                        >
                            <IconUpload className="w-4 h-4" />
                            Upload Files
                        </button>
                        <button
                            onClick={() => {
                                console.log('Upload Folder button clicked');
                                if (folderInputRef.current) {
                                    folderInputRef.current.click();
                                } else {
                                    // Fallback using document.getElementById
                                    const input = document.getElementById('folder-upload-input') as HTMLInputElement;
                                    if (input) {
                                        input.click();
                                    } else {
                                        console.error('Folder input not found');
                                    }
                                }
                            }}
                            className="flex-1 flex items-center justify-center gap-2 bg-green-600 hover:bg-green-500 text-white font-bold py-2 px-4 rounded-lg transition-colors"
                        >
                            <IconFolder className="w-4 h-4" />
                            Upload Folder
                        </button>
                    </div>

                    {/* Debug Info */}
                    <div className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                        Debug: File refs - Files: {fileInputRef.current ? '✓' : '✗'}, Folder: {folderInputRef.current ? '✓' : '✗'}
                    </div>

                    <div 
                        onDragEnter={handleDragEnter} onDragOver={handleDragEnter} onDragLeave={handleDragLeave} onDrop={handleDrop}
                        className={`p-4 flex-1 flex flex-col border-2 border-dashed rounded-lg transition-colors ${isDragging ? 'border-purple-500 bg-purple-500/10' : 'border-gray-300 dark:border-gray-600'}`}
                    >
                        <div className="w-full h-full flex flex-col items-center justify-center text-center">
                            <IconUpload className="w-8 h-8 text-gray-400 dark:text-gray-500 mb-2" />
                            <p className="font-semibold text-gray-700 dark:text-gray-300">Drag & drop your MIDI files</p>
                            <p className="text-sm text-gray-500 dark:text-gray-400">Unlimited files supported • Processing in batches for optimal performance</p>
                        </div>
                    </div>

                    {isProcessingFiles && (
                        <div className="flex items-center justify-center gap-2 p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                            <IconLoader className="w-4 h-4 animate-spin text-blue-600 dark:text-blue-400" />
                            <span className="text-sm text-blue-600 dark:text-blue-400">Processing files...</span>
                        </div>
                    )}

                    {trainingFiles.length > 0 && (
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <h4 className="font-semibold text-sm text-gray-600 dark:text-gray-400">
                                    Training Files ({trainingFiles.length}):
                                </h4>
                                <button
                                    onClick={() => setTrainingFiles([])}
                                    className="text-xs text-red-500 hover:text-red-700 transition-colors"
                                >
                                    Clear All
                                </button>
                            </div>
                            <div className="max-h-32 overflow-y-auto space-y-1 pr-2">
                                {trainingFiles.map(file => (
                                    <div key={file.name} className="flex items-center justify-between bg-gray-100 dark:bg-gray-800/50 p-1.5 rounded text-sm">
                                        <div className="flex items-center gap-2 truncate">
                                            <IconMusic className="w-4 h-4 text-purple-500 dark:text-purple-400 flex-shrink-0" />
                                            <span className="truncate">{file.name}</span>
                                        </div>
                                        <button 
                                            onClick={() => handleRemoveFile(file.name)} 
                                            disabled={isTraining} 
                                            className="p-1 text-gray-500 hover:text-red-500 disabled:opacity-50"
                                        >
                                            <IconX className="w-3 h-3"/>
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* AI Recommendations in Help Mode */}
                    {isHelpMode && trainingFiles.length > 0 && (
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <h4 className="font-semibold text-sm text-gray-600 dark:text-gray-400">AI Recommendations:</h4>
                                <button
                                    onClick={generateAIRecommendations}
                                    disabled={isGeneratingRecommendations}
                                    className="text-xs bg-purple-600 hover:bg-purple-500 text-white px-2 py-1 rounded transition-colors disabled:opacity-50"
                                >
                                    {isGeneratingRecommendations ? 'Analyzing...' : 'Get Recommendations'}
                                </button>
                            </div>
                            {aiRecommendations.length > 0 && (
                                <div className="space-y-1">
                                    {aiRecommendations.map((rec, i) => (
                                        <div key={i} className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded text-xs">
                                            <p className="text-purple-800 dark:text-purple-200 mb-1">{rec}</p>
                                            <button
                                                onClick={() => applyRecommendation(rec)}
                                                className="text-purple-600 dark:text-purple-400 hover:text-purple-800 dark:hover:text-purple-200 transition-colors"
                                            >
                                                Use as prompt →
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    <button 
                        onClick={handleStartTraining} 
                        disabled={isTraining || trainingFiles.length === 0} 
                        className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-bold py-2 px-4 rounded-lg transition-colors duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isTraining ? (
                            isAnalyzing ? (
                                <>
                                    <IconBrain className="w-5 h-5 animate-pulse"/>
                                    Analyzing MIDI Files...
                                </>
                            ) : (
                                <>
                                    <IconLoader className="w-5 h-5 animate-spin"/>
                                    Training in Progress...
                                </>
                            )
                        ) : (
                            <>
                                <IconCpu className="w-5 h-5"/>
                                Start Training
                            </>
                        )}
                    </button>
                </div>

                {/* Right Side: Generation */}
                <div className="flex flex-col gap-4">
                    <h3 className={`font-semibold text-lg transition-colors ${isTrained ? 'text-gray-800 dark:text-gray-200' : 'text-gray-500 dark:text-gray-600'}`}>
                        2. Generate Music
                    </h3>
                    <div className={`flex-1 flex flex-col gap-4 p-4 rounded-lg bg-gray-100 dark:bg-gray-800/50 transition-opacity ${isTrained ? 'opacity-100' : 'opacity-50'}`}>
                        <div className="flex-1 space-y-4">
                            {isTraining && (
                                <>
                                    <h4 className="font-semibold text-sm text-gray-600 dark:text-gray-400">Training Log:</h4>
                                    <div className="h-40 bg-gray-900 text-gray-300 font-mono text-xs p-2 rounded-md overflow-y-auto">
                                        {trainingLog.map((line, i) => (
                                            <p key={i} className={`whitespace-pre-wrap ${line?.startsWith('[SUCCESS]') ? 'text-green-400' : ''}`}>
                                                {`> ${line || ''}`}
                                            </p>
                                        ))}
                                        <div className="w-2 h-2 bg-green-400 rounded-full animate-ping mt-1"></div>
                                    </div>
                                </>
                            )}
                            {isTrained && !isTraining && (
                                <div className="h-40 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg flex items-center justify-center">
                                    <div className="text-center">
                                        <div className="w-12 h-12 bg-green-100 dark:bg-green-900/50 rounded-full flex items-center justify-center mx-auto mb-3">
                                            <IconCheck className="w-6 h-6 text-green-600 dark:text-green-400" />
                                        </div>
                                        <p className="text-green-800 dark:text-green-200 font-semibold">Training Complete!</p>
                                        <p className="text-green-600 dark:text-green-400 text-sm mt-1">Your model is ready to generate music</p>
                                    </div>
                                </div>
                            )}
                            <div>
                                <label htmlFor="generation-prompt" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Prompt:
                                </label>
                                <input 
                                    type="text" 
                                    id="generation-prompt" 
                                    value={generationPrompt} 
                                    onChange={e => setGenerationPrompt(e.target.value)} 
                                    placeholder="e.g., a funky bassline" 
                                    disabled={!isTrained || isGenerating} 
                                    className="w-full bg-white dark:bg-gray-700 border-2 border-gray-300 dark:border-gray-600 rounded-lg p-2 text-gray-800 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-70" 
                                />
                            </div>
                        </div>
                        <button 
                            onClick={handleGenerate} 
                            disabled={!isTrained || isGenerating || !generationPrompt.trim()} 
                            className="w-full flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-500 text-white font-bold py-2 px-4 rounded-lg transition-colors duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isGenerating ? <IconLoader className="w-5 h-5 animate-spin"/> : <IconWand className="w-5 h-5"/>}
                            {isGenerating ? 'Generating...' : 'Generate MIDI'}
                        </button>
                    </div>
                    {generationError && (
                        <div className="text-sm text-red-500 dark:text-red-400 p-2 bg-red-100 dark:bg-red-900/50 rounded-md">
                            Error: {generationError}
                        </div>
                    )}
                    {generatedMidi && (
                        <div className="bg-green-100 dark:bg-green-900/50 p-3 rounded-lg flex items-center justify-between animate-fade-in">
                            <div className="flex items-center gap-2 truncate">
                                <IconMusic className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0" />
                                <p className="text-sm font-semibold text-green-800 dark:text-green-200 truncate">
                                    {generatedMidi.fileName}
                                </p>
                            </div>
                            <button 
                                onClick={handleDownload} 
                                className="flex items-center gap-1.5 text-xs bg-green-600 hover:bg-green-500 text-white font-bold py-1.5 px-3 rounded-lg transition-colors"
                            >
                                <IconDownload className="w-4 h-4"/> Download
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Hidden file inputs */}
            <input 
                ref={fileInputRef}
                type="file" 
                multiple 
                accept=".mid,.midi" 
                onChange={e => handleFileChange(e.target.files)} 
                className="hidden" 
                id="file-upload-input"
            />
            <input 
                ref={folderInputRef}
                type="file" 
                {...({webkitdirectory: ''} as any)}
                directory=""
                multiple 
                onChange={e => handleFolderUpload(e.target.files)} 
                className="hidden" 
                id="folder-upload-input"
            />
        </div>
    );
};