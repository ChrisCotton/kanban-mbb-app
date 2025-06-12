import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'
import { DragDropContext, Droppable } from '@hello-pangea/dnd'
import TaskCard from './TaskCard'
import { Task } from '../../lib/database/kanban-queries'

const mockTask: Task = {
  id: '1',
  title: 'Test Task',
  description: 'This is a test task description',
  status: 'todo',
  priority: 'high',
  due_date: '2025-01-15',
  order_index: 0,
  created_at: '2025-01-01T00:00:00Z',
  updated_at: '2025-01-01T00:00:00Z',
  user_id: 'test-user-1'
}

const mockTaskWithoutOptionals: Task = {
  id: '2',
  title: 'Minimal Task',
  status: 'backlog',
  priority: 'medium',
  order_index: 1,
  created_at: '2025-01-01T00:00:00Z',
  updated_at: '2025-01-01T00:00:00Z',
  user_id: 'test-user-1'
}

const defaultProps = {
  task: mockTask,
  index: 0,
  onTaskMove: jest.fn()
}

// Helper component to wrap TaskCard with required DragDropContext and Droppable
const TaskCardWrapper = ({ children }: { children: React.ReactNode }) => (
  <DragDropContext onDragEnd={() => {}}>
    <Droppable droppableId="test-droppable">
      {(provided) => (
        <div ref={provided.innerRef} {...provided.droppableProps}>
          {children}
          {provided.placeholder}
        </div>
      )}
    </Droppable>
  </DragDropContext>
)

