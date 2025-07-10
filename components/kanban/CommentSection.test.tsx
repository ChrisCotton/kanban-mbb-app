import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import CommentSection from './CommentSection';
import { Comment } from '../../lib/database/kanban-queries';

// Mock the useComments hook
const mockUseComments = {
  comments: [],
  isLoading: false,
  error: null,
  addComment: jest.fn(),
  updateComment: jest.fn(),
  deleteComment: jest.fn(),
};

jest.mock('../../hooks/useComments', () => ({
  useComments: () => mockUseComments,
}));

// Mock react-markdown to avoid complex rendering in tests
jest.mock('react-markdown', () => {
  return function MockMarkdown({ children }: { children: string }) {
    return <div data-testid="markdown-content">{children}</div>;
  };
});

const mockComments: Comment[] = [
  {
    id: 'comment-1',
    task_id: 'task-1',
    content: 'This is a test comment',
    created_at: '2025-01-01T10:00:00Z',
    updated_at: '2025-01-01T10:00:00Z',
    user_id: 'user-1',
  },
  {
    id: 'comment-2',
    task_id: 'task-1',
    content: '## Markdown Comment\n\nThis comment has **markdown** formatting.',
    created_at: '2025-01-01T11:00:00Z',
    updated_at: '2025-01-01T11:30:00Z',
    user_id: 'user-1',
  },
];

const defaultProps = {
  taskId: 'task-1',
};

