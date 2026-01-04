import React, { useState, useRef } from 'react';
import { XMarkIcon, CloudArrowUpIcon, DocumentIcon, CheckCircleIcon, ExclamationCircleIcon } from '@heroicons/react/24/outline';
import api from '../api';
import { clsx } from 'clsx';

interface ImportModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

interface UploadStatus {
    fileName: string;
    status: 'uploading' | 'success' | 'error';
    progress: number;
    error?: string;
}

const ImportModal: React.FC<ImportModalProps> = ({ isOpen, onClose, onSuccess }) => {
    const [files, setFiles] = useState<File[]>([]);
    const [uploadStatuses, setUploadStatuses] = useState<Record<string, UploadStatus>>({});
    const fileInputRef = useRef<HTMLInputElement>(null);

    if (!isOpen) return null;

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            const newFiles = Array.from(e.target.files);
            setFiles(prev => [...prev, ...newFiles]);
        }
    };

    const handleUpload = async () => {
        const uploadPromises = files.map(async (file) => {
            if (uploadStatuses[file.name]?.status === 'success') return;

            setUploadStatuses(prev => ({
                ...prev,
                [file.name]: { fileName: file.name, status: 'uploading', progress: 0 }
            }));

            const formData = new FormData();
            formData.append('file', file);

            try {
                await api.post('/books/upload', formData, {
                    headers: { 'Content-Type': 'multipart/form-data' },
                    onUploadProgress: (progressEvent) => {
                        const progress = Math.round((progressEvent.loaded * 100) / (progressEvent.total || 1));
                        setUploadStatuses(prev => ({
                            ...prev,
                            [file.name]: { ...prev[file.name], progress }
                        }));
                    }
                });

                setUploadStatuses(prev => ({
                    ...prev,
                    [file.name]: { ...prev[file.name], status: 'success', progress: 100 }
                }));
            } catch (err: any) {
                setUploadStatuses(prev => ({
                    ...prev,
                    [file.name]: { ...prev[file.name], status: 'error', progress: 0, error: err.response?.data?.detail || "Upload failed" }
                }));
            }
        });

        const results = await Promise.allSettled(uploadPromises);
        const someSuccess = results.some(r => r.status === 'fulfilled');

        if (someSuccess) {
            setTimeout(() => {
                onSuccess();
                onClose();
            }, 1000);
        }
    };

    const removeFile = (name: string) => {
        setFiles(prev => prev.filter(f => f.name !== name));
        const newStatuses = { ...uploadStatuses };
        delete newStatuses[name];
        setUploadStatuses(newStatuses);
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-sm" onClick={onClose} />

            <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-xl shadow-2xl relative flex flex-col max-h-[80vh] animate-in zoom-in-95 duration-200 border dark:border-slate-800">
                <div className="p-6 border-b dark:border-slate-800 flex items-center justify-between">
                    <div>
                        <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100">Import Books</h3>
                        <p className="text-sm text-slate-500 dark:text-slate-400">Upload EPUB or PDF files to your library</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl text-slate-400 dark:text-slate-500">
                        <XMarkIcon className="w-6 h-6" />
                    </button>
                </div>

                <div className="p-6 overflow-y-auto flex-1 space-y-4">
                    {/* Drag & Drop Area Placeholder */}
                    <div
                        onClick={() => fileInputRef.current?.click()}
                        className="border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl p-8 flex flex-col items-center justify-center space-y-3 hover:border-blue-400 dark:hover:border-blue-500 hover:bg-blue-50/50 dark:hover:bg-blue-900/10 transition-all cursor-pointer group"
                    >
                        <div className="w-12 h-12 bg-blue-50 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                            <CloudArrowUpIcon className="w-6 h-6" />
                        </div>
                        <p className="text-sm font-medium text-slate-700 dark:text-slate-200">Click to select files</p>
                        <p className="text-xs text-slate-400 dark:text-slate-500">Supports EPUB and PDF</p>
                        <input
                            type="file"
                            ref={fileInputRef}
                            className="hidden"
                            multiple
                            accept=".epub,.pdf"
                            onChange={handleFileSelect}
                        />
                    </div>

                    {/* File List */}
                    <div className="space-y-2">
                        {files.map(file => (
                            <div key={file.name} className="flex items-center space-x-3 p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700 group">
                                <DocumentIcon className="w-8 h-8 text-blue-500 dark:text-blue-400 shrink-0" />
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-slate-700 dark:text-slate-200 truncate">{file.name}</p>
                                    <div className="flex items-center space-x-2">
                                        <p className="text-[10px] text-slate-400 dark:text-slate-500">{(file.size / (1024 * 1024)).toFixed(2)} MB</p>
                                        {uploadStatuses[file.name] && (
                                            <span className={clsx(
                                                "text-[10px] font-bold uppercase",
                                                uploadStatuses[file.name].status === 'uploading' && "text-blue-500",
                                                uploadStatuses[file.name].status === 'success' && "text-emerald-500",
                                                uploadStatuses[file.name].status === 'error' && "text-red-500"
                                            )}>
                                                • {uploadStatuses[file.name].status}
                                            </span>
                                        )}
                                    </div>
                                    {uploadStatuses[file.name]?.status === 'uploading' && (
                                        <div className="mt-2 h-1 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-blue-500 transition-all duration-300"
                                                style={{ width: `${uploadStatuses[file.name].progress}%` }}
                                            />
                                        </div>
                                    )}
                                    {uploadStatuses[file.name]?.status === 'error' && (
                                        <p className="text-[10px] text-red-500 mt-1">{uploadStatuses[file.name].error}</p>
                                    )}
                                </div>
                                {uploadStatuses[file.name]?.status === 'success' ? (
                                    <CheckCircleIcon className="w-6 h-6 text-emerald-500" />
                                ) : uploadStatuses[file.name]?.status === 'error' ? (
                                    <ExclamationCircleIcon className="w-6 h-6 text-red-500" />
                                ) : (
                                    <button
                                        onClick={() => removeFile(file.name)}
                                        className="p-1 hover:bg-white dark:hover:bg-slate-700 rounded text-slate-400 dark:text-slate-500 group-hover:text-red-500"
                                    >
                                        <XMarkIcon className="w-5 h-5" />
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>
                </div>

                <div className="p-6 border-t dark:border-slate-800 flex items-center justify-end space-x-3">
                    <button onClick={onClose} className="px-4 py-2 text-slate-600 dark:text-slate-300 font-medium hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors">
                        Cancel
                    </button>
                    <button
                        onClick={handleUpload}
                        disabled={files.length === 0 || Object.values(uploadStatuses).some(s => s.status === 'uploading')}
                        className="px-6 py-2 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-200 dark:shadow-none disabled:opacity-50 disabled:shadow-none"
                    >
                        Upload {files.length > 0 ? files.length : ''} {files.length === 1 ? 'Book' : 'Books'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ImportModal;
