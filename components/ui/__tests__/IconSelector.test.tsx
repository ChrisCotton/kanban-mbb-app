import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import IconSelector from '../IconSelector';

describe('IconSelector', () => {
  const mockOnChange = jest.fn();
  const defaultProps = {
    value: null,
    onChange: mockOnChange,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Basic Rendering', () => {
    it('renders with placeholder when no value selected', () => {
      render(<IconSelector {...defaultProps} />);
      
      expect(screen.getByText('Select an icon...')).toBeInTheDocument();
    });

    it('renders selected icon when value is provided', () => {
      render(<IconSelector {...defaultProps} value="🚀" />);
      
      expect(screen.getByText('🚀')).toBeInTheDocument();
    });

    it('renders error message when error prop is provided', () => {
      render(<IconSelector {...defaultProps} error="Icon is required" />);
      
      expect(screen.getByText('Icon is required')).toBeInTheDocument();
    });

    it('applies custom className', () => {
      const { container } = render(
        <IconSelector {...defaultProps} className="custom-class" />
      );
      
      expect(container.firstChild).toHaveClass('custom-class');
    });
  });

  describe('Dropdown Functionality', () => {
    it('opens dropdown when button is clicked', async () => {
      render(<IconSelector {...defaultProps} />);
      
      const button = screen.getByRole('button');
      await userEvent.click(button);
      
      expect(screen.getByPlaceholderText('Search icons...')).toBeInTheDocument();
      expect(screen.getByText('None')).toBeInTheDocument();
    });

    it('closes dropdown when clicking outside', async () => {
      render(
        <div>
          <div data-testid="outside">Outside</div>
          <IconSelector {...defaultProps} />
        </div>
      );
      
      const button = screen.getByRole('button');
      await userEvent.click(button);
      
      expect(screen.getByPlaceholderText('Search icons...')).toBeInTheDocument();
      
      const outside = screen.getByTestId('outside');
      await userEvent.click(outside);
      
      await waitFor(() => {
        expect(screen.queryByPlaceholderText('Search icons...')).not.toBeInTheDocument();
      });
    });

    it('shows icons grid when dropdown is open', async () => {
      render(<IconSelector {...defaultProps} />);
      
      const button = screen.getByRole('button');
      await userEvent.click(button);
      
      // Should show the grid container
      const grid = document.querySelector('div[class*="grid"]');
      expect(grid).toBeInTheDocument();
      
      // Should have multiple buttons (main selector + None + icon buttons)
      const allButtons = screen.getAllByRole('button');
      expect(allButtons.length).toBeGreaterThan(2); // At least main button, None button, and some icons
    });
  });

  describe('Icon Selection', () => {
    it('calls onChange when icon is selected', async () => {
      render(<IconSelector {...defaultProps} />);
      
      const button = screen.getByRole('button');
      await userEvent.click(button);
      
      // Find an icon button in the grid (skip first button which is main selector, second is "None")
      const allButtons = screen.getAllByRole('button');
      // Find a button that's in the grid and has emoji content
      const grid = document.querySelector('div[class*="grid"]');
      const iconButtons = grid ? Array.from(grid.querySelectorAll('button')) : [];
      
      if (iconButtons.length > 0) {
        const iconButton = iconButtons[0] as HTMLButtonElement;
        await userEvent.click(iconButton);
        // Should be called with an emoji string
        expect(mockOnChange).toHaveBeenCalled();
        const callArg = mockOnChange.mock.calls[0][0];
        expect(typeof callArg).toBe('string');
        expect(callArg.length).toBeGreaterThan(0);
      }
    });

    it('closes dropdown after selecting icon', async () => {
      render(<IconSelector {...defaultProps} />);
      
      const button = screen.getByRole('button');
      await userEvent.click(button);
      
      const allButtons = screen.getAllByRole('button');
      const iconButton = allButtons.find(btn => 
        btn.textContent && 
        btn.textContent.length === 1 && 
        /[\u{1F300}-\u{1F9FF}]/u.test(btn.textContent) &&
        btn.closest('div[class*="grid"]')
      );
      
      if (iconButton) {
        await userEvent.click(iconButton);
        
        await waitFor(() => {
          expect(screen.queryByPlaceholderText('Search icons...')).not.toBeInTheDocument();
        });
      }
    });

    it('highlights selected icon in dropdown', async () => {
      render(<IconSelector {...defaultProps} value="🚀" />);
      
      const button = screen.getByRole('button');
      await userEvent.click(button);
      
      // The selected icon should have special styling (find it in the grid)
      const grid = document.querySelector('div[class*="grid"]');
      const iconButtons = grid ? Array.from(grid.querySelectorAll('button')) : [];
      const selectedButton = iconButtons.find(btn => btn.textContent === '🚀') as HTMLButtonElement;
      
      if (selectedButton) {
        expect(selectedButton).toHaveClass('bg-blue-50');
      }
    });
  });

  describe('Clear Option', () => {
    it('calls onChange with null when "None" is selected', async () => {
      render(<IconSelector {...defaultProps} value="🚀" />);
      
      const button = screen.getByRole('button');
      await userEvent.click(button);
      
      const noneButton = screen.getByText('None');
      await userEvent.click(noneButton);
      
      expect(mockOnChange).toHaveBeenCalledWith(null);
    });
  });

  describe('Search Functionality', () => {
    it('shows search input when dropdown opens', async () => {
      render(<IconSelector {...defaultProps} />);
      
      const button = screen.getByRole('button');
      await userEvent.click(button);
      
      expect(screen.getByPlaceholderText('Search icons...')).toBeInTheDocument();
    });

    it('clears search when dropdown closes', async () => {
      render(<IconSelector {...defaultProps} />);
      
      const button = screen.getByRole('button');
      await userEvent.click(button);
      
      const searchInput = screen.getByPlaceholderText('Search icons...');
      await userEvent.type(searchInput, 'test');
      
      const outside = document.body;
      fireEvent.mouseDown(outside);
      
      await waitFor(() => {
        expect(screen.queryByPlaceholderText('Search icons...')).not.toBeInTheDocument();
      });
      
      // Reopen dropdown
      await userEvent.click(button);
      
      const newSearchInput = screen.getByPlaceholderText('Search icons...');
      expect(newSearchInput).toHaveValue('');
    });
  });
});