describe('CommentSection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseComments.comments = mockComments;
    mockUseComments.isLoading = false;
    mockUseComments.error = null;
  });

  describe('Rendering', () => {
    it('renders comments list', () => {
      render(<CommentSection {...defaultProps} />);
      
      expect(screen.getByText('Comments')).toBeInTheDocument();
      expect(screen.getByText('This is a test comment')).toBeInTheDocument();
      expect(screen.getByText('## Markdown Comment\n\nThis comment has **markdown** formatting.')).toBeInTheDocument();
    });

    it('displays comment count', () => {
      render(<CommentSection {...defaultProps} />);
      
      expect(screen.getByText('Comments (2)')).toBeInTheDocument();
    });

    it('shows empty state when no comments', () => {
      mockUseComments.comments = [];
      render(<CommentSection {...defaultProps} />);
      
      expect(screen.getByText('No comments yet')).toBeInTheDocument();
      expect(screen.getByText('Be the first to add a comment')).toBeInTheDocument();
    });

    it('shows loading state', () => {
      mockUseComments.isLoading = true;
      render(<CommentSection {...defaultProps} />);
      
      expect(screen.getByText('Loading comments...')).toBeInTheDocument();
    });

    it('shows error state', () => {
      mockUseComments.error = 'Failed to load comments';
      render(<CommentSection {...defaultProps} />);
      
      expect(screen.getByText('Error loading comments: Failed to load comments')).toBeInTheDocument();
    });
  });

  describe('Comment Creation', () => {
    it('shows add comment form', () => {
      render(<CommentSection {...defaultProps} />);
      
      expect(screen.getByPlaceholderText('Add a comment...')).toBeInTheDocument();
      expect(screen.getByText('Write')).toBeInTheDocument();
      expect(screen.getByText('Preview')).toBeInTheDocument();
    });

    it('creates new comment', async () => {
      const user = userEvent.setup();
      render(<CommentSection {...defaultProps} />);
      
      const textarea = screen.getByPlaceholderText('Add a comment...');
      await user.type(textarea, 'New test comment');
      await user.click(screen.getByText('Add Comment'));
      
      expect(mockUseComments.addComment).toHaveBeenCalledWith('New test comment');
    });

    it('prevents submission of empty comment', async () => {
      const user = userEvent.setup();
      render(<CommentSection {...defaultProps} />);
      
      await user.click(screen.getByText('Add Comment'));
      
      expect(mockUseComments.addComment).not.toHaveBeenCalled();
    });

    it('clears form after successful submission', async () => {
      const user = userEvent.setup();
      mockUseComments.addComment.mockResolvedValue(undefined);
      
      render(<CommentSection {...defaultProps} />);
      
      const textarea = screen.getByPlaceholderText('Add a comment...');
      await user.type(textarea, 'Test comment');
      await user.click(screen.getByText('Add Comment'));
      
      await waitFor(() => {
        expect(textarea).toHaveValue('');
      });
    });

    it('supports keyboard shortcut for submission', async () => {
      const user = userEvent.setup();
      render(<CommentSection {...defaultProps} />);
      
      const textarea = screen.getByPlaceholderText('Add a comment...');
      await user.type(textarea, 'Keyboard shortcut comment');
      await user.keyboard('{Control>}{Enter}{/Control}');
      
      expect(mockUseComments.addComment).toHaveBeenCalledWith('Keyboard shortcut comment');
    });
  });

  describe('Markdown Preview', () => {
    it('switches to preview mode', async () => {
      const user = userEvent.setup();
      render(<CommentSection {...defaultProps} />);
      
      const textarea = screen.getByPlaceholderText('Add a comment...');
      await user.type(textarea, '**Bold text**');
      await user.click(screen.getByText('Preview'));
      
      expect(screen.getByTestId('markdown-content')).toBeInTheDocument();
      expect(screen.getByText('**Bold text**')).toBeInTheDocument();
    });

    it('switches back to write mode', async () => {
      const user = userEvent.setup();
      render(<CommentSection {...defaultProps} />);
      
      await user.click(screen.getByText('Preview'));
      await user.click(screen.getByText('Write'));
      
      expect(screen.getByPlaceholderText('Add a comment...')).toBeInTheDocument();
    });

    it('shows preview placeholder when content is empty', async () => {
      const user = userEvent.setup();
      render(<CommentSection {...defaultProps} />);
      
      await user.click(screen.getByText('Preview'));
      
      expect(screen.getByText('Nothing to preview')).toBeInTheDocument();
    });
  });

  describe('Comment Editing', () => {
    it('enters edit mode when edit button is clicked', async () => {
      const user = userEvent.setup();
      render(<CommentSection {...defaultProps} />);
      
      const comment = screen.getByText('This is a test comment').closest('[data-testid="comment-item"]');
      await user.hover(comment!);
      await user.click(screen.getByTitle('Edit comment'));
      
      expect(screen.getByDisplayValue('This is a test comment')).toBeInTheDocument();
      expect(screen.getByText('Save')).toBeInTheDocument();
      expect(screen.getByText('Cancel')).toBeInTheDocument();
    });

    it('saves edited comment', async () => {
      const user = userEvent.setup();
      render(<CommentSection {...defaultProps} />);
      
      const comment = screen.getByText('This is a test comment').closest('[data-testid="comment-item"]');
      await user.hover(comment!);
      await user.click(screen.getByTitle('Edit comment'));
      
      const textarea = screen.getByDisplayValue('This is a test comment');
      await user.clear(textarea);
      await user.type(textarea, 'Updated comment');
      await user.click(screen.getByText('Save'));
      
      expect(mockUseComments.updateComment).toHaveBeenCalledWith('comment-1', 'Updated comment');
    });

    it('cancels edit mode', async () => {
      const user = userEvent.setup();
      render(<CommentSection {...defaultProps} />);
      
      const comment = screen.getByText('This is a test comment').closest('[data-testid="comment-item"]');
      await user.hover(comment!);
      await user.click(screen.getByTitle('Edit comment'));
      
      await user.click(screen.getByText('Cancel'));
      
      expect(screen.getByText('This is a test comment')).toBeInTheDocument();
      expect(screen.queryByDisplayValue('This is a test comment')).not.toBeInTheDocument();
    });

    it('supports keyboard shortcuts in edit mode', async () => {
      const user = userEvent.setup();
      render(<CommentSection {...defaultProps} />);
      
      const comment = screen.getByText('This is a test comment').closest('[data-testid="comment-item"]');
      await user.hover(comment!);
      await user.click(screen.getByTitle('Edit comment'));
      
      const textarea = screen.getByDisplayValue('This is a test comment');
      await user.clear(textarea);
      await user.type(textarea, 'Keyboard save');
      await user.keyboard('{Control>}{Enter}{/Control}');
      
      expect(mockUseComments.updateComment).toHaveBeenCalledWith('comment-1', 'Keyboard save');
    });

    it('cancels edit with Escape key', async () => {
      const user = userEvent.setup();
      render(<CommentSection {...defaultProps} />);
      
      const comment = screen.getByText('This is a test comment').closest('[data-testid="comment-item"]');
      await user.hover(comment!);
      await user.click(screen.getByTitle('Edit comment'));
      
      await user.keyboard('{Escape}');
      
      expect(screen.getByText('This is a test comment')).toBeInTheDocument();
      expect(screen.queryByDisplayValue('This is a test comment')).not.toBeInTheDocument();
    });
  });

  describe('Comment Deletion', () => {
    it('shows delete confirmation modal', async () => {
      const user = userEvent.setup();
      render(<CommentSection {...defaultProps} />);
      
      const comment = screen.getByText('This is a test comment').closest('[data-testid="comment-item"]');
      await user.hover(comment!);
      await user.click(screen.getByTitle('Delete comment'));
      
      expect(screen.getByText('Delete Comment')).toBeInTheDocument();
      expect(screen.getByText('Are you sure you want to delete this comment?')).toBeInTheDocument();
    });

    it('deletes comment when confirmed', async () => {
      const user = userEvent.setup();
      render(<CommentSection {...defaultProps} />);
      
      const comment = screen.getByText('This is a test comment').closest('[data-testid="comment-item"]');
      await user.hover(comment!);
      await user.click(screen.getByTitle('Delete comment'));
      await user.click(screen.getByText('Delete'));
      
      expect(mockUseComments.deleteComment).toHaveBeenCalledWith('comment-1');
    });

    it('cancels deletion', async () => {
      const user = userEvent.setup();
      render(<CommentSection {...defaultProps} />);
      
      const comment = screen.getByText('This is a test comment').closest('[data-testid="comment-item"]');
      await user.hover(comment!);
      await user.click(screen.getByTitle('Delete comment'));
      await user.click(screen.getByText('Cancel'));
      
      expect(mockUseComments.deleteComment).not.toHaveBeenCalled();
      expect(screen.queryByText('Delete Comment')).not.toBeInTheDocument();
    });
  });

  describe('Comment Display', () => {
    it('shows relative timestamps', () => {
      render(<CommentSection {...defaultProps} />);
      
      // Mock dates should show relative time
      expect(screen.getByText(/ago/)).toBeInTheDocument();
    });

    it('shows edited indicator for updated comments', () => {
      render(<CommentSection {...defaultProps} />);
      
      // Second comment has different created_at and updated_at
      const editedComment = screen.getByText('## Markdown Comment').closest('[data-testid="comment-item"]');
      expect(editedComment).toHaveTextContent('edited');
    });

    it('renders markdown content in comments', () => {
      render(<CommentSection {...defaultProps} />);
      
      const markdownComments = screen.getAllByTestId('markdown-content');
      expect(markdownComments).toHaveLength(2);
    });
  });

  describe('Auto-expanding Textarea', () => {
    it('expands textarea as content grows', async () => {
      const user = userEvent.setup();
      render(<CommentSection {...defaultProps} />);
      
      const textarea = screen.getByPlaceholderText('Add a comment...');
      const initialHeight = textarea.style.height;
      
      await user.type(textarea, 'Line 1\nLine 2\nLine 3\nLine 4\nLine 5');
      
      // Height should have increased (this is mocked behavior)
      expect(textarea.style.height).not.toBe(initialHeight);
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA labels', () => {
      render(<CommentSection {...defaultProps} />);
      
      expect(screen.getByLabelText('Add a comment')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Add Comment' })).toBeInTheDocument();
    });

    it('has proper heading structure', () => {
      render(<CommentSection {...defaultProps} />);
      
      const heading = screen.getByText('Comments (2)');
      expect(heading.tagName).toBe('H3');
    });

    it('provides keyboard navigation for action buttons', async () => {
      const user = userEvent.setup();
      render(<CommentSection {...defaultProps} />);
      
      // Tab to edit button and activate with Enter
      await user.tab();
      await user.tab();
      await user.keyboard('{Enter}');
      
      expect(screen.getByDisplayValue('This is a test comment')).toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('shows error when comment creation fails', async () => {
      const user = userEvent.setup();
      mockUseComments.addComment.mockRejectedValue(new Error('Creation failed'));
      
      render(<CommentSection {...defaultProps} />);
      
      await user.type(screen.getByPlaceholderText('Add a comment...'), 'Test comment');
      await user.click(screen.getByText('Add Comment'));
      
      await waitFor(() => {
        expect(screen.getByText('Failed to add comment')).toBeInTheDocument();
      });
    });

    it('shows error when comment update fails', async () => {
      const user = userEvent.setup();
      mockUseComments.updateComment.mockRejectedValue(new Error('Update failed'));
      
      render(<CommentSection {...defaultProps} />);
      
      const comment = screen.getByText('This is a test comment').closest('[data-testid="comment-item"]');
      await user.hover(comment!);
      await user.click(screen.getByTitle('Edit comment'));
      await user.click(screen.getByText('Save'));
      
      await waitFor(() => {
        expect(screen.getByText('Failed to update comment')).toBeInTheDocument();
      });
    });

    it('shows error when comment deletion fails', async () => {
      const user = userEvent.setup();
      mockUseComments.deleteComment.mockRejectedValue(new Error('Deletion failed'));
      
      render(<CommentSection {...defaultProps} />);
      
      const comment = screen.getByText('This is a test comment').closest('[data-testid="comment-item"]');
      await user.hover(comment!);
      await user.click(screen.getByTitle('Delete comment'));
      await user.click(screen.getByText('Delete'));
      
      await waitFor(() => {
        expect(screen.getByText('Failed to delete comment')).toBeInTheDocument();
      });
    });
  });
}); 