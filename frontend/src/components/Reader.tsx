import React, { useEffect, useRef, useState } from 'react';
import ePub, { Rendition } from 'epubjs';
import { XMarkIcon, ChevronLeftIcon, ChevronRightIcon, DocumentTextIcon } from '@heroicons/react/24/outline';
import api from '../api';

interface ReaderProps {
    bookId: number;
    onClose: () => void;
}

const Reader: React.FC<ReaderProps> = ({ bookId, onClose }) => {
    const viewerRef = useRef<HTMLDivElement>(null);
    const renditionRef = useRef<Rendition | null>(null);
    const [title, setTitle] = useState('');
    const [location, setLocation] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        let bookUrl = `http://localhost:8000/books/${bookId}/file`;
        const book = ePub(bookUrl);

        book.ready.then(() => {
            setTitle((book as any).package.metadata.title);
            return book.locations.generate(1000);
        });

        const rendition = book.renderTo(viewerRef.current!, {
            width: '100%',
            height: '100%',
            flow: 'paginated',
            manager: 'default',
        });

        renditionRef.current = rendition;

        // Fetch saved progress
        api.get(`/progress/${bookId}`).then(res => {
            const savedCfi = res.data.cfi;
            if (savedCfi) {
                rendition.display(savedCfi);
            } else {
                rendition.display();
            }
        });

        rendition.on('relocated', (location: any) => {
            setLocation(location);
            // Save progress
            api.post(`/progress/${bookId}`, {
                cfi: location.start.cfi,
                percentage: book.locations.percentageFromCfi(location.start.cfi) * 100
            }).catch(err => console.error("Failed to save progress", err));
        });

        rendition.on('rendered', () => {
            setIsLoading(false);
        });

        return () => {
            if (book) {
                book.destroy();
            }
        };
    }, [bookId]);

    const next = () => renditionRef.current?.next();
    const prev = () => renditionRef.current?.prev();

    return (
        <div className="fixed inset-0 bg-white z-[60] flex flex-col animate-in fade-in zoom-in duration-300">
            {/* Toolbar */}
            <div className="h-14 border-b flex items-center justify-between px-4 bg-slate-50 shrink-0">
                <div className="flex items-center space-x-4">
                    <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-lg text-slate-600">
                        <XMarkIcon className="w-5 h-5" />
                    </button>
                    <h2 className="font-semibold text-slate-800 truncate max-w-md">{title || 'Loading...'}</h2>
                </div>

                <div className="flex items-center space-x-2">
                    <span className="text-xs text-slate-500 font-medium">
                        {location ? `${Math.round(location.start.percentage * 100)}%` : '0%'}
                    </span>
                    <button className="p-2 hover:bg-slate-200 rounded-lg text-slate-600">
                        <DocumentTextIcon className="w-5 h-5" />
                    </button>
                </div>
            </div>

            {/* Viewer Container */}
            <div className="flex-1 relative bg-slate-100 flex items-center justify-center overflow-hidden">
                {isLoading && (
                    <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/80">
                        <div className="flex flex-col items-center">
                            <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                            <p className="mt-4 text-slate-600 font-medium text-sm">Loading your book...</p>
                        </div>
                    </div>
                )}

                {/* Click regions for navigation */}
                <div className="absolute inset-y-0 left-0 w-32 z-20 cursor-pointer group" onClick={prev}>
                    <div className="h-full flex items-center pl-4 opacity-0 group-hover:opacity-100 transition-opacity">
                        <div className="p-2 bg-white/80 rounded-full shadow-lg">
                            <ChevronLeftIcon className="w-6 h-6 text-slate-600" />
                        </div>
                    </div>
                </div>
                <div className="absolute inset-y-0 right-0 w-32 z-20 cursor-pointer group" onClick={next}>
                    <div className="h-full flex items-center justify-end pr-4 opacity-0 group-hover:opacity-100 transition-opacity">
                        <div className="p-2 bg-white/80 rounded-full shadow-lg">
                            <ChevronRightIcon className="w-6 h-6 text-slate-600" />
                        </div>
                    </div>
                </div>

                {/* The actual EPUB.js viewer */}
                <div className="w-full max-w-4xl h-full bg-white shadow-2xl mx-auto" ref={viewerRef}></div>
            </div>

            {/* Keyboard shortcuts hints */}
            <div className="h-8 bg-slate-50 border-t flex items-center justify-center text-[10px] text-slate-400 font-medium uppercase tracking-widest shrink-0">
                Use arrows or click sides to navigate
            </div>
        </div>
    );
};

export default Reader;
