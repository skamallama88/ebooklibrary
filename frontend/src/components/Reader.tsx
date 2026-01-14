import React, { useEffect, useRef, useState } from 'react';
import ePub, { Rendition } from 'epubjs';
import {
    XMarkIcon,
    ChevronLeftIcon,
    ChevronRightIcon,
    AdjustmentsHorizontalIcon,
    MagnifyingGlassPlusIcon,
    MagnifyingGlassMinusIcon,
    ListBulletIcon,
    BookmarkIcon,
    TrashIcon,
} from '@heroicons/react/24/outline';
import { BookmarkIcon as BookmarkIconSolid } from '@heroicons/react/24/solid';
import { Document, Page, pdfjs } from 'react-pdf';
import api from '../api';
import { clsx } from 'clsx';
import { useMediaQuery } from '../hooks/useMediaQuery';

// Set up PDF worker
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

// Import react-pdf styles
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

const themes: Record<string, { body: { background: string; color: string } }> = {
    light: { body: { background: '#ffffff', color: '#1a1a1b' } },
    sepia: { body: { background: '#f4ecd8', color: '#5b4636' } },
    dark: { body: { background: '#121212', color: '#e0e0e0' } },
};

interface ReaderProps {
    bookId: number;
    onClose: () => void;
}

interface Bookmark {
    id: number;
    cfi: string;
    label: string;
    created_at?: string; // Optional since it might not always be returned or populated
}

interface TocItem {
    label: string;
    href: string;
    page: number;
    cfi?: string;
    title?: string;
}

interface ReaderLocation {
    start: {
        cfi: string;
        percentage: number;
        href: string;
    };
    end: {
        cfi: string;
        percentage: number;
        href: string;
    };
}

