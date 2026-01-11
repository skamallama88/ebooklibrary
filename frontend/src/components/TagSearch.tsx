import React, { useState, useRef, useEffect } from 'react';
import TagAutocomplete from './TagAutocomplete';

interface TagSearchProps {
  value: string;
  onChange: (value: string) => void;
  onSearch: (query: string) => void;
  placeholder?: string;
  className?: string;
}

const TagSearch: React.FC<TagSearchProps> = ({
  value,
  onChange,
  onSearch,
  placeholder = 'Search with tags... (e.g., fantasy -romance, genre:scifi OR genre:fantasy)',
  className = '',
}) => {
  const [showAutocomplete, setShowAutocomplete] = useState(false);
  const [currentWord, setCurrentWord] = useState('');
  const [showHelp, setShowHelp] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Extract current word being typed for autocomplete
  // Extract current word being typed for autocomplete
  useEffect(() => {
    if (!inputRef.current) return;

    const cursorPos = inputRef.current.selectionStart || 0;
    const textBeforeCursor = value.substring(0, cursorPos);
    
    // Find the last word (split by spaces and operators)
    const words = textBeforeCursor.split(/\s+/);
    const lastWord = words[words.length - 1] || '';
    
    // Remove operators from the start of the word
    const cleanWord = lastWord.replace(/^[-]/, '');
    
    // Extract tag name (remove type: prefix if exists)
    const tagName = cleanWord.includes(':') ? cleanWord.split(':')[1] : cleanWord;
    
    // Only update state if it changed to avoid loops
    if (tagName !== currentWord) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setCurrentWord(tagName);
    }
    
    const shouldShow = tagName.length >= 2 && !textBeforeCursor.endsWith(' ');
    if (shouldShow !== showAutocomplete) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setShowAutocomplete(shouldShow);
    }
  }, [value, currentWord, showAutocomplete]);

  const handleTagSelect = (tagName: string) => {
    if (!inputRef.current) return;

    const cursorPos = inputRef.current.selectionStart || 0;
    const textBeforeCursor = value.substring(0, cursorPos);
    const textAfterCursor = value.substring(cursorPos);

    // Find the position of the current word
    const words = textBeforeCursor.split(/\s+/);
    const lastWord = words[words.length - 1] || '';
    
    // Preserve operator prefix if exists
    const hasExclusion = lastWord.startsWith('-');
    const hasType = lastWord.includes(':');
    
    let replacement = tagName;
    if (hasExclusion) {
      replacement = `-${tagName}`;
    } else if (hasType) {
      const typePrefix = lastWord.split(':')[0];
      replacement = `${typePrefix}:${tagName}`;
    }

    // Replace the current word with the selected tag
    const beforeWord = textBeforeCursor.substring(0, textBeforeCursor.length - lastWord.length);
    const newValue = beforeWord + replacement + textAfterCursor;
    
    onChange(newValue);
    setShowAutocomplete(false);

    // Focus back on input
    setTimeout(() => {
      inputRef.current?.focus();
      const newCursorPos = beforeWord.length + replacement.length;
      inputRef.current?.setSelectionRange(newCursorPos, newCursorPos);
    }, 0);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !showAutocomplete) {
      e.preventDefault();
      onSearch(value);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value);
  };

  return (
    <div className={`relative ${className}`}>
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="w-full px-4 py-2 pr-20 border dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500"
        />
        
        {/* Help Icon */}
        <button
          type="button"
          onClick={() => setShowHelp(!showHelp)}
          className="absolute right-12 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
          title="Search syntax help"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </button>

        {/* Search Button */}
        <button
          type="button"
          onClick={() => onSearch(value)}
          className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 bg-blue-500 hover:bg-blue-600 text-white rounded-md transition-colors"
          title="Search"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </button>
      </div>

      {/* Autocomplete Dropdown */}
      <TagAutocomplete
        query={currentWord}
        onSelect={handleTagSelect}
        isOpen={showAutocomplete}
        onClose={() => setShowAutocomplete(false)}
      />

      {/* Help Panel */}
      {showHelp && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setShowHelp(false)}
          />
          <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-slate-800 border dark:border-slate-700 rounded-lg shadow-lg p-4 z-50">
            <div className="text-sm space-y-3">
              <div>
                <h4 className="font-semibold text-slate-900 dark:text-slate-100 mb-2">Tag Search Syntax</h4>
                <div className="space-y-1 text-slate-600 dark:text-slate-400">
                  <div><code className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-700 rounded">fantasy</code> - Include books with this tag</div>
                  <div><code className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-700 rounded">-romance</code> - Exclude books with this tag</div>
                  <div><code className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-700 rounded">fantasy scifi</code> - AND (both required)</div>
                  <div><code className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-700 rounded">fantasy OR scifi</code> - OR (either required)</div>
                  <div><code className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-700 rounded">genre:fantasy</code> - Filter by tag type</div>
                  <div><code className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-700 rounded">"space opera"</code> - Multi-word tag</div>
                </div>
              </div>
              <div className="pt-2 border-t dark:border-slate-700">
                <p className="text-xs text-slate-500 dark:text-slate-500">
                  Tip: Start typing a tag name to see autocomplete suggestions with usage counts.
                </p>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default TagSearch;
