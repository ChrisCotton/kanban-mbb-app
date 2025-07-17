import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import CategoryManager from './CategoryManager'
import { useCategories } from '../../hooks/useCategories'

// Mock the useCategories hook
jest.mock('../../hooks/useCategories')
const mockUseCategories = useCategories as jest.MockedFunction<typeof useCategories>

// Mock CategoryList component to avoid complex dependencies
jest.mock('./CategoryList', () => {
  return function MockCategoryList() {
    return <div data-testid="category-list">Mocked CategoryList</div>
  }
})

// Mock fetch for CSV operations
global.fetch = jest.fn()

// Mock window methods for CSV downloads
Object.defineProperty(window, 'URL', {
  value: {
    createObjectURL: jest.fn(() => 'blob:mock-url'),
    revokeObjectURL: jest.fn(),
  },
  writable: true,
})

// Mock DOM methods
const mockLink = {
  href: '',
  download: '',
  click: jest.fn(),
}
jest.spyOn(document, 'createElement').mockImplementation((tagName) => {
  if (tagName === 'a') {
    return mockLink as any
  }
  return {} as any
})
jest.spyOn(document.body, 'appendChild').mockImplementation(() => null as any)
jest.spyOn(document.body, 'removeChild').mockImplementation(() => null as any)

const mockCategories = [
  {
    id: '1',
    name: 'Software Development',
    hourly_rate: 85.00,
    color: '#3B82F6',
    is_active: true,
    total_hours: 120,
    created_at: '2024-01-01T10:00:00Z',
    updated_at: '2024-01-01T10:00:00Z',
    created_by: 'user-1',
    updated_by: 'user-1',
    task_count: 5
  },
  {
    id: '2',
    name: 'UI/UX Design',
    hourly_rate: 75.00,
    color: '#10B981',
    is_active: true,
    total_hours: 80,
    created_at: '2024-01-02T10:00:00Z',
    updated_at: '2024-01-02T10:00:00Z',
    created_by: 'user-1',
    updated_by: 'user-1',
    task_count: 3
  }
]

const mockUseCategoriesReturn = {
  categories: mockCategories,
  loading: false,
  error: null,
  submitting: false,
  createCategory: jest.fn(),
  updateCategory: jest.fn(),
  deleteCategory: jest.fn(),
  loadCategories: jest.fn(),
  bulkUpload: jest.fn(),
  getCategoryById: jest.fn(),
  getCategoriesByIds: jest.fn(),
  getActiveCategories: jest.fn(),
  searchCategories: jest.fn(),
  validateCategoryName: jest.fn(),
  setError: jest.fn(),
  clearError: jest.fn(),
  refresh: jest.fn(),
}

