import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import SearchAndFilter from './SearchAndFilter';
import { SearchFilters } from '../../types/kanban';

// Mock the hooks
jest.mock('../../hooks/useCategories', () => ({
  useCategories: () => ({
    categories: [
      { id: '1', name: 'Development', hourly_rate: 100 },
      { id: '2', name: 'Design', hourly_rate: 80 },
    ],
    isLoading: false,
    error: null,
  }),
}));

jest.mock('../../hooks/useTags', () => ({
  useTags: () => ({
    tags: [
      { id: '1', name: 'urgent', color: '#ef4444' },
      { id: '2', name: 'frontend', color: '#3b82f6' },
      { id: '3', name: 'backend', color: '#10b981' },
    ],
    isLoading: false,
    error: null,
  }),
}));

// Mock lodash debounce
jest.mock('lodash/debounce', () => {
  return (fn: any) => {
    fn.cancel = jest.fn();
    return fn;
  };
});

const defaultFilters: SearchFilters = {
  q: '',
  status: '',
  priority: '',
  category: '',
  tags: [],
  dueDateFrom: '',
  dueDateTo: '',
  overdue: false,
};

const defaultProps = {
  filters: defaultFilters,
  onFiltersChange: jest.fn(),
  onSearch: jest.fn(),
  activeFilterCount: 0,
  onClearFilters: jest.fn(),
};

