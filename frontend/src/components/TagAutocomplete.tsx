import React, { useState, useEffect, useRef } from 'react';
import api from '../api';

interface TagAutocompleteItem {
  id: number;
  name: string;
  type: string;
  usage_count: number;
}

interface TagAutocompleteProps {
  query: string;
  onSelect: (tagName: string) => void;
  isOpen: boolean;
  onClose: () => void;
}

const TagAutocomplete: React.FC<TagAutocompleteProps> = ({
  query,
  onSelect,
  isOpen,
  onClose,
}) => {
  const [suggestions, setSuggestions] = useState<TagAutocompleteItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  // Fetch suggestions when query changes
  useEffect(() => {
    const fetchSuggestions = async () => {
      if (!query || query.length < 2) {
        setSuggestions([]);
        return;
      }

      setIsLoading(true);
      try {
        const response = await api.get(`/tags/autocomplete?q=${encodeURIComponent(query)}&limit=10`);
        setSuggestions(response.data);
        setSelectedIndex(0);
      } catch (error) {
        console.error('Failed to fetch tag suggestions:', error);
        setSuggestions([]);
      } finally {
        setIsLoading(false);
      }
    };

    const debounce = setTimeout(fetchSuggestions, 200);
    return () => clearTimeout(debounce);
  }, [query]);

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen || suggestions.length === 0) return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => Math.min(prev + 1, suggestions.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => Math.max(prev - 1, 0));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (suggestions[selectedIndex]) {
          const tag = suggestions[selectedIndex];
          const value = tag.type === 'general' ? tag.name : `${tag.type}:${tag.name}`;
          onSelect(value);
          onClose();
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, suggestions, selectedIndex, onSelect, onClose]);

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen, onClose]);

  if (!isOpen || suggestions.length === 0) return null;

  const tagTypeColors: Record<string, string> = {
    genre: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
    theme: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    setting: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    tone: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
    structure: 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400',
    character_trait: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400',
    meta: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400',
    general: 'bg-slate-100 text-slate-700 dark:bg-slate-700/30 dark:text-slate-400',
  };

  return (
    <div
      ref={containerRef}
      className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-slate-800 border dark:border-slate-700 rounded-lg shadow-lg max-h-80 overflow-y-auto z-50"
    >
      {isLoading ? (
        <div className="p-3 text-sm text-slate-500 dark:text-slate-400">Loading suggestions...</div>
      ) : (
        <div className="py-1">
          {suggestions.map((tag, index) => (
            <button
              key={tag.id}
              onClick={() => {
                const value = tag.type === 'general' ? tag.name : `${tag.type}:${tag.name}`;
                onSelect(value);
                onClose();
              }}
              className={`w-full px-3 py-2 text-left flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors ${
                index === selectedIndex ? 'bg-blue-50 dark:bg-blue-900/20' : ''
              }`}
            >
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <span className="font-medium text-slate-900 dark:text-slate-100 truncate">
                  {tag.name}
                </span>
                <span
                  className={`px-1.5 py-0.5 text-[10px] rounded font-medium ${
                    tagTypeColors[tag.type] || tagTypeColors.general
                  }`}
                >
                  {tag.type}
                </span>
              </div>
              <span className="text-xs text-slate-400 dark:text-slate-500 ml-2 flex-shrink-0">
                {tag.usage_count}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default TagAutocomplete;
