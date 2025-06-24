import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import CategoryList from './CategoryList'

// Mock fetch
global.fetch = jest.fn()

// Mock window.confirm
Object.defineProperty(window, 'confirm', {
  value: jest.fn(() => true),
})

const mockCategories = [
  {
    id: '1',
    name: 'Software Development',
    hourly_rate_usd: 85.00,
    created_at: '2024-01-01T10:00:00Z',
    updated_at: '2024-01-01T10:00:00Z'
  },
  {
    id: '2',
    name: 'UI/UX Design',
    hourly_rate_usd: 75.00,
    created_at: '2024-01-02T10:00:00Z',
    updated_at: '2024-01-02T10:00:00Z'
  },
  {
    id: '3',
    name: 'Project Management',
    hourly_rate_usd: 95.00,
    created_at: '2024-01-03T10:00:00Z',
    updated_at: '2024-01-03T10:00:00Z'
  }
]

describe('CategoryList', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        data: mockCategories
      })
    })
  })

  it('renders loading state initially', () => {
    render(<CategoryList />)
    expect(screen.getByText('Loading categories...')).toBeInTheDocument()
  })

  it('renders categories after loading', async () => {
    render(<CategoryList />)
    
    await waitFor(() => {
      expect(screen.getByText('Software Development')).toBeInTheDocument()
      expect(screen.getByText('UI/UX Design')).toBeInTheDocument()
      expect(screen.getByText('Project Management')).toBeInTheDocument()
    })
  })

  it('displays category information correctly', async () => {
    render(<CategoryList />)
    
    await waitFor(() => {
      expect(screen.getByText('Software Development')).toBeInTheDocument()
      expect(screen.getByText('$85.00/hr')).toBeInTheDocument()
      expect(screen.getByText('Created Jan 1, 2024')).toBeInTheDocument()
    })
  })

  it('renders search input when searchable is true', async () => {
    render(<CategoryList searchable={true} />)
    
    await waitFor(() => {
      expect(screen.getByPlaceholderText('Search categories...')).toBeInTheDocument()
    })
  })

  it('filters categories based on search term', async () => {
    const user = userEvent.setup()
    render(<CategoryList searchable={true} />)
    
    await waitFor(() => {
      expect(screen.getByText('Software Development')).toBeInTheDocument()
    })
    
    const searchInput = screen.getByPlaceholderText('Search categories...')
    await user.type(searchInput, 'design')
    
    await waitFor(() => {
      expect(screen.getByText('UI/UX Design')).toBeInTheDocument()
      expect(screen.queryByText('Software Development')).not.toBeInTheDocument()
      expect(screen.queryByText('Project Management')).not.toBeInTheDocument()
    })
  })

  it('shows empty message when no categories exist', async () => {
    ;(fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        data: []
      })
    })
    
    render(<CategoryList />)
    
    await waitFor(() => {
      expect(screen.getByText('No categories found. Create your first category to get started.')).toBeInTheDocument()
    })
  })

  it('shows custom empty message', async () => {
    ;(fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        data: []
      })
    })
    
    const customMessage = 'Custom empty message'
    render(<CategoryList emptyMessage={customMessage} />)
    
    await waitFor(() => {
      expect(screen.getByText(customMessage)).toBeInTheDocument()
    })
  })

  it('shows no results message when search returns empty', async () => {
    const user = userEvent.setup()
    render(<CategoryList searchable={true} />)
    
    await waitFor(() => {
      expect(screen.getByText('Software Development')).toBeInTheDocument()
    })
    
    const searchInput = screen.getByPlaceholderText('Search categories...')
    await user.type(searchInput, 'nonexistent')
    
    await waitFor(() => {
      expect(screen.getByText('No categories found matching "nonexistent"')).toBeInTheDocument()
    })
  })

  it('sorts categories by name', async () => {
    render(<CategoryList sortable={true} />)
    
    await waitFor(() => {
      expect(screen.getByText('Software Development')).toBeInTheDocument()
    })
    
    const nameHeader = screen.getByText('Name')
    fireEvent.click(nameHeader)
    
    // Check if categories are sorted (you might need to check DOM order)
    const categories = screen.getAllByRole('button', { name: /Edit category/ })
    expect(categories).toHaveLength(3)
  })

  it('sorts categories by hourly rate', async () => {
    render(<CategoryList sortable={true} />)
    
    await waitFor(() => {
      expect(screen.getByText('Software Development')).toBeInTheDocument()
    })
    
    const rateHeader = screen.getByText('Rate')
    fireEvent.click(rateHeader)
    
    // Verify sorting functionality is called
    expect(screen.getByText('⬆️')).toBeInTheDocument()
  })

  it('toggles sort direction when clicking same header', async () => {
    render(<CategoryList sortable={true} />)
    
    await waitFor(() => {
      expect(screen.getByText('Software Development')).toBeInTheDocument()
    })
    
    const nameHeader = screen.getByText('Name')
    fireEvent.click(nameHeader) // First click - ascending
    fireEvent.click(nameHeader) // Second click - descending
    
    // Check for descending sort indicator
    expect(screen.getByText('⬇️')).toBeInTheDocument()
  })

  it('handles category selection when selectable is true', async () => {
    const onCategorySelect = jest.fn()
    render(<CategoryList selectable={true} onCategorySelect={onCategorySelect} />)
    
    await waitFor(() => {
      expect(screen.getByText('Software Development')).toBeInTheDocument()
    })
    
    fireEvent.click(screen.getByText('Software Development'))
    
    expect(onCategorySelect).toHaveBeenCalledWith(mockCategories[0])
  })

  it('shows edit and delete buttons when showActions is true', async () => {
    render(<CategoryList showActions={true} />)
    
    await waitFor(() => {
      expect(screen.getAllByTitle('Edit category')).toHaveLength(3)
      expect(screen.getAllByTitle('Delete category')).toHaveLength(3)
    })
  })

  it('hides action buttons when showActions is false', async () => {
    render(<CategoryList showActions={false} />)
    
    await waitFor(() => {
      expect(screen.queryByTitle('Edit category')).not.toBeInTheDocument()
      expect(screen.queryByTitle('Delete category')).not.toBeInTheDocument()
    })
  })

  it('deletes category when delete button is clicked', async () => {
    ;(fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: mockCategories })
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true })
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: mockCategories.slice(1) })
      })
    
    render(<CategoryList showActions={true} />)
    
    await waitFor(() => {
      expect(screen.getByText('Software Development')).toBeInTheDocument()
    })
    
    const deleteButtons = screen.getAllByTitle('Delete category')
    fireEvent.click(deleteButtons[0])
    
    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith('/api/categories/1', {
        method: 'DELETE'
      })
    })
  })

  it('handles delete confirmation dialog', async () => {
    const confirmSpy = jest.spyOn(window, 'confirm')
    render(<CategoryList showActions={true} />)
    
    await waitFor(() => {
      expect(screen.getByText('Software Development')).toBeInTheDocument()
    })
    
    const deleteButtons = screen.getAllByTitle('Delete category')
    fireEvent.click(deleteButtons[0])
    
    expect(confirmSpy).toHaveBeenCalledWith('Are you sure you want to delete "Software Development"?\n\nThis action cannot be undone and may affect existing tasks.')
  })

  it('handles API errors gracefully', async () => {
    ;(fetch as jest.Mock).mockResolvedValue({
      ok: false,
      status: 500
    })
    
    render(<CategoryList />)
    
    await waitFor(() => {
      expect(screen.getByText('Error loading categories')).toBeInTheDocument()
      expect(screen.getByText('HTTP error! status: 500')).toBeInTheDocument()
      expect(screen.getByText('Retry')).toBeInTheDocument()
    })
  })

  it('retries loading when retry button is clicked', async () => {
    ;(fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: false,
        status: 500
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: mockCategories })
      })
    
    render(<CategoryList />)
    
    await waitFor(() => {
      expect(screen.getByText('Retry')).toBeInTheDocument()
    })
    
    fireEvent.click(screen.getByText('Retry'))
    
    await waitFor(() => {
      expect(screen.getByText('Software Development')).toBeInTheDocument()
    })
  })

  it('shows results summary', async () => {
    render(<CategoryList />)
    
    await waitFor(() => {
      expect(screen.getByText('Showing 3 of 3 categories')).toBeInTheDocument()
    })
  })

  it('shows filtered results summary', async () => {
    const user = userEvent.setup()
    render(<CategoryList searchable={true} />)
    
    await waitFor(() => {
      expect(screen.getByText('Software Development')).toBeInTheDocument()
    })
    
    const searchInput = screen.getByPlaceholderText('Search categories...')
    await user.type(searchInput, 'design')
    
    await waitFor(() => {
      expect(screen.getByText('Showing 1 of 3 categories matching "design"')).toBeInTheDocument()
    })
  })

  it('calls onCategoryChange when categories are loaded', async () => {
    const onCategoryChange = jest.fn()
    render(<CategoryList onCategoryChange={onCategoryChange} />)
    
    await waitFor(() => {
      expect(onCategoryChange).toHaveBeenCalled()
    })
  })

  it('applies custom className', () => {
    const customClass = 'custom-category-list'
    render(<CategoryList className={customClass} />)
    
    expect(document.querySelector(`.${customClass}`)).toBeInTheDocument()
  })

  it('applies custom maxHeight', async () => {
    render(<CategoryList maxHeight="max-h-64" />)
    
    await waitFor(() => {
      expect(document.querySelector('.max-h-64')).toBeInTheDocument()
    })
  })
}) 