import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { GoalWithRelations } from '../../types/goals';

interface GoalsHeaderStripProps {
  goals: GoalWithRelations[];
  activeGoalId: string | null;
  onGoalClick: (goalId: string) => void;
  className?: string;
}

const GoalsHeaderStrip: React.FC<GoalsHeaderStripProps> = ({
  goals,
  activeGoalId,
  onGoalClick,
  className = '',
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [showLeftArrow, setShowLeftArrow] = useState(false);
  const [showRightArrow, setShowRightArrow] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const getProgressBarColor = (progress: number): string => {
    if (progress >= 70) return 'bg-green-500';
    if (progress >= 30) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const truncateTitle = (title: string, maxLength: number = 20): string => {
    if (title.length <= maxLength) return title;
    return title.substring(0, maxLength - 3) + '...';
  };

  const checkScrollButtons = () => {
    if (!scrollContainerRef.current) return;

    const container = scrollContainerRef.current;
    const { scrollLeft, scrollWidth, clientWidth } = container;

    setShowLeftArrow(scrollLeft > 0);
    setShowRightArrow(scrollLeft < scrollWidth - clientWidth - 1);
  };

  useEffect(() => {
    checkScrollButtons();
    const container = scrollContainerRef.current;
    if (container) {
      container.addEventListener('scroll', checkScrollButtons);
      window.addEventListener('resize', checkScrollButtons);
      return () => {
        container.removeEventListener('scroll', checkScrollButtons);
        window.removeEventListener('resize', checkScrollButtons);
      };
    }
  }, [goals]);

  const scrollLeft = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: -200, behavior: 'smooth' });
    }
  };

  const scrollRight = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: 200, behavior: 'smooth' });
    }
  };

  const handleGoalClick = (goalId: string) => {
    onGoalClick(goalId);
  };

  if (isCollapsed) {
    return (
      <div
        data-testid="goals-header-strip"
        className={`bg-white/10 backdrop-blur-sm border-b border-white/20 ${className}`}
      >
        <div className="flex items-center justify-between px-4 h-[72px]">
          <button
            onClick={() => setIsCollapsed(false)}
            className="text-white/70 hover:text-white"
            aria-label="Expand goals strip"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </button>
          <span className="text-white/70 text-sm">Goals ({goals.length})</span>
          <Link href="/goals" aria-label="Manage goals" data-testid="goals-settings-link">
            <svg className="w-5 h-5 text-white/70 hover:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div
      data-testid="goals-header-strip"
      className={`bg-white/10 backdrop-blur-sm border-b border-white/20 relative ${className}`}
    >
      <div className="flex items-center h-[72px]">
        {/* Toggle Button */}
        <button
          onClick={() => setIsCollapsed(true)}
          className="px-3 h-full text-white/70 hover:text-white hover:bg-white/10 transition-colors"
          aria-label="Collapse goals strip"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 15l7-7 7 7"
            />
          </svg>
        </button>

        {/* Left Arrow */}
        {showLeftArrow && (
          <button
            onClick={scrollLeft}
            className="absolute left-12 z-10 h-full px-2 bg-white/10 hover:bg-white/20 text-white/70 hover:text-white transition-colors"
            aria-label="Scroll left"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
          </button>
        )}

        {/* Scrollable Goals Container */}
        <div
          ref={scrollContainerRef}
          className="flex-1 overflow-x-auto scrollbar-hide flex items-center gap-3 px-2"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          data-testid="goals-scroll-container"
        >
          <div className="flex items-center gap-3 min-w-max py-2">
            {goals.length === 0 ? (
              <div className="text-white/50 text-sm px-4">No goals</div>
            ) : (
              goals.map((goal) => {
                const isActive = activeGoalId === goal.id;
                const progressColor = getProgressBarColor(goal.progress_value);
                const displayIcon = goal.icon || '🎯';

                return (
                  <div
                    key={goal.id}
                    data-testid={`goal-card-compact-${goal.id}`}
                    onClick={() => handleGoalClick(goal.id)}
                    className={`
                      flex items-center gap-2 px-3 py-2 rounded-lg
                      bg-white/10 hover:bg-white/20 border-2
                      cursor-pointer transition-all duration-200
                      min-w-[200px] flex-shrink-0
                      ${
                        isActive
                          ? 'border-blue-500 ring-2 ring-blue-200 bg-blue-500/20'
                          : 'border-white/20 hover:border-white/30'
                      }
                    `}
                  >
                    {/* Icon */}
                    <span className="text-xl flex-shrink-0">{displayIcon}</span>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      {/* Title */}
                      <div className="text-sm font-medium text-white truncate">
                        {truncateTitle(goal.title, 18)}
                      </div>

                      {/* Progress Bar and Number */}
                      <div className="flex items-center gap-2 mt-1">
                        <div className="flex-1 h-1.5 bg-white/20 rounded-full overflow-hidden">
                          <div
                            className={`h-full ${progressColor} transition-all duration-300`}
                            style={{ width: `${goal.progress_value}%` }}
                            role="progressbar"
                            aria-valuenow={goal.progress_value}
                            aria-valuemin={0}
                            aria-valuemax={100}
                          />
                        </div>
                        <span className="text-xs font-semibold text-white/80 flex-shrink-0">
                          {goal.progress_value}%
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Arrow */}
        {showRightArrow && (
          <button
            onClick={scrollRight}
            className="absolute right-12 z-10 h-full px-2 bg-white/10 hover:bg-white/20 text-white/70 hover:text-white transition-colors"
            aria-label="Scroll right"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5l7 7-7 7"
              />
            </svg>
          </button>
        )}

        {/* Gear Icon Link */}
        <Link
          href="/goals"
          className="px-3 h-full flex items-center text-white/70 hover:text-white hover:bg-white/10 transition-colors"
          aria-label="Manage goals"
          data-testid="goals-settings-link"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
            />
          </svg>
        </Link>
      </div>

      {/* Hide scrollbar styles */}
      <style jsx>{`
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </div>
  );
};

export default GoalsHeaderStrip;
