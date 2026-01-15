import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TimerControls } from './TimerControls';

describe('TimerControls', () => {
  const mockHandlers = {
    onStart: jest.fn(),
    onPause: jest.fn(),
    onResume: jest.fn(),
    onStop: jest.fn(),
    onReset: jest.fn(),
    onDelete: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Timer State: Stopped', () => {
    it('should render Start and Reset buttons when timer is stopped', () => {
      render(
        <TimerControls
          isRunning={false}
          isPaused={false}
          {...mockHandlers}
        />
      );

      expect(screen.getByRole('button', { name: /start timer/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /reset timer/i })).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /pause timer/i })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /stop timer/i })).not.toBeInTheDocument();
    });

    it('should call onStart when Start button is clicked', async () => {
      const user = userEvent.setup();
      render(
        <TimerControls
          isRunning={false}
          isPaused={false}
          {...mockHandlers}
        />
      );

      const startButton = screen.getByRole('button', { name: /start timer/i });
      await user.click(startButton);

      expect(mockHandlers.onStart).toHaveBeenCalledTimes(1);
    });
  });

  describe('Timer State: Running', () => {
    it('should render Pause, Stop, and Reset buttons when timer is running', () => {
      render(
        <TimerControls
          isRunning={true}
          isPaused={false}
          {...mockHandlers}
        />
      );

      expect(screen.getByRole('button', { name: /pause timer/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /stop timer/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /reset timer/i })).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /start timer/i })).not.toBeInTheDocument();
    });

    it('should call onPause when Pause button is clicked', async () => {
      const user = userEvent.setup();
      render(
        <TimerControls
          isRunning={true}
          isPaused={false}
          {...mockHandlers}
        />
      );

      const pauseButton = screen.getByRole('button', { name: /pause timer/i });
      await user.click(pauseButton);

      expect(mockHandlers.onPause).toHaveBeenCalledTimes(1);
    });

    it('should call onStop when Stop button is clicked', async () => {
      const user = userEvent.setup();
      render(
        <TimerControls
          isRunning={true}
          isPaused={false}
          {...mockHandlers}
        />
      );

      const stopButton = screen.getByRole('button', { name: /stop timer/i });
      await user.click(stopButton);

      expect(mockHandlers.onStop).toHaveBeenCalledTimes(1);
    });
  });

  describe('Timer State: Paused', () => {
    it('should render Resume, Stop, and Reset buttons when timer is paused', () => {
      render(
        <TimerControls
          isRunning={true}
          isPaused={true}
          {...mockHandlers}
        />
      );

      expect(screen.getByRole('button', { name: /resume timer/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /stop timer/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /reset timer/i })).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /pause timer/i })).not.toBeInTheDocument();
    });

    it('should call onResume when Resume button is clicked', async () => {
      const user = userEvent.setup();
      render(
        <TimerControls
          isRunning={true}
          isPaused={true}
          {...mockHandlers}
        />
      );

      const resumeButton = screen.getByRole('button', { name: /resume timer/i });
      await user.click(resumeButton);

      expect(mockHandlers.onResume).toHaveBeenCalledTimes(1);
    });
  });

  describe('Reset Functionality', () => {
    it('should show Reset button in all timer states', () => {
      // Stopped state
      const { rerender } = render(
        <TimerControls
          isRunning={false}
          isPaused={false}
          {...mockHandlers}
        />
      );
      expect(screen.getByRole('button', { name: /reset timer/i })).toBeInTheDocument();

      // Running state
      rerender(
        <TimerControls
          isRunning={true}
          isPaused={false}
          {...mockHandlers}
        />
      );
      expect(screen.getByRole('button', { name: /reset timer/i })).toBeInTheDocument();

      // Paused state
      rerender(
        <TimerControls
          isRunning={true}
          isPaused={true}
          {...mockHandlers}
        />
      );
      expect(screen.getByRole('button', { name: /reset timer/i })).toBeInTheDocument();
    });

    it('should call onReset when Reset button is clicked', async () => {
      const user = userEvent.setup();
      render(
        <TimerControls
          isRunning={false}
          isPaused={false}
          {...mockHandlers}
        />
      );

      const resetButton = screen.getByRole('button', { name: /reset timer/i });
      await user.click(resetButton);

      expect(mockHandlers.onReset).toHaveBeenCalledTimes(1);
    });
  });

  describe('Size Variants', () => {
    it('should apply small size classes', () => {
      render(
        <TimerControls
          isRunning={false}
          isPaused={false}
          size="sm"
          {...mockHandlers}
        />
      );

      const startButton = screen.getByRole('button', { name: /start timer/i });
      expect(startButton).toHaveClass('px-2', 'py-1', 'text-sm');
      
      const startIcon = startButton.querySelector('svg');
      expect(startIcon).toHaveClass('w-3', 'h-3');
    });

    it('should apply medium size classes (default)', () => {
      render(
        <TimerControls
          isRunning={false}
          isPaused={false}
          {...mockHandlers}
        />
      );

      const startButton = screen.getByRole('button', { name: /start timer/i });
      expect(startButton).toHaveClass('px-4', 'py-2');
      
      const startIcon = startButton.querySelector('svg');
      expect(startIcon).toHaveClass('w-4', 'h-4');
    });

    it('should apply large size classes', () => {
      render(
        <TimerControls
          isRunning={false}
          isPaused={false}
          size="lg"
          {...mockHandlers}
        />
      );

      const startButton = screen.getByRole('button', { name: /start timer/i });
      expect(startButton).toHaveClass('px-6', 'py-3', 'text-lg');
      
      const startIcon = startButton.querySelector('svg');
      expect(startIcon).toHaveClass('w-5', 'h-5');
    });
  });

  describe('Visual Variants', () => {
    it('should apply default variant styles', () => {
      render(
        <TimerControls
          isRunning={false}
          isPaused={false}
          variant="default"
          {...mockHandlers}
        />
      );

      const startButton = screen.getByRole('button', { name: /start timer/i });
      expect(startButton).toHaveClass('bg-green-600');
      expect(startButton).not.toHaveClass('bg-transparent', 'border');
    });

    it('should apply minimal variant styles', () => {
      render(
        <TimerControls
          isRunning={false}
          isPaused={false}
          variant="minimal"
          {...mockHandlers}
        />
      );

      const startButton = screen.getByRole('button', { name: /start timer/i });
      expect(startButton).toHaveClass('bg-transparent', 'border', 'border-white/20');
    });

    it('should apply compact variant styles', () => {
      render(
        <TimerControls
          isRunning={false}
          isPaused={false}
          variant="compact"
          {...mockHandlers}
        />
      );

      const startButton = screen.getByRole('button', { name: /start timer/i });
      expect(startButton).toHaveClass('bg-white/10');
    });
  });

  describe('Label Display', () => {
    it('should show labels by default', () => {
      render(
        <TimerControls
          isRunning={false}
          isPaused={false}
          {...mockHandlers}
        />
      );

      const startLabel = screen.getByText('Start');
      expect(startLabel).toBeInTheDocument();
      expect(startLabel).toHaveClass('hidden', 'sm:inline');
    });

    it('should hide labels when showLabels is false', () => {
      render(
        <TimerControls
          isRunning={false}
          isPaused={false}
          showLabels={false}
          {...mockHandlers}
        />
      );

      expect(screen.queryByText('Start')).not.toBeInTheDocument();
    });

    it('should hide Reset label in compact variant', () => {
      render(
        <TimerControls
          isRunning={false}
          isPaused={false}
          variant="compact"
          {...mockHandlers}
        />
      );

      expect(screen.queryByText('Reset')).not.toBeInTheDocument();
    });
  });

  describe('Disabled State', () => {
    it('should disable all buttons when disabled prop is true', () => {
      render(
        <TimerControls
          isRunning={true}
          isPaused={false}
          disabled={true}
          {...mockHandlers}
        />
      );

      const pauseButton = screen.getByRole('button', { name: /pause timer/i });
      const stopButton = screen.getByRole('button', { name: /stop timer/i });
      const resetButton = screen.getByRole('button', { name: /reset timer/i });

      expect(pauseButton).toBeDisabled();
      expect(stopButton).toBeDisabled();
      expect(resetButton).toBeDisabled();
    });

    it('should apply disabled styling when disabled', () => {
      render(
        <TimerControls
          isRunning={false}
          isPaused={false}
          disabled={true}
          {...mockHandlers}
        />
      );

      const startButton = screen.getByRole('button', { name: /start timer/i });
      expect(startButton).toHaveClass('opacity-50', 'cursor-not-allowed');
    });

    it('should not call handlers when disabled', async () => {
      const user = userEvent.setup();
      render(
        <TimerControls
          isRunning={false}
          isPaused={false}
          disabled={true}
          {...mockHandlers}
        />
      );

      const startButton = screen.getByRole('button', { name: /start timer/i });
      const resetButton = screen.getByRole('button', { name: /reset timer/i });

      await user.click(startButton);
      await user.click(resetButton);

      expect(mockHandlers.onStart).not.toHaveBeenCalled();
      expect(mockHandlers.onReset).not.toHaveBeenCalled();
    });
  });

  describe('Custom Styling', () => {
    it('should apply custom className', () => {
      const { container } = render(
        <TimerControls
          isRunning={false}
          isPaused={false}
          className="custom-timer-controls"
          {...mockHandlers}
        />
      );

      const controlsContainer = container.firstChild;
      expect(controlsContainer).toHaveClass('custom-timer-controls');
    });

    it('should maintain base classes with custom className', () => {
      const { container } = render(
        <TimerControls
          isRunning={false}
          isPaused={false}
          className="custom-class"
          {...mockHandlers}
        />
      );

      const controlsContainer = container.firstChild;
      expect(controlsContainer).toHaveClass('flex', 'items-center', 'space-x-2', 'custom-class');
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels for all buttons', () => {
      render(
        <TimerControls
          isRunning={true}
          isPaused={true}
          {...mockHandlers}
        />
      );

      expect(screen.getByRole('button', { name: /resume timer/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /stop timer/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /reset timer/i })).toBeInTheDocument();
    });

    it('should have role="group" with aria-label for the controls container', () => {
      render(
        <TimerControls
          isRunning={false}
          isPaused={false}
          {...mockHandlers}
        />
      );

      const controlsGroup = screen.getByRole('group', { name: /timer controls/i });
      expect(controlsGroup).toBeInTheDocument();
    });

    it('should have aria-hidden="true" on SVG icons', () => {
      render(
        <TimerControls
          isRunning={false}
          isPaused={false}
          {...mockHandlers}
        />
      );

      const startButton = screen.getByRole('button', { name: /start timer/i });
      const svgIcon = startButton.querySelector('svg');
      expect(svgIcon).toHaveAttribute('aria-hidden', 'true');
    });

    it('should have proper title attribute on Reset button', () => {
      render(
        <TimerControls
          isRunning={false}
          isPaused={false}
          {...mockHandlers}
        />
      );

      const resetButton = screen.getByRole('button', { name: /reset timer/i });
      expect(resetButton).toHaveAttribute('title', 'Reset Timer');
    });
  });

  describe('Button Color Coding', () => {
    it('should use green color for Start button', () => {
      render(
        <TimerControls
          isRunning={false}
          isPaused={false}
          {...mockHandlers}
        />
      );

      const startButton = screen.getByRole('button', { name: /start timer/i });
      expect(startButton).toHaveClass('bg-green-600');
    });

    it('should use yellow color for Pause button', () => {
      render(
        <TimerControls
          isRunning={true}
          isPaused={false}
          {...mockHandlers}
        />
      );

      const pauseButton = screen.getByRole('button', { name: /pause timer/i });
      expect(pauseButton).toHaveClass('bg-yellow-600');
    });

    it('should use blue color for Resume button', () => {
      render(
        <TimerControls
          isRunning={true}
          isPaused={true}
          {...mockHandlers}
        />
      );

      const resumeButton = screen.getByRole('button', { name: /resume timer/i });
      expect(resumeButton).toHaveClass('bg-blue-600');
    });

    it('should use red color for Stop button', () => {
      render(
        <TimerControls
          isRunning={true}
          isPaused={false}
          {...mockHandlers}
        />
      );

      const stopButton = screen.getByRole('button', { name: /stop timer/i });
      expect(stopButton).toHaveClass('bg-red-600');
    });

    it('should use gray color for Reset button', () => {
      render(
        <TimerControls
          isRunning={false}
          isPaused={false}
          {...mockHandlers}
        />
      );

      const resetButton = screen.getByRole('button', { name: /reset timer/i });
      expect(resetButton).toHaveClass('bg-gray-600');
    });
  });

  describe('Keyboard Navigation', () => {
    it('should support keyboard navigation with Tab', async () => {
      const user = userEvent.setup();
      render(
        <TimerControls
          isRunning={true}
          isPaused={false}
          {...mockHandlers}
        />
      );

      const pauseButton = screen.getByRole('button', { name: /pause timer/i });
      const stopButton = screen.getByRole('button', { name: /stop timer/i });
      const resetButton = screen.getByRole('button', { name: /reset timer/i });

      // Tab through buttons
      await user.tab();
      expect(pauseButton).toHaveFocus();

      await user.tab();
      expect(stopButton).toHaveFocus();

      await user.tab();
      expect(resetButton).toHaveFocus();
    });

    it('should support Enter key activation', async () => {
      const user = userEvent.setup();
      render(
        <TimerControls
          isRunning={false}
          isPaused={false}
          {...mockHandlers}
        />
      );

      const startButton = screen.getByRole('button', { name: /start timer/i });
      startButton.focus();
      
      await user.keyboard('{Enter}');
      expect(mockHandlers.onStart).toHaveBeenCalledTimes(1);
    });

    it('should support Space key activation', async () => {
      const user = userEvent.setup();
      render(
        <TimerControls
          isRunning={false}
          isPaused={false}
          {...mockHandlers}
        />
      );

      const resetButton = screen.getByRole('button', { name: /reset timer/i });
      resetButton.focus();
      
      await user.keyboard(' ');
      expect(mockHandlers.onReset).toHaveBeenCalledTimes(1);
    });
  });
}); 