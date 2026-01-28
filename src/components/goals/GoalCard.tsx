import React from 'react';
import { GoalWithRelations } from '../../types/goals';
import { parseLocalDate } from '../../../lib/utils/date-helpers';

interface GoalCardProps {
  goal: GoalWithRelations;
  onClick: () => void;
  onEdit?: (goal: GoalWithRelations) => void;
  onDelete?: (goal: GoalWithRelations) => void;
  className?: string;
}

export default function GoalCard({ 
  goal, 
  onClick, 
  onEdit, 
  onDelete, 
  className = '' 
}: GoalCardProps) {
  const formatDate = (dateString: string): string => {
    // Use parseLocalDate to avoid timezone issues (YYYY-MM-DD interpreted as UTC)
    const date = parseLocalDate(dateString);
    const currentYear = new Date().getFullYear();
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: date.getFullYear() !== currentYear ? 'numeric' : undefined,
    });
  };

  const isOverdue = (targetDate: string | null, status: string): boolean => {
    if (!targetDate || status === 'completed') return false;
    // Use parseLocalDate to avoid timezone issues
    const dueDate = parseLocalDate(targetDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    dueDate.setHours(0, 0, 0, 0);
    return dueDate < today;
  };

  const getProgressBarColor = (progress: number): string => {
    if (progress >= 70) return 'bg-green-500';
    if (progress >= 30) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const overdue = isOverdue(goal.target_date, goal.status);
  const progressColor = getProgressBarColor(goal.progress_value);
  const hasVisionImage = goal.vision_images && goal.vision_images.length > 0;
  const displayIcon = goal.icon || '🎯';

  const handleEditClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onEdit) {
      onEdit(goal);
    }
  };

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onDelete) {
      onDelete(goal);
    }
  };

  return (
    <div
      onClick={onClick}
      data-testid="goal-card"
      className={`
        bg-white dark:bg-gray-700 rounded-lg shadow-sm border 
        transition-all duration-200 cursor-pointer hover:shadow-md
        ${overdue ? 'border-red-500 dark:border-red-400' : 'border-gray-200 dark:border-gray-600'}
        ${className}
      `}
    >
      {/* Header with Image/Icon */}
      <div className="relative h-32 bg-gradient-to-br from-purple-100 to-blue-100 dark:from-purple-900/30 dark:to-blue-900/30 rounded-t-lg overflow-hidden">
        {hasVisionImage ? (
          <img
            src={goal.vision_images![0].thumbnail_url}
            alt={goal.title}
            className="w-full h-full object-cover"
            role="img"
          />
        ) : (
          <div className="flex items-center justify-center h-full">
            <span className="text-4xl">{displayIcon}</span>
          </div>
        )}
        
        {/* Category Badge */}
        {goal.category && (
          <div
            className="absolute top-2 right-2 px-2 py-1 rounded-md text-xs font-medium text-white shadow-md"
            style={{ backgroundColor: goal.category.color || '#8B5CF6' }}
          >
            {goal.category.name}
          </div>
        )}

        {/* Action Buttons */}
        <div className="absolute top-2 left-2 flex gap-1">
          {onEdit && (
            <button
              onClick={handleEditClick}
              className="p-1.5 bg-black/30 hover:bg-black/50 rounded-md text-white transition-colors"
              aria-label="Edit goal"
              title="Edit goal"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </button>
          )}
          {onDelete && (
            <button
              onClick={handleDeleteClick}
              className="p-1.5 bg-black/30 hover:bg-red-500/70 rounded-md text-white transition-colors"
              aria-label="Delete goal"
              title="Delete goal"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        {/* Title */}
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2 line-clamp-2">
          {goal.title}
        </h3>

        {/* Progress Bar */}
        <div className="mb-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Progress
            </span>
            <span className="text-sm font-semibold text-gray-900 dark:text-white">
              {goal.progress_value}%
            </span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2">
            <div
              className={`${progressColor} h-2 rounded-full transition-all duration-300`}
              style={{ width: `${Math.min(goal.progress_value, 100)}%` }}
              role="progressbar"
              aria-valuenow={goal.progress_value}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={`${goal.progress_value}% complete`}
            />
          </div>
        </div>

        {/* Due Date */}
        {goal.target_date && (
          <div className={`text-sm ${overdue ? 'text-red-600 dark:text-red-400 font-medium' : 'text-gray-600 dark:text-gray-400'}`}>
            <span className="flex items-center gap-1">
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
              {overdue && <span className="font-semibold">Overdue:</span>}
              {formatDate(goal.target_date)}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
