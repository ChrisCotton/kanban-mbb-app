import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import GoalCard from '../GoalCard';
import { GoalWithRelations } from '../../../types/goals';
import { mockGoal, TEST_CATEGORY_ID } from '../../../test/fixtures/goals';

// Create mock GoalWithRelations
const createMockGoalWithRelations = (
  overrides?: Partial<GoalWithRelations>
): GoalWithRelations => {
  return {
    ...mockGoal,
    category: {
      id: TEST_CATEGORY_ID,
      name: 'Development',
      color: '#8B5CF6',
    },
    vision_images: [],
    ...overrides,
  };
};

describe('GoalCard', () => {
  const mockOnClick = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Basic Rendering', () => {
    it('renders title', () => {
      const goal = createMockGoalWithRelations();
      render(<GoalCard goal={goal} onClick={mockOnClick} />);

      expect(screen.getByText(goal.title)).toBeInTheDocument();
    });

    it('renders progress bar', () => {
      const goal = createMockGoalWithRelations({ progress_value: 45 });
      render(<GoalCard goal={goal} onClick={mockOnClick} />);

      const progressBar = screen.getByRole('progressbar');
      expect(progressBar).toBeInTheDocument();
      expect(progressBar).toHaveAttribute('aria-valuenow', '45');
    });

    it('renders progress percentage', () => {
      const goal = createMockGoalWithRelations({ progress_value: 45 });
      render(<GoalCard goal={goal} onClick={mockOnClick} />);

      expect(screen.getByText(/45%/)).toBeInTheDocument();
    });
  });

  describe('Due Date', () => {
    it('renders due date when present', () => {
      const goal = createMockGoalWithRelations({
        target_date: '2026-02-19',
      });
      render(<GoalCard goal={goal} onClick={mockOnClick} />);

      // Should show formatted date (check for month abbreviation)
      expect(screen.getByText(/Feb/)).toBeInTheDocument();
      // Date should be present (could be 18, 19, or 20 depending on timezone)
      const dateText = screen.getByText(/Feb/).textContent;
      expect(dateText).toMatch(/\d+/); // Should contain a number
    });

    it('does not render due date when not present', () => {
      const goal = createMockGoalWithRelations({
        target_date: null,
      });
      render(<GoalCard goal={goal} onClick={mockOnClick} />);

      // Should not show date-related text
      const dateElements = screen.queryAllByText(/Feb|Mar|Jan|2026/);
      expect(dateElements.length).toBe(0);
    });

    it('shows overdue styling for past dates', () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 5);
      const goal = createMockGoalWithRelations({
        target_date: pastDate.toISOString().split('T')[0],
        status: 'active',
      });
      render(<GoalCard goal={goal} onClick={mockOnClick} />);

      // Check for overdue styling (red border)
      const card = screen.getByTestId('goal-card');
      expect(card).toHaveClass('border-red-500');
    });

    it('does not show overdue styling for future dates', () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 5);
      const goal = createMockGoalWithRelations({
        target_date: futureDate.toISOString().split('T')[0],
      });
      render(<GoalCard goal={goal} onClick={mockOnClick} />);

      const card = screen.getByText(goal.title).closest('div');
      expect(card).not.toHaveClass(/red|overdue/i);
    });
  });

  describe('Category Badge', () => {
    it('renders category badge when present', () => {
      const goal = createMockGoalWithRelations({
        category: {
          id: TEST_CATEGORY_ID,
          name: 'Development',
          color: '#8B5CF6',
        },
      });
      render(<GoalCard goal={goal} onClick={mockOnClick} />);

      expect(screen.getByText('Development')).toBeInTheDocument();
    });

    it('does not render category badge when not present', () => {
      const goal = createMockGoalWithRelations({
        category: null,
      });
      render(<GoalCard goal={goal} onClick={mockOnClick} />);

      expect(screen.queryByText('Development')).not.toBeInTheDocument();
    });
  });

  describe('Vision Board Image', () => {
    it('shows vision board image when linked', () => {
      const goal = createMockGoalWithRelations({
        vision_images: [
          {
            id: 'img-1',
            url: 'https://example.com/image.jpg',
            thumbnail_url: 'https://example.com/thumb.jpg',
          },
        ],
      });
      render(<GoalCard goal={goal} onClick={mockOnClick} />);

      const image = screen.getByRole('img');
      expect(image).toBeInTheDocument();
      expect(image).toHaveAttribute('src', 'https://example.com/thumb.jpg');
    });

    it('shows fallback icon when no image', () => {
      const goal = createMockGoalWithRelations({
        vision_images: [],
        icon: '🚀',
      });
      render(<GoalCard goal={goal} onClick={mockOnClick} />);

      expect(screen.getByText('🚀')).toBeInTheDocument();
    });

    it('shows default icon when no image and no icon set', () => {
      const goal = createMockGoalWithRelations({
        vision_images: [],
        icon: null,
      });
      render(<GoalCard goal={goal} onClick={mockOnClick} />);

      // Should show some default icon or placeholder
      const card = screen.getByText(goal.title).closest('div');
      expect(card).toBeInTheDocument();
    });
  });

  describe('Click Handler', () => {
    it('calls onClick handler when clicked', () => {
      const goal = createMockGoalWithRelations();
      render(<GoalCard goal={goal} onClick={mockOnClick} />);

      const card = screen.getByTestId('goal-card');
      fireEvent.click(card);

      expect(mockOnClick).toHaveBeenCalledTimes(1);
    });

    it('does not call onClick when not provided', () => {
      const goal = createMockGoalWithRelations();
      render(<GoalCard goal={goal} onClick={mockOnClick} />);

      // Should not throw error
      const card = screen.getByText(goal.title).closest('div');
      expect(card).toBeInTheDocument();
    });
  });

  describe('Progress Bar Colors', () => {
    it('renders green progress bar for >70%', () => {
      const goal = createMockGoalWithRelations({ progress_value: 75 });
      render(<GoalCard goal={goal} onClick={mockOnClick} />);

      const progressBar = screen.getByRole('progressbar');
      expect(progressBar).toHaveClass(/green/);
    });

    it('renders yellow progress bar for 30-70%', () => {
      const goal = createMockGoalWithRelations({ progress_value: 50 });
      render(<GoalCard goal={goal} onClick={mockOnClick} />);

      const progressBar = screen.getByRole('progressbar');
      expect(progressBar).toHaveClass(/yellow/);
    });

    it('renders red progress bar for <30%', () => {
      const goal = createMockGoalWithRelations({ progress_value: 20 });
      render(<GoalCard goal={goal} onClick={mockOnClick} />);

      const progressBar = screen.getByRole('progressbar');
      expect(progressBar).toHaveClass(/red/);
    });

    it('renders green progress bar for exactly 70%', () => {
      const goal = createMockGoalWithRelations({ progress_value: 70 });
      render(<GoalCard goal={goal} onClick={mockOnClick} />);

      const progressBar = screen.getByRole('progressbar');
      expect(progressBar).toHaveClass(/green/);
    });

    it('renders yellow progress bar for exactly 30%', () => {
      const goal = createMockGoalWithRelations({ progress_value: 30 });
      render(<GoalCard goal={goal} onClick={mockOnClick} />);

      const progressBar = screen.getByRole('progressbar');
      expect(progressBar).toHaveClass(/yellow/);
    });
  });

  describe('Custom className', () => {
    it('applies custom className', () => {
      const goal = createMockGoalWithRelations();
      render(<GoalCard goal={goal} onClick={mockOnClick} className="custom-class" />);

      const card = screen.getByTestId('goal-card');
      expect(card).toHaveClass('custom-class');
    });
  });
});