describe('CategoryManager', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockUseCategories.mockReturnValue(mockUseCategoriesReturn)
    ;(fetch as jest.Mock).mockResolvedValue({
      ok: true,
      blob: async () => new Blob(['test,data'], { type: 'text/csv' })
    })
  })

  describe('Basic Rendering', () => {
    it('renders with default header', () => {
      render(<CategoryManager />)
      
      expect(screen.getByText('Task Categories')).toBeInTheDocument()
      expect(screen.getByText(/Manage your task categories/)).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Add Category' })).toBeInTheDocument()
    })

    it('renders without header when showHeader is false', () => {
      render(<CategoryManager showHeader={false} />)
      
      expect(screen.queryByText('Task Categories')).not.toBeInTheDocument()
      expect(screen.queryByRole('button', { name: 'Add Category' })).not.toBeInTheDocument()
    })

    it('applies custom className', () => {
      const { container } = render(<CategoryManager className="custom-class" />)
      expect(container.firstChild).toHaveClass('custom-class')
    })

    it('renders CategoryList component', () => {
      render(<CategoryManager />)
      expect(screen.getByTestId('category-list')).toBeInTheDocument()
    })
  })

  describe('Add Category Modal', () => {
    it('opens modal when Add Category button is clicked', async () => {
      const user = userEvent.setup()
      render(<CategoryManager />)
      
      await user.click(screen.getByRole('button', { name: 'Add Category' }))
      
      expect(screen.getByText('Add New Category')).toBeInTheDocument()
      expect(screen.getByLabelText('Category Name *')).toBeInTheDocument()
      expect(screen.getByLabelText('Hourly Rate (USD) *')).toBeInTheDocument()
    })

    it('closes modal when Cancel is clicked', async () => {
      const user = userEvent.setup()
      render(<CategoryManager />)
      
      await user.click(screen.getByRole('button', { name: 'Add Category' }))
      await user.click(screen.getByRole('button', { name: 'Cancel' }))
      
      expect(screen.queryByText('Add New Category')).not.toBeInTheDocument()
    })

    it('resets form when modal is closed and reopened', async () => {
      const user = userEvent.setup()
      render(<CategoryManager />)
      
      // Open modal and fill form
      await user.click(screen.getByRole('button', { name: 'Add Category' }))
      const nameInput = screen.getByLabelText('Category Name *')
      await user.type(nameInput, 'Test Category')
      
      // Close modal
      await user.click(screen.getByRole('button', { name: 'Cancel' }))
      
      // Reopen modal
      await user.click(screen.getByRole('button', { name: 'Add Category' }))
      
      // Form should be reset
      expect(screen.getByLabelText('Category Name *')).toHaveValue('')
    })
  })

  describe('Form Validation', () => {
    beforeEach(async () => {
      const user = userEvent.setup()
      render(<CategoryManager />)
      await user.click(screen.getByRole('button', { name: 'Add Category' }))
    })

    it('shows error for empty category name', async () => {
      const user = userEvent.setup()
      
      await user.click(screen.getByRole('button', { name: 'Add Category' }))
      
      expect(screen.getByText('Category name is required')).toBeInTheDocument()
    })

    it('shows error for short category name', async () => {
      const user = userEvent.setup()
      
      const nameInput = screen.getByLabelText('Category Name *')
      await user.type(nameInput, 'A')
      await user.click(screen.getByRole('button', { name: 'Add Category' }))
      
      expect(screen.getByText('Category name must be at least 2 characters')).toBeInTheDocument()
    })

    it('shows error for invalid hourly rate', async () => {
      const user = userEvent.setup()
      
      const nameInput = screen.getByLabelText('Category Name *')
      const rateInput = screen.getByLabelText('Hourly Rate (USD) *')
      
      await user.type(nameInput, 'Valid Name')
      await user.type(rateInput, '-10')
      await user.click(screen.getByRole('button', { name: 'Add Category' }))
      
      expect(screen.getByText('Please enter a valid hourly rate (0 or greater)')).toBeInTheDocument()
    })

    it('validates duplicate category names', async () => {
      const user = userEvent.setup()
      
      const nameInput = screen.getByLabelText('Category Name *')
      const rateInput = screen.getByLabelText('Hourly Rate (USD) *')
      
      await user.type(nameInput, 'Software Development') // Existing category
      await user.type(rateInput, '100')
      await user.click(screen.getByRole('button', { name: 'Add Category' }))
      
      expect(screen.getByText('A category with this name already exists')).toBeInTheDocument()
    })
  })

  describe('CSV Functionality', () => {
    it('shows CSV dropdown when CSV button is clicked', async () => {
      const user = userEvent.setup()
      render(<CategoryManager />)
      
      await user.click(screen.getByRole('button', { name: /CSV/ }))
      
      expect(screen.getByText('Export CSV')).toBeInTheDocument()
      expect(screen.getByText('Download Template')).toBeInTheDocument()
    })

    it('exports CSV when Export CSV is clicked', async () => {
      const user = userEvent.setup()
      render(<CategoryManager />)
      
      await user.click(screen.getByRole('button', { name: /CSV/ }))
      await user.click(screen.getByText('Export CSV'))
      
      expect(fetch).toHaveBeenCalledWith('/api/categories/export')
      expect(window.URL.createObjectURL).toHaveBeenCalled()
      expect(mockLink.click).toHaveBeenCalled()
    })

    it('downloads template when Download Template is clicked', async () => {
      const user = userEvent.setup()
      render(<CategoryManager />)
      
      await user.click(screen.getByRole('button', { name: /CSV/ }))
      await user.click(screen.getByText('Download Template'))
      
      expect(fetch).toHaveBeenCalledWith('/api/categories/template')
      expect(window.URL.createObjectURL).toHaveBeenCalled()
      expect(mockLink.click).toHaveBeenCalled()
    })

    it('handles CSV export error gracefully', async () => {
      const user = userEvent.setup()
      const mockSetError = jest.fn()
      
      mockUseCategories.mockReturnValue({
        ...mockUseCategoriesReturn,
        setError: mockSetError
      })
      
      ;(fetch as jest.Mock).mockRejectedValue(new Error('Export failed'))
      
      render(<CategoryManager />)
      
      await user.click(screen.getByRole('button', { name: /CSV/ }))
      await user.click(screen.getByText('Export CSV'))
      
      await waitFor(() => {
        expect(mockSetError).toHaveBeenCalledWith('Failed to export categories')
      })
    })
  })

  describe('Create Category', () => {
    it('creates new category with valid data', async () => {
      const user = userEvent.setup()
      const mockCreate = jest.fn().mockResolvedValue({ id: '3', name: 'New Category' })
      
      mockUseCategories.mockReturnValue({
        ...mockUseCategoriesReturn,
        createCategory: mockCreate
      })
      
      render(<CategoryManager />)
      
      await user.click(screen.getByRole('button', { name: 'Add Category' }))
      
      const nameInput = screen.getByLabelText('Category Name *')
      const rateInput = screen.getByLabelText('Hourly Rate (USD) *')
      
      await user.type(nameInput, 'New Category')
      await user.type(rateInput, '75.50')
      await user.click(screen.getByRole('button', { name: 'Add Category' }))
      
      expect(mockCreate).toHaveBeenCalledWith({
        name: 'New Category',
        hourly_rate_usd: '75.50',
        color: ''
      })
    })

    it('closes modal after successful creation', async () => {
      const user = userEvent.setup()
      const mockCreate = jest.fn().mockResolvedValue({ id: '3', name: 'New Category' })
      
      mockUseCategories.mockReturnValue({
        ...mockUseCategoriesReturn,
        createCategory: mockCreate
      })
      
      render(<CategoryManager />)
      
      await user.click(screen.getByRole('button', { name: 'Add Category' }))
      
      const nameInput = screen.getByLabelText('Category Name *')
      const rateInput = screen.getByLabelText('Hourly Rate (USD) *')
      
      await user.type(nameInput, 'New Category')
      await user.type(rateInput, '75.50')
      await user.click(screen.getByRole('button', { name: 'Add Category' }))
      
      await waitFor(() => {
        expect(screen.queryByText('Add New Category')).not.toBeInTheDocument()
      })
    })

    it('shows error when creation fails', async () => {
      const user = userEvent.setup()
      const mockCreate = jest.fn().mockRejectedValue(new Error('Network error'))
      
      mockUseCategories.mockReturnValue({
        ...mockUseCategoriesReturn,
        createCategory: mockCreate
      })
      
      render(<CategoryManager />)
      
      await user.click(screen.getByRole('button', { name: 'Add Category' }))
      
      const nameInput = screen.getByLabelText('Category Name *')
      const rateInput = screen.getByLabelText('Hourly Rate (USD) *')
      
      await user.type(nameInput, 'New Category')
      await user.type(rateInput, '75.50')
      await user.click(screen.getByRole('button', { name: 'Add Category' }))
      
      await waitFor(() => {
        expect(screen.getByText('Network error')).toBeInTheDocument()
      })
    })
  })

  describe('Submitting State', () => {
    it('shows loading state when submitting', async () => {
      const user = userEvent.setup()
      
      mockUseCategories.mockReturnValue({
        ...mockUseCategoriesReturn,
        submitting: true
      })
      
      render(<CategoryManager />)
      
      await user.click(screen.getByRole('button', { name: 'Add Category' }))
      
      const submitButton = screen.getByRole('button', { name: 'Saving...' })
      expect(submitButton).toBeDisabled()
    })
  })

  describe('onCategoryChange Handler', () => {
    it('calls onCategoryChange when provided', () => {
      const mockOnCategoryChange = jest.fn()
      
      render(<CategoryManager onCategoryChange={mockOnCategoryChange} />)
      
      // The effect should be called on mount
      expect(mockOnCategoryChange).toHaveBeenCalled()
    })
  })
}) 