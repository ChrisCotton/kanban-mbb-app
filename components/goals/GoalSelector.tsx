import React, { useState, useEffect, useRef } from 'react';
import { Goal } from '../../src/types/goals';
import { useGoalsStore } from '../../src/stores/goals.store';
import GoalModal from '../../src/components/goals/GoalModal';

interface GoalSelectorProps {
  value: string | null; // Selected goal ID
  onChange: (goalId: string | null) => void;
  userId: string;
  placeholder?: string;
  className?: string;
  allowClear?: boolean;
  showCreateOption?: boolean;
  error?: string;
  required?: boolean;
}

const GoalSelector: React.FC<GoalSelectorProps> = ({
  value,
  onChange,
  userId,
  placeholder = 'Select a goal...',
  className = '',
  allowClear = false,
  showCreateOption = true,
  error,
  required = false,
}) => {
  const { goals, fetchGoals } = useGoalsStore();
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Fetch goals on mount
  useEffect(() => {
    if (goals.length === 0) {
      fetchGoals({ status: 'active' }).catch((error) => {
        console.error('Error fetching goals:', error);
      });
    }
  }, [goals.length, fetchGoals]);

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

  // Filter goals based on search query
  const filteredGoals = goals.filter((goal) => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return (
      goal.title.toLowerCase().includes(query) ||
      (goal.description && goal.description.toLowerCase().includes(query))
    );
  });

  // Get selected goal
  const selectedGoal = goals.find((g) => g.id === value);

  const handleSelectGoal = (goalId: string | null) => {
    onChange(goalId);
    setIsOpen(false);
    setSearchQuery('');
  };

  const handleCreateGoal = () => {
    setShowCreateModal(true);
    setIsOpen(false);
  };

  const handleGoalCreated = (newGoal: Goal) => {
    // Select the newly created goal
    onChange(newGoal.id);
    setShowCreateModal(false);
  };

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      {/* Select Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full px-4 py-2 bg-white/10 border rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-500 flex items-center justify-between ${
          error ? 'border-red-500' : 'border-white/20'
        }`}
      >
        <span className="truncate">
          {selectedGoal ? (
            <span className="flex items-center gap-2">
              <span>{selectedGoal.icon || '🎯'}</span>
              <span>{selectedGoal.title}</span>
            </span>
          ) : (
            <span className="text-white/50">{placeholder}</span>
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
              placeholder="Search goals..."
              className="w-full px-3 py-2 text-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
              autoFocus
            />
          </div>

          {/* Goals List */}
          <div className="max-h-48 overflow-y-auto">
            {allowClear && (
              <button
                onClick={() => handleSelectGoal(null)}
                className="w-full text-left px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <span className="text-gray-500 dark:text-gray-400">None</span>
              </button>
            )}

            {filteredGoals.length === 0 ? (
              <div className="px-3 py-2 text-sm text-gray-500 dark:text-gray-400 text-center">
                {searchQuery ? 'No goals found' : 'No goals available'}
              </div>
            ) : (
              filteredGoals.map((goal) => (
                <button
                  key={goal.id}
                  onClick={() => handleSelectGoal(goal.id)}
                  className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2 ${
                    value === goal.id ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                  }`}
                >
                  <span>{goal.icon || '🎯'}</span>
                  <span className="text-gray-700 dark:text-gray-300 truncate">{goal.title}</span>
                  {goal.progress_value !== undefined && (
                    <span className="ml-auto text-xs text-gray-500 dark:text-gray-400">
                      {goal.progress_value}%
                    </span>
                  )}
                </button>
              ))
            )}

            {/* Create New Goal Option */}
            {showCreateOption && (
              <button
                onClick={handleCreateGoal}
                className="w-full text-left px-3 py-2 text-sm text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 border-t border-gray-200 dark:border-gray-700 flex items-center gap-2"
              >
                <span>+</span>
                <span>Create New Goal</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Create Goal Modal */}
      {showCreateModal && (
        <GoalModal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onSuccess={handleGoalCreated}
        />
      )}
    </div>
  );
};

export default GoalSelector;