describe('SearchAndFilter', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Search Input', () => {
    it('renders search input with placeholder', () => {
      render(<SearchAndFilter {...defaultProps} />);
      
      expect(screen.getByPlaceholderText('Search tasks...')).toBeInTheDocument();
    });

    it('displays current search query', () => {
      const propsWithQuery = {
        ...defaultProps,
        filters: { ...defaultFilters, q: 'test query' },
      };
      
      render(<SearchAndFilter {...propsWithQuery} />);
      
      expect(screen.getByDisplayValue('test query')).toBeInTheDocument();
    });

    it('calls onSearch when typing in search input', async () => {
      const user = userEvent.setup();
      render(<SearchAndFilter {...defaultProps} />);
      
      const searchInput = screen.getByPlaceholderText('Search tasks...');
      await user.type(searchInput, 'new search');
      
      expect(defaultProps.onSearch).toHaveBeenCalledWith('new search');
    });

    it('shows search icon', () => {
      render(<SearchAndFilter {...defaultProps} />);
      
      expect(screen.getByTestId('search-icon')).toBeInTheDocument();
    });
  });

  describe('Filters Button', () => {
    it('shows filters button with count when no active filters', () => {
      render(<SearchAndFilter {...defaultProps} />);
      
      expect(screen.getByText('Filters')).toBeInTheDocument();
      expect(screen.queryByText('0')).not.toBeInTheDocument();
    });

    it('shows filter count when filters are active', () => {
      const propsWithFilters = {
        ...defaultProps,
        activeFilterCount: 3,
      };
      
      render(<SearchAndFilter {...propsWithFilters} />);
      
      expect(screen.getByText('Filters')).toBeInTheDocument();
      expect(screen.getByText('3')).toBeInTheDocument();
    });

    it('toggles filters panel when clicked', async () => {
      const user = userEvent.setup();
      render(<SearchAndFilter {...defaultProps} />);
      
      await user.click(screen.getByText('Filters'));
      
      expect(screen.getByText('Status')).toBeInTheDocument();
      expect(screen.getByText('Priority')).toBeInTheDocument();
    });
  });

  describe('Clear Filters Button', () => {
    it('shows clear button when filters are active', () => {
      const propsWithFilters = {
        ...defaultProps,
        activeFilterCount: 2,
      };
      
      render(<SearchAndFilter {...propsWithFilters} />);
      
      expect(screen.getByText('Clear')).toBeInTheDocument();
    });

    it('hides clear button when no active filters', () => {
      render(<SearchAndFilter {...defaultProps} />);
      
      expect(screen.queryByText('Clear')).not.toBeInTheDocument();
    });

    it('calls onClearFilters when clicked', async () => {
      const user = userEvent.setup();
      const propsWithFilters = {
        ...defaultProps,
        activeFilterCount: 2,
      };
      
      render(<SearchAndFilter {...propsWithFilters} />);
      
      await user.click(screen.getByText('Clear'));
      
      expect(defaultProps.onClearFilters).toHaveBeenCalled();
    });
  });

  describe('Filters Panel', () => {
    beforeEach(async () => {
      const user = userEvent.setup();
      render(<SearchAndFilter {...defaultProps} />);
      await user.click(screen.getByText('Filters'));
    });

    it('renders all filter sections', () => {
      expect(screen.getByText('Status')).toBeInTheDocument();
      expect(screen.getByText('Priority')).toBeInTheDocument();
      expect(screen.getByText('Category')).toBeInTheDocument();
      expect(screen.getByText('Tags')).toBeInTheDocument();
      expect(screen.getByText('Due Date Range')).toBeInTheDocument();
      expect(screen.getByText('Quick Filters')).toBeInTheDocument();
    });

    describe('Status Filter', () => {
      it('shows all status options', () => {
        expect(screen.getByRole('option', { name: 'All statuses' })).toBeInTheDocument();
        expect(screen.getByRole('option', { name: 'Backlog' })).toBeInTheDocument();
        expect(screen.getByRole('option', { name: 'To Do' })).toBeInTheDocument();
        expect(screen.getByRole('option', { name: 'Doing' })).toBeInTheDocument();
        expect(screen.getByRole('option', { name: 'Done' })).toBeInTheDocument();
      });

      it('updates status filter when changed', async () => {
        const user = userEvent.setup();
        
        await user.selectOptions(screen.getByLabelText('Status'), 'doing');
        
        expect(defaultProps.onFiltersChange).toHaveBeenCalledWith({
          ...defaultFilters,
          status: 'doing',
        });
      });
    });

    describe('Priority Filter', () => {
      it('shows all priority options', () => {
        expect(screen.getByRole('option', { name: 'All priorities' })).toBeInTheDocument();
        expect(screen.getByRole('option', { name: 'Low' })).toBeInTheDocument();
        expect(screen.getByRole('option', { name: 'Medium' })).toBeInTheDocument();
        expect(screen.getByRole('option', { name: 'High' })).toBeInTheDocument();
        expect(screen.getByRole('option', { name: 'Urgent' })).toBeInTheDocument();
      });

      it('updates priority filter when changed', async () => {
        const user = userEvent.setup();
        
        await user.selectOptions(screen.getByLabelText('Priority'), 'high');
        
        expect(defaultProps.onFiltersChange).toHaveBeenCalledWith({
          ...defaultFilters,
          priority: 'high',
        });
      });
    });

    describe('Category Filter', () => {
      it('shows category options from hook', () => {
        expect(screen.getByRole('option', { name: 'All categories' })).toBeInTheDocument();
        expect(screen.getByRole('option', { name: 'Development' })).toBeInTheDocument();
        expect(screen.getByRole('option', { name: 'Design' })).toBeInTheDocument();
      });

      it('updates category filter when changed', async () => {
        const user = userEvent.setup();
        
        await user.selectOptions(screen.getByLabelText('Category'), '1');
        
        expect(defaultProps.onFiltersChange).toHaveBeenCalledWith({
          ...defaultFilters,
          category: '1',
        });
      });
    });

    describe('Tags Filter', () => {
      it('shows tag search input', () => {
        expect(screen.getByPlaceholderText('Search tags...')).toBeInTheDocument();
      });

      it('displays available tags', () => {
        expect(screen.getByText('urgent')).toBeInTheDocument();
        expect(screen.getByText('frontend')).toBeInTheDocument();
        expect(screen.getByText('backend')).toBeInTheDocument();
      });

      it('adds tag to selection when clicked', async () => {
        const user = userEvent.setup();
        
        await user.click(screen.getByText('urgent'));
        
        expect(defaultProps.onFiltersChange).toHaveBeenCalledWith({
          ...defaultFilters,
          tags: ['1'],
        });
      });

      it('filters tags based on search input', async () => {
        const user = userEvent.setup();
        
        await user.type(screen.getByPlaceholderText('Search tags...'), 'front');
        
        expect(screen.getByText('frontend')).toBeInTheDocument();
        expect(screen.queryByText('urgent')).not.toBeInTheDocument();
        expect(screen.queryByText('backend')).not.toBeInTheDocument();
      });
    });

    describe('Date Range Filter', () => {
      it('shows date range inputs', () => {
        expect(screen.getByLabelText('From')).toBeInTheDocument();
        expect(screen.getByLabelText('To')).toBeInTheDocument();
      });

      it('updates date range when changed', async () => {
        const user = userEvent.setup();
        
        await user.type(screen.getByLabelText('From'), '2025-01-01');
        
        expect(defaultProps.onFiltersChange).toHaveBeenCalledWith({
          ...defaultFilters,
          dueDateFrom: '2025-01-01',
        });
      });
    });

    describe('Quick Filters', () => {
      it('shows overdue filter button', () => {
        expect(screen.getByText('Overdue')).toBeInTheDocument();
      });

      it('toggles overdue filter when clicked', async () => {
        const user = userEvent.setup();
        
        await user.click(screen.getByText('Overdue'));
        
        expect(defaultProps.onFiltersChange).toHaveBeenCalledWith({
          ...defaultFilters,
          overdue: true,
        });
      });

      it('shows active state for overdue filter', () => {
        const propsWithOverdue = {
          ...defaultProps,
          filters: { ...defaultFilters, overdue: true },
        };
        
        render(<SearchAndFilter {...propsWithOverdue} />);
        
        expect(screen.getByText('Overdue')).toHaveClass('bg-red-100');
      });
    });
  });

  describe('Selected Tags Display', () => {
    it('shows selected tags as chips', () => {
      const propsWithTags = {
        ...defaultProps,
        filters: { ...defaultFilters, tags: ['1', '2'] },
      };
      
      render(<SearchAndFilter {...propsWithTags} />);
      
      expect(screen.getByText('urgent')).toBeInTheDocument();
      expect(screen.getByText('frontend')).toBeInTheDocument();
    });

    it('removes tag when chip close button is clicked', async () => {
      const user = userEvent.setup();
      const propsWithTags = {
        ...defaultProps,
        filters: { ...defaultFilters, tags: ['1', '2'] },
      };
      
      render(<SearchAndFilter {...propsWithTags} />);
      
      const removeButton = screen.getAllByLabelText('Remove tag')[0];
      await user.click(removeButton);
      
      expect(defaultProps.onFiltersChange).toHaveBeenCalledWith({
        ...defaultFilters,
        tags: ['2'],
      });
    });
  });

  describe('Mobile Responsiveness', () => {
    it('shows expandable filters panel on mobile', async () => {
      const user = userEvent.setup();
      // Mock mobile viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      });
      
      render(<SearchAndFilter {...defaultProps} />);
      
      // Filters should be collapsed by default on mobile
      expect(screen.queryByText('Status')).not.toBeInTheDocument();
      
      await user.click(screen.getByText('Filters'));
      
      expect(screen.getByText('Status')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA labels', () => {
      render(<SearchAndFilter {...defaultProps} />);
      
      expect(screen.getByLabelText('Search tasks')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Toggle filters' })).toBeInTheDocument();
    });

    it('supports keyboard navigation', async () => {
      const user = userEvent.setup();
      render(<SearchAndFilter {...defaultProps} />);
      
      // Tab to filters button and activate
      await user.tab();
      await user.tab();
      await user.keyboard('{Enter}');
      
      expect(screen.getByText('Status')).toBeInTheDocument();
    });

    it('has proper focus management', async () => {
      const user = userEvent.setup();
      render(<SearchAndFilter {...defaultProps} />);
      
      const searchInput = screen.getByPlaceholderText('Search tasks...');
      await user.click(searchInput);
      
      expect(searchInput).toHaveFocus();
    });
  });

  describe('Loading States', () => {
    it('shows loading state for tags', () => {
      // Mock loading state
      jest.doMock('../../hooks/useTags', () => ({
        useTags: () => ({
          tags: [],
          isLoading: true,
          error: null,
        }),
      }));
      
      render(<SearchAndFilter {...defaultProps} />);
      
      expect(screen.getByText('Loading tags...')).toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('handles tag loading errors gracefully', () => {
      // Mock error state
      jest.doMock('../../hooks/useTags', () => ({
        useTags: () => ({
          tags: [],
          isLoading: false,
          error: 'Failed to load tags',
        }),
      }));
      
      render(<SearchAndFilter {...defaultProps} />);
      
      expect(screen.getByText('Error loading tags')).toBeInTheDocument();
    });
  });

  describe('Filter Persistence', () => {
    it('maintains filter state when panel is toggled', async () => {
      const user = userEvent.setup();
      const propsWithFilters = {
        ...defaultProps,
        filters: { ...defaultFilters, status: 'doing', priority: 'high' },
      };
      
      render(<SearchAndFilter {...propsWithFilters} />);
      
      await user.click(screen.getByText('Filters'));
      
      expect(screen.getByDisplayValue('doing')).toBeInTheDocument();
      expect(screen.getByDisplayValue('high')).toBeInTheDocument();
      
      await user.click(screen.getByText('Filters'));
      await user.click(screen.getByText('Filters'));
      
      expect(screen.getByDisplayValue('doing')).toBeInTheDocument();
      expect(screen.getByDisplayValue('high')).toBeInTheDocument();
    });
  });
}); 