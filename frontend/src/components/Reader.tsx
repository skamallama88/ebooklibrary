import React, { useEffect, useRef, useState } from 'react';
import ePub, { Rendition } from 'epubjs';
import {
    XMarkIcon,
    ChevronLeftIcon,
    ChevronRightIcon,
    AdjustmentsHorizontalIcon,
    MagnifyingGlassPlusIcon,
    MagnifyingGlassMinusIcon,
} from '@heroicons/react/24/outline';
import { Document, Page, pdfjs } from 'react-pdf';
import api from '../api';
import { clsx } from 'clsx';

// Set up PDF worker
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

// Import react-pdf styles
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

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
    const [format, setFormat] = useState<'epub' | 'pdf' | null>(null);
    const [pdfBlob, setPdfBlob] = useState<Blob | null>(null);
    const [numPages, setNumPages] = useState<number>(0);
    const [pageNumber, setPageNumber] = useState(1);
    const [scale, setScale] = useState(1.0);
    // Load settings from localStorage or use defaults
    const [fontSize, setFontSize] = useState(() => {
        try {
            const saved = localStorage.getItem('reader-settings');
            return saved ? JSON.parse(saved).fontSize ?? 100 : 100;
        } catch { return 100; }
    });
    const [theme, setTheme] = useState(() => {
        try {
            const saved = localStorage.getItem('reader-settings');
            return saved ? JSON.parse(saved).theme ?? 'light' : 'light';
        } catch { return 'light'; }
    });
    const [showSettings, setShowSettings] = useState(false);
    const [isTwoPage, setIsTwoPage] = useState(() => {
        try {
            const saved = localStorage.getItem('reader-settings');
            return saved ? JSON.parse(saved).isTwoPage ?? true : true;
        } catch { return true; }
    });
    const [fontFamily, setFontFamily] = useState<'serif' | 'sans-serif'>(() => {
        try {
            const saved = localStorage.getItem('reader-settings');
            return saved ? JSON.parse(saved).fontFamily ?? 'serif' : 'serif';
        } catch { return 'serif'; }
    });
    const [flowMode, setFlowMode] = useState<'paginated' | 'scrolled'>(() => {
        try {
            const saved = localStorage.getItem('reader-settings');
            return saved ? JSON.parse(saved).flowMode ?? 'paginated' : 'paginated';
        } catch { return 'paginated'; }
    });

    // Save settings to localStorage when they change
    useEffect(() => {
        localStorage.setItem('reader-settings', JSON.stringify({
            fontSize,
            theme,
            isTwoPage,
            fontFamily,
            flowMode
        }));
    }, [fontSize, theme, isTwoPage, fontFamily, flowMode]);

    const themes = {
        light: { body: { background: '#ffffff', color: '#1a1a1b' } },
        sepia: { body: { background: '#f4ecd8', color: '#5b4636' } },
        dark: { body: { background: '#121212', color: '#e0e0e0' } },
    };

    const settingsRef = useRef({ theme, fontSize, fontFamily });
    useEffect(() => {
        settingsRef.current = { theme, fontSize, fontFamily };
    }, [theme, fontSize, fontFamily]);

    const applyStylesToContents = (contents: any) => {
        const { theme: currTheme, fontFamily: currFont } = settingsRef.current;
        const activeTheme = themes[currTheme as keyof typeof themes];

        contents.addStylesheetRules({
            "body": {
                "background-color": "transparent !important",
                "color": activeTheme.body.color + " !important",
                "font-family": (currFont === 'serif' ? 'Georgia, serif' : 'system-ui, -apple-system, sans-serif') + ' !important'
            },
            "div, section, article, p, span, h1, h2, h3, h4, h5, h6": {
                "background-color": "transparent !important",
                "color": "inherit !important"
            },
            "img, svg": {
                "background-color": "white !important",
                "padding": "4px",
                "border-radius": "4px"
            }
        });
    };

    useEffect(() => {
        let isMounted = true;
        let book: any;
        let rendition: any;

        const loadBook = async () => {
            try {
                // First fetch book metadata to know the format and title
                const metaRes = await api.get(`/books/${bookId}`);
                if (!isMounted) return;

                const bookFormat = metaRes.data.format?.toLowerCase() || 'epub';
                setFormat(bookFormat as 'epub' | 'pdf');
                setTitle(metaRes.data.title);

                // Fetch the book file as a blob
                const response = await api.get(`/books/${bookId}/file`, {
                    responseType: 'blob'
                });

                if (!isMounted) return;
                const blob = response.data;

                if (bookFormat === 'pdf') {
                    setPdfBlob(blob);
                    setIsLoading(false);
                    // Fetch saved progress for PDF
                    api.get(`/progress/${bookId}`).then(res => {
                        const savedPage = res.data.cfi; // We'll store page number in cfi field for simplicity
                        if (savedPage && !isNaN(parseInt(savedPage))) {
                            setPageNumber(parseInt(savedPage));
                        }
                    });
                } else {
                    book = ePub(blob);

                    book.ready.then(() => {
                        if (isMounted) {
                            setTitle((book as any).package.metadata.title || metaRes.data.title);
                        }
                        return book.locations.generate(1000);
                    });

                    rendition = book.renderTo(viewerRef.current!, {
                        width: '100%',
                        height: '100%',
                        flow: flowMode,
                        manager: flowMode === 'scrolled' ? 'continuous' : 'default',
                        spread: flowMode === 'scrolled' ? 'none' : (isTwoPage ? 'auto' : 'none'),
                    });

                    renditionRef.current = rendition;

                    // Register themes
                    Object.keys(themes).forEach(name => {
                        rendition.themes.register(name, (themes as any)[name]);
                    });
                    rendition.themes.select(theme);
                    rendition.themes.fontSize(`${fontSize}%`);
                    rendition.themes.font(fontFamily === 'serif' ? 'serif' : 'sans-serif');

                    // Inject CSS to ensure theme works even if EPUB has hardcoded styles
                    rendition.hooks.content.register(applyStylesToContents);

                    // Fetch saved progress
                    api.get(`/progress/${bookId}`).then(res => {
                        const savedCfi = res.data.cfi;
                        if (savedCfi && bookFormat === 'epub') {
                            rendition.display(savedCfi);
                        } else {
                            rendition.display();
                        }
                    });

                    rendition.on('relocated', (location: any) => {
                        if (!isMounted) return;
                        setLocation(location);
                        // Save progress
                        api.post(`/progress/${bookId}`, {
                            cfi: location.start.cfi,
                            percentage: book.locations.percentageFromCfi(location.start.cfi) * 100
                        }).catch(err => console.error("Failed to save progress", err));
                    });

                    rendition.on('rendered', () => {
                        if (isMounted) setIsLoading(false);
                    });
                }

                const handleKeys = (e: KeyboardEvent) => {
                    if (e.key === 'ArrowLeft') prev();
                    if (e.key === 'ArrowRight') next();
                };
                window.addEventListener('keydown', handleKeys);

                return () => {
                    window.removeEventListener('keydown', handleKeys);
                };
            } catch (error) {
                console.error("Failed to load book:", error);
                if (isMounted) setIsLoading(false);
            }
        };

        loadBook();

        return () => {
            isMounted = false;
            if (book) {
                book.destroy();
            }
        };
    }, [bookId, format]); // Added format to dependencies to ensure next/prev closure is fresh

    // Handle settings updates
    useEffect(() => {
        if (renditionRef.current) {
            renditionRef.current.themes.select(theme);
            renditionRef.current.themes.fontSize(`${fontSize}%`);
            renditionRef.current.themes.font(fontFamily === 'serif' ? 'serif' : 'sans-serif');

            // Apply styles to already loaded views
            renditionRef.current.views().forEach((view: any) => {
                if (view.contents) {
                    applyStylesToContents(view.contents);
                }
            });
        }
    }, [theme, fontSize, fontFamily]);

    useEffect(() => {
        if (renditionRef.current) {
            if (flowMode === 'scrolled') {
                renditionRef.current.flow('scrolled');
                renditionRef.current.spread('none');
            } else {
                renditionRef.current.flow('paginated');
                renditionRef.current.spread(isTwoPage ? 'auto' : 'none');
            }
            // Add a small delay for container animations
            const timer = setTimeout(() => {
                if (viewerRef.current && renditionRef.current) {
                    renditionRef.current.resize(viewerRef.current.offsetWidth, viewerRef.current.offsetHeight);
                }
            }, 300);
            return () => clearTimeout(timer);
        }
    }, [flowMode, isTwoPage]);

    const next = () => {
        if (format === 'pdf') {
            if (pageNumber < numPages) {
                const newPage = pageNumber + 1;
                setPageNumber(newPage);
                api.post(`/progress/${bookId}`, {
                    cfi: String(newPage),
                    percentage: (newPage / numPages) * 100
                }).catch(err => console.error("Failed to save progress", err));
            }
        } else {
            renditionRef.current?.next();
        }
    };

    const prev = () => {
        if (format === 'pdf') {
            if (pageNumber > 1) {
                const newPage = pageNumber - 1;
                setPageNumber(newPage);
                api.post(`/progress/${bookId}`, {
                    cfi: String(newPage),
                    percentage: (newPage / numPages) * 100
                }).catch(err => console.error("Failed to save progress", err));
            }
        } else {
            renditionRef.current?.prev();
        }
    };

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
                    <div className="flex items-center space-x-2 mr-2">
                        {format === 'pdf' ? (
                            <div className="flex items-center space-x-1 bg-black/5 dark:bg-white/5 rounded-lg px-2 py-1">
                                <button onClick={() => setScale(s => Math.max(0.2, s - 0.1))} className="p-1 hover:bg-black/5 dark:hover:bg-white/10 rounded">
                                    <MagnifyingGlassMinusIcon className="w-4 h-4" />
                                </button>
                                <span className="text-[10px] font-bold w-12 text-center">{Math.round(scale * 100)}%</span>
                                <button onClick={() => setScale(s => Math.min(3, s + 0.1))} className="p-1 hover:bg-black/5 dark:hover:bg-white/10 rounded">
                                    <MagnifyingGlassPlusIcon className="w-4 h-4" />
                                </button>
                            </div>
                        ) : (
                            <span className="text-xs font-medium opacity-60">
                                {location ? `${Math.round(location.start.percentage * 100)}%` : '0%'}
                            </span>
                        )}

                        {format === 'pdf' && (
                            <span className="text-[10px] font-bold opacity-60 ml-2">
                                {pageNumber} / {numPages}
                            </span>
                        )}
                    </div>

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
                                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 block mb-2">Typeface</label>
                                    <div className="grid grid-cols-2 gap-2">
                                        <button onClick={() => setFontFamily('serif')} className={clsx("px-2 py-1.5 rounded-lg text-xs font-medium border transition-all font-serif", fontFamily === 'serif' ? "border-blue-500 bg-blue-50 text-blue-600" : "bg-white border-slate-200 text-slate-600")}>Serif</button>
                                        <button onClick={() => setFontFamily('sans-serif')} className={clsx("px-2 py-1.5 rounded-lg text-xs font-medium border transition-all font-sans", fontFamily === 'sans-serif' ? "border-blue-500 bg-blue-50 text-blue-600" : "bg-white border-slate-200 text-slate-600")}>Sans</button>
                                    </div>
                                </div>

                                <div>
                                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 block mb-2">Layout</label>
                                    <div className="grid grid-cols-2 gap-2 mb-3">
                                        <button onClick={() => setFlowMode('paginated')} className={clsx("px-2 py-1.5 rounded-lg text-xs font-medium border transition-all", flowMode === 'paginated' ? "border-blue-500 bg-blue-50 text-blue-600" : "bg-white border-slate-200 text-slate-600")}>Paged</button>
                                        <button onClick={() => setFlowMode('scrolled')} className={clsx("px-2 py-1.5 rounded-lg text-xs font-medium border transition-all", flowMode === 'scrolled' ? "border-blue-500 bg-blue-50 text-blue-600" : "bg-white border-slate-200 text-slate-600")}>Scroll</button>
                                    </div>

                                    {flowMode === 'paginated' && (
                                        <button
                                            onClick={() => setIsTwoPage(!isTwoPage)}
                                            className="w-full flex items-center justify-between px-3 py-2 bg-slate-50 dark:bg-slate-900 border dark:border-slate-700 rounded-lg text-xs font-medium transition-all"
                                        >
                                            <span>Two Page Spread</span>
                                            <div className={clsx("w-8 h-4 rounded-full transition-colors relative", isTwoPage ? "bg-blue-500" : "bg-slate-300 dark:bg-slate-700")}>
                                                <div className={clsx("absolute top-0.5 w-3 h-3 bg-white rounded-full transition-transform", isTwoPage ? "translate-x-4.5" : "translate-x-0.5")} />
                                            </div>
                                        </button>
                                    )}
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

                {/* The viewer */}
                {format === 'pdf' ? (
                    <div className={clsx(
                        "w-full h-full overflow-auto flex justify-center p-4 transition-all duration-300",
                        theme === 'dark' && "filter-dark-pdf"
                    )}>
                        <Document
                            file={pdfBlob}
                            onLoadSuccess={({ numPages }) => setNumPages(numPages)}
                            onLoadError={(error) => {
                                console.error("PDF load error:", error);
                                setIsLoading(false);
                            }}
                            loading={
                                <div className="flex flex-col items-center">
                                    <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                                    <p className="mt-4 text-slate-600 dark:text-slate-400 font-medium text-sm">Loading PDF...</p>
                                </div>
                            }
                        >
                            <Page
                                pageNumber={pageNumber}
                                scale={scale}
                                className="shadow-2xl"
                                loading={null}
                                renderAnnotationLayer={false}
                                renderTextLayer={true}
                            />
                        </Document>
                    </div>
                ) : (
                    <div className={clsx("w-full h-full shadow-2xl transition-all duration-300 origin-center mx-auto",
                        flowMode === 'scrolled' ? "max-w-4xl overflow-y-auto" : (isTwoPage ? "max-w-6xl" : "max-w-2xl"),
                        readerBg)} ref={viewerRef}></div>
                )}
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
