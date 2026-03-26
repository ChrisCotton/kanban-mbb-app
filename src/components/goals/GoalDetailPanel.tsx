import React, { useState } from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { GoalWithRelations, GoalMilestone } from '../../types/goals';
import ColorDot from './ColorDot';
import { useGoalsStore } from '../../stores/goals.store';
import GoalModal from './GoalModal';
import MilestoneModal from './MilestoneModal';
import { parseLocalDate } from '../../../lib/utils/date-helpers';

interface GoalDetailPanelProps {
  goal: GoalWithRelations;
  isOpen: boolean;
  onClose: () => void;
  onEdit?: (goal: GoalWithRelations) => void;
}

const GoalDetailPanel: React.FC<GoalDetailPanelProps> = ({
  goal,
  isOpen,
  onClose,
  onEdit,
}) => {
  const {
    completeGoal,
    deleteGoal,
    updateGoal,
    createMilestone,
    updateMilestone,
    deleteMilestone,
    toggleMilestone,
    reorderMilestones,
  } = useGoalsStore();
  const [showEditModal, setShowEditModal] = useState(false);
  const [showCompleteConfirm, setShowCompleteConfirm] = useState(false);
  const [showArchiveConfirm, setShowArchiveConfirm] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showMilestoneModal, setShowMilestoneModal] = useState(false);
  const [editingMilestone, setEditingMilestone] = useState<GoalMilestone | undefined>(undefined);
  const [deletingMilestoneId, setDeletingMilestoneId] = useState<string | null>(null);

  const formatDate = (dateString: string | null): string => {
    if (!dateString) return '';
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

  const handleEdit = () => {
    if (onEdit) {
      onEdit(goal);
    }
    setShowEditModal(true);
  };

  const handleComplete = async () => {
    setIsProcessing(true);
    try {
      await completeGoal(goal.id);
      setShowCompleteConfirm(false);
      onClose();
    } catch (error) {
      console.error('Error completing goal:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleArchive = async () => {
    setIsProcessing(true);
    try {
      await deleteGoal(goal.id);
      setShowArchiveConfirm(false);
      onClose();
    } catch (error) {
      console.error('Error archiving goal:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleMilestoneToggle = async (milestoneId: string, currentStatus: boolean) => {
    if (!goal.milestones) return;

    const milestone = goal.milestones.find((m) => m.id === milestoneId);
    if (!milestone) return;

    try {
      await toggleMilestone(goal.id, milestoneId, !currentStatus);
      // Store action handles optimistic update and refresh
    } catch (error) {
      console.error('Error toggling milestone:', error);
    }
  };

  const handleCreateMilestone = async (title: string) => {
    await createMilestone(goal.id, title);
  };

  const handleEditMilestone = async (title: string) => {
    if (!editingMilestone) return;
    await updateMilestone(goal.id, editingMilestone.id, { title });
    setEditingMilestone(undefined);
  };

  const handleDeleteMilestone = async () => {
    if (!deletingMilestoneId) return;
    try {
      await deleteMilestone(goal.id, deletingMilestoneId);
      setDeletingMilestoneId(null);
    } catch (error) {
      console.error('Error deleting milestone:', error);
    }
  };

  const handleMilestoneDragEnd = async (result: DropResult) => {
    if (!result.destination || !goal.milestones) return;

    // If dropped in the same position, do nothing
    if (result.destination.index === result.source.index) return;

    const sortedMilestones = [...goal.milestones].sort((a, b) => a.display_order - b.display_order);
    const reorderedMilestones = Array.from(sortedMilestones);
    const [movedMilestone] = reorderedMilestones.splice(result.source.index, 1);
    reorderedMilestones.splice(result.destination.index, 0, movedMilestone);

    // Extract milestone IDs in new order
    const milestoneIds = reorderedMilestones.map((m) => m.id);

    try {
      await reorderMilestones(goal.id, milestoneIds);
    } catch (error) {
      console.error('Error reordering milestones:', error);
    }
  };

  const overdue = isOverdue(goal.target_date, goal.status);
  const progressColor = getProgressBarColor(goal.progress_value);
  const hasVisionImage = goal.vision_images && goal.vision_images.length > 0;
  const displayIcon = goal.icon || '🎯';

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 z-[70] transition-opacity"
        onClick={onClose}
      />

      {/* Slide-in Panel */}
      <div
        data-testid="goal-detail-panel"
        className={`fixed top-0 right-0 h-full w-[480px] bg-white dark:bg-gray-800 shadow-2xl z-[80] transform transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              aria-label="Close panel"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 19l-7-7 7-7"
                />
              </svg>
            </button>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Goal Details</h2>
            <div className="w-6" /> {/* Spacer for centering */}
          </div>

          {/* Content - Scrollable */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* Image Section */}
            {hasVisionImage && goal.vision_images && goal.vision_images.length > 0 && (
              <div className="relative w-full h-48 rounded-lg overflow-hidden">
                <img
                  src={goal.vision_images[0].url}
                  alt="Goal vision"
                  className="w-full h-full object-cover"
                />
              </div>
            )}

            {/* Title Section */}
            <div>
              <div className="flex items-center gap-3 mb-2">
                <span className="text-3xl">{displayIcon}</span>
                <ColorDot dueDate={goal.target_date} size="md" />
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{goal.title}</h1>
              </div>
              {goal.category && (
                <span
                  className="inline-block px-3 py-1 rounded-full text-sm font-medium text-white"
                  style={{ backgroundColor: goal.category.color }}
                >
                  {goal.category.name}
                </span>
              )}
            </div>

            {/* Progress Section */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Progress</span>
                <span className="text-sm font-semibold text-gray-900 dark:text-white">
                  {goal.progress_value}%
                </span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
                <div
                  className={`h-3 rounded-full transition-all duration-300 ${progressColor}`}
                  style={{ width: `${goal.progress_value}%` }}
                  role="progressbar"
                  aria-valuenow={goal.progress_value}
                  aria-valuemin={0}
                  aria-valuemax={100}
                />
              </div>
            </div>

            {/* Metadata Section */}
            <div className="grid grid-cols-2 gap-4">
              {goal.target_date && (
                <div>
                  <span className="text-xs text-gray-500 dark:text-gray-400">Target Date</span>
                  <p
                    className={`text-sm font-medium ${
                      overdue ? 'text-red-600 dark:text-red-400' : 'text-gray-900 dark:text-white'
                    }`}
                  >
                    {formatDate(goal.target_date)}
                    {overdue && (
                      <span className="ml-2 text-xs font-semibold">(Overdue)</span>
                    )}
                  </p>
                </div>
              )}
              <div>
                <span className="text-xs text-gray-500 dark:text-gray-400">Status</span>
                <p className="text-sm font-medium text-gray-900 dark:text-white capitalize">
                  {goal.status}
                </p>
              </div>
              <div>
                <span className="text-xs text-gray-500 dark:text-gray-400">Progress Type</span>
                <p className="text-sm font-medium text-gray-900 dark:text-white capitalize">
                  {goal.progress_type.replace('_', '-')}
                </p>
              </div>
            </div>

            {/* Description Section */}
            {goal.description && (
              <div>
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Description
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 whitespace-pre-wrap">
                  {goal.description}
                </p>
              </div>
            )}

            {/* Linked Tasks Section */}
            <div>
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Linked Tasks
              </h3>
              {goal.linked_tasks_count && goal.linked_tasks_count > 0 ? (
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {goal.linked_tasks_count} task{goal.linked_tasks_count !== 1 ? 's' : ''} linked
                </p>
              ) : (
                <p className="text-sm text-gray-500 dark:text-gray-500 italic">
                  No linked tasks
                </p>
              )}
            </div>

            {/* Milestones Section */}
            {goal.progress_type === 'milestone_based' && (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Milestones
                  </h3>
                  <button
                    onClick={() => {
                      setEditingMilestone(undefined);
                      setShowMilestoneModal(true);
                    }}
                    className="text-xs px-2 py-1 bg-blue-500 hover:bg-blue-600 text-white rounded transition-colors"
                  >
                    + Add Milestone
                  </button>
                </div>
                {goal.milestones && goal.milestones.length > 0 ? (
                  <DragDropContext onDragEnd={handleMilestoneDragEnd}>
                    <Droppable droppableId="milestones">
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.droppableProps}
                          className={`space-y-2 ${
                            snapshot.isDraggingOver ? 'bg-blue-50 dark:bg-blue-900/20 rounded-lg p-2' : ''
                          }`}
                        >
                          {(goal.milestones ?? [])
                            .sort((a, b) => a.display_order - b.display_order)
                            .map((milestone: GoalMilestone, index: number) => (
                              <Draggable
                                key={milestone.id}
                                draggableId={milestone.id}
                                index={index}
                              >
                                {(provided, snapshot) => (
                                  <div
                                    ref={provided.innerRef}
                                    {...provided.draggableProps}
                                    className={`group flex items-center gap-3 p-3 rounded-lg border transition-all ${
                                      snapshot.isDragging
                                        ? 'bg-blue-50 dark:bg-blue-900/30 border-blue-400 shadow-lg'
                                        : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700'
                                    }`}
                                  >
                                    {/* Drag Handle */}
                                    <div
                                      {...provided.dragHandleProps}
                                      className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing"
                                      title="Drag to reorder"
                                    >
                                      <svg
                                        className="w-4 h-4 text-gray-400 dark:text-gray-500"
                                        fill="currentColor"
                                        viewBox="0 0 20 20"
                                      >
                                        <path d="M7 2a2 2 0 1 1 .001 4.001A2 2 0 0 1 7 2zM7 8a2 2 0 1 1 .001 4.001A2 2 0 0 1 7 8zM7 14a2 2 0 1 1 .001 4.001A2 2 0 0 1 7 14zM13 2a2 2 0 1 1 .001 4.001A2 2 0 0 1 13 2zM13 8a2 2 0 1 1 .001 4.001A2 2 0 0 1 13 8zM13 14a2 2 0 1 1 .001 4.001A2 2 0 0 1 13 14z" />
                                      </svg>
                                    </div>

                                    <ColorDot dueDate={goal.target_date} size="sm" />
                                    <input
                                      type="checkbox"
                                      checked={milestone.is_complete}
                                      onChange={() => handleMilestoneToggle(milestone.id, milestone.is_complete)}
                                      className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                                      onClick={(e) => e.stopPropagation()}
                                    />
                                    <span
                                      className={`flex-1 text-sm ${
                                        milestone.is_complete
                                          ? 'line-through text-gray-500 dark:text-gray-400'
                                          : 'text-gray-900 dark:text-white'
                                      }`}
                                    >
                                      {milestone.title}
                                    </span>

                                    {/* Action Buttons */}
                                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setEditingMilestone(milestone);
                                          setShowMilestoneModal(true);
                                        }}
                                        className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                                        title={`Edit milestone "${milestone.title}"`}
                                        aria-label={`Edit milestone "${milestone.title}"`}
                                      >
                                        <svg
                                          className="w-4 h-4"
                                          fill="none"
                                          viewBox="0 0 24 24"
                                          stroke="currentColor"
                                        >
                                          <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth={2}
                                            d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                                          />
                                        </svg>
                                      </button>
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setDeletingMilestoneId(milestone.id);
                                        }}
                                        className="p-1 rounded hover:bg-red-100 dark:hover:bg-red-900/30 text-gray-600 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400"
                                        title={`Delete milestone "${milestone.title}"`}
                                        aria-label={`Delete milestone "${milestone.title}"`}
                                      >
                                        <svg
                                          className="w-4 h-4"
                                          fill="none"
                                          viewBox="0 0 24 24"
                                          stroke="currentColor"
                                        >
                                          <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth={2}
                                            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                                          />
                                        </svg>
                                      </button>
                                    </div>
                                  </div>
                                )}
                              </Draggable>
                            ))}
                          {provided.placeholder}
                        </div>
                      )}
                    </Droppable>
                  </DragDropContext>
                ) : (
                  <p className="text-sm text-gray-500 dark:text-gray-500 italic">
                    No milestones yet
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Actions Footer */}
          <div className="border-t border-gray-200 dark:border-gray-700 p-6 space-y-3">
            {goal.status === 'active' && (
              <>
                <button
                  onClick={handleEdit}
                  className="w-full px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors font-medium"
                >
                  Edit
                </button>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setShowCompleteConfirm(true)}
                    className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors font-medium"
                  >
                    Complete
                  </button>
                  <button
                    onClick={() => setShowArchiveConfirm(true)}
                    className="px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg transition-colors font-medium"
                  >
                    Archive
                  </button>
                </div>
              </>
            )}
            {goal.status === 'completed' && (
              <button
                onClick={() => setShowArchiveConfirm(true)}
                className="w-full px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg transition-colors font-medium"
              >
                Archive
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Edit Modal */}
      <GoalModal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        goal={goal}
        onSuccess={() => {
          setShowEditModal(false);
          onClose();
        }}
      />

      {/* Milestone Modal */}
      <MilestoneModal
        isOpen={showMilestoneModal}
        onClose={() => {
          setShowMilestoneModal(false);
          setEditingMilestone(undefined);
        }}
        milestone={editingMilestone}
        onSave={editingMilestone ? handleEditMilestone : handleCreateMilestone}
      />

      {/* Delete Milestone Confirmation */}
      {deletingMilestoneId && (
        <div
          className="fixed inset-0 z-[90] flex items-center justify-center p-4 bg-black bg-opacity-50 backdrop-blur-sm"
          data-testid="confirmation-modal"
        >
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Delete Milestone?
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Are you sure you want to delete this milestone? This action cannot be undone.
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setDeletingMilestoneId(null)}
                disabled={isProcessing}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteMilestone}
                disabled={isProcessing}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                {isProcessing ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Complete Confirmation */}
      {showCompleteConfirm && (
        <div
          className="fixed inset-0 z-[90] flex items-center justify-center p-4 bg-black bg-opacity-50 backdrop-blur-sm"
          data-testid="confirmation-modal"
        >
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Complete Goal?
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Are you sure you want to mark this goal as completed?
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowCompleteConfirm(false)}
                disabled={isProcessing}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleComplete}
                disabled={isProcessing}
                className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
              >
                {isProcessing ? 'Completing...' : 'Yes, Complete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Archive Confirmation */}
      {showArchiveConfirm && (
        <div
          className="fixed inset-0 z-[90] flex items-center justify-center p-4 bg-black bg-opacity-50 backdrop-blur-sm"
          data-testid="confirmation-modal"
        >
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Archive Goal?
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Are you sure you want to archive this goal? You can restore it later if needed.
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowArchiveConfirm(false)}
                disabled={isProcessing}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleArchive}
                disabled={isProcessing}
                className="px-4 py-2 text-sm font-medium text-white bg-gray-600 rounded-lg hover:bg-gray-700 transition-colors disabled:opacity-50"
              >
                {isProcessing ? 'Archiving...' : 'Yes, Archive'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default GoalDetailPanel;
