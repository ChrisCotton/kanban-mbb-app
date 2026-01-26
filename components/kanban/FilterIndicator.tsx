import React from 'react';
import { Goal } from '../../src/types/goals';

interface FilterIndicatorProps {
  goal: Goal;
  onClear: () => void;
}

const FilterIndicator: React.FC<FilterIndicatorProps> = ({ goal, onClear }) => {
  return (
    <div
      data-testid="goal-filter-indicator"
      className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg px-4 py-2 mb-4 flex items-center justify-between"
    >
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <span className="text-blue-600 dark:text-blue-400 font-medium">
            Filtered by goal:
          </span>
          <span className="text-blue-800 dark:text-blue-300 font-semibold">
            {goal.icon || '🎯'} {goal.title}
          </span>
        </div>
      </div>
      <button
        onClick={onClear}
        className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-200 transition-colors"
        aria-label="Clear filter"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M6 18L18 6M6 6l12 12"
          />
        </svg>
      </button>
    </div>
  );
};

export default FilterIndicator;
