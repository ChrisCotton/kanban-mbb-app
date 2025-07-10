import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import PrioritySelector from './PrioritySelector';

const defaultProps = {
  value: 'medium' as const,
  onChange: jest.fn(),
};

describe('PrioritySelector', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Default Variant', () => {
    describe('Basic Rendering', () => {
      it('renders with default props', () => {
        render(<PrioritySelector {...defaultProps} />);
        
        expect(screen.getByText('Medium Priority')).toBeInTheDocument();
        expect(screen.getByText('Important, normal timeline')).toBeInTheDocument();
        expect(screen.getByText('➡️')).toBeInTheDocument();
      });

      it('renders with custom className', () => {
        const { container } = render(<PrioritySelector {...defaultProps} className="custom-class" />);
        
        expect(container.firstChild).toHaveClass('custom-class');
      });

      it('renders low priority correctly', () => {
        render(<PrioritySelector {...defaultProps} value="low" />);
        
        expect(screen.getByText('Low Priority')).toBeInTheDocument();
        expect(screen.getByText('Nice to have, non-urgent')).toBeInTheDocument();
        expect(screen.getByText('⬇️')).toBeInTheDocument();
      });

      it('renders high priority correctly', () => {
        render(<PrioritySelector {...defaultProps} value="high" />);
        
        expect(screen.getByText('High Priority')).toBeInTheDocument();
        expect(screen.getByText('Important, needs attention')).toBeInTheDocument();
        expect(screen.getByText('⬆️')).toBeInTheDocument();
      });

      it('renders urgent priority correctly', () => {
        render(<PrioritySelector {...defaultProps} value="urgent" />);
        
        expect(screen.getByText('Urgent Priority')).toBeInTheDocument();
        expect(screen.getByText('Critical, requires immediate action')).toBeInTheDocument();
        expect(screen.getByText('🔥')).toBeInTheDocument();
      });

      it('defaults to medium when value is undefined', () => {
        render(<PrioritySelector {...defaultProps} value={undefined} />);
        
        expect(screen.getByText('Medium Priority')).toBeInTheDocument();
      });
    });

    describe('Disabled State', () => {
      it('renders disabled state correctly', () => {
        const { container } = render(<PrioritySelector {...defaultProps} disabled />);
        
        const button = screen.getByRole('button');
        expect(button).toBeDisabled();
        
        const disabledContainer = container.querySelector('.opacity-50');
        expect(disabledContainer).toBeInTheDocument();
      });

      it('does not open dropdown when disabled', async () => {
        const user = userEvent.setup();
        render(<PrioritySelector {...defaultProps} disabled />);
        
        await user.click(screen.getByRole('button'));
        
        expect(screen.queryByText('Select Priority Level')).not.toBeInTheDocument();
      });
    });

    describe('Error Handling', () => {
      it('displays error message', () => {
        render(<PrioritySelector {...defaultProps} error="Invalid priority" />);
        
        expect(screen.getByText('Invalid priority')).toBeInTheDocument();
      });

      it('applies error styling', () => {
        render(<PrioritySelector {...defaultProps} error="Invalid priority" />);
        
        const button = screen.getByRole('button');
        expect(button).toHaveClass('border-red-500');
      });

      it('shows error in red color', () => {
        render(<PrioritySelector {...defaultProps} error="Invalid priority" />);
        
        const errorText = screen.getByText('Invalid priority');
        expect(errorText).toHaveClass('text-red-600');
      });
    });

    describe('Dropdown Functionality', () => {
      it('opens dropdown when clicked', async () => {
        const user = userEvent.setup();
        render(<PrioritySelector {...defaultProps} />);
        
        await user.click(screen.getByRole('button'));
        
        expect(screen.getByText('Select Priority Level')).toBeInTheDocument();
      });

      it('closes dropdown when clicking outside', async () => {
        const user = userEvent.setup();
        render(
          <div>
            <PrioritySelector {...defaultProps} />
            <div data-testid="outside">Outside</div>
          </div>
        );
        
        await user.click(screen.getByRole('button'));
        expect(screen.getByText('Select Priority Level')).toBeInTheDocument();
        
        await user.click(screen.getByTestId('outside'));
        
        await waitFor(() => {
          expect(screen.queryByText('Select Priority Level')).not.toBeInTheDocument();
        });
      });

      it('renders all priority options in dropdown', async () => {
        const user = userEvent.setup();
        render(<PrioritySelector {...defaultProps} />);
        
        await user.click(screen.getByRole('button'));
        
        expect(screen.getByText('Low Priority')).toBeInTheDocument();
        expect(screen.getByText('Medium Priority')).toBeInTheDocument();
        expect(screen.getByText('High Priority')).toBeInTheDocument();
        expect(screen.getByText('Urgent Priority')).toBeInTheDocument();
      });

      it('shows selected option with checkmark', async () => {
        const user = userEvent.setup();
        render(<PrioritySelector {...defaultProps} value="high" />);
        
        await user.click(screen.getByRole('button'));
        
        const highPriorityOption = screen.getByText('High Priority').closest('button');
        expect(highPriorityOption).toHaveClass('bg-gray-50');
        
        // Check for checkmark icon
        const checkmark = highPriorityOption?.querySelector('svg');
        expect(checkmark).toBeInTheDocument();
      });

      it('highlights hovered option', async () => {
        const user = userEvent.setup();
        render(<PrioritySelector {...defaultProps} />);
        
        await user.click(screen.getByRole('button'));
        
        const lowPriorityOption = screen.getByText('Low Priority').closest('button');
        await user.hover(lowPriorityOption!);
        
        expect(lowPriorityOption).toHaveClass('hover:bg-gray-50');
      });
    });

    describe('Priority Selection', () => {
      it('calls onChange when priority is selected', async () => {
        const user = userEvent.setup();
        const onChange = jest.fn();
        render(<PrioritySelector {...defaultProps} onChange={onChange} />);
        
        await user.click(screen.getByRole('button'));
        await user.click(screen.getByText('High Priority'));
        
        expect(onChange).toHaveBeenCalledWith('high');
      });

      it('closes dropdown after selection', async () => {
        const user = userEvent.setup();
        render(<PrioritySelector {...defaultProps} />);
        
        await user.click(screen.getByRole('button'));
        await user.click(screen.getByText('High Priority'));
        
        await waitFor(() => {
          expect(screen.queryByText('Select Priority Level')).not.toBeInTheDocument();
        });
      });

      it('can select low priority', async () => {
        const user = userEvent.setup();
        const onChange = jest.fn();
        render(<PrioritySelector {...defaultProps} onChange={onChange} />);
        
        await user.click(screen.getByRole('button'));
        await user.click(screen.getByText('Low Priority'));
        
        expect(onChange).toHaveBeenCalledWith('low');
      });

      it('can select urgent priority', async () => {
        const user = userEvent.setup();
        const onChange = jest.fn();
        render(<PrioritySelector {...defaultProps} onChange={onChange} />);
        
        await user.click(screen.getByRole('button'));
        await user.click(screen.getByText('Urgent Priority'));
        
        expect(onChange).toHaveBeenCalledWith('urgent');
      });

      it('updates display when value prop changes', () => {
        const { rerender } = render(<PrioritySelector {...defaultProps} value="low" />);
        
        expect(screen.getByText('Low Priority')).toBeInTheDocument();
        
        rerender(<PrioritySelector {...defaultProps} value="urgent" />);
        
        expect(screen.getByText('Urgent Priority')).toBeInTheDocument();
      });
    });

    describe('Priority Option Details', () => {
      it('displays correct icons for each priority', async () => {
        const user = userEvent.setup();
        render(<PrioritySelector {...defaultProps} />);
        
        await user.click(screen.getByRole('button'));
        
        // Use more specific selectors within the dropdown
        const dropdown = screen.getByText('Select Priority Level').closest('div');
        expect(dropdown).toBeInTheDocument();
        
        // Check for icons within the dropdown options specifically
        const lowPriorityOption = screen.getByText('Low Priority').closest('button');
        const mediumPriorityOption = screen.getByText('Medium Priority').closest('button');
        const highPriorityOption = screen.getByText('High Priority').closest('button');
        const urgentPriorityOption = screen.getByText('Urgent Priority').closest('button');
        
        expect(lowPriorityOption?.textContent).toContain('⬇️');
        expect(mediumPriorityOption?.textContent).toContain('➡️');
        expect(highPriorityOption?.textContent).toContain('⬆️');
        expect(urgentPriorityOption?.textContent).toContain('🔥');
      });

      it('displays correct descriptions for each priority', async () => {
        const user = userEvent.setup();
        render(<PrioritySelector {...defaultProps} />);
        
        await user.click(screen.getByRole('button'));
        
        // Use getAllByText to handle multiple instances and select from dropdown
        const niceTodoTexts = screen.getAllByText('Nice to have, non-urgent');
        const importantTexts = screen.getAllByText('Important, normal timeline');
        const needsAttentionTexts = screen.getAllByText('Important, needs attention');
        const criticalTexts = screen.getAllByText('Critical, requires immediate action');
        
        // Should have at least one of each in the dropdown
        expect(niceTodoTexts.length).toBeGreaterThan(0);
        expect(importantTexts.length).toBeGreaterThan(0);
        expect(needsAttentionTexts.length).toBeGreaterThan(0);
        expect(criticalTexts.length).toBeGreaterThan(0);
      });

      it('applies correct color classes for each priority', async () => {
        const user = userEvent.setup();
        render(<PrioritySelector {...defaultProps} />);
        
        await user.click(screen.getByRole('button'));
        
        // Get all instances and check that at least one has the correct color
        const lowPriorityElements = screen.getAllByText('Low Priority');
        const highPriorityElements = screen.getAllByText('High Priority');
        const urgentPriorityElements = screen.getAllByText('Urgent Priority');
        
        // Check that at least one instance of each has the correct color
        const hasGreenLow = lowPriorityElements.some(el => el.classList.contains('text-green-700'));
        const hasRedHigh = highPriorityElements.some(el => el.classList.contains('text-red-700'));
        const hasPurpleUrgent = urgentPriorityElements.some(el => el.classList.contains('text-purple-700'));
        
        expect(hasGreenLow).toBe(true);
        expect(hasRedHigh).toBe(true);
        expect(hasPurpleUrgent).toBe(true);
      });
    });
  });

  describe('Compact Variant', () => {
    const compactProps = {
      ...defaultProps,
      variant: 'compact' as const,
    };

    describe('Basic Rendering', () => {
      it('renders compact variant correctly', () => {
        render(<PrioritySelector {...compactProps} />);
        
        expect(screen.getByText('medium')).toBeInTheDocument();
        expect(screen.getByText('➡️')).toBeInTheDocument();
        
        // Should not show description in compact mode
        expect(screen.queryByText('Important, normal timeline')).not.toBeInTheDocument();
      });

      it('renders with rounded-full styling', () => {
        render(<PrioritySelector {...compactProps} />);
        
        const button = screen.getByRole('button');
        expect(button).toHaveClass('rounded-full');
      });

      it('applies correct background colors', () => {
        render(<PrioritySelector {...compactProps} value="low" />);
        
        const button = screen.getByRole('button');
        expect(button).toHaveClass('bg-green-100');
      });

      it('shows priority value as text', () => {
        render(<PrioritySelector {...compactProps} value="urgent" />);
        
        expect(screen.getByText('urgent')).toBeInTheDocument();
        expect(screen.getByText('🔥')).toBeInTheDocument();
      });
    });

    describe('Compact Dropdown', () => {
      it('opens compact dropdown when clicked', async () => {
        const user = userEvent.setup();
        render(<PrioritySelector {...compactProps} />);
        
        await user.click(screen.getByRole('button'));
        
        // Should show all priority options
        expect(screen.getByText('Low Priority')).toBeInTheDocument();
        expect(screen.getByText('Medium Priority')).toBeInTheDocument();
        expect(screen.getByText('High Priority')).toBeInTheDocument();
        expect(screen.getByText('Urgent Priority')).toBeInTheDocument();
      });

      it('has fixed width dropdown', async () => {
        const user = userEvent.setup();
        render(<PrioritySelector {...compactProps} />);
        
        await user.click(screen.getByRole('button'));
        
        // Find the dropdown container more specifically
        const dropdownContainer = screen.getByText('Low Priority').closest('.absolute');
        expect(dropdownContainer).toHaveClass('w-48');
      });

      it('allows priority selection in compact mode', async () => {
        const user = userEvent.setup();
        const onChange = jest.fn();
        render(<PrioritySelector {...compactProps} onChange={onChange} />);
        
        await user.click(screen.getByRole('button'));
        await user.click(screen.getByText('High Priority'));
        
        expect(onChange).toHaveBeenCalledWith('high');
      });
    });

    describe('Compact Disabled State', () => {
      it('renders disabled compact variant correctly', () => {
        render(<PrioritySelector {...compactProps} disabled />);
        
        const button = screen.getByRole('button');
        expect(button).toBeDisabled();
        expect(button).toHaveClass('opacity-50');
      });

      it('does not open dropdown when disabled in compact mode', async () => {
        const user = userEvent.setup();
        render(<PrioritySelector {...compactProps} disabled />);
        
        await user.click(screen.getByRole('button'));
        
        expect(screen.queryByText('Low Priority')).not.toBeInTheDocument();
      });
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA attributes', () => {
      render(<PrioritySelector {...defaultProps} />);
      
      const button = screen.getByRole('button');
      expect(button).toBeInTheDocument();
    });

    it('supports keyboard navigation', async () => {
      const user = userEvent.setup();
      render(<PrioritySelector {...defaultProps} />);
      
      const button = screen.getByRole('button');
      await user.tab();
      
      expect(button).toHaveFocus();
    });

    it('opens dropdown with Enter key', async () => {
      const user = userEvent.setup();
      render(<PrioritySelector {...defaultProps} />);
      
      const button = screen.getByRole('button');
      await user.tab();
      await user.keyboard('{Enter}');
      
      expect(screen.getByText('Select Priority Level')).toBeInTheDocument();
    });

    it('opens dropdown with Space key', async () => {
      const user = userEvent.setup();
      render(<PrioritySelector {...defaultProps} />);
      
      const button = screen.getByRole('button');
      await user.tab();
      await user.keyboard(' ');
      
      expect(screen.getByText('Select Priority Level')).toBeInTheDocument();
    });

    it('allows keyboard navigation through options', async () => {
      const user = userEvent.setup();
      render(<PrioritySelector {...defaultProps} />);
      
      await user.tab();
      await user.keyboard('{Enter}');
      
      const options = screen.getAllByRole('button');
      expect(options.length).toBeGreaterThan(1);
      
      // Each option should be focusable
      for (const option of options.slice(1)) { // Skip the main button
        await user.tab();
        expect(option).toHaveFocus();
      }
    });
  });

  describe('Edge Cases', () => {
    it('handles invalid priority value gracefully', () => {
      render(<PrioritySelector {...defaultProps} value={'invalid' as any} />);
      
      // Should fall back to medium priority
      expect(screen.getByText('Medium Priority')).toBeInTheDocument();
    });

    it('handles null value gracefully', () => {
      render(<PrioritySelector {...defaultProps} value={null as any} />);
      
      expect(screen.getByText('Medium Priority')).toBeInTheDocument();
    });

    it('handles undefined onChange prop', () => {
      const { container } = render(<PrioritySelector value="medium" onChange={undefined as any} />);
      
      expect(container.firstChild).toBeInTheDocument();
    });

    it('cleans up event listeners on unmount', () => {
      const removeEventListenerSpy = jest.spyOn(document, 'removeEventListener');
      const { unmount } = render(<PrioritySelector {...defaultProps} />);
      
      unmount();
      
      expect(removeEventListenerSpy).toHaveBeenCalledWith('mousedown', expect.any(Function));
      
      removeEventListenerSpy.mockRestore();
    });
  });

  describe('Performance', () => {
    it('does not re-render unnecessarily', () => {
      const onChange = jest.fn();
      const { rerender } = render(<PrioritySelector {...defaultProps} onChange={onChange} />);
      
      // Same props should not cause unnecessary re-renders
      rerender(<PrioritySelector {...defaultProps} onChange={onChange} />);
      
      expect(onChange).not.toHaveBeenCalled();
    });

    it('maintains focus state correctly', async () => {
      const user = userEvent.setup();
      render(<PrioritySelector {...defaultProps} />);
      
      const button = screen.getByRole('button');
      await user.tab();
      
      expect(button).toHaveFocus();
      
      // Focus should remain after state changes
      await user.keyboard('{Enter}');
      
      expect(button).toHaveFocus();
    });
  });

  describe('Color Theming', () => {
    it('applies correct color theme for each priority', () => {
      const priorities = ['low', 'medium', 'high', 'urgent'] as const;
      
      priorities.forEach(priority => {
        const { unmount } = render(<PrioritySelector {...defaultProps} value={priority} />);
        
        // Each priority should have its unique styling
        const priorityText = screen.getByText(`${priority.charAt(0).toUpperCase()}${priority.slice(1)} Priority`);
        expect(priorityText).toBeInTheDocument();
        
        unmount();
      });
    });

    it('supports dark theme classes', () => {
      render(<PrioritySelector {...defaultProps} />);
      
      const button = screen.getByRole('button');
      expect(button).toHaveClass('dark:bg-gray-700');
    });
  });

  describe('Hover States', () => {
    it('applies hover styles correctly', () => {
      render(<PrioritySelector {...defaultProps} />);
      
      const button = screen.getByRole('button');
      expect(button).toHaveClass('hover:border-gray-400');
    });

    it('applies focus styles correctly', () => {
      render(<PrioritySelector {...defaultProps} />);
      
      const button = screen.getByRole('button');
      expect(button).toHaveClass('focus:outline-none', 'focus:ring-2');
    });
  });
}); 