import React, { useState, useEffect } from 'react';
import { GoalMilestone } from '../../types/goals';

interface MilestoneModalProps {
  isOpen: boolean;
  onClose: () => void;
  milestone?: GoalMilestone; // If provided, we're editing; if undefined, we're creating
  onSave: (title: string) => Promise<void>;
}

const MilestoneModal: React.FC<MilestoneModalProps> = ({
  isOpen,
  onClose,
  milestone,
  onSave,
}) => {
  const [title, setTitle] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset form when modal opens/closes or milestone changes
  useEffect(() => {
    if (isOpen) {
      if (milestone) {
        // Edit mode - pre-fill with existing title
        setTitle(milestone.title || '');
      } else {
        // Create mode - clear form
        setTitle('');
      }
      setError(null);
    }
  }, [isOpen, milestone]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validate title
    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      setError('Title is required');
      return;
    }

    if (trimmedTitle.length > 255) {
      setError('Title must be 255 characters or less');
      return;
    }

    setIsLoading(true);
    try {
      await onSave(trimmedTitle);
      onClose();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to save milestone';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    setTitle('');
    setError(null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 z-[90] transition-opacity"
        onClick={handleCancel}
      />

      {/* Modal */}
      <div
        className="fixed inset-0 z-[100] flex items-center justify-center p-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            {milestone ? 'Edit Milestone' : 'Add Milestone'}
          </h2>

          <form onSubmit={handleSubmit}>
            {/* Title Input */}
            <div className="mb-4">
              <label
                htmlFor="milestone-title"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
              >
                Title
              </label>
              <input
                id="milestone-title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Enter milestone title..."
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                autoFocus
                disabled={isLoading}
                maxLength={255}
              />
              {error && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">{error}</p>
              )}
            </div>

            {/* Actions */}
            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={handleCancel}
                disabled={isLoading}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isLoading || !title.trim()}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? 'Saving...' : milestone ? 'Save Changes' : 'Add Milestone'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
};

export default MilestoneModal;
