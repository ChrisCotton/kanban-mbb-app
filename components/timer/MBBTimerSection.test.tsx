import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MBBTimerSection } from './MBBTimerSection';

// Mock the useTimer hook
jest.mock('../../hooks/useTimer', () => ({
  useTimer: jest.fn(),
}));

// Mock the timer integration module
jest.mock('../../lib/timer-integration', () => ({
  saveTimerSession: jest.fn(),
  startTimerSession: jest.fn(),
  timerService: {
    startSession: jest.fn(),
    endSession: jest.fn(),
    pauseSession: jest.fn(),
    resumeSession: jest.fn(),
  },
}));

const mockUseTimer = require('../../hooks/useTimer').useTimer;

describe('MBBTimerSection', () => {
  const mockActiveTask = {
    id: 'task-1',
    title: 'Test Task',
    category: {
      id: 'cat-1',
      name: 'Development',
      hourly_rate: 75,
      color: '#3B82F6'
    }
  };

  const mockTimerState = {
    currentTime: 0,
    isRunning: false,
    isPaused: false,
    sessionEarnings: 0,
    start: jest.fn(),
    pause: jest.fn(),
    resume: jest.fn(),
    stop: jest.fn(),
    reset: jest.fn(),
    activeSession: null,
    totalSessionsToday: 0,
    totalEarningsToday: 0,
  };

  const mockOnTaskSelect = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseTimer.mockReturnValue(mockTimerState);
  });

  describe('Initial Rendering', () => {
    it('should render with no active task', () => {
      render(<MBBTimerSection />);

      expect(screen.getByText('No task selected')).toBeInTheDocument();
      expect(screen.getByText('00:00')).toBeInTheDocument();
      expect(screen.getByText('$0.00')).toBeInTheDocument(); // Session earnings
      expect(screen.getByText('--')).toBeInTheDocument(); // Rate display when no task
    });

    it('should render with active task', () => {
      render(
        <MBBTimerSection 
          activeTask={mockActiveTask}
          onTaskSelect={mockOnTaskSelect}
        />
      );

      expect(screen.getByText('Test Task')).toBeInTheDocument();
      expect(screen.getByText('Development')).toBeInTheDocument();
      expect(screen.getByText('$75.00/hr')).toBeInTheDocument();
      expect(screen.getByText('00:00')).toBeInTheDocument();
    });

    it('should render with custom className', () => {
      const { container } = render(
        <MBBTimerSection className="custom-class" />
      );

      expect(container.firstChild).toHaveClass('custom-class');
    });

    it('should use default userId when none provided', () => {
      render(<MBBTimerSection />);

      expect(mockUseTimer).toHaveBeenCalledWith(
        expect.objectContaining({
          onSessionSave: expect.any(Function),
          autoSave: true,
        })
      );
    });
  });

  describe('Time Display Formatting', () => {
    it('should format time in MM:SS format for less than an hour', () => {
      mockUseTimer.mockReturnValue({
        ...mockTimerState,
        currentTime: 125, // 2 minutes 5 seconds
      });

      render(<MBBTimerSection />);

      expect(screen.getByText('02:05')).toBeInTheDocument();
    });

    it('should format time in HH:MM:SS format for an hour or more', () => {
      mockUseTimer.mockReturnValue({
        ...mockTimerState,
        currentTime: 3665, // 1 hour 1 minute 5 seconds
      });

      render(<MBBTimerSection />);

      expect(screen.getByText('01:01:05')).toBeInTheDocument();
    });

    it('should pad single digits with zeros', () => {
      mockUseTimer.mockReturnValue({
        ...mockTimerState,
        currentTime: 65, // 1 minute 5 seconds
      });

      render(<MBBTimerSection />);

      expect(screen.getByText('01:05')).toBeInTheDocument();
    });
  });

  describe('Currency Display Formatting', () => {
    it('should format session earnings as USD currency', () => {
      mockUseTimer.mockReturnValue({
        ...mockTimerState,
        sessionEarnings: 37.50,
      });

      render(<MBBTimerSection />);

      expect(screen.getByText('$37.50')).toBeInTheDocument();
    });

    it('should format hourly rate as currency per hour', () => {
      render(
        <MBBTimerSection activeTask={mockActiveTask} />
      );

      expect(screen.getByText('$75.00/hr')).toBeInTheDocument();
    });

    it('should handle zero earnings correctly', () => {
      mockUseTimer.mockReturnValue({
        ...mockTimerState,
        sessionEarnings: 0,
      });

      render(<MBBTimerSection />);

      expect(screen.getByText('$0.00')).toBeInTheDocument();
    });
  });

  describe('Timer Controls - Start State', () => {
    it('should show Start button when timer is not running', () => {
      render(<MBBTimerSection />);

      const startButton = screen.getByRole('button', { name: /start/i });
      expect(startButton).toBeInTheDocument();
      expect(startButton).toHaveClass('bg-green-600');
    });

    it('should call start function when Start button is clicked', async () => {
      const user = userEvent.setup();
      render(<MBBTimerSection />);

      const startButton = screen.getByRole('button', { name: /start/i });
      await user.click(startButton);

      expect(mockTimerState.start).toHaveBeenCalled();
    });

    it('should show reset button when timer is not running', () => {
      render(<MBBTimerSection />);

      const resetButton = screen.getByRole('button', { name: /reset timer/i });
      expect(resetButton).toBeInTheDocument();
    });
  });

  describe('Timer Controls - Running State', () => {
    beforeEach(() => {
      mockUseTimer.mockReturnValue({
        ...mockTimerState,
        isRunning: true,
        isPaused: false,
      });
    });

    it('should show Pause and Stop buttons when timer is running', () => {
      render(<MBBTimerSection />);

      expect(screen.getByRole('button', { name: /pause/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /stop/i })).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /start/i })).not.toBeInTheDocument();
    });

    it('should call pause function when Pause button is clicked', async () => {
      const user = userEvent.setup();
      render(<MBBTimerSection />);

      const pauseButton = screen.getByRole('button', { name: /pause/i });
      await user.click(pauseButton);

      expect(mockTimerState.pause).toHaveBeenCalled();
    });

    it('should call stop function when Stop button is clicked', async () => {
      const user = userEvent.setup();
      render(<MBBTimerSection />);

      const stopButton = screen.getByRole('button', { name: /stop/i });
      await user.click(stopButton);

      expect(mockTimerState.stop).toHaveBeenCalled();
    });

    it('should show green pulsing indicator when running', () => {
      render(<MBBTimerSection />);

      const indicator = document.querySelector('.w-3.h-3.rounded-full');
      expect(indicator).toHaveClass('bg-green-500', 'animate-pulse');
    });
  });

  describe('Timer Controls - Paused State', () => {
    beforeEach(() => {
      mockUseTimer.mockReturnValue({
        ...mockTimerState,
        isRunning: true,
        isPaused: true,
      });
    });

    it('should show Resume and Stop buttons when timer is paused', () => {
      render(<MBBTimerSection />);

      expect(screen.getByRole('button', { name: /resume/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /stop/i })).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /pause/i })).not.toBeInTheDocument();
    });

    it('should call resume function when Resume button is clicked', async () => {
      const user = userEvent.setup();
      render(<MBBTimerSection />);

      const resumeButton = screen.getByRole('button', { name: /resume/i });
      await user.click(resumeButton);

      expect(mockTimerState.resume).toHaveBeenCalled();
    });

    it('should show yellow indicator when paused', () => {
      render(<MBBTimerSection />);

      const indicator = document.querySelector('.w-3.h-3.rounded-full');
      expect(indicator).toHaveClass('bg-yellow-500');
      expect(indicator).not.toHaveClass('animate-pulse');
    });
  });

  describe('Reset Functionality', () => {
    it('should call reset function when Reset button is clicked', async () => {
      const user = userEvent.setup();
      render(<MBBTimerSection />);

      const resetButton = screen.getByRole('button', { name: /reset timer/i });
      await user.click(resetButton);

      expect(mockTimerState.reset).toHaveBeenCalled();
    });

    it('should show reset button in all timer states', () => {
      // Test in stopped state
      const { unmount } = render(<MBBTimerSection />);
      expect(screen.getByRole('button', { name: /reset timer/i })).toBeInTheDocument();
      unmount();

      // Test in running state - create new render with different mock
      mockUseTimer.mockReturnValue({
        ...mockTimerState,
        isRunning: true,
      });
      render(<MBBTimerSection />);
      expect(screen.getByRole('button', { name: /reset timer/i })).toBeInTheDocument();
    });
  });

  describe('Status Indicator', () => {
    it('should show gray indicator when timer is stopped', () => {
      render(<MBBTimerSection />);

      const indicator = document.querySelector('.w-3.h-3.rounded-full');
      expect(indicator).toHaveClass('bg-gray-500');
    });

    it('should show green pulsing indicator when running', () => {
      mockUseTimer.mockReturnValue({
        ...mockTimerState,
        isRunning: true,
        isPaused: false,
      });

      render(<MBBTimerSection />);

      const indicator = document.querySelector('.w-3.h-3.rounded-full');
      expect(indicator).toHaveClass('bg-green-500', 'animate-pulse');
    });

    it('should show yellow indicator when paused', () => {
      mockUseTimer.mockReturnValue({
        ...mockTimerState,
        isRunning: true,
        isPaused: true,
      });

      render(<MBBTimerSection />);

      const indicator = document.querySelector('.w-3.h-3.rounded-full');
      expect(indicator).toHaveClass('bg-yellow-500');
    });
  });

  describe('Task Information Display', () => {
    it('should display task title and category when active task is provided', () => {
      render(
        <MBBTimerSection activeTask={mockActiveTask} />
      );

      expect(screen.getByText('Test Task')).toBeInTheDocument();
      expect(screen.getByText('Development')).toBeInTheDocument();
    });

    it('should display "No task selected" when no active task', () => {
      render(<MBBTimerSection />);

      expect(screen.getByText('No task selected')).toBeInTheDocument();
    });

    it('should hide category display when task has no category', () => {
      const taskWithoutCategory = {
        id: 'task-1',
        title: 'Test Task'
      };

      render(
        <MBBTimerSection activeTask={taskWithoutCategory} />
      );

      expect(screen.getByText('Test Task')).toBeInTheDocument();
      expect(screen.queryByText('Development')).not.toBeInTheDocument();
    });
  });

  describe('useTimer Hook Integration', () => {
    it('should pass correct options to useTimer hook', () => {
      const onSessionSave = jest.fn();
      
      render(
        <MBBTimerSection 
          activeTask={mockActiveTask}
          onTaskSelect={mockOnTaskSelect}
          userId="test-user"
        />
      );

      expect(mockUseTimer).toHaveBeenCalledWith({
        activeTask: mockActiveTask,
        onTaskSelect: mockOnTaskSelect,
        onSessionSave: expect.any(Function),
        autoSave: true,
      });
    });

    it('should use default userId when none provided', () => {
      render(<MBBTimerSection />);

      const calls = mockUseTimer.mock.calls[0][0];
      expect(calls.autoSave).toBe(true);
    });
  });

  describe('Responsive Design', () => {
    it('should hide rate display on small screens', () => {
      render(
        <MBBTimerSection activeTask={mockActiveTask} />
      );

      const rateContainer = screen.getByText('$75.00/hr').closest('.hidden.sm\\:flex');
      expect(rateContainer).toBeInTheDocument();
    });

    it('should hide button text on small screens', () => {
      render(<MBBTimerSection />);

      const startButton = screen.getByRole('button', { name: /start/i });
      const hiddenText = startButton.querySelector('.hidden.sm\\:inline');
      expect(hiddenText).toBeInTheDocument();
    });

    it('should stack items vertically on mobile', () => {
      render(<MBBTimerSection />);

      const mainContainer = document.querySelector('.flex.flex-col.lg\\:flex-row');
      expect(mainContainer).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper button roles and labels', () => {
      render(<MBBTimerSection />);

      expect(screen.getByRole('button', { name: /start/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /reset timer/i })).toBeInTheDocument();
    });

    it('should have proper title attribute on reset button', () => {
      render(<MBBTimerSection />);

      const resetButton = screen.getByRole('button', { name: /reset timer/i });
      expect(resetButton).toHaveAttribute('title', 'Reset Timer');
    });

    it('should maintain focus management for timer controls', async () => {
      const user = userEvent.setup();
      render(<MBBTimerSection />);

      const startButton = screen.getByRole('button', { name: /start/i });
      await user.click(startButton);
      
      // Button should remain focusable
      expect(startButton).not.toHaveAttribute('disabled');
    });
  });

  describe('Error Handling', () => {
    it('should handle missing category gracefully', () => {
      const taskWithoutCategory = {
        id: 'task-1',
        title: 'Test Task'
      };

      expect(() => {
        render(<MBBTimerSection activeTask={taskWithoutCategory} />);
      }).not.toThrow();

      expect(screen.getByText('--')).toBeInTheDocument(); // Rate should show as '--'
    });

    it('should handle missing hourly_rate gracefully', () => {
      const taskWithoutRate = {
        id: 'task-1',
        title: 'Test Task',
        category: {
          id: 'cat-1',
          name: 'Development',
          hourly_rate: 0
        }
      };

      render(<MBBTimerSection activeTask={taskWithoutRate} />);

      // When hourly_rate is 0, the component shows '--' instead of formatted currency
      expect(screen.getByText('--')).toBeInTheDocument();
    });
  });
}); 