const Reader: React.FC<ReaderProps> = ({ bookId, onClose }) => {
    const { isMobile } = useMediaQuery();
    const viewerRef = useRef<HTMLDivElement>(null);
    const renditionRef = useRef<Rendition | null>(null);
    const [title, setTitle] = useState('');
    const [location, setLocation] = useState<ReaderLocation | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [format, setFormat] = useState<'epub' | 'pdf' | 'txt' | 'rtf' | 'mobi' | null>(null);
    const [pdfBlob, setPdfBlob] = useState<Blob | null>(null);
    const [textContent, setTextContent] = useState<string>('');
    const [numPages, setNumPages] = useState<number>(0);
    const [pageNumber, setPageNumber] = useState(1);
    const [scale, setScale] = useState(1.0);

    // TOC & Bookmarks
    const [showSidebar, setShowSidebar] = useState(false);
    const [activeTab, setActiveTab] = useState<'chapters' | 'bookmarks'>('chapters');
    const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);

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
            // Default to single-page on mobile
            const defaultValue = typeof window !== 'undefined' && window.innerWidth < 640 ? false : true;
            return saved ? JSON.parse(saved).isTwoPage ?? defaultValue : defaultValue;
        } catch {
            return typeof window !== 'undefined' && window.innerWidth < 640 ? false : true;
        }
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

    // Fetch bookmarks
    useEffect(() => {
        api.get(`/bookmarks/${bookId}`)
            .then(res => setBookmarks(res.data))
            .catch(err => console.error("Failed to fetch bookmarks", err));
    }, [bookId]);

    const settingsRef = useRef({ theme, fontSize, fontFamily });
    useEffect(() => {
        settingsRef.current = { theme, fontSize, fontFamily };
    }, [theme, fontSize, fontFamily]);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const applyStylesToContents = React.useCallback((contents: any) => {
        const { theme: currTheme, fontFamily: currFont } = settingsRef.current;
        const activeTheme = themes[currTheme];

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
    }, []); // themes is static object but used inside

    const [toc, setToc] = useState<TocItem[]>([]);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const bookRef = useRef<any>(null);

    const isReadyToSave = useRef(false);

    useEffect(() => {
        let isMounted = true;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let book: any;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let rendition: any;

        const loadBook = async () => {
            try {
                // Reset save flag
                isReadyToSave.current = false;

                // First fetch book metadata to know the format and title
                const metaRes = await api.get(`/books/${bookId}`);
                if (!isMounted) return;

                const bookFormat = metaRes.data.format?.toLowerCase() || 'epub';
                if (isMounted && format !== bookFormat) {
                    setFormat(bookFormat as 'epub' | 'pdf' | 'txt' | 'rtf' | 'mobi');
                }
                setTitle(metaRes.data.title);

                if (['txt', 'rtf', 'mobi'].includes(bookFormat)) {
                    const textRes = await api.get(`/books/${bookId}/text`);
                    if (isMounted) {
                        setTextContent(textRes.data.text);
                        setIsLoading(false);
                    }
                    return;
                }

                // Fetch the book file as a blob
                const response = await api.get(`/books/${bookId}/file`, {
                    responseType: 'blob'
                });

                if (!isMounted) return;
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const blob = response.data as any;

                if (bookFormat === 'pdf') {
                    setPdfBlob(blob);
                    setIsLoading(false);

                    // Fetch PDF outline (chapters)
                    const loadingTask = pdfjs.getDocument(URL.createObjectURL(blob));
                    const pdf = await loadingTask.promise;
                    const outline = await pdf.getOutline();

                    if (isMounted && outline) {
                        const chapters = await Promise.all(outline.map(async (item) => {
                            let pageNum = 1;
                            if (typeof item.dest === 'string') {
                                const dest = await pdf.getDestination(item.dest);
                                if (dest) {
                                    const pageRef = dest[0];
                                    pageNum = (await pdf.getPageIndex(pageRef)) + 1;
                                }
                            } else if (Array.isArray(item.dest)) {
                                const pageRef = item.dest[0];
                                pageNum = (await pdf.getPageIndex(pageRef)) + 1;
                            }
                            return { 
                                title: item.title, 
                                label: item.title, 
                                page: pageNum, 
                                href: String(pageNum) 
                            } as TocItem;
                        }));
                        setToc(chapters);
                    }

                    // Fetch saved progress for PDF
                    api.get(`/progress/${bookId}`).then(res => {
                        const savedPage = res.data.cfi;
                        if (savedPage && !isNaN(parseInt(savedPage))) {
                            setPageNumber(parseInt(savedPage));
                        }
                        // Enable saving after initial load
                        setTimeout(() => { isReadyToSave.current = true; }, 500);
                    });
                } else {
                    book = ePub(blob);
                    bookRef.current = book;
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    (window as any).book = book;

                    book.ready.then(() => {
                        if (isMounted) {
                            // eslint-disable-next-line @typescript-eslint/no-explicit-any
                            setTitle((book.package.metadata as any).title || metaRes.data.title);
                            // eslint-disable-next-line @typescript-eslint/no-explicit-any
                            setToc(book.navigation.toc.map((t: any) => ({
                                ...t,
                                label: t.label,
                                href: t.href,
                                page: 0 // EPUBs don't have page numbers the same way
                            })) || []);
                        }
                        return book.locations.generate(1000);
                    }).then(() => {
                        if (isMounted) {
                            // Refresh TOC with percentages
                            // eslint-disable-next-line @typescript-eslint/no-explicit-any
                             setToc(book.navigation.toc.map((t: any) => ({
                                ...t,
                                label: t.label,
                                href: t.href,
                                page: 0
                            })) || []);
                            
                            // Force update location state with calculated percentage if we have a current location
                            if (renditionRef.current && renditionRef.current.location) {
                                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                const currentLocation = renditionRef.current.location as any;
                                const percentage = book.locations.percentageFromCfi(currentLocation.start.cfi);
                                setLocation({
                                    ...currentLocation,
                                    start: {
                                        ...currentLocation.start,
                                        percentage: percentage
                                    }
                                });

                                // Ensure we save this valid percentage to the server if we're ready
                                if (isReadyToSave.current) {
                                    api.post(`/progress/${bookId}`, {
                                        cfi: currentLocation.start.cfi,
                                        percentage: percentage * 100
                                    }).catch(err => console.error("Failed to save progress", err));
                                }
                            }
                        }
                    });

                    rendition = book.renderTo(viewerRef.current!, {
                        width: '100%',
                        height: '100%',
                        flow: flowMode,
                        manager: flowMode === 'scrolled' ? 'continuous' : 'default',
                        spread: flowMode === 'scrolled' ? 'none' : (isTwoPage ? 'auto' : 'none'),
                    });

                    renditionRef.current = rendition;
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    (window as any).rendition = rendition;

                    // Register themes
                    Object.keys(themes).forEach(name => {
                        rendition.themes.register(name, themes[name]);
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
                            rendition.display(savedCfi).then(() => {
                                // Enable saving only after initial content is displayed
                                isReadyToSave.current = true;
                            });
                        } else {
                            rendition.display().then(() => {
                                isReadyToSave.current = true;
                            });
                        }
                    });

                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    rendition.on('relocated', (location: any) => {
                        if (!isMounted) return;
                        
                        // Calculate percentage carefully
                        let percentage: number | null = null;
                        try {
                            if (book.locations.length() > 0) {
                                percentage = book.locations.percentageFromCfi(location.start.cfi);
                            }
                        } catch (e) {
                            console.warn("Could not calculate percentage from CFI", e);
                        }
                        
                        if (percentage !== null) {
                            // Update state with calculated percentage
                            setLocation({
                                ...location,
                                start: {
                                    ...location.start,
                                    percentage: percentage
                                }
                            });

                            // Only save to server if we are ready (initial load done)
                            // AND if we have a valid percentage (locations ready)
                            if (isReadyToSave.current) {
                                api.post(`/progress/${bookId}`, {
                                    cfi: location.start.cfi,
                                    percentage: percentage * 100
                                }).catch(err => console.error("Failed to save progress", err));
                            }
                        } else {
                            // If we can't calculate percentage, we still update location state 
                            // but maybe keep old percentage or just don't update percentage field?
                            // Better to update location so the reader works, but NOT save to server.
                            setLocation(location);
                        }
                    });

                    rendition.on('rendered', () => {
                        if (isMounted) setIsLoading(false);
                    });
                }

                return () => {
                    // Cleanup if needed
                };
            } catch (error) {
                console.error("Failed to load book:", error);
                if (isMounted) setIsLoading(false);
            }
        };

        loadBook();

        return () => {
            isMounted = false;
            // Only destroy book if we are actually unmounting the component or changing bookId
            // We do NOT want to destroy when just changing layout modes since we handle that below
            if (book) {
                book.destroy();
            }
        };
        // Removed flowMode and isTwoPage from dependencies to prevent full reload
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [bookId]);

    // Handle settings updates
    useEffect(() => {
        if (renditionRef.current) {
            renditionRef.current.themes.select(theme);
            renditionRef.current.themes.fontSize(`${fontSize}%`);
            renditionRef.current.themes.font(fontFamily === 'serif' ? 'serif' : 'sans-serif');

            // Apply styles to already loaded views
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            renditionRef.current.views().forEach((view: any) => {
                if (view.contents) {
                    applyStylesToContents(view.contents);
                }
            });
        }
    }, [theme, fontSize, fontFamily, applyStylesToContents]);

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
    }, [flowMode, isTwoPage, applyStylesToContents]);

    const next = React.useCallback(() => {
        if (format === 'pdf') {
            setPageNumber(prevPage => {
                if (prevPage < numPages) {
                    const newPage = prevPage + 1;
                    api.post(`/progress/${bookId}`, {
                        cfi: String(newPage),
                        percentage: (newPage / numPages) * 100
                    }).catch(err => console.error("Failed to save progress", err));
                    return newPage;
                }
                return prevPage;
            });
        } else if (format === 'epub') {
            renditionRef.current?.next();
        }
    }, [format, numPages, bookId]);

    const prev = React.useCallback(() => {
        if (format === 'pdf') {
            setPageNumber(prevPage => {
                if (prevPage > 1) {
                    const newPage = prevPage - 1;
                    api.post(`/progress/${bookId}`, {
                        cfi: String(newPage),
                        percentage: (newPage / numPages) * 100
                    }).catch(err => console.error("Failed to save progress", err));
                    return newPage;
                }
                return prevPage;
            });
        } else if (format === 'epub') {
            renditionRef.current?.prev();
        }
    }, [format, numPages, bookId]);

    // Jump to location (CFI or PDF page)
    const jumpTo = (target: string) => {
        if (format === 'pdf') {
            const page = parseInt(target);
            if (!isNaN(page)) {
                setPageNumber(page);
                api.post(`/progress/${bookId}`, {
                    cfi: String(page),
                    percentage: (page / numPages) * 100
                }).catch(err => console.error("Failed to save progress", err));
            }
        } else {
            renditionRef.current?.display(target);
        }
        setShowSidebar(false);
    };

    // Add Bookmark
    const addBookmark = async () => {
        let cfi = '';
        let percentage = 0;
        let label = '';

        if (format === 'pdf') {
            cfi = String(pageNumber);
            percentage = (pageNumber / numPages) * 100;
            label = `Page ${pageNumber} (${Math.round(percentage)}%)`;
        } else if (location) {
            cfi = location.start.cfi;
            percentage = location.start.percentage;

            // Try to find chapter name
            const chapter = toc.find((item) => item.href === location.start.href);
            label = chapter ? `${chapter.label} (${Math.round(percentage * 100)}%)` : `Location ${Math.round(percentage * 100)}%`;
        }

        if (!cfi) return;

        try {
            const res = await api.post(`/bookmarks/${bookId}`, { cfi, label });
            setBookmarks([res.data, ...bookmarks]);
        } catch (e) {
            console.error("Failed to add bookmark", e);
        }
    };

    const deleteBookmark = async (id: number, e: React.MouseEvent) => {
        e.stopPropagation();
        try {
            await api.delete(`/bookmarks/${id}`);
            setBookmarks(bookmarks.filter(b => b.id !== id));
        } catch (e) {
            console.error("Failed to delete bookmark", e);
        }
    };

    useEffect(() => {
        const handleKeys = (e: KeyboardEvent) => {
            if (e.key === 'ArrowLeft') prev();
            if (e.key === 'ArrowRight') next();
        };
        window.addEventListener('keydown', handleKeys);
        return () => window.removeEventListener('keydown', handleKeys);
    }, [prev, next]);

    const handleProgressBarClick = (e: React.MouseEvent<HTMLDivElement>) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const percentage = x / rect.width;

        if (format === 'pdf') {
            const newPage = Math.max(1, Math.min(numPages, Math.round(percentage * numPages)));
            setPageNumber(newPage);
            api.post(`/progress/${bookId}`, {
                cfi: String(newPage),
                percentage: (newPage / numPages) * 100
            }).catch(err => console.error("Failed to save progress", err));
        } else if (bookRef.current && renditionRef.current && bookRef.current.locations.length() > 0) {
            try {
                const cfi = bookRef.current.locations.cfiFromPercentage(percentage);
                if (cfi) {
                    renditionRef.current.display(cfi);
                }
            } catch (err) {
                console.warn("Failed to jump to percentage", err);
            }
        }
    };

    const [chapterMarkers, setChapterMarkers] = useState<{ pos: number; title: string }[]>([]);

    useEffect(() => {
        if (!toc || toc.length === 0) {
            setChapterMarkers([]);
            return;
        }

        if (format === 'pdf') {
            setChapterMarkers(toc.map(item => ({
                pos: (item.page / numPages) * 100,
                title: item.title || item.label || 'Chapter'
            })));
        } else if (bookRef.current && bookRef.current.locations.length() > 0) {
            const markers = toc.map(item => {
                let percentage = 0;
                try {
                    // Try to get CFI for the TOC item safely
                    const href = item.href?.split('#')[0];
                    const spineItem = bookRef.current.spine.get(href);

                    // Strategy 1: Use specific item.cfi or construct from spine base
                    let cfi = item.cfi;

                    if (!cfi && spineItem) {
                        cfi = spineItem.cfiBase;
                        // If it's a base CFI (ending in !), we need to point to the start of content
                        if (cfi && cfi.endsWith('!')) {
                            cfi = `${cfi}/4/1:0`; // Standard start path
                        }
                    }

                    if (cfi && typeof cfi === 'string') {
                        // Ensure it's a full CFI string
                        if (!cfi.startsWith('epubcfi(')) {
                            cfi = `epubcfi(${cfi})`;
                        }

                        // Calculate percentage from CFI
                        percentage = bookRef.current.locations.percentageFromCfi(cfi) * 100;
                    } else if (spineItem) {
                        // Strategy 2: Fallback to spine index approximation
                        // This isn't perfect but better than no marker
                        percentage = (spineItem.index / bookRef.current.spine.length) * 100;
                    }

                    if (percentage >= 0 && percentage <= 100) {
                        return {
                            pos: percentage,
                            title: item.label
                        };
                    }
                } catch {
                    // Fail silently for individual bad markers to keep the rest
                }
                return null;
            }).filter((marker): marker is { pos: number, title: string } =>
                marker !== null
            );
            setChapterMarkers(markers);
        }
    }, [toc, format, numPages]);

    const readerBg = theme === 'sepia' ? 'bg-[#f4ecd8]' : theme === 'dark' ? 'bg-[#121212]' : 'bg-white';
    const containerBg = theme === 'sepia' ? 'bg-[#ebe4d1]' : theme === 'dark' ? 'bg-[#1a1a1a]' : 'bg-slate-100';

    return (
        <div className={clsx("fixed inset-0 z-[60] flex flex-col", readerBg)}>
            {/* Toolbar */}
            <div className={clsx("h-14 border-b flex items-center justify-between px-2 md:px-4 shrink-0 transition-colors z-[70] relative",
                theme === 'dark' ? "bg-slate-900 border-slate-800 text-slate-300" : "bg-slate-50 text-slate-600")}>
                <div className="flex items-center space-x-2 md:space-x-4">
                    <button onClick={onClose} className="p-2 hover:bg-black/5 rounded-lg transition-colors touch-target">
                        <XMarkIcon className="w-5 h-5" />
                    </button>

                    <button
                        onClick={() => setShowSidebar(!showSidebar)}
                        className={clsx("p-2 rounded-lg transition-colors touch-target", showSidebar ? "bg-blue-100 text-blue-600" : "hover:bg-black/5")}
                    >
                        <ListBulletIcon className="w-5 h-5" />
                    </button>

                    <h2 className="font-semibold truncate max-w-md hidden sm:block">{title || 'Loading...'}</h2>
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
                        className={clsx("p-2 rounded-lg transition-colors touch-target", showSettings ? "bg-blue-100 text-blue-600" : "hover:bg-black/5")}
                    >
                        <AdjustmentsHorizontalIcon className="w-5 h-5" />
                    </button>

                    {/* Desktop Settings Dropdown */}
                    {!isMobile && showSettings && (
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

            {/* Mobile Bottom Sheet Settings */}
            {isMobile && showSettings && (
                <>
                    <div 
                        className="fixed inset-0 bg-black/50 z-[75]"
                        onClick={() => setShowSettings(false)}
                    />
                    <div className="fixed bottom-0 left-0 right-0 z-[80] bg-white dark:bg-slate-800 rounded-t-2xl shadow-2xl max-h-[80vh] overflow-y-auto animate-in slide-in-from-bottom duration-300">
                        <div className="sticky top-0 bg-white dark:bg-slate-800 border-b dark:border-slate-700 px-4 py-3 flex items-center justify-between">
                            <h3 className="font-semibold text-slate-800 dark:text-slate-100">Reader Settings</h3>
                            <button onClick={() => setShowSettings(false)} className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg touch-target">
                                <XMarkIcon className="w-5 h-5 text-slate-500 dark:text-slate-400" />
                            </button>
                        </div>
                        <div className="p-4 space-y-6">
                            <div>
                                <label className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 block mb-3">Theme</label>
                                <div className="grid grid-cols-3 gap-2">
                                    <button onClick={() => setTheme('light')} className={clsx("px-3 py-2.5 rounded-lg text-sm font-medium border transition-all touch-target", theme === 'light' ? "border-blue-500 bg-blue-50 text-blue-600" : "bg-white border-slate-200 text-slate-600")}>
                                        Light
                                    </button>
                                    <button onClick={() => setTheme('sepia')} className={clsx("px-3 py-2.5 rounded-lg text-sm font-medium border transition-all touch-target", theme === 'sepia' ? "border-orange-400 bg-orange-50 text-orange-700" : "bg-[#f4ecd8] border-[#e1d9c5] text-[#5b4636]")}>
                                        Sepia
                                    </button>
                                    <button onClick={() => setTheme('dark')} className={clsx("px-3 py-2.5 rounded-lg text-sm font-medium border transition-all touch-target", theme === 'dark' ? "border-blue-500 bg-slate-700 text-white" : "bg-slate-900 border-slate-800 text-slate-400")}>
                                        Dark
                                    </button>
                                </div>
                            </div>

                            <div>
                                <div className="flex justify-between items-center mb-3">
                                    <label className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Font Size</label>
                                    <span className="text-sm font-bold text-blue-500">{fontSize}%</span>
                                </div>
                                <input
                                    type="range" min="60" max="200" step="10"
                                    value={fontSize} onChange={(e) => setFontSize(parseInt(e.target.value))}
                                    className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                                />
                            </div>

                            <div>
                                <label className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 block mb-3">Typeface</label>
                                <div className="grid grid-cols-2 gap-2">
                                    <button onClick={() => setFontFamily('serif')} className={clsx("px-3 py-2.5 rounded-lg text-sm font-medium border transition-all font-serif touch-target", fontFamily === 'serif' ? "border-blue-500 bg-blue-50 text-blue-600" : "bg-white border-slate-200 text-slate-600")}>
                                        Serif
                                    </button>
                                    <button onClick={() => setFontFamily('sans-serif')} className={clsx("px-3 py-2.5 rounded-lg text-sm font-medium border transition-all font-sans touch-target", fontFamily === 'sans-serif' ? "border-blue-500 bg-blue-50 text-blue-600" : "bg-white border-slate-200 text-slate-600")}>
                                        Sans
                                    </button>
                                </div>
                            </div>

                            <div>
                                <label className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 block mb-3">Layout</label>
                                <div className="grid grid-cols-2 gap-2 mb-3">
                                    <button onClick={() => setFlowMode('paginated')} className={clsx("px-3 py-2.5 rounded-lg text-sm font-medium border transition-all touch-target", flowMode === 'paginated' ? "border-blue-500 bg-blue-50 text-blue-600" : "bg-white border-slate-200 text-slate-600")}>
                                        Paged
                                    </button>
                                    <button onClick={() => setFlowMode('scrolled')} className={clsx("px-3 py-2.5 rounded-lg text-sm font-medium border transition-all touch-target", flowMode === 'scrolled' ? "border-blue-500 bg-blue-50 text-blue-600" : "bg-white border-slate-200 text-slate-600")}>
                                        Scroll
                                    </button>
                                </div>

                                {flowMode === 'paginated' && (
                                    <button
                                        onClick={() => setIsTwoPage(!isTwoPage)}
                                        className="w-full flex items-center justify-between px-4 py-3 bg-slate-50 dark:bg-slate-900 border dark:border-slate-700 rounded-lg text-sm font-medium transition-all touch-target"
                                    >
                                        <span>Two Page Spread</span>
                                        <div className={clsx("w-10 h-5 rounded-full transition-colors relative", isTwoPage ? "bg-blue-500" : "bg-slate-300 dark:bg-slate-700")}>
                                            <div className={clsx("absolute top-0.5 w-4 h-4 bg-white rounded-full transition-transform", isTwoPage ? "translate-x-5.5" : "translate-x-0.5")} />
                                        </div>
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </>
            )}

            {/* Sidebar (TOC & Bookmarks) - Full screen on mobile */}
            <div className={clsx(
                "bg-white dark:bg-slate-900 z-[75] shadow-2xl transform transition-transform duration-300 ease-in-out flex flex-col",
                // Desktop: side panel
                !isMobile && [
                    "fixed inset-y-0 left-0 w-80 border-r dark:border-slate-800 mt-14",
                    showSidebar ? "translate-x-0" : "-translate-x-full"
                ],
                // Mobile: full screen
                isMobile && [
                    "fixed inset-0",
                    showSidebar ? "translate-y-0" : "translate-y-full"
                ]
            )}>
                {/* Header with close button on mobile */}
                {isMobile && (
                    <div className="px-4 py-3 border-b dark:border-slate-800 flex items-center justify-between">
                        <h3 className="font-semibold text-slate-800 dark:text-slate-100">Navigation</h3>
                        <button onClick={() => setShowSidebar(false)} className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg touch-target">
                            <XMarkIcon className="w-5 h-5 text-slate-500 dark:text-slate-400" />
                        </button>
                    </div>
                )}

                <div className="flex border-b dark:border-slate-800">
                    <button
                        onClick={() => setActiveTab('chapters')}
                        className={clsx(
                            "flex-1 py-3 text-sm font-medium text-center transition-colors border-b-2",
                            activeTab === 'chapters'
                                ? "border-blue-500 text-blue-600 dark:text-blue-400"
                                : "border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400"
                        )}
                    >
                        Chapters
                    </button>
                    <button
                        onClick={() => setActiveTab('bookmarks')}
                        className={clsx(
                            "flex-1 py-3 text-sm font-medium text-center transition-colors border-b-2",
                            activeTab === 'bookmarks'
                                ? "border-blue-500 text-blue-600 dark:text-blue-400"
                                : "border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400"
                        )}
                    >
                        Bookmarks
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto">
                    {activeTab === 'chapters' ? (
                        <div className="py-2">
                            {toc.length > 0 ? toc.map((chapter, i) => (
                                <button
                                    key={i}
                                    onClick={() => jumpTo(format === 'pdf' ? String(chapter.page) : chapter.href)}
                                    className="w-full text-left px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-sm text-slate-700 dark:text-slate-300 border-b border-transparent hover:border-slate-100 dark:hover:border-slate-700"
                                >
                                    <div className="font-medium truncate">{chapter.label || chapter.title}</div>
                                    {format === 'pdf' && <div className="text-xs text-slate-400 mt-0.5">Page {chapter.page}</div>}
                                </button>
                            )) : (
                                <div className="p-8 text-center text-slate-500 dark:text-slate-400">
                                    <ListBulletIcon className="w-12 h-12 mx-auto mb-3 opacity-20" />
                                    <p className="text-sm">No chapters found</p>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="py-2">
                            <div className="px-4 py-2">
                                <button
                                    onClick={addBookmark}
                                    className="w-full flex items-center justify-center space-x-2 py-2 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors text-sm font-medium"
                                >
                                    <BookmarkIconSolid className="w-4 h-4" />
                                    <span>Add Bookmark</span>
                                </button>
                            </div>

                            {bookmarks.length > 0 ? bookmarks.map((bookmark) => (
                                <div
                                    key={bookmark.id}
                                    className="w-full text-left px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-sm text-slate-700 dark:text-slate-300 border-b border-transparent hover:border-slate-100 dark:hover:border-slate-700 group flex items-start justify-between"
                                >
                                    <button
                                        className="flex-1 text-left min-w-0"
                                        onClick={() => jumpTo(bookmark.cfi)}
                                    >
                                        <div className="font-medium truncate">{bookmark.label || 'Untitled Bookmark'}</div>
                                        <div className="text-xs text-slate-400 mt-0.5">{new Date(bookmark.created_at).toLocaleString()}</div>
                                    </button>
                                    <button
                                        onClick={(e) => deleteBookmark(bookmark.id, e)}
                                        className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded opacity-0 group-hover:opacity-100 transition-all"
                                    >
                                        <TrashIcon className="w-4 h-4" />
                                    </button>
                                </div>
                            )) : (
                                <div className="p-8 text-center text-slate-500 dark:text-slate-400">
                                    <BookmarkIcon className="w-12 h-12 mx-auto mb-3 opacity-20" />
                                    <p className="text-sm">No bookmarks yet</p>
                                </div>
                            )}
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

                {/* Click regions for navigation - Larger on mobile */}
                <div className={clsx("absolute inset-y-0 left-0 z-20 cursor-pointer group", isMobile ? "w-20" : "w-32")} onClick={prev}>
                    <div className="h-full flex items-center pl-2 md:pl-4 opacity-0 group-hover:opacity-100 transition-opacity">
                        <div className={clsx("flex items-center justify-center bg-white/90 dark:bg-slate-800/90 rounded-full shadow-lg", isMobile ? "w-12 h-12" : "p-2")}>
                            <ChevronLeftIcon className={clsx("text-slate-600 dark:text-slate-300", isMobile ? "w-7 h-7" : "w-6 h-6")} />
                        </div>
                    </div>
                </div>
                <div className={clsx("absolute inset-y-0 right-0 z-20 cursor-pointer group", isMobile ? "w-20" : "w-32")} onClick={next}>
                    <div className="h-full flex items-center justify-end pr-2 md:pr-4 opacity-0 group-hover:opacity-100 transition-opacity">
                        <div className={clsx("flex items-center justify-center bg-white/90 dark:bg-slate-800/90 rounded-full shadow-lg", isMobile ? "w-12 h-12" : "p-2")}>
                            <ChevronRightIcon className={clsx("text-slate-600 dark:text-slate-300", isMobile ? "w-7 h-7" : "w-6 h-6")} />
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
                ) : ['txt', 'rtf', 'mobi'].includes(format || '') ? (
                    <div className={clsx("w-full h-full overflow-y-auto p-8 md:p-12 leading-relaxed whitespace-pre-wrap transition-all duration-300 mx-auto",
                        flowMode === 'scrolled' ? "max-w-4xl" : "max-w-2xl",
                        readerBg)}
                        style={{
                            fontSize: `${fontSize}%`,
                            fontFamily: fontFamily === 'serif' ? 'Georgia, serif' : 'system-ui, -apple-system, sans-serif'
                        }}
                    >
                        {textContent}
                    </div>
                ) : (
                    <div className={clsx("w-full h-full shadow-2xl transition-all duration-300 origin-center mx-auto",
                        flowMode === 'scrolled' ? "max-w-4xl overflow-y-auto" : (isTwoPage ? "max-w-6xl" : "max-w-2xl"),
                        readerBg)} ref={viewerRef}></div>
                )}
            </div>

            {/* Progress Bar & Navigation Hints */}
            <div className="shrink-0 z-[60]">
                <div
                    className="h-2 w-full bg-black/5 dark:bg-white/5 relative cursor-pointer group/progress"
                    onClick={handleProgressBarClick}
                >
                    {/* Chapter Markers */}
                    {chapterMarkers.map((marker, i) => (
                        <div
                            key={i}
                            className="absolute top-0 bottom-0 w-px bg-black/10 dark:bg-white/10 z-10"
                            style={{ left: `${marker.pos}%` }}
                            title={marker.title}
                        />
                    ))}
                    <div
                        className="h-full bg-blue-500/80 group-hover/progress:bg-blue-500 transition-all duration-300 relative z-20"
                        style={{ width: `${format === 'pdf' ? (numPages > 0 ? (pageNumber / numPages) * 100 : 0) : ((location?.start.percentage || 0) * 100)}%` }}
                    />
                </div>
                {/* Simplified navigation hint on mobile */}
                <div className={clsx("h-8 border-t flex items-center justify-center text-[10px] font-medium uppercase tracking-widest transition-colors",
                    theme === 'dark' ? "bg-slate-900 border-slate-800 text-slate-500" : "bg-slate-50 text-slate-400",
                    isMobile && "hidden")}>
                    {isMobile ? 'Tap sides to navigate' : (flowMode === 'scrolled' ? 'Use mouse or arrows to scroll' : 'Use arrows or click sides to navigate')}
                </div>
            </div>
        </div>
    );
};

export default Reader;
