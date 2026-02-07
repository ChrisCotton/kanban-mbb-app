import React from 'react'
import { getDueDateColorHex, getDueDateIntervalLabel } from '../../../lib/utils/due-date-color'

interface ColorDotProps {
  dueDate: string | null | undefined
  size?: 'sm' | 'md' | 'lg'
  className?: string
  tooltip?: string
}

const sizeClasses = {
  sm: 'w-1.5 h-1.5', // 6px
  md: 'w-2 h-2',     // 8px
  lg: 'w-3 h-3'      // 12px
}

const ColorDot: React.FC<ColorDotProps> = ({
  dueDate,
  size = 'md',
  className = '',
  tooltip
}) => {
  const colorHex = getDueDateColorHex(dueDate)
  const defaultTooltip = getDueDateIntervalLabel(dueDate)
  const tooltipText = tooltip || defaultTooltip

  return (
    <span
      role="img"
      aria-label={defaultTooltip}
      title={tooltipText}
      className={`
        inline-block
        ${sizeClasses[size]}
        rounded-full
        border
        border-white/20
        dark:border-gray-700/50
        ${className}
      `}
      style={{ backgroundColor: colorHex }}
    />
  )
}

export default ColorDot
