import React from 'react'
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import ColorDot from '../ColorDot'

// Mock the due-date-color utility
jest.mock('../../../../lib/utils/due-date-color', () => ({
  getDueDateColorHex: jest.fn((date) => {
    if (!date) return '#6B7280' // gray
    if (date === '2024-01-10') return '#DC2626' // overdue red
    if (date === '2024-01-20') return '#EF4444' // today red
    if (date === '2024-01-21') return '#F43F5E' // tomorrow rose
    if (date === '2024-01-27') return '#F97316' // next week orange
    return '#6B7280' // default gray
  }),
  getDueDateIntervalLabel: jest.fn((date) => {
    if (!date) return 'No due date'
    if (date === '2024-01-10') return 'Overdue by 5 days'
    if (date === '2024-01-20') return 'Due Today'
    if (date === '2024-01-21') return 'Due Tomorrow'
    if (date === '2024-01-27') return 'Due Next Week'
    return 'No due date'
  })
}))

describe('ColorDot', () => {
  describe('Rendering', () => {
    it('should render a color dot', () => {
      render(<ColorDot dueDate="2024-01-20" />)
      const dot = screen.getByRole('img', { hidden: true })
      expect(dot).toBeInTheDocument()
    })

    it('should render with correct color for a due date', () => {
      render(<ColorDot dueDate="2024-01-20" />)
      const dot = screen.getByRole('img', { hidden: true })
      expect(dot).toHaveStyle({ backgroundColor: '#EF4444' })
    })

    it('should render gray color for null due date', () => {
      render(<ColorDot dueDate={null} />)
      const dot = screen.getByRole('img', { hidden: true })
      expect(dot).toHaveStyle({ backgroundColor: '#6B7280' })
    })

    it('should render gray color for undefined due date', () => {
      render(<ColorDot dueDate={undefined} />)
      const dot = screen.getByRole('img', { hidden: true })
      expect(dot).toHaveStyle({ backgroundColor: '#6B7280' })
    })

    it('should render red color for overdue date', () => {
      render(<ColorDot dueDate="2024-01-10" />)
      const dot = screen.getByRole('img', { hidden: true })
      expect(dot).toHaveStyle({ backgroundColor: '#DC2626' })
    })
  })

  describe('Sizes', () => {
    it('should render with default medium size (md)', () => {
      render(<ColorDot dueDate="2024-01-20" />)
      const dot = screen.getByRole('img', { hidden: true })
      expect(dot).toHaveClass('w-2', 'h-2') // 8px = 2 * 4px (Tailwind)
    })

    it('should render with small size', () => {
      render(<ColorDot dueDate="2024-01-20" size="sm" />)
      const dot = screen.getByRole('img', { hidden: true })
      expect(dot).toHaveClass('w-1.5', 'h-1.5') // 6px
    })

    it('should render with large size', () => {
      render(<ColorDot dueDate="2024-01-20" size="lg" />)
      const dot = screen.getByRole('img', { hidden: true })
      expect(dot).toHaveClass('w-3', 'h-3') // 12px
    })
  })

  describe('Colors', () => {
    it('should render correct color for today', () => {
      render(<ColorDot dueDate="2024-01-20" />)
      const dot = screen.getByRole('img', { hidden: true })
      expect(dot).toHaveStyle({ backgroundColor: '#EF4444' })
    })

    it('should render correct color for tomorrow', () => {
      render(<ColorDot dueDate="2024-01-21" />)
      const dot = screen.getByRole('img', { hidden: true })
      expect(dot).toHaveStyle({ backgroundColor: '#F43F5E' })
    })

    it('should render correct color for next week', () => {
      render(<ColorDot dueDate="2024-01-27" />)
      const dot = screen.getByRole('img', { hidden: true })
      expect(dot).toHaveStyle({ backgroundColor: '#F97316' })
    })
  })

  describe('Accessibility', () => {
    it('should have aria-label with due date interval', () => {
      render(<ColorDot dueDate="2024-01-20" />)
      const dot = screen.getByRole('img', { hidden: true })
      expect(dot).toHaveAttribute('aria-label', 'Due Today')
    })

    it('should have aria-label for overdue dates', () => {
      render(<ColorDot dueDate="2024-01-10" />)
      const dot = screen.getByRole('img', { hidden: true })
      expect(dot).toHaveAttribute('aria-label', 'Overdue by 5 days')
    })

    it('should have aria-label for no due date', () => {
      render(<ColorDot dueDate={null} />)
      const dot = screen.getByRole('img', { hidden: true })
      expect(dot).toHaveAttribute('aria-label', 'No due date')
    })
  })

  describe('Tooltip', () => {
    it('should display tooltip text when provided', () => {
      render(<ColorDot dueDate="2024-01-20" tooltip="Custom tooltip" />)
      const dot = screen.getByRole('img', { hidden: true })
      expect(dot).toHaveAttribute('title', 'Custom tooltip')
    })

    it('should use default tooltip from interval label when not provided', () => {
      render(<ColorDot dueDate="2024-01-20" />)
      const dot = screen.getByRole('img', { hidden: true })
      expect(dot).toHaveAttribute('title', 'Due Today')
    })
  })

  describe('Custom className', () => {
    it('should apply custom className', () => {
      render(<ColorDot dueDate="2024-01-20" className="custom-class" />)
      const dot = screen.getByRole('img', { hidden: true })
      expect(dot).toHaveClass('custom-class')
    })
  })

  describe('Styling', () => {
    it('should have rounded-full class for circular shape', () => {
      render(<ColorDot dueDate="2024-01-20" />)
      const dot = screen.getByRole('img', { hidden: true })
      expect(dot).toHaveClass('rounded-full')
    })

    it('should have border for contrast', () => {
      render(<ColorDot dueDate="2024-01-20" />)
      const dot = screen.getByRole('img', { hidden: true })
      expect(dot).toHaveClass('border')
    })
  })
})
