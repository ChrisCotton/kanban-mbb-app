import React, { useState, useEffect, useRef } from 'react';

interface IconSelectorProps {
  value: string | null;
  onChange: (icon: string | null) => void;
  placeholder?: string;
  className?: string;
  error?: string;
}

// Common goal-related icons organized by category
const GOAL_ICONS = [
  // Achievement & Success
  '🎯', '🏆', '⭐', '💎', '👑', '🏅', '🎖️', '🥇', '🥈', '🥉',
  // Business & Finance
  '💰', '💵', '💴', '💶', '💷', '💸', '📈', '📊', '💼', '🏢',
  // Growth & Progress
  '🌱', '🌿', '🌳', '📈', '📊', '📉', '📌', '📍', '🎪', '🎨',
  // Technology & Development
  '💻', '📱', '⌨️', '🖥️', '🖨️', '📡', '🔌', '⚡', '🔋', '💡',
  // Health & Fitness
  '💪', '🏃', '🚴', '🏋️', '🧘', '🧗', '🏔️', '⛰️', '🏊', '🎾',
  // Travel & Adventure
  '✈️', '🚀', '🚁', '🚢', '🚗', '🏎️', '🏍️', '🚲', '🗺️', '🧳',
  // Learning & Education
  '📚', '📖', '📝', '✏️', '🖊️', '🖋️', '📋', '📄', '🎓', '🧠',
  // Creativity & Arts
  '🎨', '🖼️', '🎭', '🎬', '🎤', '🎧', '🎵', '🎶', '🎸', '🎹',
  // Relationships & Social
  '👥', '🤝', '💬', '📞', '📧', '💌', '🎁', '🎉', '🎊', '🎈',
  // Home & Lifestyle
  '🏠', '🏡', '🏘️', '🏰', '⛪', '🏛️', '🌆', '🌇', '🌃', '🌉',
  // Nature & Environment
  '🌍', '🌎', '🌏', '🌊', '🌋', '🏜️', '🏝️', '🌴', '🌵', '🌲',
  // Time & Calendar
  '⏰', '⏱️', '⏲️', '🕐', '📅', '📆', '🗓️', '⏳', '⌛', '⏰',
  // Miscellaneous
  '🔥', '💯', '✅', '❌', '⚠️', '🚨', '🎯', '🎲', '🎰', '🎮',
];

const IconSelector: React.FC<IconSelectorProps> = ({
  value,
  onChange,
  placeholder = 'Select an icon...',
  className = '',
  error,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearchQuery('');
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  // Filter icons based on search query (search by emoji or category)
  const filteredIcons = GOAL_ICONS.filter((icon) => {
    if (!searchQuery.trim()) return true;
    // For now, just show all if searching (could enhance with emoji name search)
    return true;
  });

  const handleSelectIcon = (icon: string) => {
    onChange(icon);
    setIsOpen(false);
    setSearchQuery('');
  };

  const handleClear = () => {
    onChange(null);
    setIsOpen(false);
  };

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      {/* Select Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full px-4 py-2 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 flex items-center justify-between ${
          error ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
        }`}
      >
        <span className="flex items-center gap-2">
          {value ? (
            <span className="text-2xl">{value}</span>
          ) : (
            <span className="text-gray-400 dark:text-gray-500">{placeholder}</span>
          )}
        </span>
        <svg
          className={`w-5 h-5 transition-transform ${isOpen ? 'transform rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Error Message */}
      {error && <p className="mt-1 text-sm text-red-400">{error}</p>}

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg max-h-64 overflow-hidden">
          {/* Search Input */}
          <div className="p-2 border-b border-gray-200 dark:border-gray-700">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search icons..."
              className="w-full px-3 py-2 text-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
              autoFocus
            />
          </div>

          {/* Icons Grid */}
          <div className="max-h-48 overflow-y-auto p-2">
            {/* Clear Option */}
            <button
              onClick={handleClear}
              className="w-full text-left px-3 py-2 text-sm text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded mb-1"
            >
              None
            </button>

            {/* Icons Grid */}
            <div className="grid grid-cols-8 gap-2">
              {filteredIcons.map((icon) => (
                <button
                  key={icon}
                  type="button"
                  onClick={() => handleSelectIcon(icon)}
                  className={`p-2 text-2xl rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors ${
                    value === icon ? 'bg-blue-50 dark:bg-blue-900/20 ring-2 ring-blue-500' : ''
                  }`}
                  title={icon}
                >
                  {icon}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default IconSelector;
