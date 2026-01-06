import { useState, useEffect } from 'react';

interface MediaQueryResult {
    isMobile: boolean;
    isTablet: boolean;
    isDesktop: boolean;
    width: number;
}

/**
 * Custom hook to detect current screen size and breakpoint
 * 
 * Breakpoints:
 * - Mobile: < 640px
 * - Tablet: 640px - 1024px
 * - Desktop: > 1024px
 */
export function useMediaQuery(): MediaQueryResult {
    const [windowWidth, setWindowWidth] = useState<number>(
        typeof window !== 'undefined' ? window.innerWidth : 1024
    );

    useEffect(() => {
        const handleResize = () => {
            setWindowWidth(window.innerWidth);
        };

        // Add event listener
        window.addEventListener('resize', handleResize);

        // Call handler right away so state gets updated with initial window size
        handleResize();

        // Remove event listener on cleanup
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    return {
        isMobile: windowWidth < 640,
        isTablet: windowWidth >= 640 && windowWidth < 1024,
        isDesktop: windowWidth >= 1024,
        width: windowWidth,
    };
}

/**
 * Hook to check if current screen matches a specific breakpoint
 * @param query - Media query string, e.g., "(max-width: 640px)"
 */
export function useMediaQueryMatch(query: string): boolean {
    const [matches, setMatches] = useState<boolean>(false);

    useEffect(() => {
        const media = window.matchMedia(query);
        
        // Update initial state
        if (media.matches !== matches) {
            setMatches(media.matches);
        }

        // Create listener
        const listener = (e: MediaQueryListEvent) => {
            setMatches(e.matches);
        };

        // Add listener
        media.addEventListener('change', listener);

        // Cleanup
        return () => media.removeEventListener('change', listener);
    }, [matches, query]);

    return matches;
}