describe('TaskCard', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders task title', () => {
    render(
      <TaskCardWrapper>
        <TaskCard {...defaultProps} />
      </TaskCardWrapper>
    )

    expect(screen.getByText('Test Task')).toBeInTheDocument()
  })

  it('renders task description when provided', () => {
    render(
      <TaskCardWrapper>
        <TaskCard {...defaultProps} />
      </TaskCardWrapper>
    )

    expect(screen.getByText('This is a test task description')).toBeInTheDocument()
  })

  it('does not render description when not provided', () => {
    render(
      <TaskCardWrapper>
        <TaskCard {...defaultProps} task={mockTaskWithoutOptionals} />
      </TaskCardWrapper>
    )

    expect(screen.queryByText('This is a test task description')).not.toBeInTheDocument()
  })

  it('renders priority badge', () => {
    render(
      <TaskCardWrapper>
        <TaskCard {...defaultProps} />
      </TaskCardWrapper>
    )

    expect(screen.getByText('high')).toBeInTheDocument()
  })

  it('renders due date when set', () => {
    render(
      <TaskCardWrapper>
        <TaskCard {...defaultProps} />
      </TaskCardWrapper>
    )

    expect(screen.getByText('Jan 14')).toBeInTheDocument()
  })

  it('renders created date', () => {
    render(
      <TaskCardWrapper>
        <TaskCard {...defaultProps} />
      </TaskCardWrapper>
    )

    expect(screen.getByText('Dec 31')).toBeInTheDocument()
  })

  it('does not render due date when not set', () => {
    render(
      <TaskCardWrapper>
        <TaskCard {...defaultProps} task={mockTaskWithoutOptionals} />
      </TaskCardWrapper>
    )

    // Should not have due date icon
    expect(screen.queryByRole('img')).not.toBeInTheDocument()
  })

  it('applies correct priority color classes', () => {
    const priorities: Task['priority'][] = ['low', 'medium', 'high']
    
    priorities.forEach(priority => {
      const taskWithPriority = { ...mockTask, priority }
      const { unmount } = render(
        <TaskCardWrapper>
          <TaskCard task={taskWithPriority} index={0} />
        </TaskCardWrapper>
      )
      
      expect(screen.getByText(priority)).toBeInTheDocument()
      unmount()
    })
  })

  it('displays different task content correctly', () => {
    const statuses: Task['status'][] = ['backlog', 'todo', 'doing', 'done']
    
    statuses.forEach(status => {
      const taskWithStatus = { ...mockTask, status }
      const { unmount } = render(
        <TaskCardWrapper>
          <TaskCard task={taskWithStatus} index={0} />
        </TaskCardWrapper>
      )
      
      expect(screen.getByText('Test Task')).toBeInTheDocument()
      unmount()
    })
  })

  it('maintains consistent styling across different task types', () => {
    render(
      <TaskCardWrapper>
        <TaskCard {...defaultProps} />
      </TaskCardWrapper>
    )

    const taskCard = screen.getByText('Test Task').closest('div')
    expect(taskCard).toHaveClass('bg-white', 'dark:bg-gray-700', 'rounded-lg')
  })

  it('handles tasks with all fields populated', () => {
    render(
      <TaskCardWrapper>
        <TaskCard {...defaultProps} />
      </TaskCardWrapper>
    )

    expect(screen.getByText('Test Task')).toBeInTheDocument()
    expect(screen.getByText('This is a test task description')).toBeInTheDocument()
    expect(screen.getByText('high')).toBeInTheDocument()
    expect(screen.getByText('Jan 14')).toBeInTheDocument()
    expect(screen.getByText('Dec 31')).toBeInTheDocument()
  })

  it('handles minimal task data', () => {
    render(
      <TaskCardWrapper>
        <TaskCard task={mockTaskWithoutOptionals} index={0} />
      </TaskCardWrapper>
    )

    expect(screen.getByText('Minimal Task')).toBeInTheDocument()
    expect(screen.getByText('medium')).toBeInTheDocument()
    expect(screen.getByText('Dec 31')).toBeInTheDocument()
    expect(screen.queryByText('This is a test task description')).not.toBeInTheDocument()
  })

  it('renders with draggable functionality', () => {
    render(
      <TaskCardWrapper>
        <TaskCard {...defaultProps} />
      </TaskCardWrapper>
    )

    // The task card should be wrapped in a Draggable component
    const taskCard = screen.getByText('Test Task').closest('[data-rbd-draggable-id="1"]')
    expect(taskCard).toBeInTheDocument()
  })

  it('displays priority badge with correct styling', () => {
    render(
      <TaskCardWrapper>
        <TaskCard {...defaultProps} />
      </TaskCardWrapper>
    )

    const priorityBadge = screen.getByText('high')
    expect(priorityBadge).toHaveClass('px-2', 'py-1', 'rounded-full', 'text-xs', 'font-medium')
  })

  it('formats dates correctly', () => {
    render(
      <TaskCardWrapper>
        <TaskCard {...defaultProps} />
      </TaskCardWrapper>
    )

    // Due date should be formatted as "Jan 14"
    expect(screen.getByText('Jan 14')).toBeInTheDocument()
    // Created date should be formatted as "Dec 31"
    expect(screen.getByText('Dec 31')).toBeInTheDocument()
  })

  it('handles drag interactions through drag and drop context', () => {
    const onDragEnd = jest.fn()
    
    render(
      <DragDropContext onDragEnd={onDragEnd}>
        <Droppable droppableId="test-droppable">
          {(provided) => (
            <div ref={provided.innerRef} {...provided.droppableProps}>
              <TaskCard {...defaultProps} />
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>
    )

    const taskCard = screen.getByText('Test Task').closest('[data-rbd-draggable-id="1"]')
    expect(taskCard).toBeInTheDocument()
    expect(taskCard).toHaveAttribute('data-rbd-draggable-id', '1')
  })

  it('renders task description with proper text truncation', () => {
    const longDescription = 'This is a very long description that should be truncated using the line-clamp-2 class to ensure it does not take up too much space in the card layout'
    const taskWithLongDescription = { 
      ...mockTask, 
      description: longDescription 
    }

    render(
      <TaskCardWrapper>
        <TaskCard task={taskWithLongDescription} index={0} />
      </TaskCardWrapper>
    )

    const description = screen.getByText(longDescription)
    expect(description).toHaveClass('line-clamp-2')
  })

  it('applies hover effects correctly', () => {
    render(
      <TaskCardWrapper>
        <TaskCard {...defaultProps} />
      </TaskCardWrapper>
    )

    const taskCard = screen.getByText('Test Task').closest('div')
    expect(taskCard).toHaveClass('hover:shadow-md')
  })

  it('maintains accessibility with proper semantic structure', () => {
    render(
      <TaskCardWrapper>
        <TaskCard {...defaultProps} />
      </TaskCardWrapper>
    )

    // Check that the card has proper heading structure
    const title = screen.getByText('Test Task')
    expect(title.tagName).toBe('H3')
    
    // Check that description is in a paragraph
    const description = screen.getByText('This is a test task description')
    expect(description.tagName).toBe('P')
  })
}) 