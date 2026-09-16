import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/router';
import toast from 'react-hot-toast';
import { supabase } from '../lib/supabase';
import { getClientAuthUserForPageLoad } from '../lib/get-client-auth-user';
import Layout from '../components/layout/Layout';
import GoalCard from '../src/components/goals/GoalCard';
import GoalModal from '../src/components/goals/GoalModal';
import GoalDetailPanel from '../src/components/goals/GoalDetailPanel';
import GoalsProgressSummary from '../src/components/goals/GoalsProgressSummary';
import { useGoalsStore } from '../src/stores/goals.store';
import {
  normalizeGoalAutoArchiveDays,
  selectGoalsDueForAutoArchive,
} from '../src/lib/goal-auto-archive';
import { computeGoalsProgressSummary } from '../src/lib/goals-progress-summary';

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
  const [selectedGoal, setSelectedGoal] = useState(null);
  const [showDetailPanel, setShowDetailPanel] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortField, setSortField] = useState('display_order');
  const [sortDirection, setSortDirection] = useState('asc');
  const [showCompleted, setShowCompleted] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const [autoArchiveDays, setAutoArchiveDays] = useState(90);
  const [prefReady, setPrefReady] = useState(false);
  const autoArchiveRan = useRef(false);

  const {
    goals,
    isLoading,
    error,
    fetchGoals,
    getActiveGoals,
    getCompletedGoals,
    getArchivedGoals,
    setActiveGoalFilter,
    deleteGoal,
  } = useGoalsStore();

  const refreshGoals = useCallback(() => {
    // Always load all statuses so summary + Completed/Archived sections stay accurate.
    const sort = {
      field: sortField,
      direction: sortDirection,
    };
    return fetchGoals(undefined, sort);
  }, [sortField, sortDirection, fetchGoals]);

  useEffect(() => {
    let cancelled = false;

    const getUser = async () => {
      try {
        const nextUser = await getClientAuthUserForPageLoad();
        if (cancelled) return;
        if (!nextUser) {
          await router.replace('/auth/login');
          return;
        }

        setUser(nextUser);

        const { data: images, error: imagesError } = await supabase
          .from('vision_board_images')
          .select('*')
          .eq('user_id', nextUser.id)
          .eq('is_active', true)
          .order('display_order', { ascending: true });

        if (imagesError) {
          console.error('[Goals] Vision board query failed:', imagesError);
        }
        if (!cancelled) {
          setVisionBoardImages(images || []);
        }

        try {
          const profileRes = await fetch(`/api/profile?user_id=${nextUser.id}`);
          const profileJson = await profileRes.json();
          if (profileJson.success && profileJson.data) {
            setAutoArchiveDays(
              profileJson.data.goal_auto_archive_days === undefined
                ? 90
                : profileJson.data.goal_auto_archive_days === null
                  ? null
                  : normalizeGoalAutoArchiveDays(profileJson.data.goal_auto_archive_days)
            );
          }
        } catch (e) {
          console.warn('[Goals] Could not load auto-archive preference:', e);
        } finally {
          if (!cancelled) setPrefReady(true);
        }
      } catch (e) {
        if (!cancelled) {
          console.error('[Goals] Failed to load user or images:', e);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    getUser();
    return () => {
      cancelled = true;
    };
  }, [router]);

  useEffect(() => {
    if (user) {
      refreshGoals();
    }
  }, [user, refreshGoals]);

  // Lazy auto-archive once per visit against the full goals list (not status-filtered)
  useEffect(() => {
    if (!user || !prefReady || autoArchiveRan.current) return;

    const run = async () => {
      autoArchiveRan.current = true;
      try {
        await fetchGoals(undefined, { field: sortField, direction: sortDirection });
        const pref =
          autoArchiveDays === null ? null : normalizeGoalAutoArchiveDays(autoArchiveDays);
        const currentGoals = useGoalsStore.getState().goals;
        const due = selectGoalsDueForAutoArchive(currentGoals, pref);
        let archived = 0;
        for (const goal of due) {
          try {
            await deleteGoal(goal.id);
            archived += 1;
          } catch (e) {
            console.warn('[Goals] Auto-archive failed for', goal.id, e);
          }
        }
        if (archived > 0) {
          toast.success(
            `Archived ${archived} completed goal${archived === 1 ? '' : 's'} (auto-archive)`
          );
        }
        await refreshGoals();
      } catch (e) {
        console.warn('[Goals] Auto-archive pass failed:', e);
      }
    };

    void run();
  }, [
    user,
    prefReady,
    autoArchiveDays,
    deleteGoal,
    fetchGoals,
    refreshGoals,
    sortField,
    sortDirection,
  ]);

  const handleAutoArchivePrefChange = async (value) => {
    const next = value === 'off' ? null : Number(value);
    const normalized = normalizeGoalAutoArchiveDays(next === null ? null : next);
    // Allow explicit Off
    const toSave = value === 'off' ? null : normalized;
    setAutoArchiveDays(toSave);
    autoArchiveRan.current = false;
    if (!user) return;
    try {
      const res = await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: user.id,
          goal_auto_archive_days: toSave,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Failed to save preference');
      }
      toast.success('Auto-archive preference saved');
    } catch (e) {
      console.error(e);
      toast.error(e instanceof Error ? e.message : 'Failed to save preference');
    }
  };

  const handleCreateGoal = () => {
    setShowCreateModal(true);
  };

  const handleGoalCreated = () => {
    setShowCreateModal(false);
    refreshGoals();
  };

  const handleGoalClick = (goalId) => {
    const goal = goals.find((g) => g.id === goalId);
    if (goal) {
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
        refreshGoals();
      } catch (err) {
        console.error('Error archiving goal:', err);
      }
    }
  };

  const handleGoalUpdated = () => {
    setShowEditModal(false);
    setEditingGoal(null);
    refreshGoals();
  };

  const activeGoals = getActiveGoals();
  const completedGoals = getCompletedGoals();
  const archivedGoals = getArchivedGoals();
  const progressSummary = computeGoalsProgressSummary(goals);

  const showActiveSection = statusFilter === 'all' || statusFilter === 'active';
  const showCompletedSection = statusFilter === 'all' || statusFilter === 'completed';
  const showArchivedSection = statusFilter === 'all' || statusFilter === 'archived';

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
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-white mb-2">Goals</h1>
            <p className="text-white/70">
              Track your progress and achieve your objectives.
            </p>
          </div>

          {!isLoading && !error && (
            <GoalsProgressSummary
              summary={progressSummary}
              onOverdueClick={handleGoalClick}
            />
          )}

          <div className="flex flex-wrap items-center gap-4 mb-6">
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

            <div className="flex items-center gap-2 ml-auto">
              <label htmlFor="auto-archive-days" className="text-white/70 text-sm">
                Auto-archive:
              </label>
              <select
                id="auto-archive-days"
                value={autoArchiveDays === null ? 'off' : String(autoArchiveDays)}
                onChange={(e) => handleAutoArchivePrefChange(e.target.value)}
                className="px-3 py-1.5 bg-white/10 border border-white/20 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="off">Off</option>
                <option value="30">30 days</option>
                <option value="60">60 days</option>
                <option value="90">90 days</option>
              </select>
            </div>
          </div>

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

          {error && !isLoading && (
            <div className="bg-red-500/20 border border-red-500/30 rounded-lg p-4 text-red-200 mb-6">
              <p>Error: {error}</p>
            </div>
          )}

          {!isLoading && !error && (
            <>
              {showActiveSection && (
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
                  ) : statusFilter !== 'completed' && statusFilter !== 'archived' ? (
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
                  ) : null}
                </>
              )}

              {showCompletedSection && completedGoals.length > 0 && (
                <div className="mt-8">
                  <button
                    onClick={() => setShowCompleted(!showCompleted)}
                    className="flex items-center gap-2 text-white/70 hover:text-white mb-4 transition-colors"
                  >
                    <svg
                      className={`w-5 h-5 transition-transform ${
                        showCompleted || statusFilter === 'completed' ? 'rotate-90' : ''
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

                  {(showCompleted || statusFilter === 'completed') && (
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

              {showArchivedSection && archivedGoals.length > 0 && (
                <div className="mt-8">
                  <button
                    onClick={() => setShowArchived(!showArchived)}
                    className="flex items-center gap-2 text-white/70 hover:text-white mb-4 transition-colors"
                  >
                    <svg
                      className={`w-5 h-5 transition-transform ${
                        showArchived || statusFilter === 'archived' ? 'rotate-90' : ''
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
                      Archived Goals ({archivedGoals.length})
                    </span>
                  </button>

                  {(showArchived || statusFilter === 'archived') && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {archivedGoals.map((goal) => (
                        <GoalCard
                          key={goal.id}
                          goal={goal}
                          onClick={() => handleGoalClick(goal.id)}
                          onEdit={handleEditGoal}
                          onDelete={handleDeleteGoal}
                          className="opacity-60"
                        />
                      ))}
                    </div>
                  )}
                </div>
              )}
            </>
          )}

          <GoalModal
            isOpen={showCreateModal}
            onClose={() => setShowCreateModal(false)}
            onSuccess={handleGoalCreated}
          />

          <GoalModal
            isOpen={showEditModal}
            goal={editingGoal}
            onClose={() => {
              setShowEditModal(false);
              setEditingGoal(null);
            }}
            onSuccess={handleGoalUpdated}
          />

          {showDeleteConfirm && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black bg-opacity-50 backdrop-blur-sm">
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  Archive Goal?
                </h3>
                <p className="text-gray-600 dark:text-gray-400 mb-6">
                  Archive &quot;{goalToDelete?.title}&quot;? You can restore it later from Archived.
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
                    className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
                  >
                    Archive
                  </button>
                </div>
              </div>
            </div>
          )}

          {selectedGoal && (
            <GoalDetailPanel
              goal={selectedGoal}
              isOpen={showDetailPanel}
              onClose={() => {
                setShowDetailPanel(false);
                setSelectedGoal(null);
                setActiveGoalFilter(null);
                refreshGoals();
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
