import React, { useEffect, useRef, useState } from 'react';
import ePub, { Rendition } from 'epubjs';
import {
    XMarkIcon,
    ChevronLeftIcon,
    ChevronRightIcon,
    AdjustmentsHorizontalIcon,
} from '@heroicons/react/24/outline';
import api from '../api';
import { clsx } from 'clsx';

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
    const [fontSize, setFontSize] = useState(100);
    const [theme, setTheme] = useState('light');
    const [showSettings, setShowSettings] = useState(false);
    const [isTwoPage, setIsTwoPage] = useState(true);

    const themes = {
        light: { body: { background: '#ffffff', color: '#1a1a1b' } },
        sepia: { body: { background: '#f4ecd8', color: '#5b4636' } },
        dark: { body: { background: '#121212', color: '#e0e0e0' } },
    };

    useEffect(() => {
        let bookUrl = `${api.defaults.baseURL}/books/${bookId}/file`;
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
            spread: isTwoPage ? 'auto' : 'none',
        });

        renditionRef.current = rendition;

        // Register themes
        Object.keys(themes).forEach(name => {
            rendition.themes.register(name, (themes as any)[name]);
        });
        rendition.themes.select(theme);
        rendition.themes.fontSize(`${fontSize}%`);

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

        const handleKeys = (e: KeyboardEvent) => {
            if (e.key === 'ArrowLeft') rendition.prev();
            if (e.key === 'ArrowRight') rendition.next();
        };
        window.addEventListener('keydown', handleKeys);

        return () => {
            window.removeEventListener('keydown', handleKeys);
            if (book) {
                book.destroy();
            }
        };
    }, [bookId]);

    // Handle settings updates
    useEffect(() => {
        if (renditionRef.current) {
            renditionRef.current.themes.select(theme);
        }
    }, [theme]);

    useEffect(() => {
        if (renditionRef.current) {
            renditionRef.current.themes.fontSize(`${fontSize}%`);
        }
    }, [fontSize]);

    useEffect(() => {
        if (renditionRef.current) {
            // Re-render required for spread change usually, for MVP we'll just note it
            // renditionRef.current.spread(isTwoPage ? 'auto' : 'none');
        }
    }, [isTwoPage]);

    const next = () => renditionRef.current?.next();
    const prev = () => renditionRef.current?.prev();

    const readerBg = theme === 'sepia' ? 'bg-[#f4ecd8]' : theme === 'dark' ? 'bg-[#121212]' : 'bg-white';
    const containerBg = theme === 'sepia' ? 'bg-[#ebe4d1]' : theme === 'dark' ? 'bg-[#1a1a1a]' : 'bg-slate-100';

    return (
        <div className={clsx("fixed inset-0 z-[60] flex flex-col animate-in fade-in zoom-in duration-300", readerBg)}>
            {/* Toolbar */}
            <div className={clsx("h-14 border-b flex items-center justify-between px-4 shrink-0 transition-colors",
                theme === 'dark' ? "bg-slate-900 border-slate-800 text-slate-300" : "bg-slate-50 text-slate-600")}>
                <div className="flex items-center space-x-4">
                    <button onClick={onClose} className="p-2 hover:bg-black/5 rounded-lg transition-colors">
                        <XMarkIcon className="w-5 h-5" />
                    </button>
                    <h2 className="font-semibold truncate max-w-md">{title || 'Loading...'}</h2>
                </div>

                <div className="flex items-center space-x-2 relative">
                    <span className="text-xs font-medium opacity-60">
                        {location ? `${Math.round(location.start.percentage * 100)}%` : '0%'}
                    </span>

                    <button
                        onClick={() => setShowSettings(!showSettings)}
                        className={clsx("p-2 rounded-lg transition-colors", showSettings ? "bg-blue-100 text-blue-600" : "hover:bg-black/5")}
                    >
                        <AdjustmentsHorizontalIcon className="w-5 h-5" />
                    </button>

                    {showSettings && (
                        <div className="absolute right-0 top-12 w-64 p-4 bg-white dark:bg-slate-800 rounded-xl shadow-2xl border dark:border-slate-700 z-50 text-slate-800 dark:text-slate-100 animate-in fade-in slide-in-from-top-2 duration-200">
                            <div className="space-y-4">
                                <div>
                                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 block mb-2">Theme</label>
                                    <div className="grid grid-cols-3 gap-2">
                                        <button onClick={() => setTheme('light')} className={clsx("px-2 py-1.5 rounded-lg text-xs font-medium border transition-all", theme === 'light' ? "border-blue-500 bg-blue-50 text-blue-600" : "bg-white border-slate-200 text-slate-600")}>Light</button>
                                        <button onClick={() => setTheme('sepia')} className={clsx("px-2 py-1.5 rounded-lg text-xs font-medium border transition-all", theme === 'sepia' ? "border-orange-400 bg-orange-50 text-orange-700" : "bg-[#f4ecd8] border-[#e1d9c5] text-[#5b4636]")}>Sepia</button>
                                        <button onClick={() => setTheme('dark')} className={clsx("px-2 py-1.5 rounded-lg text-xs font-medium border transition-all", theme === 'dark' ? "border-blue-500 bg-slate-700 text-white" : "bg-slate-900 border-slate-800 text-slate-400")}>Dark</button>
                                    </div>
                                </div>

                                <div>
                                    <div className="flex justify-between items-center mb-2">
                                        <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Font Size</label>
                                        <span className="text-xs font-bold text-blue-500">{fontSize}%</span>
                                    </div>
                                    <input
                                        type="range" min="60" max="200" step="10"
                                        value={fontSize} onChange={(e) => setFontSize(parseInt(e.target.value))}
                                        className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                                    />
                                </div>

                                <div>
                                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 block mb-2">Layout</label>
                                    <button
                                        onClick={() => setIsTwoPage(!isTwoPage)}
                                        className="w-full flex items-center justify-between px-3 py-2 bg-slate-50 dark:bg-slate-900 border dark:border-slate-700 rounded-lg text-xs font-medium"
                                    >
                                        <span>Two Page Spread</span>
                                        <div className={clsx("w-8 h-4 rounded-full transition-colors relative", isTwoPage ? "bg-blue-500" : "bg-slate-300 dark:bg-slate-700")}>
                                            <div className={clsx("absolute top-0.5 w-3 h-3 bg-white rounded-full transition-transform", isTwoPage ? "translate-x-4.5" : "translate-x-0.5")} />
                                        </div>
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Viewer Container */}
            <div className={clsx("flex-1 relative flex items-center justify-center overflow-hidden transition-colors", containerBg)}>
                {isLoading && (
                    <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/80 dark:bg-slate-900/80">
                        <div className="flex flex-col items-center">
                            <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                            <p className="mt-4 text-slate-600 dark:text-slate-400 font-medium text-sm">Loading your book...</p>
                        </div>
                    </div>
                )}

                {/* Click regions for navigation */}
                <div className="absolute inset-y-0 left-0 w-32 z-20 cursor-pointer group" onClick={prev}>
                    <div className="h-full flex items-center pl-4 opacity-0 group-hover:opacity-100 transition-opacity">
                        <div className="p-2 bg-white/90 dark:bg-slate-800/90 rounded-full shadow-lg">
                            <ChevronLeftIcon className="w-6 h-6 text-slate-600 dark:text-slate-300" />
                        </div>
                    </div>
                </div>
                <div className="absolute inset-y-0 right-0 w-32 z-20 cursor-pointer group" onClick={next}>
                    <div className="h-full flex items-center justify-end pr-4 opacity-0 group-hover:opacity-100 transition-opacity">
                        <div className="p-2 bg-white/90 dark:bg-slate-800/90 rounded-full shadow-lg">
                            <ChevronRightIcon className="w-6 h-6 text-slate-600 dark:text-slate-300" />
                        </div>
                    </div>
                </div>

                {/* The actual EPUB.js viewer */}
                <div className={clsx("w-full h-full shadow-2xl transition-all duration-300",
                    isTwoPage ? "max-w-6xl" : "max-w-3xl",
                    readerBg)} ref={viewerRef}></div>
            </div>

            {/* Keyboard shortcuts hints */}
            <div className={clsx("h-8 border-t flex items-center justify-center text-[10px] font-medium uppercase tracking-widest shrink-0 transition-colors",
                theme === 'dark' ? "bg-slate-900 border-slate-800 text-slate-500" : "bg-slate-50 text-slate-400")}>
                Use arrows or click sides to navigate
            </div>
        </div>
    );
};

export default Reader;
