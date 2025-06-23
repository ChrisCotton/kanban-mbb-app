import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import CalendarView from './CalendarView'
import { supabase } from '@/lib/supabase'

// Mock Supabase
jest.mock('@/lib/supabase', () => ({
  supabase: {
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          gte: jest.fn(() => ({
            lte: jest.fn(() => ({
              order: jest.fn(() => ({
                // Return promise-like object
                then: jest.fn()
              }))
            }))
          }))
        }))
      }))
    }))
  }
}))

const mockSupabase = supabase as jest.Mocked<typeof supabase>

describe('CalendarView', () => {
  const mockTasks = [
    {
      id: '1',
      title: 'Test Task 1',
      description: 'Task description',
      due_date: '2024-01-15',
      priority: 'high' as const,
      status: 'todo' as const,
      category_id: 'cat1',
      categories: {
        name: 'Work',
        hourly_rate_usd: 50
      }
    },
    {
      id: '2',
      title: 'Test Task 2',
      due_date: '2024-01-15',
      priority: 'medium' as const,
      status: 'in_progress' as const,
      category_id: 'cat2',
      categories: {
        name: 'Personal',
        hourly_rate_usd: 25
      }
    },
    {
      id: '3',
      title: 'Test Task 3',
      due_date: '2024-01-20',
      priority: 'low' as const,
      status: 'done' as const
    }
  ]

  beforeEach(() => {
    jest.clearAllMocks()
    
    // Setup default mock response
    const mockSelect = jest.fn(() => ({
      eq: jest.fn(() => ({
        gte: jest.fn(() => ({
          lte: jest.fn(() => ({
            order: jest.fn(() => Promise.resolve({
              data: mockTasks,
              error: null
            }))
          }))
        }))
      }))
    }))
    
    mockSupabase.from.mockReturnValue({
      select: mockSelect
    } as any)
  })

  it('renders loading state initially', () => {
    render(<CalendarView userId="test-user" />)
    
    expect(screen.getByText('Loading calendar...')).toBeInTheDocument()
    expect(screen.getByRole('status', { hidden: true })).toBeInTheDocument()
  })

  it('renders calendar with current month and year', async () => {
    render(<CalendarView userId="test-user" />)
    
    await waitFor(() => {
      expect(screen.queryByText('Loading calendar...')).not.toBeInTheDocument()
    })

    const currentDate = new Date()
    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ]
    const expectedTitle = `${monthNames[currentDate.getMonth()]} ${currentDate.getFullYear()}`
    
    expect(screen.getByText(expectedTitle)).toBeInTheDocument()
  })

  it('renders days of the week header', async () => {
    render(<CalendarView userId="test-user" />)
    
    await waitFor(() => {
      expect(screen.queryByText('Loading calendar...')).not.toBeInTheDocument()
    })

    const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
    daysOfWeek.forEach(day => {
      expect(screen.getByText(day)).toBeInTheDocument()
    })
  })

  it('renders navigation buttons', async () => {
    render(<CalendarView userId="test-user" />)
    
    await waitFor(() => {
      expect(screen.queryByText('Loading calendar...')).not.toBeInTheDocument()
    })

    expect(screen.getByLabelText('Previous month')).toBeInTheDocument()
    expect(screen.getByText('Today')).toBeInTheDocument()
    expect(screen.getByLabelText('Next month')).toBeInTheDocument()
  })

  it('navigates to previous month when previous button is clicked', async () => {
    render(<CalendarView userId="test-user" />)
    
    await waitFor(() => {
      expect(screen.queryByText('Loading calendar...')).not.toBeInTheDocument()
    })

    const currentDate = new Date()
    const previousMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1)
    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ]
    
    fireEvent.click(screen.getByLabelText('Previous month'))
    
    await waitFor(() => {
      const expectedTitle = `${monthNames[previousMonth.getMonth()]} ${previousMonth.getFullYear()}`
      expect(screen.getByText(expectedTitle)).toBeInTheDocument()
    })
  })

  it('navigates to next month when next button is clicked', async () => {
    render(<CalendarView userId="test-user" />)
    
    await waitFor(() => {
      expect(screen.queryByText('Loading calendar...')).not.toBeInTheDocument()
    })

    const currentDate = new Date()
    const nextMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1)
    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ]
    
    fireEvent.click(screen.getByLabelText('Next month'))
    
    await waitFor(() => {
      const expectedTitle = `${monthNames[nextMonth.getMonth()]} ${nextMonth.getFullYear()}`
      expect(screen.getByText(expectedTitle)).toBeInTheDocument()
    })
  })

  it('navigates to current month when Today button is clicked', async () => {
    render(<CalendarView userId="test-user" />)
    
    await waitFor(() => {
      expect(screen.queryByText('Loading calendar...')).not.toBeInTheDocument()
    })

    // Navigate to different month first
    fireEvent.click(screen.getByLabelText('Previous month'))
    
    await waitFor(() => {
      fireEvent.click(screen.getByText('Today'))
    })

    const currentDate = new Date()
    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ]
    const expectedTitle = `${monthNames[currentDate.getMonth()]} ${currentDate.getFullYear()}`
    
    await waitFor(() => {
      expect(screen.getByText(expectedTitle)).toBeInTheDocument()
    })
  })

  it('displays tasks on correct dates', async () => {
    // Mock current date to January 2024 to match our test data
    const mockDate = new Date('2024-01-01')
    jest.spyOn(global, 'Date').mockImplementation((...args) => {
      if (args.length === 0) {
        return mockDate
      }
      return new (global.Date as any)(...args)
    })

    render(<CalendarView userId="test-user" />)
    
    await waitFor(() => {
      expect(screen.queryByText('Loading calendar...')).not.toBeInTheDocument()
    })

    // Tasks on Jan 15 should be visible
    expect(screen.getByText('Test Task 1')).toBeInTheDocument()
    expect(screen.getByText('Test Task 2')).toBeInTheDocument()
    
    // Task on Jan 20 should be visible
    expect(screen.getByText('Test Task 3')).toBeInTheDocument()

    // Restore Date
    jest.restoreAllMocks()
  })

  it('opens task detail modal when task is clicked', async () => {
    // Mock current date to January 2024
    const mockDate = new Date('2024-01-01')
    jest.spyOn(global, 'Date').mockImplementation((...args) => {
      if (args.length === 0) {
        return mockDate
      }
      return new (global.Date as any)(...args)
    })

    render(<CalendarView userId="test-user" />)
    
    await waitFor(() => {
      expect(screen.queryByText('Loading calendar...')).not.toBeInTheDocument()
    })

    fireEvent.click(screen.getByText('Test Task 1'))
    
    await waitFor(() => {
      // Modal should be open with task details
      expect(screen.getByText('Task description')).toBeInTheDocument()
      expect(screen.getByText('High')).toBeInTheDocument()
      expect(screen.getByText('Todo')).toBeInTheDocument()
      expect(screen.getByText('Work ($50/hr)')).toBeInTheDocument()
    })

    jest.restoreAllMocks()
  })

  it('closes task detail modal when close button is clicked', async () => {
    const mockDate = new Date('2024-01-01')
    jest.spyOn(global, 'Date').mockImplementation((...args) => {
      if (args.length === 0) {
        return mockDate
      }
      return new (global.Date as any)(...args)
    })

    render(<CalendarView userId="test-user" />)
    
    await waitFor(() => {
      expect(screen.queryByText('Loading calendar...')).not.toBeInTheDocument()
    })

    // Open modal
    fireEvent.click(screen.getByText('Test Task 1'))
    
    await waitFor(() => {
      expect(screen.getByText('Task description')).toBeInTheDocument()
    })

    // Close modal
    const closeButton = screen.getByRole('button', { name: /close/i })
    fireEvent.click(closeButton)
    
    await waitFor(() => {
      expect(screen.queryByText('Task description')).not.toBeInTheDocument()
    })

    jest.restoreAllMocks()
  })

  it('calls onTaskSelect when task is clicked', async () => {
    const mockOnTaskSelect = jest.fn()
    const mockDate = new Date('2024-01-01')
    jest.spyOn(global, 'Date').mockImplementation((...args) => {
      if (args.length === 0) {
        return mockDate
      }
      return new (global.Date as any)(...args)
    })

    render(<CalendarView userId="test-user" onTaskSelect={mockOnTaskSelect} />)
    
    await waitFor(() => {
      expect(screen.queryByText('Loading calendar...')).not.toBeInTheDocument()
    })

    fireEvent.click(screen.getByText('Test Task 1'))
    
    expect(mockOnTaskSelect).toHaveBeenCalledWith(
      expect.objectContaining({
        id: '1',
        title: 'Test Task 1'
      })
    )

    jest.restoreAllMocks()
  })

  it('handles database error gracefully', async () => {
    // Mock error response
    const mockSelect = jest.fn(() => ({
      eq: jest.fn(() => ({
        gte: jest.fn(() => ({
          lte: jest.fn(() => ({
            order: jest.fn(() => Promise.resolve({
              data: null,
              error: new Error('Database error')
            }))
          }))
        }))
      }))
    }))
    
    mockSupabase.from.mockReturnValue({
      select: mockSelect
    } as any)

    render(<CalendarView userId="test-user" />)
    
    await waitFor(() => {
      expect(screen.getByText('Failed to load tasks')).toBeInTheDocument()
    })
  })

  it('dismisses error message when close button is clicked', async () => {
    // Mock error response
    const mockSelect = jest.fn(() => ({
      eq: jest.fn(() => ({
        gte: jest.fn(() => ({
          lte: jest.fn(() => ({
            order: jest.fn(() => Promise.resolve({
              data: null,
              error: new Error('Database error')
            }))
          }))
        }))
      }))
    }))
    
    mockSupabase.from.mockReturnValue({
      select: mockSelect
    } as any)

    render(<CalendarView userId="test-user" />)
    
    await waitFor(() => {
      expect(screen.getByText('Failed to load tasks')).toBeInTheDocument()
    })

    const closeErrorButton = screen.getByRole('button', { name: /close error/i })
    fireEvent.click(closeErrorButton)
    
    expect(screen.queryByText('Failed to load tasks')).not.toBeInTheDocument()
  })

  it('renders without userId', () => {
    render(<CalendarView />)
    
    // Should still render the calendar structure
    expect(screen.getByText('Loading calendar...')).toBeInTheDocument()
  })

  it('displays task priority colors correctly', async () => {
    const mockDate = new Date('2024-01-01')
    jest.spyOn(global, 'Date').mockImplementation((...args) => {
      if (args.length === 0) {
        return mockDate
      }
      return new (global.Date as any)(...args)
    })

    render(<CalendarView userId="test-user" />)
    
    await waitFor(() => {
      expect(screen.queryByText('Loading calendar...')).not.toBeInTheDocument()
    })

    const task1Element = screen.getByText('Test Task 1').closest('div')
    const task2Element = screen.getByText('Test Task 2').closest('div')
    const task3Element = screen.getByText('Test Task 3').closest('div')
    
    expect(task1Element).toHaveClass('bg-orange-100') // high priority
    expect(task2Element).toHaveClass('bg-yellow-100') // medium priority
    expect(task3Element).toHaveClass('bg-blue-100') // low priority

    jest.restoreAllMocks()
  })

  it('displays status border colors correctly', async () => {
    const mockDate = new Date('2024-01-01')
    jest.spyOn(global, 'Date').mockImplementation((...args) => {
      if (args.length === 0) {
        return mockDate
      }
      return new (global.Date as any)(...args)
    })

    render(<CalendarView userId="test-user" />)
    
    await waitFor(() => {
      expect(screen.queryByText('Loading calendar...')).not.toBeInTheDocument()
    })

    const task1Element = screen.getByText('Test Task 1').closest('div')
    const task2Element = screen.getByText('Test Task 2').closest('div')
    const task3Element = screen.getByText('Test Task 3').closest('div')
    
    expect(task1Element).toHaveClass('border-l-gray-400') // todo status
    expect(task2Element).toHaveClass('border-l-blue-400') // in_progress status
    expect(task3Element).toHaveClass('border-l-green-400') // done status

    jest.restoreAllMocks()
  })

  it('shows "more tasks" indicator when day has more than 3 tasks', async () => {
    // Add more tasks to the same date
    const manyTasks = [
      ...mockTasks,
      { id: '4', title: 'Task 4', due_date: '2024-01-15', priority: 'low' as const, status: 'todo' as const },
      { id: '5', title: 'Task 5', due_date: '2024-01-15', priority: 'low' as const, status: 'todo' as const }
    ]

    const mockSelect = jest.fn(() => ({
      eq: jest.fn(() => ({
        gte: jest.fn(() => ({
          lte: jest.fn(() => ({
            order: jest.fn(() => Promise.resolve({
              data: manyTasks,
              error: null
            }))
          }))
        }))
      }))
    }))
    
    mockSupabase.from.mockReturnValue({
      select: mockSelect
    } as any)

    const mockDate = new Date('2024-01-01')
    jest.spyOn(global, 'Date').mockImplementation((...args) => {
      if (args.length === 0) {
        return mockDate
      }
      return new (global.Date as any)(...args)
    })

    render(<CalendarView userId="test-user" />)
    
    await waitFor(() => {
      expect(screen.queryByText('Loading calendar...')).not.toBeInTheDocument()
    })

    expect(screen.getByText('+2 more')).toBeInTheDocument()

    jest.restoreAllMocks()
  })
}) 