import React, { useState, useEffect, useRef } from 'react';
import { ChatMessage } from '../types';
import { useVoiceRecognition } from '../hooks/useVoiceRecognition';
import { IconSend, IconMicrophone, IconPaperclip, IconSparkles, IconUser, IconLoader, IconX, IconCrop } from './Icon';
import { extractTextFromImage } from '../services/ocrService';

interface AssistantViewProps {
  messages: ChatMessage[];
  onSendMessage: (text: string, images: { type: string, data: string }[]) => void;
  isReplying: boolean;
}

const toBase64 = (file: File): Promise<{ type: string, data: string }> => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
        const result = reader.result as string;
        const [meta, data] = result.split(',');
        const type = meta.split(':')[1].split(';')[0];
        resolve({ type, data });
    };
    reader.onerror = error => reject(error);
});

export const AssistantView: React.FC<AssistantViewProps> = ({ messages, onSendMessage, isReplying }) => {
    const [inputText, setInputText] = useState('');
    const [inputImages, setInputImages] = useState<{ file: File, preview: string }[]>([]);
    const [isCapturing, setIsCapturing] = useState(false);
    const { isListening, transcript, startListening, stopListening } = useVoiceRecognition();
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (transcript) {
            setInputText(transcript);
        }
    }, [transcript]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, isReplying]);
    
    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        if (event.target.files) {
            const files = Array.from(event.target.files);
            // FIX: Explicitly type `file` as `File` to resolve incorrect type inference. This fixes access to `file.type`.
            const imageFiles = files.filter((file: File) => file.type.startsWith('image/'));
            if (imageFiles.length > 0) {
                // FIX: Explicitly type `file` as `File` to fix `URL.createObjectURL` argument type error.
                const previews = imageFiles.map((file: File) => ({ file, preview: URL.createObjectURL(file) }));
                setInputImages(prev => [...prev, ...previews].slice(0, 5)); // Limit to 5 images
            }
        }
    };
    
    const removeImage = (fileName: string) => {
        setInputImages(prev => prev.filter(img => img.file.name !== fileName));
    };

    const handleSend = async () => {
        if (isReplying || (inputText.trim() === '' && inputImages.length === 0)) return;

        const imagePayloads = await Promise.all(
            inputImages.map(img => toBase64(img.file))
        );

        onSendMessage(inputText, imagePayloads);
        setInputText('');
        setInputImages([]);
        if(isListening) stopListening();
    };

    const handleCaptureBrief = async () => {
        if (!window.frame?.captureScreenshot) {
            alert("Screenshot functionality is not available in this environment.");
            return;
        }
        setIsCapturing(true);
        try {
            const imageData = await window.frame.captureScreenshot();
            if (imageData) {
                const extractedText = await extractTextFromImage(imageData);
                setInputText(prev => prev ? `${prev}\n\n--- Captured Brief ---\n${extractedText}` : extractedText);
            }
        } catch (error) {
            console.error("Failed to capture screen or perform OCR:", error);
            setInputText(prev => prev ? `${prev}\n\n--- Error capturing brief ---` : 'Error capturing brief.');
        } finally {
            setIsCapturing(false);
        }
    };

    return (
        <div className="flex flex-col h-[calc(100vh-140px)] bg-white/50 dark:bg-black/30 backdrop-blur-md border border-purple-300 dark:border-purple-500/20 rounded-2xl animate-fade-in">
            {/* Message History */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {messages.map((msg) => (
                    <div key={msg.id} className={`flex gap-4 items-start ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        {msg.role === 'assistant' && (
                            <div className="w-10 h-10 flex-shrink-0 bg-purple-600 rounded-full flex items-center justify-center">
                                <IconSparkles className="w-6 h-6 text-white" />
                            </div>
                        )}
                        <div className={`max-w-lg p-4 rounded-2xl ${msg.role === 'user' ? 'bg-blue-600 text-white rounded-br-none' : 'bg-gray-200 dark:bg-gray-700/80 text-gray-800 dark:text-gray-200 rounded-bl-none'}`}>
                            {msg.images && msg.images.length > 0 && (
                                <div className="flex flex-wrap gap-2 mb-2">
                                    {msg.images.map((img, index) => (
                                        <img key={index} src={img} className="max-w-xs max-h-48 rounded-lg" alt="User upload" />
                                    ))}
                                </div>
                            )}
                            <p className="whitespace-pre-wrap">{msg.text}</p>
                        </div>
                        {msg.role === 'user' && (
                            <div className="w-10 h-10 flex-shrink-0 bg-gray-500 dark:bg-gray-600 rounded-full flex items-center justify-center">
                                <IconUser className="w-6 h-6 text-white" />
                            </div>
                        )}
                    </div>
                ))}
                {isReplying && (
                    <div className="flex gap-4 items-start justify-start">
                        <div className="w-10 h-10 flex-shrink-0 bg-purple-600 rounded-full flex items-center justify-center">
                            <IconSparkles className="w-6 h-6 text-white" />
                        </div>
                        <div className="max-w-lg p-4 rounded-2xl bg-gray-200 dark:bg-gray-700/80 text-gray-800 dark:text-gray-200 rounded-bl-none flex items-center gap-2">
                             <div className="w-2 h-2 bg-purple-500 dark:bg-purple-300 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                             <div className="w-2 h-2 bg-purple-500 dark:bg-purple-300 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                             <div className="w-2 h-2 bg-purple-500 dark:bg-purple-300 rounded-full animate-bounce"></div>
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="p-4 border-t border-purple-300 dark:border-purple-500/20">
                 {inputImages.length > 0 && (
                    <div className="flex gap-2 mb-2 p-2 bg-gray-100 dark:bg-gray-900/50 rounded-lg overflow-x-auto">
                        {inputImages.map(img => (
                            <div key={img.file.name} className="relative flex-shrink-0">
                                <img src={img.preview} className="w-20 h-20 object-cover rounded-md" />
                                <button onClick={() => removeImage(img.file.name)} className="absolute top-0 right-0 p-0.5 bg-black/50 rounded-full text-white hover:bg-red-500">
                                    <IconX className="w-4 h-4" />
                                </button>
                            </div>
                        ))}
                    </div>
                )}
                <div className="relative flex items-center gap-2">
                    <button onClick={() => fileInputRef.current?.click()} className="p-3 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 rounded-full text-gray-600 dark:text-gray-300 transition-colors" title="Attach Image">
                        <IconPaperclip className="w-5 h-5" />
                    </button>
                    <button onClick={handleCaptureBrief} disabled={isCapturing} className="p-3 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 rounded-full text-gray-600 dark:text-gray-300 transition-colors disabled:opacity-50 disabled:cursor-wait" title="Capture Brief from Screen">
                        {isCapturing ? <IconLoader className="w-5 h-5 animate-spin" /> : <IconCrop className="w-5 h-5" />}
                    </button>
                    <input type="file" ref={fileInputRef} onChange={handleFileChange} multiple accept="image/*" className="hidden" />
                    <textarea
                        value={inputText}
                        onChange={(e) => setInputText(e.target.value)}
                        onKeyDown={(e) => { if(e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                        placeholder="Type a message or use your voice..."
                        rows={1}
                        className="flex-1 resize-none max-h-40 bg-gray-100 dark:bg-gray-800/50 border-2 border-gray-300 dark:border-gray-700 rounded-lg p-3 pr-24 text-gray-800 dark:text-gray-300 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-1">
                         <button onClick={isListening ? stopListening : startListening} className={`p-3 rounded-full transition-colors ${isListening ? 'bg-red-600 animate-pulse text-white' : 'bg-transparent text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'}`} title={isListening ? 'Stop Listening' : 'Use Voice'}>
                            <IconMicrophone className="w-5 h-5" />
                        </button>
                        <button onClick={handleSend} disabled={isReplying} className="p-3 bg-purple-600 hover:bg-purple-500 rounded-full text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed" title="Send Message">
                            {isReplying ? <IconLoader className="w-5 h-5 animate-spin" /> : <IconSend className="w-5 h-5" />}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};