import React from 'react';

interface TimerControlsProps {
  // Timer state
  isRunning: boolean;
  isPaused: boolean;
  
  // Control functions
  onStart: () => void;
  onPause: () => void;
  onResume: () => void;
  onStop: () => void;
  onReset: () => void;
  
  // Customization options
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'minimal' | 'compact';
  showLabels?: boolean;
  disabled?: boolean;
}

const sizeClasses = {
  sm: 'px-2 py-1 text-sm',
  md: 'px-4 py-2',
  lg: 'px-6 py-3 text-lg'
};

const iconSizes = {
  sm: 'w-3 h-3',
  md: 'w-4 h-4',
  lg: 'w-5 h-5'
};

export const TimerControls: React.FC<TimerControlsProps> = ({
  isRunning,
  isPaused,
  onStart,
  onPause,
  onResume,
  onStop,
  onReset,
  className = '',
  size = 'md',
  variant = 'default',
  showLabels = true,
  disabled = false
}) => {
  const getSizeClasses = () => sizeClasses[size];
  const getIconSize = () => iconSizes[size];
  
  const getVariantClasses = () => {
    switch (variant) {
      case 'minimal':
        return 'bg-transparent border border-white/20 hover:bg-white/10';
      case 'compact':
        return 'bg-white/10 hover:bg-white/20';
      default:
        return '';
    }
  };

  const baseButtonClasses = `
    ${getSizeClasses()}
    rounded-lg text-white font-medium transition-colors 
    flex items-center space-x-2 
    ${getVariantClasses()}
    ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
  `;

  // Start Button (shown when timer is not running)
  const StartButton = () => (
    <button
      onClick={onStart}
      disabled={disabled}
      className={`${baseButtonClasses} bg-green-600 hover:bg-green-700 ${disabled ? '' : 'hover:bg-green-700'}`}
      aria-label="Start Timer"
    >
      <svg className={getIconSize()} fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
        <path 
          fillRule="evenodd" 
          d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" 
          clipRule="evenodd" 
        />
      </svg>
      {showLabels && <span className="hidden sm:inline">Start</span>}
    </button>
  );

  // Pause Button (shown when timer is running and not paused)
  const PauseButton = () => (
    <button
      onClick={onPause}
      disabled={disabled}
      className={`${baseButtonClasses} bg-yellow-600 hover:bg-yellow-700 ${disabled ? '' : 'hover:bg-yellow-700'}`}
      aria-label="Pause Timer"
    >
      <svg className={getIconSize()} fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
        <path 
          fillRule="evenodd" 
          d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z" 
          clipRule="evenodd" 
        />
      </svg>
      {showLabels && <span className="hidden sm:inline">Pause</span>}
    </button>
  );

  // Resume Button (shown when timer is paused)
  const ResumeButton = () => (
    <button
      onClick={onResume}
      disabled={disabled}
      className={`${baseButtonClasses} bg-blue-600 hover:bg-blue-700 ${disabled ? '' : 'hover:bg-blue-700'}`}
      aria-label="Resume Timer"
    >
      <svg className={getIconSize()} fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
        <path 
          fillRule="evenodd" 
          d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" 
          clipRule="evenodd" 
        />
      </svg>
      {showLabels && <span className="hidden sm:inline">Resume</span>}
    </button>
  );

  // Stop Button (shown when timer is running)
  const StopButton = () => (
    <button
      onClick={onStop}
      disabled={disabled}
      className={`${baseButtonClasses} bg-red-600 hover:bg-red-700 ${disabled ? '' : 'hover:bg-red-700'}`}
      aria-label="Stop Timer"
    >
      <svg className={getIconSize()} fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
        <path 
          fillRule="evenodd" 
          d="M10 18a8 8 0 100-16 8 8 0 000 16zM8 7a1 1 0 00-1 1v4a1 1 0 001 1h4a1 1 0 001-1V8a1 1 0 00-1-1H8z" 
          clipRule="evenodd" 
        />
      </svg>
      {showLabels && <span className="hidden sm:inline">Stop</span>}
    </button>
  );

  // Reset Button (always shown)
  const ResetButton = () => (
    <button
      onClick={onReset}
      disabled={disabled}
      className={`${baseButtonClasses} bg-gray-600 hover:bg-gray-700 ${disabled ? '' : 'hover:bg-gray-700'} ${variant === 'compact' ? getSizeClasses() : 'px-3 py-2'}`}
      title="Reset Timer"
      aria-label="Reset Timer"
    >
      <svg className={getIconSize()} fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
        <path 
          fillRule="evenodd" 
          d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" 
          clipRule="evenodd" 
        />
      </svg>
      {showLabels && variant !== 'compact' && (
        <span className="hidden sm:inline">Reset</span>
      )}
    </button>
  );

  return (
    <div className={`flex items-center space-x-2 ${className}`} role="group" aria-label="Timer Controls">
      {!isRunning ? (
        <StartButton />
      ) : (
        <>
          {isPaused ? <ResumeButton /> : <PauseButton />}
          <StopButton />
        </>
      )}
      <ResetButton />
    </div>
  );
};

export default TimerControls; 