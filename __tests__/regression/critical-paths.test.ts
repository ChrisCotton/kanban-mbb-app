import React from 'react';
import { render, screen } from '@testing-library/react';
import { DragDropContext } from '@hello-pangea/dnd';
import KanbanBoard from '../../components/kanban/KanbanBoard';

// Mock the custom hooks used by KanbanBoard
jest.mock('../../hooks/useKanban', () => ({
  useKanban: () => ({
    tasks: { backlog: [], todo: [], doing: [], done: [] },
    isLoading: false,
    error: null,
    stats: { total: 0, backlog: 0, todo: 0, doing: 0, done: 0 },
    createTask: jest.fn(),
    updateTask: jest.fn(),
    deleteTask: jest.fn(),
    moveTask: jest.fn(),
    clearError: jest.fn(),
    refetchTasks: jest.fn(),
  }),
}));

jest.mock('../../hooks/useTaskSearch', () => ({
  useTaskSearch: () => ({
    organizedResults: { backlog: [], todo: [], doing: [], done: [] },
    searchStats: { total: 0, backlog: 0, todo: 0, doing: 0, done: 0 },
    isSearching: false,
    searchError: null,
    activeFilters: {},
    isSearchMode: false,
    hasActiveFilters: false,
    performSearch: jest.fn(),
    clearSearch: jest.fn(),
    clearError: jest.fn(),
  }),
}));

jest.mock('../../hooks/useDragAndDrop', () => ({
  useDragAndDrop: () => ({
    dragDropState: {
      isDragging: false,
      sourceStatus: null,
      destinationStatus: null,
    },
    handleDragStart: jest.fn(),
    handleDragUpdate: jest.fn(),
    handleDragEnd: jest.fn(),
  }),
}));

jest.mock('../../hooks/useMultiSelect', () => ({
  useMultiSelect: () => ({
    selectedTaskIds: [],
    selectedCount: 0,
    isMultiSelectMode: false,
    toggleMultiSelectMode: jest.fn(),
    toggleTaskSelection: jest.fn(),
    selectAllTasks: jest.fn(),
    clearSelection: jest.fn(),
    isTaskSelected: jest.fn(),
  }),
}));

describe('Regression: Critical Paths', () => {
  it('should render the KanbanBoard without crashing', () => {
    render(<KanbanBoard />);
    
    // Check for a key element to confirm render
    expect(screen.getByText('Kanban Board')).toBeInTheDocument();
  });
});
