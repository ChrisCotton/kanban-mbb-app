import React, { useState, useEffect } from 'react';
import { Goal, CreateGoalInput, UpdateGoalInput, GoalProgressType } from '../../types/goals';
import { useGoalsStore } from '../../stores/goals.store';
import CategorySelector from '../../../components/ui/CategorySelector';
import DatePicker from '../../../components/ui/DatePicker';
import IconSelector from '../../../components/ui/IconSelector';
import { supabase } from '../../../lib/supabase';

interface VisionBoardImage {
  id: string;
  file_path: string;
}

interface GoalModalProps {
  isOpen: boolean;
  onClose: () => void;
  goal?: Goal; // If provided, we're editing; if undefined, we're creating
  onSuccess?: (goal: Goal) => void;
}

const GoalModal: React.FC<GoalModalProps> = ({
  isOpen,
  onClose,
  goal,
  onSuccess,
}) => {
  const { createGoal, updateGoal } = useGoalsStore();
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [visionImages, setVisionImages] = useState<VisionBoardImage[]>([]);
  const [selectedVisionImageIds, setSelectedVisionImageIds] = useState<string[]>([]);

  // Form state
  const [formData, setFormData] = useState<{
    title: string;
    description: string;
    category_id: string | null;
    target_date: string;
    progress_type: GoalProgressType;
    color: string;
    icon: string;
  }>({
    title: '',
    description: '',
    category_id: null,
    target_date: '',
    progress_type: 'manual',
    color: '#8B5CF6',
    icon: '🎯',
  });

  // Fetch vision board images
  useEffect(() => {
    if (isOpen) {
      const fetchVisionImages = async () => {
        try {
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) return;

          const { data: images, error } = await supabase
            .from('vision_board_images')
            .select('id, file_path')
            .eq('user_id', user.id)
            .eq('is_active', true)
            .order('display_order', { ascending: true });

          if (error) {
            console.error('Error fetching vision images:', error);
            return;
          }

          setVisionImages(images || []);
        } catch (error) {
          console.error('Error fetching vision images:', error);
        }
      };

      fetchVisionImages();
    }
  }, [isOpen]);

  // Reset form when modal opens/closes or goal changes
  useEffect(() => {
    if (isOpen) {
      if (goal) {
        // Edit mode - pre-fill with existing values
        setFormData({
          title: goal.title || '',
          description: goal.description || '',
          category_id: goal.category_id || null,
          target_date: goal.target_date || '',
          progress_type: goal.progress_type || 'manual',
          color: goal.color || '#8B5CF6',
          icon: goal.icon || '🎯',
        });
        // Set selected vision images if goal has them
        if (goal.vision_images && goal.vision_images.length > 0) {
          setSelectedVisionImageIds(goal.vision_images.map((img) => img.id));
        } else {
          setSelectedVisionImageIds([]);
        }
      } else {
        // Create mode - reset to defaults
        setFormData({
          title: '',
          description: '',
          category_id: null,
          target_date: '',
          progress_type: 'manual',
          color: '#8B5CF6',
          icon: '🎯',
        });
        setSelectedVisionImageIds([]);
      }
      setErrors({});
    }
  }, [isOpen, goal]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.title.trim()) {
      newErrors.title = 'Title is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    setErrors({});

    try {
      const today = new Date().toISOString().split('T')[0];
      const inputData: CreateGoalInput | UpdateGoalInput = {
        title: formData.title.trim(),
        description: formData.description.trim() || undefined,
        category_id: formData.category_id || undefined,
        target_date: formData.target_date || undefined,
        progress_type: formData.progress_type,
        color: formData.color || undefined,
        icon: formData.icon || '🎯', // Default to 🎯 if no icon selected
        vision_image_ids: selectedVisionImageIds.length > 0 ? selectedVisionImageIds : undefined,
      };

      let result: Goal;
      if (goal) {
        // Edit mode
        result = await updateGoal(goal.id, inputData as UpdateGoalInput);
      } else {
        // Create mode
        result = await createGoal(inputData as CreateGoalInput);
      }

      if (onSuccess) {
        onSuccess(result);
      }
      onClose();
    } catch (error: any) {
      setErrors({
        submit: error.message || 'Failed to save goal. Please try again.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    if (!isLoading) {
      onClose();
    }
  };

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    // Only close if clicking directly on the backdrop, not on any child elements
    if (e.target === e.currentTarget && !isLoading) {
      onClose();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape' && !isLoading) {
      handleClose();
    }
  };

  const toggleVisionImage = (imageId: string) => {
    setSelectedVisionImageIds((prev) =>
      prev.includes(imageId)
        ? prev.filter((id) => id !== imageId)
        : [...prev, imageId]
    );
  };

  if (!isOpen) return null;

  const today = new Date().toISOString().split('T')[0];

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black bg-opacity-50 backdrop-blur-sm"
      onClick={handleBackdropClick}
      onKeyDown={handleKeyDown}
    >
      <div
        className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            {goal ? 'Edit Goal' : 'Create New Goal'}
          </h2>
          <button
            onClick={handleClose}
            disabled={isLoading}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 disabled:opacity-50"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Title Field */}
          <div>
            <label
              htmlFor="goal-title"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
            >
              Title <span className="text-red-500">*</span>
            </label>
            <input
              id="goal-title"
              type="text"
              value={formData.title}
              onChange={(e) =>
                setFormData({ ...formData, title: e.target.value })
              }
              className={`w-full px-4 py-2 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.title
                  ? 'border-red-500'
                  : 'border-gray-300 dark:border-gray-600'
              }`}
              placeholder="Enter goal title"
            />
            {errors.title && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400" role="alert">
                {errors.title}
              </p>
            )}
          </div>

          {/* Description Field */}
          <div>
            <label
              htmlFor="goal-description"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
            >
              Description
            </label>
            <textarea
              id="goal-description"
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              rows={4}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter goal description (optional)"
            />
          </div>

          {/* Category Field */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Category
            </label>
            <CategorySelector
              value={formData.category_id || undefined}
              onChange={(categoryId) =>
                setFormData({ ...formData, category_id: categoryId })
              }
              allowNone={true}
            />
          </div>

          {/* Target Date Field */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Target Date
            </label>
            <DatePicker
              value={formData.target_date}
              onChange={(date) =>
                setFormData({ ...formData, target_date: date })
              }
              minDate={today}
              placeholder="Select target date"
            />
          </div>

          {/* Progress Type Field */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Progress Type
            </label>
            <div className="space-y-2">
              <label className="flex items-start">
                <input
                  type="radio"
                  name="progress_type"
                  value="manual"
                  checked={formData.progress_type === 'manual'}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      progress_type: e.target.value as GoalProgressType,
                    })
                  }
                  className="mr-2 mt-1"
                />
                <div className="flex-1">
                  <span className="text-gray-700 dark:text-gray-300 font-medium">Manual</span>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    You manually update progress percentage yourself.
                  </p>
                </div>
              </label>
              <label className="flex items-start">
                <input
                  type="radio"
                  name="progress_type"
                  value="task_based"
                  checked={formData.progress_type === 'task_based'}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      progress_type: e.target.value as GoalProgressType,
                    })
                  }
                  className="mr-2 mt-1"
                />
                <div className="flex-1">
                  <span className="text-gray-700 dark:text-gray-300 font-medium">Task-based</span>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    Progress automatically updates based on completion of linked Kanban tasks.
                  </p>
                </div>
              </label>
              <label className="flex items-start">
                <input
                  type="radio"
                  name="progress_type"
                  value="milestone_based"
                  checked={formData.progress_type === 'milestone_based'}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      progress_type: e.target.value as GoalProgressType,
                    })
                  }
                  className="mr-2 mt-1"
                />
                <div className="flex-1">
                  <span className="text-gray-700 dark:text-gray-300 font-medium">Milestone-based</span>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    Progress automatically updates based on completion of goal milestones you define.
                  </p>
                </div>
              </label>
            </div>
          </div>

          {/* Vision Board Images */}
          {visionImages.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Vision Board Images
              </label>
              <div className="grid grid-cols-4 gap-3">
                {visionImages.map((image) => (
                  <div
                    key={image.id}
                    className={`relative cursor-pointer rounded-lg overflow-hidden border-2 transition-all ${
                      selectedVisionImageIds.includes(image.id)
                        ? 'border-blue-500 ring-2 ring-blue-200'
                        : 'border-gray-200 dark:border-gray-700'
                    }`}
                    onClick={() => toggleVisionImage(image.id)}
                  >
                    <img
                      src={image.file_path}
                      alt="Vision board"
                      className="w-full h-20 object-cover"
                    />
                    {selectedVisionImageIds.includes(image.id) && (
                      <div className="absolute top-1 right-1 bg-blue-500 rounded-full p-1">
                        <svg
                          className="w-4 h-4 text-white"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Color and Icon Fields */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="goal-color"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
              >
                Color
              </label>
              <input
                id="goal-color"
                type="color"
                value={formData.color}
                onChange={(e) =>
                  setFormData({ ...formData, color: e.target.value })
                }
                className="w-full h-10 rounded-lg cursor-pointer"
              />
            </div>
            <div>
              <label
                htmlFor="goal-icon"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
              >
                Icon
              </label>
              <IconSelector
                value={formData.icon || null}
                onChange={(icon) =>
                  setFormData({ ...formData, icon: icon || '🎯' })
                }
                placeholder="Select an icon..."
              />
            </div>
          </div>

          {/* Error Message */}
          {errors.submit && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
              <p className="text-sm text-red-600 dark:text-red-400">
                {errors.submit}
              </p>
            </div>
          )}

          {/* Modal Footer */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={handleClose}
              disabled={isLoading}
              className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading
                ? 'Saving...'
                : goal
                ? 'Save Changes'
                : 'Create Goal'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default GoalModal;
