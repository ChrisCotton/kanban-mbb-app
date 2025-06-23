import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import CategorySelector from './CategorySelector'

// Mock fetch globally
global.fetch = jest.fn()

const mockCategories = [
  {
    id: '1',
    name: 'Development',
    hourly_rate_usd: 85.0,
    created_at: '2023-01-01T00:00:00Z',
    updated_at: '2023-01-01T00:00:00Z'
  },
  {
    id: '2',
    name: 'Design',
    hourly_rate_usd: 75.0,
    created_at: '2023-01-01T00:00:00Z',
    updated_at: '2023-01-01T00:00:00Z'
  },
  {
    id: '3',
    name: 'Research',
    hourly_rate_usd: 65.0,
    created_at: '2023-01-01T00:00:00Z',
    updated_at: '2023-01-01T00:00:00Z'
  }
]

describe('CategorySelector', () => {
  beforeEach(() => {
    // Reset fetch mock before each test
    (fetch as jest.Mock).mockClear()
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  const mockOnChange = jest.fn()

  const renderCategorySelector = (props = {}) => {
    const defaultProps = {
      onChange: mockOnChange,
      ...props
    }
    return render(<CategorySelector {...defaultProps} />)
  }

  it('renders with default state', () => {
    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ success: true, data: mockCategories })
    })

    renderCategorySelector()
    
    expect(screen.getByRole('button')).toBeInTheDocument()
    expect(screen.getByText('No Category Selected')).toBeInTheDocument()
  })

  it('loads categories on mount', async () => {
    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ success: true, data: mockCategories })
    })

    renderCategorySelector()

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith('/api/categories')
    })
  })

  it('displays loading state', () => {
    (fetch as jest.Mock).mockImplementationOnce(() => new Promise(() => {})) // Never resolves

    renderCategorySelector()
    
    expect(screen.getByText('Loading categories...')).toBeInTheDocument()
  })

  it('opens dropdown when clicked', async () => {
    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ success: true, data: mockCategories })
    })

    renderCategorySelector()

    // Wait for categories to load
    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith('/api/categories')
    })

    const triggerButton = screen.getByRole('button')
    fireEvent.click(triggerButton)

    await waitFor(() => {
      expect(screen.getByText('Select Category')).toBeInTheDocument()
      expect(screen.getByText('Development')).toBeInTheDocument()
      expect(screen.getByText('Design')).toBeInTheDocument()
      expect(screen.getByText('Research')).toBeInTheDocument()
    })
  })

  it('displays hourly rates in dropdown', async () => {
    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ success: true, data: mockCategories })
    })

    renderCategorySelector()

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith('/api/categories')
    })

    const triggerButton = screen.getByRole('button')
    fireEvent.click(triggerButton)

    await waitFor(() => {
      expect(screen.getByText('$85.00')).toBeInTheDocument()
      expect(screen.getByText('$75.00')).toBeInTheDocument()
      expect(screen.getByText('$65.00')).toBeInTheDocument()
    })
  })

  it('calls onChange when category is selected', async () => {
    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ success: true, data: mockCategories })
    })

    renderCategorySelector()

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith('/api/categories')
    })

    const triggerButton = screen.getByRole('button')
    fireEvent.click(triggerButton)

    await waitFor(() => {
      expect(screen.getByText('Development')).toBeInTheDocument()
    })

    const developmentOption = screen.getByText('Development')
    fireEvent.click(developmentOption)

    expect(mockOnChange).toHaveBeenCalledWith('1')
  })

  it('displays selected category', async () => {
    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ success: true, data: mockCategories })
    })

    renderCategorySelector({ value: '1' })

    await waitFor(() => {
      expect(screen.getByText('Development')).toBeInTheDocument()
      expect(screen.getByText('$85.00 per hour')).toBeInTheDocument()
    })
  })

  it('allows selecting no category when allowNone is true', async () => {
    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ success: true, data: mockCategories })
    })

    renderCategorySelector({ allowNone: true })

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith('/api/categories')
    })

    const triggerButton = screen.getByRole('button')
    fireEvent.click(triggerButton)

    await waitFor(() => {
      expect(screen.getByText('No Category')).toBeInTheDocument()
    })

    const noCategoryOption = screen.getByText('No Category')
    fireEvent.click(noCategoryOption)

    expect(mockOnChange).toHaveBeenCalledWith(null)
  })

  it('renders in compact variant', () => {
    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ success: true, data: mockCategories })
    })

    renderCategorySelector({ variant: 'compact' })
    
    const button = screen.getByRole('button')
    expect(button).toHaveClass('inline-flex')
    expect(button).toHaveClass('rounded-full')
  })

  it('handles API errors gracefully', async () => {
    (fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'))

    renderCategorySelector()

    await waitFor(() => {
      expect(screen.getByText(/Error Loading Categories/)).toBeInTheDocument()
      expect(screen.getByText('Network error')).toBeInTheDocument()
    })
  })

  it('displays empty state when no categories exist', async () => {
    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ success: true, data: [] })
    })

    renderCategorySelector()

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith('/api/categories')
    })

    const triggerButton = screen.getByRole('button')
    fireEvent.click(triggerButton)

    await waitFor(() => {
      expect(screen.getByText('No Categories Available')).toBeInTheDocument()
      expect(screen.getByText(/Create some categories first/)).toBeInTheDocument()
    })
  })

  it('is disabled when disabled prop is true', () => {
    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ success: true, data: mockCategories })
    })

    renderCategorySelector({ disabled: true })
    
    const button = screen.getByRole('button')
    expect(button).toBeDisabled()
    expect(button).toHaveClass('opacity-50')
    expect(button).toHaveClass('cursor-not-allowed')
  })

  it('displays error message when provided', () => {
    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ success: true, data: mockCategories })
    })

    const errorMessage = 'Category is required'
    renderCategorySelector({ error: errorMessage })
    
    expect(screen.getByText(errorMessage)).toBeInTheDocument()
    expect(screen.getByText(errorMessage)).toHaveClass('text-red-600')
  })
}) 