import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import { Task } from '../../lib/database/kanban-queries'
import userEvent from '@testing-library/user-event';
import SwimLane from './SwimLane'

// Mock the entire @hello-pangea/dnd library
jest.mock('@hello-pangea/dnd', () => ({
  DragDropContext: ({ children, onDragEnd }: any) => {
    // Expose onDragEnd for testing, ensuring it's always a function
    global.onDragEnd = onDragEnd || jest.fn();
    return <div data-testid="drag-drop-context">{children}</div>;
  },
  Droppable: ({ children }: any) => children({
    draggableProps: { style: {} },
    innerRef: jest.fn(),
    placeholder: null,
  }, {}),
  Draggable: ({ children }: any) => children({
    draggableProps: { style: {} },
    dragHandleProps: null,
    innerRef: jest.fn(),
  }, {}),
}));

// Mock the TaskCard component
jest.mock('./TaskCard', () => {
  return function MockTaskCard({ task, index }: any) {
    return (
      <div data-testid={`task-card-${task.id}`}>
        <div data-testid={`task-title-${task.id}`}>{task.title}</div>
        <div data-testid={`task-priority-${task.id}`}>{task.priority}</div>
        <div data-testid={`task-index-${task.id}`}>{index}</div>
      </div>
    )
  }
})

// Mock fetch globally
global.fetch = jest.fn()
const mockFetch = fetch as jest.MockedFunction<typeof fetch>

const mockTasks: Task[] = [
  {
    id: '1',
    title: 'Test Task 1',
    description: 'Test description 1',
    status: 'todo',
    priority: 'high',
    due_date: '2025-01-15',
    order_index: 0,
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z',
    user_id: 'test-user-1'
  },
  {
    id: '2',
    title: 'Test Task 2',
    description: 'Test description 2',
    status: 'todo',
    priority: 'medium',
    due_date: '2025-01-20',
    order_index: 1,
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z',
    user_id: 'test-user-1'
  }
]

const defaultProps = {
  title: 'Test Lane',
  status: 'todo' as Task['status'],
  tasks: mockTasks,
  onTaskMove: jest.fn(),
  color: 'blue' as const
}

// Helper component to wrap SwimLane (no longer needs onDragEnd prop, as it's mocked globally)
const SwimLaneWrapper = ({ children }: { children: React.ReactNode }) => (
  <div data-testid="swim-lane-wrapper">{children}</div>
);

