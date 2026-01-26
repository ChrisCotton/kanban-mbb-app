import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../lib/supabase';
import Layout from '../components/layout/Layout';
import GoalCard from '../src/components/goals/GoalCard';
import GoalModal from '../src/components/goals/GoalModal';
import GoalDetailPanel from '../src/components/goals/GoalDetailPanel';
import { useGoalsStore } from '../src/stores/goals.store';

const GoalsPage = () => {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [visionBoardImages, setVisionBoardImages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingGoal, setEditingGoal] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [goalToDelete, setGoalToDelete] = useState(null);
  const [selectedGoalId, setSelectedGoalId] = useState(null);
  const [selectedGoal, setSelectedGoal] = useState(null);
  const [showDetailPanel, setShowDetailPanel] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortField, setSortField] = useState('display_order');
  const [sortDirection, setSortDirection] = useState('asc');
  const [showCompleted, setShowCompleted] = useState(false);

  const {
    goals,
    isLoading,
    error,
    fetchGoals,
    getActiveGoals,
    getCompletedGoals,
    setActiveGoalFilter,
    updateGoal,
    deleteGoal,
  } = useGoalsStore();

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/auth/login');
        return;
      }

      setUser(user);

      // Get active vision board images for carousel
      const { data: images } = await supabase
        .from('vision_board_images')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .order('display_order', { ascending: true });

      setVisionBoardImages(images || []);
      setLoading(false);
    };

    getUser();
  }, [router]);

  useEffect(() => {
    if (user) {
      const filters = statusFilter !== 'all' ? { status: statusFilter } : undefined;
      const sort = {
        field: sortField,
        direction: sortDirection,
      };
      fetchGoals(filters, sort);
    }
  }, [user, statusFilter, sortField, sortDirection, fetchGoals]);

  const handleCreateGoal = () => {
    setShowCreateModal(true);
  };

  const handleGoalCreated = (goal) => {
    // Close the modal
    setShowCreateModal(false);
    // Refresh goals list
    const filters = statusFilter !== 'all' ? { status: statusFilter } : undefined;
    const sort = {
      field: sortField,
      direction: sortDirection,
    };
    fetchGoals(filters, sort);
  };

  const handleGoalClick = (goalId) => {
    const goal = goals.find((g) => g.id === goalId);
    if (goal) {
      setSelectedGoalId(goalId);
      setSelectedGoal(goal);
      setShowDetailPanel(true);
      setActiveGoalFilter(goalId);
    }
  };

  const handleEditGoal = (goal) => {
    setEditingGoal(goal);
    setShowEditModal(true);
  };

  const handleDeleteGoal = (goal) => {
    setGoalToDelete(goal);
    setShowDeleteConfirm(true);
  };

  const handleConfirmDelete = async () => {
    if (goalToDelete) {
      try {
        await deleteGoal(goalToDelete.id);
        setShowDeleteConfirm(false);
        setGoalToDelete(null);
        // Refresh goals list
        const filters = statusFilter !== 'all' ? { status: statusFilter } : undefined;
        const sort = {
          field: sortField,
          direction: sortDirection,
        };
        fetchGoals(filters, sort);
      } catch (error) {
        console.error('Error deleting goal:', error);
      }
    }
  };

  const handleGoalUpdated = (goal) => {
    setShowEditModal(false);
    setEditingGoal(null);
    // Refresh goals list
    const filters = statusFilter !== 'all' ? { status: statusFilter } : undefined;
    const sort = {
      field: sortField,
      direction: sortDirection,
    };
    fetchGoals(filters, sort);
  };

  const activeGoals = getActiveGoals();
  const completedGoals = getCompletedGoals();

  if (loading) {
    return (
      <Layout showCarousel={false} showNavigation={false} showTimer={false}>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
        </div>
      </Layout>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <Layout carouselImages={visionBoardImages} userId={user?.id}>
      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">Goals</h1>
              <p className="text-white/70">
                Track your progress and achieve your objectives.
              </p>
            </div>
            <button
              onClick={handleCreateGoal}
              className="flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white font-medium rounded-lg transition-colors"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4v16m8-8H4"
                />
              </svg>
              New Goal
            </button>
          </div>

          {/* Filter/Sort Controls */}
          <div className="flex flex-wrap items-center gap-4 mb-6">
            <div className="flex items-center gap-2">
              <label htmlFor="status-filter" className="text-white/70 text-sm">
                Status:
              </label>
              <select
                id="status-filter"
                aria-label="Status"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-1.5 bg-white/10 border border-white/20 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All</option>
                <option value="active">Active</option>
                <option value="completed">Completed</option>
                <option value="archived">Archived</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <label htmlFor="sort-field" className="text-white/70 text-sm">
                Sort by:
              </label>
              <select
                id="sort-field"
                value={sortField}
                onChange={(e) => setSortField(e.target.value)}
                className="px-3 py-1.5 bg-white/10 border border-white/20 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="display_order">Order</option>
                <option value="target_date">Due Date</option>
                <option value="progress_value">Progress</option>
                <option value="created_at">Created</option>
                <option value="title">Title</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <label htmlFor="sort-direction" className="text-white/70 text-sm">
                Direction:
              </label>
              <select
                id="sort-direction"
                aria-label="Direction"
                value={sortDirection}
                onChange={(e) => setSortDirection(e.target.value)}
                className="px-3 py-1.5 bg-white/10 border border-white/20 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="asc">Ascending</option>
                <option value="desc">Descending</option>
              </select>
            </div>
          </div>

          {/* Loading State */}
          {isLoading && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="bg-white/10 rounded-lg h-64 animate-pulse"
                  data-testid="skeleton"
                />
              ))}
            </div>
          )}

          {/* Error State */}
          {error && !isLoading && (
            <div className="bg-red-500/20 border border-red-500/30 rounded-lg p-4 text-red-200 mb-6">
              <p>Error: {error}</p>
            </div>
          )}

          {/* Active Goals */}
          {!isLoading && !error && (
            <>
              {activeGoals.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                  {activeGoals.map((goal) => (
                    <GoalCard
                      key={goal.id}
                      goal={goal}
                      onClick={() => handleGoalClick(goal.id)}
                      onEdit={handleEditGoal}
                      onDelete={handleDeleteGoal}
                    />
                  ))}
                </div>
              ) : (
                <div className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 p-12 text-center mb-8">
                  <div className="text-6xl mb-4">🎯</div>
                  <h2 className="text-2xl font-semibold text-white mb-2">
                    No Goals Yet
                  </h2>
                  <p className="text-white/70 mb-6">
                    Create your first goal to start tracking your progress.
                  </p>
                  <button
                    onClick={handleCreateGoal}
                    className="px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white font-medium rounded-lg transition-colors"
                  >
                    Create Your First Goal
                  </button>
                </div>
              )}

              {/* Completed Goals Section */}
              {completedGoals.length > 0 && (
                <div className="mt-8">
                  <button
                    onClick={() => setShowCompleted(!showCompleted)}
                    className="flex items-center gap-2 text-white/70 hover:text-white mb-4 transition-colors"
                  >
                    <svg
                      className={`w-5 h-5 transition-transform ${
                        showCompleted ? 'rotate-90' : ''
                      }`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 5l7 7-7 7"
                      />
                    </svg>
                    <span className="text-lg font-semibold">
                      Completed Goals ({completedGoals.length})
                    </span>
                  </button>

                  {showCompleted && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {completedGoals.map((goal) => (
                        <GoalCard
                          key={goal.id}
                          goal={goal}
                          onClick={() => handleGoalClick(goal.id)}
                          onEdit={handleEditGoal}
                          onDelete={handleDeleteGoal}
                          className="opacity-75"
                        />
                      ))}
                    </div>
                  )}
                </div>
              )}
            </>
          )}

          {/* Create Goal Modal */}
          <GoalModal
            isOpen={showCreateModal}
            onClose={() => setShowCreateModal(false)}
            onSuccess={handleGoalCreated}
          />

          {/* Edit Goal Modal */}
          <GoalModal
            isOpen={showEditModal}
            goal={editingGoal}
            onClose={() => {
              setShowEditModal(false);
              setEditingGoal(null);
            }}
            onSuccess={handleGoalUpdated}
          />

          {/* Delete Confirmation Dialog */}
          {showDeleteConfirm && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black bg-opacity-50 backdrop-blur-sm">
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  Delete Goal?
                </h3>
                <p className="text-gray-600 dark:text-gray-400 mb-6">
                  Are you sure you want to delete "{goalToDelete?.title}"? This action cannot be undone.
                </p>
                <div className="flex gap-3 justify-end">
                  <button
                    onClick={() => {
                      setShowDeleteConfirm(false);
                      setGoalToDelete(null);
                    }}
                    className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleConfirmDelete}
                    className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Goal Detail Panel */}
          {selectedGoal && (
            <GoalDetailPanel
              goal={selectedGoal}
              isOpen={showDetailPanel}
              onClose={() => {
                setShowDetailPanel(false);
                setSelectedGoal(null);
                setSelectedGoalId(null);
                setActiveGoalFilter(null);
              }}
              onEdit={(goal) => {
                setShowDetailPanel(false);
                handleEditGoal(goal);
              }}
            />
          )}
        </div>
      </main>
    </Layout>
  );
};

export default GoalsPage;
