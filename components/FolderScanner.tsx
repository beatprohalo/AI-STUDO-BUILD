import React, { useState, useRef, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { IconFolder, IconMusic, IconWaveform, IconLoader, IconX, IconCheck, IconAlert } from './Icon';

interface ScannedFile {
    name: string;
    path: string;
    file_type: string;
    size: number;
}

interface FolderScannerProps {
    onFilesScanned: (files: ScannedFile[]) => void;
    onClose: () => void;
}

export const FolderScanner: React.FC<FolderScannerProps> = ({ onFilesScanned, onClose }) => {
    const [selectedFolder, setSelectedFolder] = useState<string>('');
    const [isScanning, setIsScanning] = useState(false);
    const [scannedFiles, setScannedFiles] = useState<ScannedFile[]>([]);
    const [scanError, setScanError] = useState<string>('');
    const [scanProgress, setScanProgress] = useState<string>('');
    const [isSelectingFolder, setIsSelectingFolder] = useState(false);

    const handleFolderSelect = () => {
        console.log('Folder select button clicked');
        setIsSelectingFolder(true);
        
        // Create a temporary input element for folder selection
        const tempInput = document.createElement('input');
        tempInput.type = 'file';
        tempInput.setAttribute('webkitdirectory', '');
        tempInput.setAttribute('directory', '');
        tempInput.setAttribute('multiple', '');
        tempInput.accept = '.mp3,.wav,.flac,.aac,.ogg,.m4a,.mid,.midi';
        tempInput.style.display = 'none';
        
        tempInput.onchange = (event: any) => {
            console.log('Temporary input change event triggered');
            const files = event.target.files;
            console.log('Files from temp input:', files);
            
            if (files && files.length > 0) {
                const firstFile = files[0];
                const folderPath = firstFile.webkitRelativePath ? 
                    firstFile.webkitRelativePath.split('/')[0] : 
                    'Selected folder';
                setSelectedFolder(folderPath);
                
                const fileList = Array.from(files);
                const audioFiles = fileList.filter((file: File) => {
                    const name = file.name.toLowerCase();
                    return name.endsWith('.mp3') || name.endsWith('.wav') || name.endsWith('.flac') || 
                           name.endsWith('.aac') || name.endsWith('.ogg') || name.endsWith('.m4a') ||
                           name.endsWith('.mid') || name.endsWith('.midi');
                });
                
                setScannedFiles(audioFiles.map((file: File) => ({
                    name: file.name,
                    path: (file as any).webkitRelativePath || file.name,
                    file_type: file.name.toLowerCase().includes('.mid') || file.name.toLowerCase().includes('.midi') ? 'midi' : 'audio',
                    size: file.size
                })));
                
                setScanProgress(`Found ${audioFiles.length} audio/MIDI files`);
                setScanError('');
            } else {
                setScanError('No files were selected. Please try selecting a folder again.');
            }
            
            setIsSelectingFolder(false);
            // Clean up
            document.body.removeChild(tempInput);
        };
        
        document.body.appendChild(tempInput);
        tempInput.click();
    };


    const scanFolder = async () => {
        if (!selectedFolder) return;

        setIsScanning(true);
        setScanError('');
        setScanProgress('Scanning directory...');

        try {
            const files = await invoke<ScannedFile[]>('scan_directory_for_audio_files', {
                directoryPath: selectedFolder
            });

            setScannedFiles(files);
            setScanProgress(`Found ${files.length} audio/MIDI files`);
        } catch (error) {
            setScanError(`Failed to scan directory: ${error}`);
            setScanProgress('');
        } finally {
            setIsScanning(false);
        }
    };

    const handleImportFiles = () => {
        onFilesScanned(scannedFiles);
        onClose();
    };

    const formatFileSize = (bytes: number): string => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    const getFileTypeIcon = (fileType: string) => {
        return fileType === 'audio' ? 
            <IconMusic className="w-4 h-4 text-purple-500" /> : 
            <IconWaveform className="w-4 h-4 text-blue-500" />;
    };

    const getFileTypeColor = (fileType: string) => {
        return fileType === 'audio' ? 'text-purple-600' : 'text-blue-600';
    };

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 w-full max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-200 flex items-center gap-3">
                        <IconFolder className="w-6 h-6 text-yellow-500" />
                        Folder Scanner
                    </h2>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                    >
                        <IconX className="w-5 h-5 text-gray-500" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto">
                    {/* Folder Selection */}
                    <div className="mb-6">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Select Folder to Scan
                        </label>
                        <div className="flex gap-3">
                            <button
                                onClick={handleFolderSelect}
                                disabled={isSelectingFolder}
                                className="flex-1 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 border-2 border-dashed border-gray-300 dark:border-gray-600 hover:border-purple-400 dark:hover:border-purple-500 rounded-lg p-4 text-left transition-all duration-200 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <div className="flex items-center gap-3">
                                    {isSelectingFolder ? (
                                        <IconLoader className="w-6 h-6 text-purple-500 animate-spin" />
                                    ) : (
                                        <IconFolder className="w-6 h-6 text-gray-400 group-hover:text-purple-500" />
                                    )}
                                    <div>
                                        <p className="font-medium text-gray-700 dark:text-gray-300">
                                            {isSelectingFolder ? 'Opening folder dialog...' : (selectedFolder || '📁 Click to select folder')}
                                        </p>
                                        <p className="text-sm text-gray-500">
                                            {isSelectingFolder ? 'Please wait...' : (selectedFolder ? 'Click to change folder' : 'Select a folder containing audio/MIDI files (will scan automatically)')}
                                        </p>
                                    </div>
                                </div>
                            </button>
                        </div>
                    </div>

                    {/* Progress/Error Display */}
                    {scanProgress && (
                        <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                            <p className="text-blue-700 dark:text-blue-300 flex items-center gap-2">
                                <IconCheck className="w-4 h-4" />
                                {scanProgress}
                            </p>
                        </div>
                    )}

                    {scanError && (
                        <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                            <p className="text-red-700 dark:text-red-300 flex items-center gap-2">
                                <IconAlert className="w-4 h-4" />
                                {scanError}
                            </p>
                        </div>
                    )}

                    {/* Scanned Files List */}
                    {scannedFiles.length > 0 && (
                        <div className="mb-6">
                            <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-3">
                                Found Files ({scannedFiles.length})
                            </h3>
                            <div className="max-h-60 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-lg">
                                <div className="divide-y divide-gray-200 dark:divide-gray-700">
                                    {scannedFiles.map((file, index) => (
                                        <div key={index} className="p-3 hover:bg-gray-50 dark:hover:bg-gray-800/50">
                                            <div className="flex items-center gap-3">
                                                {getFileTypeIcon(file.file_type)}
                                                <div className="flex-1 min-w-0">
                                                    <p className="font-medium text-gray-800 dark:text-gray-200 truncate">
                                                        {file.name}
                                                    </p>
                                                    <p className="text-sm text-gray-500 truncate">
                                                        {file.path}
                                                    </p>
                                                </div>
                                                <div className="flex items-center gap-2 text-sm">
                                                    <span className={`font-medium ${getFileTypeColor(file.file_type)}`}>
                                                        {file.file_type.toUpperCase()}
                                                    </span>
                                                    <span className="text-gray-500">
                                                        {formatFileSize(file.size)}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Action Buttons */}
                <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleImportFiles}
                        disabled={scannedFiles.length === 0}
                        className="bg-purple-600 hover:bg-purple-500 disabled:bg-gray-400 text-white font-bold py-2 px-6 rounded-lg transition-colors"
                    >
                        Import {scannedFiles.length} Files
                    </button>
                </div>
            </div>
        </div>
    );
};
