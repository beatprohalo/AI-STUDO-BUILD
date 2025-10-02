import React, { useState, useEffect } from 'react';
import { IconEye, IconClipboard, IconLoader, IconCheck, IconX, IconRefresh } from './Icon';
import { invoke } from '@tauri-apps/api/core';

interface ScreenInfoViewProps {
    onBriefCaptured: (brief: string) => void;
}

export const ScreenInfoView: React.FC<ScreenInfoViewProps> = ({ onBriefCaptured }) => {
    const [isActive, setIsActive] = useState(false);
    const [isCapturing, setIsCapturing] = useState(false);
    const [capturedText, setCapturedText] = useState<string>('');
    const [lastCaptureTime, setLastCaptureTime] = useState<Date | null>(null);
    const [error, setError] = useState<string | null>(null);

    const handleCaptureClipboard = async () => {
        setIsCapturing(true);
        setError(null);
        
        try {
            const text = await invoke<string>('get_clipboard_text');
            if (text && text.trim()) {
                setCapturedText(text);
                setLastCaptureTime(new Date());
                onBriefCaptured(text);
            } else {
                setError('No text found in clipboard');
            }
        } catch (err) {
            setError(`Failed to capture clipboard: ${err}`);
        } finally {
            setIsCapturing(false);
        }
    };

    const handleCaptureScreenshot = async () => {
        setIsCapturing(true);
        setError(null);
        
        try {
            await invoke('capture_screenshot');
            setLastCaptureTime(new Date());
            // Screenshot is copied to clipboard, so we can capture it as text
            setTimeout(() => handleCaptureClipboard(), 500);
        } catch (err) {
            setError(`Failed to capture screenshot: ${err}`);
        } finally {
            setIsCapturing(false);
        }
    };

    const handleClear = () => {
        setCapturedText('');
        setError(null);
        setLastCaptureTime(null);
    };

    const handleUseText = () => {
        if (capturedText.trim()) {
            onBriefCaptured(capturedText);
        }
    };

    return (
        <div className="bg-white/50 dark:bg-black/30 backdrop-blur-md border border-purple-300 dark:border-purple-500/20 rounded-2xl p-6 animate-fade-in flex flex-col h-[calc(100vh-140px)]">
            <h2 className="font-orbitron text-xl font-bold text-purple-600 dark:text-purple-300 flex items-center gap-3 mb-4">
                <IconEye className="w-6 h-6" />
                Screen Info Mode
            </h2>

            <div className="flex flex-col gap-4 mb-6">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => setIsActive(!isActive)}
                        className={`px-4 py-2 rounded-lg font-semibold transition-all ${
                            isActive 
                                ? 'bg-green-600 text-white' 
                                : 'bg-gray-600 text-gray-300 hover:bg-gray-500'
                        }`}
                    >
                        {isActive ? 'Active' : 'Activate'} Screen Reading
                    </button>
                    
                    {isActive && (
                        <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                            <span className="text-sm font-medium">Monitoring clipboard</span>
                        </div>
                    )}
                </div>

                <div className="flex gap-2">
                    <button
                        onClick={handleCaptureClipboard}
                        disabled={isCapturing}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors disabled:opacity-50"
                    >
                        {isCapturing ? <IconLoader className="w-4 h-4 animate-spin" /> : <IconClipboard className="w-4 h-4" />}
                        Capture Clipboard
                    </button>
                    
                    <button
                        onClick={handleCaptureScreenshot}
                        disabled={isCapturing}
                        className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg transition-colors disabled:opacity-50"
                    >
                        {isCapturing ? <IconLoader className="w-4 h-4 animate-spin" /> : <IconEye className="w-4 h-4" />}
                        Capture Screenshot
                    </button>
                </div>
            </div>

            {error && (
                <div className="bg-red-100 dark:bg-red-900/50 border border-red-300 dark:border-red-700 rounded-lg p-3 mb-4">
                    <div className="flex items-center gap-2 text-red-700 dark:text-red-300">
                        <IconX className="w-4 h-4" />
                        <span className="font-medium">Error:</span>
                        <span>{error}</span>
                    </div>
                </div>
            )}

            {capturedText && (
                <div className="flex-1 flex flex-col">
                    <div className="flex items-center justify-between mb-3">
                        <h3 className="font-semibold text-gray-800 dark:text-gray-200">Captured Content:</h3>
                        <div className="flex items-center gap-2">
                            {lastCaptureTime && (
                                <span className="text-xs text-gray-500 dark:text-gray-400">
                                    Captured: {lastCaptureTime.toLocaleTimeString()}
                                </span>
                            )}
                            <button
                                onClick={handleClear}
                                className="p-1 text-gray-500 hover:text-red-500 transition-colors"
                            >
                                <IconX className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                    
                    <div className="flex-1 bg-gray-100 dark:bg-gray-800/50 rounded-lg p-4 mb-4 overflow-y-auto">
                        <pre className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap font-mono">
                            {capturedText}
                        </pre>
                    </div>
                    
                    <div className="flex gap-2">
                        <button
                            onClick={handleUseText}
                            className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-500 text-white rounded-lg transition-colors"
                        >
                            <IconCheck className="w-4 h-4" />
                            Use as Brief
                        </button>
                        
                        <button
                            onClick={handleCaptureClipboard}
                            disabled={isCapturing}
                            className="flex items-center gap-2 px-4 py-2 bg-gray-600 hover:bg-gray-500 text-white rounded-lg transition-colors disabled:opacity-50"
                        >
                            <IconRefresh className="w-4 h-4" />
                            Refresh
                        </button>
                    </div>
                </div>
            )}

            {!capturedText && !error && (
                <div className="flex-1 flex items-center justify-center text-center text-gray-500 dark:text-gray-400">
                    <div>
                        <IconEye className="w-16 h-16 mx-auto mb-4 opacity-50" />
                        <h3 className="text-lg font-semibold mb-2">No Content Captured</h3>
                        <p>Use the buttons above to capture text from your clipboard or take a screenshot.</p>
                    </div>
                </div>
            )}
        </div>
    );
};