describe('SwimLane', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFetch.mockClear();
    // Mock console.error to prevent test output pollution for expected errors
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    // Restore console.error after each test
    jest.restoreAllMocks();
    // Clear the global mock for onDragEnd
    // @ts-ignore
    global.onDragEnd = undefined;
  });

  it('renders swim lane with correct title and task count', () => {
    render(
      <SwimLaneWrapper>
        <SwimLane {...defaultProps} />
      </SwimLaneWrapper>
    );

    expect(screen.getByText('Test Lane')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument(); // Task count badge
  });

  it('renders all tasks in the swim lane', () => {
    render(
      <SwimLaneWrapper>
        <SwimLane {...defaultProps} />
      </SwimLaneWrapper>
    );

    expect(screen.getByTestId('task-card-1')).toBeInTheDocument();
    expect(screen.getByTestId('task-card-2')).toBeInTheDocument();
    expect(screen.getByTestId('task-title-1')).toHaveTextContent('Test Task 1');
    expect(screen.getByTestId('task-title-2')).toHaveTextContent('Test Task 2');
  });

  it('applies correct color classes for different swim lane types', () => {
    const { rerender } = render(
      <SwimLaneWrapper>
        <SwimLane {...defaultProps} color="gray" />
      </SwimLaneWrapper>
    );
    
    // Test different colors by checking if the component renders without errors
    rerender(
      <SwimLaneWrapper>
        <SwimLane {...defaultProps} color="blue" />
      </SwimLaneWrapper>
    );
    rerender(
      <SwimLaneWrapper>
        <SwimLane {...defaultProps} color="yellow" />
      </SwimLaneWrapper>
    );
    rerender(
      <SwimLaneWrapper>
        <SwimLane {...defaultProps} color="green" />
      </SwimLaneWrapper>
    );
    
    // All should render successfully
    expect(screen.getByText('Test Lane')).toBeInTheDocument();
  });

  it('shows empty state when no tasks are present', () => {
    render(
      <SwimLaneWrapper>
        <SwimLane {...defaultProps} tasks={[]} />
      </SwimLaneWrapper>
    );

    expect(screen.getByText('No tasks in test lane')).toBeInTheDocument();
    expect(screen.getByText('0')).toBeInTheDocument(); // Task count should be 0
  });

  it('handles drag and drop events', async () => {
    const mockOnTaskMove = jest.fn();
    render(
      <SwimLaneWrapper>
        <SwimLane {...defaultProps} onTaskMove={mockOnTaskMove} />
      </SwimLaneWrapper>
    );

    // Now, trigger the mocked onDragEnd from the global object
    // @ts-ignore
    global.onDragEnd({
      draggableId: '1',
      source: { droppableId: 'todo', index: 0 },
      destination: { droppableId: 'doing', index: 0 },
      type: 'DEFAULT'
    });

    await waitFor(() => {
      expect(mockOnTaskMove).toHaveBeenCalledWith('1', 'doing', 0);
    });
  });

  it('shows add task form when add button is clicked', async () => {
    const user = userEvent.setup();
    render(
      <SwimLaneWrapper>
        <SwimLane {...defaultProps} />
      </SwimLaneWrapper>
    );

    const addButton = screen.getByRole('button', { name: /add task/i });
    await user.click(addButton);

    expect(screen.getByPlaceholderText('Enter task title...')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /add/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
  });

  it('hides add task form when cancel is clicked', async () => {
    const user = userEvent.setup();
    render(
      <SwimLaneWrapper>
        <SwimLane {...defaultProps} />
      </SwimLaneWrapper>
    );

    // Open form
    await user.click(screen.getByRole('button', { name: /add task/i }));
    expect(screen.getByPlaceholderText('Enter task title...')).toBeInTheDocument();

    // Cancel form
    await user.click(screen.getByRole('button', { name: /cancel/i }));
    await waitFor(() => {
      expect(screen.queryByPlaceholderText('Enter task title...')).not.toBeInTheDocument();
    });
    expect(screen.getByRole('button', { name: /add task/i })).toBeInTheDocument();
  });

  it('handles task creation with onTaskCreate prop', async () => {
    const mockOnTaskCreate = jest.fn().mockResolvedValue(undefined);
    const user = userEvent.setup();
    
    render(
      <SwimLaneWrapper>
        <SwimLane 
          {...defaultProps} 
          onTaskCreate={mockOnTaskCreate}
        />
      </SwimLaneWrapper>
    );

    // Open add task form
    await user.click(screen.getByRole('button', { name: /add task/i }));
    
    // Enter task title
    const input = screen.getByPlaceholderText('Enter task title...');
    await user.type(input, 'New Test Task');
    
    // Submit form
    await user.click(screen.getByRole('button', { name: /add/i }));

    await waitFor(() => {
      expect(mockOnTaskCreate).toHaveBeenCalledWith({
        title: 'New Test Task',
        status: 'todo',
        order_index: 2
      });
    });

    // Form should be hidden after successful creation
    expect(screen.queryByPlaceholderText('Enter task title...')).not.toBeInTheDocument();
  });

  it('handles task creation with API call when no onTaskCreate prop', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true })
    } as Response);

    const user = userEvent.setup();

    render(
      <SwimLaneWrapper>
        <SwimLane {...defaultProps} />
      </SwimLaneWrapper>
    );

    // Open add task form
    await user.click(screen.getByRole('button', { name: /add task/i }));
    
    // Enter task title
    const input = screen.getByPlaceholderText('Enter task title...');
    await user.type(input, 'New API Task');
    
    // Submit form
    await user.click(screen.getByRole('button', { name: /add/i }));

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('/api/kanban/tasks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: 'New API Task',
          status: 'todo',
          order_index: 2
        })
      });
    });

    // Form should be hidden after successful creation
    expect(screen.queryByPlaceholderText('Enter task title...')).not.toBeInTheDocument();
  });

  it('handles Enter key to submit new task', async () => {
    const mockOnTaskCreate = jest.fn().mockResolvedValue(undefined);
    const user = userEvent.setup();
    
    render(
      <SwimLaneWrapper>
        <SwimLane 
          {...defaultProps} 
          onTaskCreate={mockOnTaskCreate}
        />
      </SwimLaneWrapper>
    );

    // Open add task form
    await user.click(screen.getByRole('button', { name: /add task/i }));
    
    // Enter task title
    const input = screen.getByPlaceholderText('Enter task title...');
    await user.type(input, 'Enter Key Task');
    
    // Press Enter
    await user.keyboard('{Enter}');

    await waitFor(() => {
      expect(mockOnTaskCreate).toHaveBeenCalledWith({
        title: 'Enter Key Task',
        status: 'todo',
        order_index: 2
      });
    });
  });

  it('handles Escape key to cancel new task', async () => {
    const user = userEvent.setup();
    render(
      <SwimLaneWrapper>
        <SwimLane {...defaultProps} />
      </SwimLaneWrapper>
    );

    // Open form
    await user.click(screen.getByRole('button', { name: /add task/i }));
    expect(screen.getByPlaceholderText('Enter task title...')).toBeInTheDocument();

    // Press Escape
    await user.keyboard('{Escape}');

    await waitFor(() => {
      expect(screen.queryByPlaceholderText('Enter task title...')).not.toBeInTheDocument();
    });
    expect(screen.getByRole('button', { name: /add task/i })).toBeInTheDocument();
  });

  it('prevents task creation with empty title', async () => {
    const mockOnTaskCreate = jest.fn();
    const user = userEvent.setup();
    render(
      <SwimLaneWrapper>
        <SwimLane 
          {...defaultProps} 
          onTaskCreate={mockOnTaskCreate}
        />
      </SwimLaneWrapper>
    );

    // Open add task form
    await user.click(screen.getByRole('button', { name: /add task/i }));
    
    // Try to submit with empty title
    await user.click(screen.getByRole('button', { name: /add/i }));

    expect(mockOnTaskCreate).not.toHaveBeenCalled();
    expect(screen.getByPlaceholderText('Enter task title...')).toBeInTheDocument(); // Form should still be visible
  });

  it('handles API error during task creation gracefully', async () => {
    // Mock fetch to return an error
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: async () => ({ error: 'API Error' })
    } as Response);

    const user = userEvent.setup();

    render(
      <SwimLaneWrapper>
        <SwimLane {...defaultProps} />
      </SwimLaneWrapper>
    );

    // Open add task form
    await user.click(screen.getByRole('button', { name: /add task/i }));
    
    // Enter task title and submit
    const input = screen.getByPlaceholderText('Enter task title...');
    await user.type(input, 'Error Task');
    await user.click(screen.getByRole('button', { name: /add/i }));

    await waitFor(() => {
      // Expect console.error to have been called (and mocked away)
      expect(console.error).toHaveBeenCalledWith(
        'Error adding task:',
        expect.any(Error)
      );
    });

    // Form should still be visible after an API error (or handle appropriately)
    expect(screen.getByPlaceholderText('Enter task title...')).toBeInTheDocument();
  });

  // Test case for rendering TaskCard with multi-select enabled
  it('should render TaskCard components with correct multi-select props', () => {
    const mockToggleSelection = jest.fn();
    const mockToggleMultiSelectMode = jest.fn();

    render(
      <SwimLaneWrapper>
        <SwimLane
          {...defaultProps}
          isMultiSelectMode={true}
          selectedTaskIds={['1']}
          onToggleTaskSelection={mockToggleSelection}
          onToggleMultiSelectMode={mockToggleMultiSelectMode}
        />
      </SwimLaneWrapper>
    );

    // Verify that TaskCard is rendered with isMultiSelectMode and isSelected
    const taskCard1 = screen.getByTestId('task-card-1');
    expect(taskCard1).toBeInTheDocument();
    // In a real scenario, you'd test the props passed to the mocked component, 
    // but with a simple mock, we just check existence.
  });

  // Test for multi-select toggle button
  it('should show and toggle multi-select mode button', async () => {
    const user = userEvent.setup();
    const mockToggleMultiSelectMode = jest.fn();

    render(
      <SwimLaneWrapper>
        <SwimLane
          {...defaultProps}
          onToggleMultiSelectMode={mockToggleMultiSelectMode}
        />
      </SwimLaneWrapper>
    );

    // Button should be visible
    const toggleButton = screen.getByTitle('Enter multi-select mode');
    expect(toggleButton).toBeInTheDocument();

    await user.click(toggleButton);
    expect(mockToggleMultiSelectMode).toHaveBeenCalledTimes(1);

    // Simulate multi-select mode active
    render(
      <SwimLaneWrapper>
        <SwimLane
          {...defaultProps}
          isMultiSelectMode={true}
          onToggleMultiSelectMode={mockToggleMultiSelectMode}
        />
      </SwimLaneWrapper>
    );

    expect(screen.getByTitle('Exit multi-select mode')).toBeInTheDocument();
  });

  it('should not show multi-select toggle button if tasks.length is 0', () => {
    const mockToggleMultiSelectMode = jest.fn();

    render(
      <SwimLaneWrapper>
        <SwimLane
          {...defaultProps}
          tasks={[]}
          onToggleMultiSelectMode={mockToggleMultiSelectMode}
        />
      </SwimLaneWrapper>
    );

    expect(screen.queryByTitle('Enter multi-select mode')).not.toBeInTheDocument();
  });

  it('renders task indices correctly', () => {
    render(
      <SwimLaneWrapper>
        <SwimLane {...defaultProps} />
      </SwimLaneWrapper>
    );
    expect(screen.getByTestId('task-index-1')).toHaveTextContent('0');
    expect(screen.getByTestId('task-index-2')).toHaveTextContent('1');
  });
});