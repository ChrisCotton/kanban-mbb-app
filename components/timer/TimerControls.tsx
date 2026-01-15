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
  onDelete: () => void;
  
  // Customization options
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'minimal' | 'compact';
  showLabels?: boolean;
  disabled?: boolean;
  ariaLabelPrefix?: string;
  testIdPrefix?: string;
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
  onDelete,
  className = '',
  size = 'md',
  variant = 'default',
  showLabels = true,
  disabled = false,
  ariaLabelPrefix,
  testIdPrefix
}) => {
  const buildAriaLabel = (label: string) =>
    ariaLabelPrefix ? `${ariaLabelPrefix} ${label}` : label;
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
      className={`${baseButtonClasses} bg-emerald-600 hover:bg-emerald-700 ${disabled ? '' : 'hover:bg-emerald-700'}`}
      aria-label={buildAriaLabel('Start Timer')}
      title={buildAriaLabel('Start Timer')}
      data-testid={testIdPrefix ? `${testIdPrefix}-start` : undefined}
    >
      <svg className={`${getIconSize()} text-white`} viewBox="0 0 24 24" aria-hidden="true">
        <path d="M7 5.5v13l11-6.5-11-6.5z" fill="currentColor" />
      </svg>
      {showLabels && <span className="hidden sm:inline">Start</span>}
    </button>
  );

  // Pause Button (shown when timer is running and not paused)
  const PauseButton = () => (
    <button
      onClick={onPause}
      disabled={disabled}
      className={`${baseButtonClasses} bg-amber-600 hover:bg-amber-700 ${disabled ? '' : 'hover:bg-amber-700'}`}
      aria-label={buildAriaLabel('Pause Timer')}
      title={buildAriaLabel('Pause Timer')}
      data-testid={testIdPrefix ? `${testIdPrefix}-pause` : undefined}
    >
      <svg className={`${getIconSize()} text-white`} viewBox="0 0 24 24" aria-hidden="true">
        <path d="M7 5h4v14H7zM13 5h4v14h-4z" fill="currentColor" />
      </svg>
      {showLabels && <span className="hidden sm:inline">Pause</span>}
    </button>
  );

  // Resume Button (shown when timer is paused)
  const ResumeButton = () => (
    <button
      onClick={onResume}
      disabled={disabled}
      className={`${baseButtonClasses} bg-sky-600 hover:bg-sky-700 ${disabled ? '' : 'hover:bg-sky-700'}`}
      aria-label={buildAriaLabel('Resume Timer')}
      title={buildAriaLabel('Resume Timer')}
      data-testid={testIdPrefix ? `${testIdPrefix}-resume` : undefined}
    >
      <svg className={`${getIconSize()} text-white`} viewBox="0 0 24 24" aria-hidden="true">
        <path d="M7 5.5v13l11-6.5-11-6.5z" fill="currentColor" />
      </svg>
      {showLabels && <span className="hidden sm:inline">Resume</span>}
    </button>
  );

  // Stop Button (shown when timer is running)
  const StopButton = () => (
    <button
      onClick={onStop}
      disabled={disabled}
      className={`${baseButtonClasses} bg-rose-600 hover:bg-rose-700 ${disabled ? '' : 'hover:bg-rose-700'}`}
      aria-label={buildAriaLabel('Stop Timer')}
      title={buildAriaLabel('Stop Timer')}
      data-testid={testIdPrefix ? `${testIdPrefix}-stop` : undefined}
    >
      <svg className={`${getIconSize()} text-white`} viewBox="0 0 24 24" aria-hidden="true">
        <path d="M6 6h12v12H6z" fill="currentColor" />
      </svg>
      {showLabels && <span className="hidden sm:inline">Stop</span>}
    </button>
  );

  // Reset Button (always shown)
  const ResetButton = () => (
    <button
      onClick={onReset}
      disabled={disabled}
      className={`${baseButtonClasses} bg-slate-600 hover:bg-slate-700 ${disabled ? '' : 'hover:bg-slate-700'} ${variant === 'compact' ? getSizeClasses() : 'px-3 py-2'}`}
      aria-label={buildAriaLabel('Reset Timer')}
      title={buildAriaLabel('Reset Timer')}
      data-testid={testIdPrefix ? `${testIdPrefix}-reset` : undefined}
    >
      <svg className={`${getIconSize()} text-white`} viewBox="0 0 24 24" aria-hidden="true">
        <path
          d="M6 8a7 7 0 0112 4h2a9 9 0 10-9 9v-2a7 7 0 01-5-11zm-2 0V3h5"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      {showLabels && variant !== 'compact' && (
        <span className="hidden sm:inline">Reset</span>
      )}
    </button>
  );

  // Delete Button (always shown)
  const DeleteButton = () => (
    <button
      onClick={onDelete}
      disabled={disabled}
      className={`${baseButtonClasses} bg-red-800 hover:bg-red-900 ${disabled ? '' : 'hover:bg-red-900'} ${variant === 'compact' ? getSizeClasses() : 'px-3 py-2'}`}
      aria-label={buildAriaLabel('Delete Timer')}
      title={buildAriaLabel('Delete Timer')}
      data-testid={testIdPrefix ? `${testIdPrefix}-delete` : undefined}
    >
      <svg className={`${getIconSize()} text-white`} viewBox="0 0 24 24" aria-hidden="true">
        <path
          d="M9 3h6l1 2h4v2H4V5h4l1-2zm1 6v9m4-9v9M7 7l1 14h8l1-14"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      {showLabels && variant !== 'compact' && (
        <span className="hidden sm:inline">Delete</span>
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
      <DeleteButton />
    </div>
  );
};

export default TimerControls; 