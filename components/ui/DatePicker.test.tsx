import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import DatePicker from './DatePicker';

// Mock date to ensure consistent testing
const mockDate = new Date('2025-01-15T12:00:00.000Z');
const originalDate = global.Date;

const mockDateNow = jest.fn(() => mockDate.getTime());
global.Date = jest.fn((dateString?: string | number | Date) => {
  if (dateString === undefined) {
    return mockDate;
  }
  return new originalDate(dateString);
}) as any;
global.Date.now = mockDateNow;
Object.setPrototypeOf(global.Date, originalDate);
Object.getOwnPropertyNames(originalDate).forEach(name => {
  if (name !== 'prototype') {
    (global.Date as any)[name] = (originalDate as any)[name];
  }
});

const defaultProps = {
  value: '',
  onChange: jest.fn(),
};

describe('DatePicker', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterAll(() => {
    global.Date = originalDate;
  });

  describe('Basic Rendering', () => {
    it('renders with default props', () => {
      render(<DatePicker {...defaultProps} />);
      
      expect(screen.getByText('Select date...')).toBeInTheDocument();
      expect(screen.getByRole('button')).toBeInTheDocument();
    });

    it('renders with custom placeholder', () => {
      render(<DatePicker {...defaultProps} placeholder="Choose a date" />);
      
      expect(screen.getByText('Choose a date')).toBeInTheDocument();
    });

    it('renders with custom className', () => {
      const { container } = render(<DatePicker {...defaultProps} className="custom-class" />);
      
      expect(container.firstChild).toHaveClass('custom-class');
    });

    it('displays formatted date when value is provided', () => {
      render(<DatePicker {...defaultProps} value="2025-01-20" />);
      
      expect(screen.getByText('Mon, Jan 20, 2025')).toBeInTheDocument();
    });

    it('shows clear button when value is provided', () => {
      render(<DatePicker {...defaultProps} value="2025-01-20" />);
      
      const clearButton = screen.getByRole('button', { name: /clear/i });
      expect(clearButton).toBeInTheDocument();
    });

    it('does not show clear button when value is empty', () => {
      render(<DatePicker {...defaultProps} />);
      
      const clearButton = screen.queryByRole('button', { name: /clear/i });
      expect(clearButton).not.toBeInTheDocument();
    });
  });

  describe('Disabled State', () => {
    it('renders disabled state correctly', () => {
      const { container } = render(<DatePicker {...defaultProps} disabled />);
      
      const inputContainer = container.querySelector('div[class*="cursor-not-allowed"]');
      expect(inputContainer).toBeInTheDocument();
    });

    it('does not open dropdown when disabled', async () => {
      const user = userEvent.setup();
      render(<DatePicker {...defaultProps} disabled />);
      
      await user.click(screen.getByRole('button'));
      
      expect(screen.queryByText('Quick Select')).not.toBeInTheDocument();
    });

    it('disables clear button when disabled', () => {
      render(<DatePicker {...defaultProps} value="2025-01-20" disabled />);
      
      const clearButton = screen.getByRole('button', { name: /clear/i });
      expect(clearButton).toBeDisabled();
    });
  });

  describe('Error Handling', () => {
    it('displays error message', () => {
      render(<DatePicker {...defaultProps} error="Invalid date" />);
      
      expect(screen.getByText('Invalid date')).toBeInTheDocument();
    });

    it('applies error styling', () => {
      const { container } = render(<DatePicker {...defaultProps} error="Invalid date" />);
      
      const inputContainer = container.querySelector('div[class*="border-red-500"]');
      expect(inputContainer).toBeInTheDocument();
    });

    it('shows error in red color', () => {
      render(<DatePicker {...defaultProps} error="Invalid date" />);
      
      const errorText = screen.getByText('Invalid date');
      expect(errorText).toHaveClass('text-red-600');
    });
  });

  describe('Dropdown Functionality', () => {
    it('opens dropdown when clicked', async () => {
      const user = userEvent.setup();
      render(<DatePicker {...defaultProps} />);
      
      await user.click(screen.getByRole('button'));
      
      expect(screen.getByText('Quick Select')).toBeInTheDocument();
    });

    it('closes dropdown when clicking outside', async () => {
      const user = userEvent.setup();
      render(
        <div>
          <DatePicker {...defaultProps} />
          <div data-testid="outside">Outside</div>
        </div>
      );
      
      await user.click(screen.getByRole('button'));
      expect(screen.getByText('Quick Select')).toBeInTheDocument();
      
      await user.click(screen.getByTestId('outside'));
      
      await waitFor(() => {
        expect(screen.queryByText('Quick Select')).not.toBeInTheDocument();
      });
    });

    it('renders date input in dropdown', async () => {
      const user = userEvent.setup();
      render(<DatePicker {...defaultProps} />);
      
      await user.click(screen.getByRole('button'));
      
      const dateInput = screen.getByDisplayValue('');
      expect(dateInput).toBeInTheDocument();
      expect(dateInput).toHaveAttribute('type', 'date');
    });

    it('sets minimum date to today by default', async () => {
      const user = userEvent.setup();
      render(<DatePicker {...defaultProps} />);
      
      await user.click(screen.getByRole('button'));
      
      const dateInput = screen.getByDisplayValue('');
      expect(dateInput).toHaveAttribute('min', '2025-01-15');
    });

    it('respects custom minDate', async () => {
      const user = userEvent.setup();
      render(<DatePicker {...defaultProps} minDate="2025-01-10" />);
      
      await user.click(screen.getByRole('button'));
      
      const dateInput = screen.getByDisplayValue('');
      expect(dateInput).toHaveAttribute('min', '2025-01-10');
    });

    it('respects custom maxDate', async () => {
      const user = userEvent.setup();
      render(<DatePicker {...defaultProps} maxDate="2025-12-31" />);
      
      await user.click(screen.getByRole('button'));
      
      const dateInput = screen.getByDisplayValue('');
      expect(dateInput).toHaveAttribute('max', '2025-12-31');
    });
  });

  describe('Date Selection', () => {
    it('calls onChange when date is selected via input', async () => {
      const user = userEvent.setup();
      const onChange = jest.fn();
      render(<DatePicker {...defaultProps} onChange={onChange} />);
      
      await user.click(screen.getByRole('button'));
      
      const dateInput = screen.getByDisplayValue('');
      await user.type(dateInput, '2025-01-20');
      
      expect(onChange).toHaveBeenCalledWith('2025-01-20');
    });

    it('closes dropdown after date selection', async () => {
      const user = userEvent.setup();
      render(<DatePicker {...defaultProps} />);
      
      await user.click(screen.getByRole('button'));
      
      const dateInput = screen.getByDisplayValue('');
      await user.type(dateInput, '2025-01-20');
      
      await waitFor(() => {
        expect(screen.queryByText('Quick Select')).not.toBeInTheDocument();
      });
    });

    it('pre-fills date input with current value', async () => {
      const user = userEvent.setup();
      render(<DatePicker {...defaultProps} value="2025-01-20" />);
      
      await user.click(screen.getByRole('button'));
      
      const dateInput = screen.getByDisplayValue('2025-01-20');
      expect(dateInput).toBeInTheDocument();
    });
  });

  describe('Date Shortcuts', () => {
    it('renders all date shortcuts', async () => {
      const user = userEvent.setup();
      render(<DatePicker {...defaultProps} />);
      
      await user.click(screen.getByRole('button'));
      
      expect(screen.getByText('Today')).toBeInTheDocument();
      expect(screen.getByText('Tomorrow')).toBeInTheDocument();
      expect(screen.getByText('Next Week')).toBeInTheDocument();
      expect(screen.getByText('Next Month')).toBeInTheDocument();
    });

    it('selects today when Today shortcut is clicked', async () => {
      const user = userEvent.setup();
      const onChange = jest.fn();
      render(<DatePicker {...defaultProps} onChange={onChange} />);
      
      await user.click(screen.getByRole('button'));
      await user.click(screen.getByText('Today'));
      
      expect(onChange).toHaveBeenCalledWith('2025-01-15');
    });

    it('selects tomorrow when Tomorrow shortcut is clicked', async () => {
      const user = userEvent.setup();
      const onChange = jest.fn();
      render(<DatePicker {...defaultProps} onChange={onChange} />);
      
      await user.click(screen.getByRole('button'));
      await user.click(screen.getByText('Tomorrow'));
      
      expect(onChange).toHaveBeenCalledWith('2025-01-16');
    });

    it('selects next week when Next Week shortcut is clicked', async () => {
      const user = userEvent.setup();
      const onChange = jest.fn();
      render(<DatePicker {...defaultProps} onChange={onChange} />);
      
      await user.click(screen.getByRole('button'));
      await user.click(screen.getByText('Next Week'));
      
      expect(onChange).toHaveBeenCalledWith('2025-01-22');
    });

    it('selects next month when Next Month shortcut is clicked', async () => {
      const user = userEvent.setup();
      const onChange = jest.fn();
      render(<DatePicker {...defaultProps} onChange={onChange} />);
      
      await user.click(screen.getByRole('button'));
      await user.click(screen.getByText('Next Month'));
      
      expect(onChange).toHaveBeenCalledWith('2025-02-15');
    });

    it('hides shortcuts when showShortcuts is false', async () => {
      const user = userEvent.setup();
      render(<DatePicker {...defaultProps} showShortcuts={false} />);
      
      await user.click(screen.getByRole('button'));
      
      expect(screen.queryByText('Today')).not.toBeInTheDocument();
      expect(screen.queryByText('Quick Select')).not.toBeInTheDocument();
    });

    it('shows Clear Date button when value is present', async () => {
      const user = userEvent.setup();
      render(<DatePicker {...defaultProps} value="2025-01-20" />);
      
      await user.click(screen.getByRole('button'));
      
      expect(screen.getByText('Clear Date')).toBeInTheDocument();
    });

    it('does not show Clear Date button when value is empty', async () => {
      const user = userEvent.setup();
      render(<DatePicker {...defaultProps} />);
      
      await user.click(screen.getByRole('button'));
      
      expect(screen.queryByText('Clear Date')).not.toBeInTheDocument();
    });
  });

  describe('Clear Functionality', () => {
    it('clears date when clear button is clicked', async () => {
      const user = userEvent.setup();
      const onChange = jest.fn();
      render(<DatePicker {...defaultProps} value="2025-01-20" onChange={onChange} />);
      
      const clearButton = screen.getByRole('button', { name: /clear/i });
      await user.click(clearButton);
      
      expect(onChange).toHaveBeenCalledWith('');
    });

    it('clears date when Clear Date shortcut is clicked', async () => {
      const user = userEvent.setup();
      const onChange = jest.fn();
      render(<DatePicker {...defaultProps} value="2025-01-20" onChange={onChange} />);
      
      await user.click(screen.getByRole('button'));
      await user.click(screen.getByText('Clear Date'));
      
      expect(onChange).toHaveBeenCalledWith('');
    });

    it('closes dropdown when Clear Date shortcut is clicked', async () => {
      const user = userEvent.setup();
      render(<DatePicker {...defaultProps} value="2025-01-20" />);
      
      await user.click(screen.getByRole('button'));
      await user.click(screen.getByText('Clear Date'));
      
      await waitFor(() => {
        expect(screen.queryByText('Quick Select')).not.toBeInTheDocument();
      });
    });

    it('prevents event propagation when clear button is clicked', async () => {
      const user = userEvent.setup();
      const onChange = jest.fn();
      render(<DatePicker {...defaultProps} value="2025-01-20" onChange={onChange} />);
      
      // Click the clear button - this should not open the dropdown
      const clearButton = screen.getByRole('button', { name: /clear/i });
      await user.click(clearButton);
      
      expect(onChange).toHaveBeenCalledWith('');
      expect(screen.queryByText('Quick Select')).not.toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA attributes', () => {
      render(<DatePicker {...defaultProps} />);
      
      const button = screen.getByRole('button');
      expect(button).toBeInTheDocument();
    });

    it('supports keyboard navigation', async () => {
      const user = userEvent.setup();
      render(<DatePicker {...defaultProps} />);
      
      const button = screen.getByRole('button');
      await user.tab();
      
      expect(button).toHaveFocus();
    });

    it('opens dropdown with Enter key', async () => {
      const user = userEvent.setup();
      render(<DatePicker {...defaultProps} />);
      
      const button = screen.getByRole('button');
      await user.tab();
      await user.keyboard('{Enter}');
      
      expect(screen.getByText('Quick Select')).toBeInTheDocument();
    });

    it('opens dropdown with Space key', async () => {
      const user = userEvent.setup();
      render(<DatePicker {...defaultProps} />);
      
      const button = screen.getByRole('button');
      await user.tab();
      await user.keyboard(' ');
      
      expect(screen.getByText('Quick Select')).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('handles invalid date string gracefully', () => {
      render(<DatePicker {...defaultProps} value="invalid-date" />);
      
      // Should not crash and should show placeholder
      expect(screen.getByText('Select date...')).toBeInTheDocument();
    });

    it('handles empty value prop', () => {
      render(<DatePicker {...defaultProps} value="" />);
      
      expect(screen.getByText('Select date...')).toBeInTheDocument();
    });

    it('handles null value prop', () => {
      render(<DatePicker {...defaultProps} value={null as any} />);
      
      expect(screen.getByText('Select date...')).toBeInTheDocument();
    });

    it('handles undefined value prop', () => {
      render(<DatePicker {...defaultProps} value={undefined} />);
      
      expect(screen.getByText('Select date...')).toBeInTheDocument();
    });

    it('formats date correctly for different locales', () => {
      render(<DatePicker {...defaultProps} value="2025-12-25" />);
      
      expect(screen.getByText('Thu, Dec 25, 2025')).toBeInTheDocument();
    });
  });

  describe('Date Formatting', () => {
    it('formats display date correctly', () => {
      render(<DatePicker {...defaultProps} value="2025-01-01" />);
      
      expect(screen.getByText('Wed, Jan 1, 2025')).toBeInTheDocument();
    });

    it('formats input date correctly', async () => {
      const user = userEvent.setup();
      render(<DatePicker {...defaultProps} value="2025-01-01" />);
      
      await user.click(screen.getByRole('button'));
      
      const dateInput = screen.getByDisplayValue('2025-01-01');
      expect(dateInput).toBeInTheDocument();
    });

    it('updates display when value prop changes', () => {
      const { rerender } = render(<DatePicker {...defaultProps} value="2025-01-01" />);
      
      expect(screen.getByText('Wed, Jan 1, 2025')).toBeInTheDocument();
      
      rerender(<DatePicker {...defaultProps} value="2025-01-02" />);
      
      expect(screen.getByText('Thu, Jan 2, 2025')).toBeInTheDocument();
    });
  });

  describe('Performance', () => {
    it('cleans up event listeners on unmount', () => {
      const removeEventListenerSpy = jest.spyOn(document, 'removeEventListener');
      const { unmount } = render(<DatePicker {...defaultProps} />);
      
      unmount();
      
      expect(removeEventListenerSpy).toHaveBeenCalledWith('mousedown', expect.any(Function));
      
      removeEventListenerSpy.mockRestore();
    });

    it('does not re-render unnecessarily', () => {
      const onChange = jest.fn();
      const { rerender } = render(<DatePicker {...defaultProps} onChange={onChange} />);
      
      // Same props should not cause re-render
      rerender(<DatePicker {...defaultProps} onChange={onChange} />);
      
      expect(onChange).not.toHaveBeenCalled();
    });
  });

  describe('Date Selection', () => {
    it('does not call onChange when a past date is manually entered and minDate is not met', async () => {
      const user = userEvent.setup();
      const onChange = jest.fn();
      render(<DatePicker {...defaultProps} onChange={onChange} minDate="2025-01-15" />);

      await user.click(screen.getByRole('button'));

      const dateInput = screen.getByDisplayValue('');
      // Attempt to type a past date
      await user.type(dateInput, '2025-01-14');

      // The onChange should not be called with an invalid past date
      expect(onChange).not.toHaveBeenCalled();
      // Optionally, check if an error message is displayed or the input remains unchanged
      // This depends on the component's internal logic for invalid dates
    });
  });
}); 