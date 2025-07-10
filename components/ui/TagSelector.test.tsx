import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import TagSelector from './TagSelector';
import { Tag } from '../../types/kanban';

// Mock the useTags hook
const mockUseTags = {
  tags: [
    { id: '1', name: 'urgent', color: '#ef4444', user_id: 'user-1', created_at: '2025-01-01T00:00:00Z', updated_at: '2025-01-01T00:00:00Z' },
    { id: '2', name: 'frontend', color: '#3b82f6', user_id: 'user-1', created_at: '2025-01-01T00:00:00Z', updated_at: '2025-01-01T00:00:00Z' },
    { id: '3', name: 'backend', color: '#10b981', user_id: 'user-1', created_at: '2025-01-01T00:00:00Z', updated_at: '2025-01-01T00:00:00Z' },
  ] as Tag[],
  isLoading: false,
  error: null,
  createTag: jest.fn(),
  updateTag: jest.fn(),
  deleteTag: jest.fn(),
};

jest.mock('../../hooks/useTags', () => ({
  useTags: () => mockUseTags,
}));

const defaultProps = {
  selectedTags: [],
  onTagsChange: jest.fn(),
  placeholder: 'Select tags...',
};

describe('TagSelector', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders with placeholder text', () => {
      render(<TagSelector {...defaultProps} />);
      
      expect(screen.getByPlaceholderText('Select tags...')).toBeInTheDocument();
    });

    it('renders with custom placeholder', () => {
      render(<TagSelector {...defaultProps} placeholder="Choose tags..." />);
      
      expect(screen.getByPlaceholderText('Choose tags...')).toBeInTheDocument();
    });

    it('shows selected tags as chips', () => {
      const selectedTags = [mockUseTags.tags[0], mockUseTags.tags[1]];
      render(<TagSelector {...defaultProps} selectedTags={selectedTags} />);
      
      expect(screen.getByText('urgent')).toBeInTheDocument();
      expect(screen.getByText('frontend')).toBeInTheDocument();
    });

    it('displays tag colors correctly', () => {
      const selectedTags = [mockUseTags.tags[0]];
      render(<TagSelector {...defaultProps} selectedTags={selectedTags} />);
      
      const tagChip = screen.getByText('urgent').closest('[data-testid="tag-chip"]');
      expect(tagChip).toHaveStyle('background-color: #ef4444');
    });
  });

  describe('Tag Selection', () => {
    it('opens dropdown when clicked', async () => {
      const user = userEvent.setup();
      render(<TagSelector {...defaultProps} />);
      
      await user.click(screen.getByPlaceholderText('Select tags...'));
      
      expect(screen.getByText('urgent')).toBeInTheDocument();
      expect(screen.getByText('frontend')).toBeInTheDocument();
      expect(screen.getByText('backend')).toBeInTheDocument();
    });

    it('selects tag when clicked', async () => {
      const user = userEvent.setup();
      render(<TagSelector {...defaultProps} />);
      
      await user.click(screen.getByPlaceholderText('Select tags...'));
      await user.click(screen.getByText('urgent'));
      
      expect(defaultProps.onTagsChange).toHaveBeenCalledWith([mockUseTags.tags[0]]);
    });

    it('deselects tag when already selected', async () => {
      const user = userEvent.setup();
      const selectedTags = [mockUseTags.tags[0]];
      render(<TagSelector {...defaultProps} selectedTags={selectedTags} />);
      
      await user.click(screen.getByPlaceholderText('Select tags...'));
      await user.click(screen.getByText('urgent'));
      
      expect(defaultProps.onTagsChange).toHaveBeenCalledWith([]);
    });

    it('allows multiple tag selection', async () => {
      const user = userEvent.setup();
      render(<TagSelector {...defaultProps} />);
      
      await user.click(screen.getByPlaceholderText('Select tags...'));
      await user.click(screen.getByText('urgent'));
      await user.click(screen.getByText('frontend'));
      
      expect(defaultProps.onTagsChange).toHaveBeenCalledWith([mockUseTags.tags[0], mockUseTags.tags[1]]);
    });
  });

  describe('Tag Search', () => {
    it('filters tags based on search input', async () => {
      const user = userEvent.setup();
      render(<TagSelector {...defaultProps} />);
      
      await user.click(screen.getByPlaceholderText('Select tags...'));
      await user.type(screen.getByPlaceholderText('Search tags...'), 'front');
      
      expect(screen.getByText('frontend')).toBeInTheDocument();
      expect(screen.queryByText('urgent')).not.toBeInTheDocument();
      expect(screen.queryByText('backend')).not.toBeInTheDocument();
    });

    it('shows no results message when search yields no matches', async () => {
      const user = userEvent.setup();
      render(<TagSelector {...defaultProps} />);
      
      await user.click(screen.getByPlaceholderText('Select tags...'));
      await user.type(screen.getByPlaceholderText('Search tags...'), 'nonexistent');
      
      expect(screen.getByText('No tags found')).toBeInTheDocument();
    });

    it('clears search when dropdown is closed', async () => {
      const user = userEvent.setup();
      render(<TagSelector {...defaultProps} />);
      
      await user.click(screen.getByPlaceholderText('Select tags...'));
      await user.type(screen.getByPlaceholderText('Search tags...'), 'front');
      
      // Click outside to close dropdown
      await user.click(document.body);
      await user.click(screen.getByPlaceholderText('Select tags...'));
      
      expect(screen.getByPlaceholderText('Search tags...')).toHaveValue('');
    });
  });

  describe('Tag Creation', () => {
    it('shows create tag option when search has no matches', async () => {
      const user = userEvent.setup();
      render(<TagSelector {...defaultProps} />);
      
      await user.click(screen.getByPlaceholderText('Select tags...'));
      await user.type(screen.getByPlaceholderText('Search tags...'), 'newtag');
      
      expect(screen.getByText('Create tag "newtag"')).toBeInTheDocument();
    });

    it('opens create tag modal when create option is clicked', async () => {
      const user = userEvent.setup();
      render(<TagSelector {...defaultProps} />);
      
      await user.click(screen.getByPlaceholderText('Select tags...'));
      await user.type(screen.getByPlaceholderText('Search tags...'), 'newtag');
      await user.click(screen.getByText('Create tag "newtag"'));
      
      expect(screen.getByText('Create New Tag')).toBeInTheDocument();
      expect(screen.getByDisplayValue('newtag')).toBeInTheDocument();
    });

    it('creates tag with default blue color', async () => {
      const user = userEvent.setup();
      mockUseTags.createTag.mockResolvedValue({ id: '4', name: 'newtag', color: '#3b82f6' });
      
      render(<TagSelector {...defaultProps} />);
      
      await user.click(screen.getByPlaceholderText('Select tags...'));
      await user.type(screen.getByPlaceholderText('Search tags...'), 'newtag');
      await user.click(screen.getByText('Create tag "newtag"'));
      await user.click(screen.getByText('Create'));
      
      expect(mockUseTags.createTag).toHaveBeenCalledWith('newtag', '#3b82f6');
    });

    it('creates tag with custom color', async () => {
      const user = userEvent.setup();
      mockUseTags.createTag.mockResolvedValue({ id: '4', name: 'newtag', color: '#ef4444' });
      
      render(<TagSelector {...defaultProps} />);
      
      await user.click(screen.getByPlaceholderText('Select tags...'));
      await user.type(screen.getByPlaceholderText('Search tags...'), 'newtag');
      await user.click(screen.getByText('Create tag "newtag"'));
      
      // Change color
      const colorInput = screen.getByLabelText('Color');
      await user.clear(colorInput);
      await user.type(colorInput, '#ef4444');
      
      await user.click(screen.getByText('Create'));
      
      expect(mockUseTags.createTag).toHaveBeenCalledWith('newtag', '#ef4444');
    });

    it('validates tag name is not empty', async () => {
      const user = userEvent.setup();
      render(<TagSelector {...defaultProps} />);
      
      await user.click(screen.getByPlaceholderText('Select tags...'));
      await user.type(screen.getByPlaceholderText('Search tags...'), 'newtag');
      await user.click(screen.getByText('Create tag "newtag"'));
      
      // Clear the name field
      await user.clear(screen.getByLabelText('Name'));
      await user.click(screen.getByText('Create'));
      
      expect(screen.getByText('Tag name is required')).toBeInTheDocument();
      expect(mockUseTags.createTag).not.toHaveBeenCalled();
    });

    it('validates tag name is unique', async () => {
      const user = userEvent.setup();
      render(<TagSelector {...defaultProps} />);
      
      await user.click(screen.getByPlaceholderText('Select tags...'));
      await user.type(screen.getByPlaceholderText('Search tags...'), 'urgent');
      await user.click(screen.getByText('Create tag "urgent"'));
      await user.click(screen.getByText('Create'));
      
      expect(screen.getByText('Tag name already exists')).toBeInTheDocument();
      expect(mockUseTags.createTag).not.toHaveBeenCalled();
    });

    it('cancels tag creation', async () => {
      const user = userEvent.setup();
      render(<TagSelector {...defaultProps} />);
      
      await user.click(screen.getByPlaceholderText('Select tags...'));
      await user.type(screen.getByPlaceholderText('Search tags...'), 'newtag');
      await user.click(screen.getByText('Create tag "newtag"'));
      await user.click(screen.getByText('Cancel'));
      
      expect(screen.queryByText('Create New Tag')).not.toBeInTheDocument();
      expect(mockUseTags.createTag).not.toHaveBeenCalled();
    });
  });

  describe('Tag Removal', () => {
    it('removes tag when chip close button is clicked', async () => {
      const user = userEvent.setup();
      const selectedTags = [mockUseTags.tags[0], mockUseTags.tags[1]];
      render(<TagSelector {...defaultProps} selectedTags={selectedTags} />);
      
      const removeButton = screen.getAllByLabelText('Remove tag')[0];
      await user.click(removeButton);
      
      expect(defaultProps.onTagsChange).toHaveBeenCalledWith([mockUseTags.tags[1]]);
    });

    it('removes all tags when clear all button is clicked', async () => {
      const user = userEvent.setup();
      const selectedTags = [mockUseTags.tags[0], mockUseTags.tags[1]];
      render(<TagSelector {...defaultProps} selectedTags={selectedTags} />);
      
      await user.click(screen.getByLabelText('Clear all tags'));
      
      expect(defaultProps.onTagsChange).toHaveBeenCalledWith([]);
    });
  });

  describe('Keyboard Navigation', () => {
    it('opens dropdown with Enter key', async () => {
      const user = userEvent.setup();
      render(<TagSelector {...defaultProps} />);
      
      const input = screen.getByPlaceholderText('Select tags...');
      await user.click(input);
      await user.keyboard('{Enter}');
      
      expect(screen.getByText('urgent')).toBeInTheDocument();
    });

    it('navigates options with arrow keys', async () => {
      const user = userEvent.setup();
      render(<TagSelector {...defaultProps} />);
      
      await user.click(screen.getByPlaceholderText('Select tags...'));
      await user.keyboard('{ArrowDown}');
      await user.keyboard('{ArrowDown}');
      await user.keyboard('{Enter}');
      
      expect(defaultProps.onTagsChange).toHaveBeenCalledWith([mockUseTags.tags[1]]);
    });

    it('closes dropdown with Escape key', async () => {
      const user = userEvent.setup();
      render(<TagSelector {...defaultProps} />);
      
      await user.click(screen.getByPlaceholderText('Select tags...'));
      await user.keyboard('{Escape}');
      
      expect(screen.queryByText('urgent')).not.toBeInTheDocument();
    });
  });

  describe('Click Outside', () => {
    it('closes dropdown when clicking outside', async () => {
      const user = userEvent.setup();
      render(<TagSelector {...defaultProps} />);
      
      await user.click(screen.getByPlaceholderText('Select tags...'));
      expect(screen.getByText('urgent')).toBeInTheDocument();
      
      await user.click(document.body);
      expect(screen.queryByText('urgent')).not.toBeInTheDocument();
    });
  });

  describe('Loading States', () => {
    it('shows loading state when tags are loading', () => {
      mockUseTags.isLoading = true;
      render(<TagSelector {...defaultProps} />);
      
      expect(screen.getByText('Loading tags...')).toBeInTheDocument();
    });

    it('shows loading state during tag creation', async () => {
      const user = userEvent.setup();
      mockUseTags.createTag.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));
      
      render(<TagSelector {...defaultProps} />);
      
      await user.click(screen.getByPlaceholderText('Select tags...'));
      await user.type(screen.getByPlaceholderText('Search tags...'), 'newtag');
      await user.click(screen.getByText('Create tag "newtag"'));
      await user.click(screen.getByText('Create'));
      
      expect(screen.getByText('Creating...')).toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('shows error state when tags fail to load', () => {
      mockUseTags.error = 'Failed to load tags';
      render(<TagSelector {...defaultProps} />);
      
      expect(screen.getByText('Error loading tags')).toBeInTheDocument();
    });

    it('shows error when tag creation fails', async () => {
      const user = userEvent.setup();
      mockUseTags.createTag.mockRejectedValue(new Error('Creation failed'));
      
      render(<TagSelector {...defaultProps} />);
      
      await user.click(screen.getByPlaceholderText('Select tags...'));
      await user.type(screen.getByPlaceholderText('Search tags...'), 'newtag');
      await user.click(screen.getByText('Create tag "newtag"'));
      await user.click(screen.getByText('Create'));
      
      await waitFor(() => {
        expect(screen.getByText('Failed to create tag')).toBeInTheDocument();
      });
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA labels', () => {
      render(<TagSelector {...defaultProps} />);
      
      expect(screen.getByLabelText('Select tags')).toBeInTheDocument();
      expect(screen.getByRole('combobox')).toBeInTheDocument();
    });

    it('has proper ARIA expanded state', async () => {
      const user = userEvent.setup();
      render(<TagSelector {...defaultProps} />);
      
      const combobox = screen.getByRole('combobox');
      expect(combobox).toHaveAttribute('aria-expanded', 'false');
      
      await user.click(combobox);
      expect(combobox).toHaveAttribute('aria-expanded', 'true');
    });

    it('has proper ARIA selected state for options', async () => {
      const user = userEvent.setup();
      const selectedTags = [mockUseTags.tags[0]];
      render(<TagSelector {...defaultProps} selectedTags={selectedTags} />);
      
      await user.click(screen.getByRole('combobox'));
      
      const urgentOption = screen.getByRole('option', { name: 'urgent' });
      expect(urgentOption).toHaveAttribute('aria-selected', 'true');
      
      const frontendOption = screen.getByRole('option', { name: 'frontend' });
      expect(frontendOption).toHaveAttribute('aria-selected', 'false');
    });

    it('supports screen reader announcements', async () => {
      const user = userEvent.setup();
      render(<TagSelector {...defaultProps} />);
      
      await user.click(screen.getByRole('combobox'));
      
      expect(screen.getByText('3 tags available')).toBeInTheDocument();
    });
  });

  describe('Color Picker', () => {
    it('shows color picker in create tag modal', async () => {
      const user = userEvent.setup();
      render(<TagSelector {...defaultProps} />);
      
      await user.click(screen.getByPlaceholderText('Select tags...'));
      await user.type(screen.getByPlaceholderText('Search tags...'), 'newtag');
      await user.click(screen.getByText('Create tag "newtag"'));
      
      expect(screen.getByLabelText('Color')).toBeInTheDocument();
      expect(screen.getByDisplayValue('#3b82f6')).toBeInTheDocument();
    });

    it('validates color format', async () => {
      const user = userEvent.setup();
      render(<TagSelector {...defaultProps} />);
      
      await user.click(screen.getByPlaceholderText('Select tags...'));
      await user.type(screen.getByPlaceholderText('Search tags...'), 'newtag');
      await user.click(screen.getByText('Create tag "newtag"'));
      
      const colorInput = screen.getByLabelText('Color');
      await user.clear(colorInput);
      await user.type(colorInput, 'invalid-color');
      await user.click(screen.getByText('Create'));
      
      expect(screen.getByText('Invalid color format')).toBeInTheDocument();
    });
  });
}); 