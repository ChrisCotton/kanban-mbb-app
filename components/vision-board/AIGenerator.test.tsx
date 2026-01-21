import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import AIGenerator from './AIGenerator'

// Mock react-datepicker
jest.mock('react-datepicker', () => {
  return function MockDatePicker({ selected, onChange, ...props }: any) {
    return (
      <input
        type="text"
        data-testid="date-picker"
        value={selected ? selected.toISOString().split('T')[0] : ''}
        onChange={(e) => {
          if (onChange) {
            onChange(new Date(e.target.value))
          }
        }}
        {...props}
      />
    )
  }
})

// Mock fetch
global.fetch = jest.fn()

describe('AIGenerator', () => {
  const defaultProps = {
    userId: 'user-123',
    aiProvider: 'nano_banana',
    onGenerationComplete: jest.fn(),
    onGenerationError: jest.fn()
  }

  beforeEach(() => {
    jest.clearAllMocks()
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        data: {
          id: 'generated-id',
          file_path: 'https://example.com/generated.jpg'
        }
      })
    })
  })

  it('renders all form fields', () => {
    render(<AIGenerator {...defaultProps} />)
    
    expect(screen.getByLabelText(/prompt/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/goal/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/due date/i)).toBeInTheDocument()
    expect(screen.getByText(/media type/i)).toBeInTheDocument()
  })

  it('shows required indicators on goal and due date fields', () => {
    render(<AIGenerator {...defaultProps} />)
    
    const goalLabel = screen.getByLabelText(/goal/i)
    const dueDateLabel = screen.getByLabelText(/due date/i)
    
    expect(goalLabel.closest('label')).toHaveTextContent('*')
    expect(dueDateLabel.closest('label')).toHaveTextContent('*')
  })

  it('renders interval dropdown with all options', () => {
    render(<AIGenerator {...defaultProps} />)
    
    const dropdown = screen.getByRole('combobox')
    expect(dropdown).toBeInTheDocument()
    
    // Check that interval options are present
    expect(screen.getByText('Today')).toBeInTheDocument()
    expect(screen.getByText('Tomorrow')).toBeInTheDocument()
    expect(screen.getByText('Next Week')).toBeInTheDocument()
    expect(screen.getByText('One Month')).toBeInTheDocument()
    expect(screen.getByText('Custom Date')).toBeInTheDocument()
  })

  it('defaults to one_month interval', () => {
    render(<AIGenerator {...defaultProps} />)
    
    const dropdown = screen.getByRole('combobox') as HTMLSelectElement
    expect(dropdown.value).toBe('one_month')
  })

  it('shows calendar when Custom Date is selected', () => {
    render(<AIGenerator {...defaultProps} />)
    
    const dropdown = screen.getByRole('combobox')
    fireEvent.change(dropdown, { target: { value: 'custom' } })
    
    expect(screen.getByTestId('date-picker')).toBeInTheDocument()
  })

  it('hides calendar when interval is selected', () => {
    render(<AIGenerator {...defaultProps} />)
    
    const dropdown = screen.getByRole('combobox')
    fireEvent.change(dropdown, { target: { value: 'custom' } })
    expect(screen.getByTestId('date-picker')).toBeInTheDocument()
    
    fireEvent.change(dropdown, { target: { value: 'one_month' } })
    expect(screen.queryByTestId('date-picker')).not.toBeInTheDocument()
  })

  it('shows validation error if goal is empty on submit', async () => {
    render(<AIGenerator {...defaultProps} />)
    
    const promptInput = screen.getByLabelText(/prompt/i)
    const submitButton = screen.getByRole('button', { name: /generate/i })
    
    fireEvent.change(promptInput, { target: { value: 'Test prompt' } })
    fireEvent.click(submitButton)
    
    await waitFor(() => {
      expect(screen.getByText(/goal is required/i)).toBeInTheDocument()
    })
  })

  it('shows validation error if prompt is empty on submit', async () => {
    render(<AIGenerator {...defaultProps} />)
    
    const goalInput = screen.getByLabelText(/goal/i)
    const submitButton = screen.getByRole('button', { name: /generate/i })
    
    fireEvent.change(goalInput, { target: { value: 'Test goal' } })
    fireEvent.click(submitButton)
    
    await waitFor(() => {
      expect(screen.getByText(/prompt is required/i)).toBeInTheDocument()
    })
  })

  it('shows validation error if custom date is not selected when custom interval is chosen', async () => {
    render(<AIGenerator {...defaultProps} />)
    
    const dropdown = screen.getByRole('combobox')
    fireEvent.change(dropdown, { target: { value: 'custom' } })
    
    const promptInput = screen.getByLabelText(/prompt/i)
    const goalInput = screen.getByLabelText(/goal/i)
    const submitButton = screen.getByRole('button', { name: /generate/i })
    
    fireEvent.change(promptInput, { target: { value: 'Test prompt' } })
    fireEvent.change(goalInput, { target: { value: 'Test goal' } })
    fireEvent.click(submitButton)
    
    await waitFor(() => {
      expect(screen.getByText(/please select a custom date/i)).toBeInTheDocument()
    })
  })

  it('disables submit button when form is invalid', async () => {
    render(<AIGenerator {...defaultProps} />)
    
    const submitButton = screen.getByRole('button', { name: /generate image/i })
    
    // Initially disabled because goal is empty
    expect(submitButton).toBeDisabled()
  })

  it('calls API with correct data on successful submission', async () => {
    render(<AIGenerator {...defaultProps} />)
    
    const promptInput = screen.getByLabelText(/prompt/i)
    const goalInput = screen.getByLabelText(/goal/i)
    const submitButton = screen.getByRole('button', { name: /generate image/i })
    
    fireEvent.change(promptInput, { target: { value: 'A beautiful sunset' } })
    fireEvent.change(goalInput, { target: { value: 'Visit the mountains' } })
    
    // Wait for form to be valid
    await waitFor(() => {
      expect(submitButton).not.toBeDisabled()
    })
    
    fireEvent.click(submitButton)
    
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/vision-board/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: expect.stringContaining('"prompt":"A beautiful sunset"')
      })
    })
  })

  it('includes due_date in correct format (YYYY-MM-DD)', async () => {
    render(<AIGenerator {...defaultProps} />)
    
    const promptInput = screen.getByLabelText(/prompt/i)
    const goalInput = screen.getByLabelText(/goal/i)
    const submitButton = screen.getByRole('button', { name: /generate image/i })
    
    fireEvent.change(promptInput, { target: { value: 'Test prompt' } })
    fireEvent.change(goalInput, { target: { value: 'Test goal' } })
    
    await waitFor(() => {
      expect(submitButton).not.toBeDisabled()
    })
    
    fireEvent.click(submitButton)
    
    await waitFor(() => {
      const callArgs = (global.fetch as jest.Mock).mock.calls[0]
      const body = JSON.parse(callArgs[1].body)
      
      // Check due_date is in YYYY-MM-DD format
      expect(body.due_date).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    })
  })

  it('shows loading state during generation', async () => {
    ;(global.fetch as jest.Mock).mockImplementation(() => 
      new Promise(resolve => setTimeout(() => resolve({
        ok: true,
        json: async () => ({ success: true, data: { id: 'test', file_path: 'test.jpg' } })
      }), 100))
    )

    render(<AIGenerator {...defaultProps} />)
    
    const promptInput = screen.getByLabelText(/prompt/i)
    const goalInput = screen.getByLabelText(/goal/i)
    const submitButton = screen.getByRole('button', { name: /generate image/i })
    
    fireEvent.change(promptInput, { target: { value: 'Test prompt' } })
    fireEvent.change(goalInput, { target: { value: 'Test goal' } })
    
    await waitFor(() => {
      expect(submitButton).not.toBeDisabled()
    })
    
    fireEvent.click(submitButton)
    
    expect(screen.getByText(/generating/i)).toBeInTheDocument()
    expect(submitButton).toBeDisabled()
  })

  it('calls onGenerationComplete on success', async () => {
    render(<AIGenerator {...defaultProps} />)
    
    const promptInput = screen.getByLabelText(/prompt/i)
    const goalInput = screen.getByLabelText(/goal/i)
    const submitButton = screen.getByRole('button', { name: /generate image/i })
    
    fireEvent.change(promptInput, { target: { value: 'Test prompt' } })
    fireEvent.change(goalInput, { target: { value: 'Test goal' } })
    
    await waitFor(() => {
      expect(submitButton).not.toBeDisabled()
    })
    
    fireEvent.click(submitButton)
    
    await waitFor(() => {
      expect(defaultProps.onGenerationComplete).toHaveBeenCalledWith(
        'generated-id',
        'https://example.com/generated.jpg'
      )
    })
  })

  it('calls onGenerationError on API error', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      json: async () => ({
        success: false,
        error: 'Generation failed'
      })
    })

    render(<AIGenerator {...defaultProps} />)
    
    const promptInput = screen.getByLabelText(/prompt/i)
    const goalInput = screen.getByLabelText(/goal/i)
    const submitButton = screen.getByRole('button', { name: /generate image/i })
    
    fireEvent.change(promptInput, { target: { value: 'Test prompt' } })
    fireEvent.change(goalInput, { target: { value: 'Test goal' } })
    
    await waitFor(() => {
      expect(submitButton).not.toBeDisabled()
    })
    
    fireEvent.click(submitButton)
    
    await waitFor(() => {
      expect(defaultProps.onGenerationError).toHaveBeenCalled()
    })
  })

  it('displays AI provider information', () => {
    render(<AIGenerator {...defaultProps} aiProvider="veo_3" />)
    
    expect(screen.getByText(/using: google veo 3/i)).toBeInTheDocument()
  })

  it('resets form after successful generation', async () => {
    render(<AIGenerator {...defaultProps} />)
    
    const promptInput = screen.getByLabelText(/prompt/i) as HTMLTextAreaElement
    const goalInput = screen.getByLabelText(/goal/i) as HTMLInputElement
    const submitButton = screen.getByRole('button', { name: /generate image/i })
    
    fireEvent.change(promptInput, { target: { value: 'Test prompt' } })
    fireEvent.change(goalInput, { target: { value: 'Test goal' } })
    
    await waitFor(() => {
      expect(submitButton).not.toBeDisabled()
    })
    
    fireEvent.click(submitButton)
    
    await waitFor(() => {
      expect(promptInput.value).toBe('')
      expect(goalInput.value).toBe('')
    })
  })

  it('shows character count for goal field', () => {
    render(<AIGenerator {...defaultProps} />)
    
    const goalInput = screen.getByLabelText(/goal/i)
    fireEvent.change(goalInput, { target: { value: 'Test goal' } })
    
    expect(screen.getByText(/10\/500 characters/i)).toBeInTheDocument()
  })

  it('shows validation error if goal exceeds 500 characters', async () => {
    render(<AIGenerator {...defaultProps} />)
    
    const promptInput = screen.getByLabelText(/prompt/i)
    const goalInput = screen.getByLabelText(/goal/i)
    const submitButton = screen.getByRole('button', { name: /generate image/i })
    
    fireEvent.change(promptInput, { target: { value: 'Test prompt' } })
    fireEvent.change(goalInput, { target: { value: 'a'.repeat(501) } })
    
    await waitFor(() => {
      fireEvent.click(submitButton)
    })
    
    await waitFor(() => {
      expect(screen.getByText(/goal must be 500 characters or less/i)).toBeInTheDocument()
    })
  })

  it('defaults media type to image', () => {
    render(<AIGenerator {...defaultProps} />)
    
    const imageRadio = screen.getByLabelText(/image/i) as HTMLInputElement
    expect(imageRadio.checked).toBe(true)
  })

  it('allows switching between image and video', () => {
    render(<AIGenerator {...defaultProps} />)
    
    const videoRadio = screen.getByLabelText(/video/i) as HTMLInputElement
    fireEvent.click(videoRadio)
    
    expect(videoRadio.checked).toBe(true)
    expect(screen.getByRole('button', { name: /generate video/i})).toBeInTheDocument()
  })
})
