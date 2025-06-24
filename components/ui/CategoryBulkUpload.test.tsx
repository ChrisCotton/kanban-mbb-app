import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import CategoryBulkUpload from './CategoryBulkUpload'

// Mock fetch
global.fetch = jest.fn()

// Mock window methods
Object.defineProperty(window, 'confirm', {
  value: jest.fn(() => true),
})

Object.defineProperty(window, 'URL', {
  value: {
    createObjectURL: jest.fn(() => 'mock-url'),
    revokeObjectURL: jest.fn(),
  },
})

// Mock file creation
const createMockFile = (content: string, name: string = 'test.csv') => {
  const file = new File([content], name, { type: 'text/csv' })
  Object.defineProperty(file, 'text', {
    value: jest.fn().mockResolvedValue(content),
  })
  return file
}

describe('CategoryBulkUpload', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(fetch as jest.Mock).mockClear()
  })

  it('renders upload interface', () => {
    render(<CategoryBulkUpload />)
    
    expect(screen.getByText('Bulk Upload Categories')).toBeInTheDocument()
    expect(screen.getByText('Choose File')).toBeInTheDocument()
    expect(screen.getByText('Download Template')).toBeInTheDocument()
    expect(screen.getByText('No file selected')).toBeInTheDocument()
  })

  it('shows file name when file is selected', async () => {
    const user = userEvent.setup()
    render(<CategoryBulkUpload />)
    
    const fileInput = screen.getByRole('button', { name: 'Choose File' })
    const csvContent = 'name,hourly_rate_usd\nDevelopment,85.00\nDesign,75.00'
    const file = createMockFile(csvContent, 'categories.csv')
    
    // Mock the file input behavior
    const input = document.querySelector('input[type="file"]') as HTMLInputElement
    Object.defineProperty(input, 'files', {
      value: [file],
      writable: false,
    })
    
    fireEvent.change(input, { target: { files: [file] } })
    
    expect(screen.getByText('categories.csv')).toBeInTheDocument()
  })

  it('shows preview and upload buttons when file is selected', () => {
    render(<CategoryBulkUpload />)
    
    const csvContent = 'name,hourly_rate_usd\nDevelopment,85.00'
    const file = createMockFile(csvContent)
    
    const input = document.querySelector('input[type="file"]') as HTMLInputElement
    Object.defineProperty(input, 'files', {
      value: [file],
      writable: false,
    })
    
    fireEvent.change(input, { target: { files: [file] } })
    
    expect(screen.getByText('Preview')).toBeInTheDocument()
    expect(screen.getByText('Upload')).toBeInTheDocument()
  })

  it('validates CSV format and shows errors for missing columns', async () => {
    render(<CategoryBulkUpload />)
    
    const csvContent = 'invalid_header\nDevelopment'
    const file = createMockFile(csvContent)
    
    const input = document.querySelector('input[type="file"]') as HTMLInputElement
    Object.defineProperty(input, 'files', {
      value: [file],
      writable: false,
    })
    
    fireEvent.change(input, { target: { files: [file] } })
    fireEvent.click(screen.getByText('Preview'))
    
    await waitFor(() => {
      expect(screen.getByText(/Validation Errors/)).toBeInTheDocument()
      expect(screen.getByText(/Missing required columns/)).toBeInTheDocument()
    })
  })

  it('validates row data and shows validation errors', async () => {
    render(<CategoryBulkUpload />)
    
    const csvContent = 'name,hourly_rate_usd\n,invalid_rate\nA,75.00'
    const file = createMockFile(csvContent)
    
    const input = document.querySelector('input[type="file"]') as HTMLInputElement
    Object.defineProperty(input, 'files', {
      value: [file],
      writable: false,
    })
    
    fireEvent.change(input, { target: { files: [file] } })
    fireEvent.click(screen.getByText('Preview'))
    
    await waitFor(() => {
      expect(screen.getByText(/Validation Errors/)).toBeInTheDocument()
      expect(screen.getByText(/Category name is required/)).toBeInTheDocument()
      expect(screen.getByText(/Hourly rate must be a valid number/)).toBeInTheDocument()
    })
  })

  it('shows preview with valid data', async () => {
    render(<CategoryBulkUpload />)
    
    const csvContent = 'name,hourly_rate_usd,description\nDevelopment,85.00,Programming tasks\nDesign,75.00,UI/UX work'
    const file = createMockFile(csvContent)
    
    const input = document.querySelector('input[type="file"]') as HTMLInputElement
    Object.defineProperty(input, 'files', {
      value: [file],
      writable: false,
    })
    
    fireEvent.change(input, { target: { files: [file] } })
    fireEvent.click(screen.getByText('Preview'))
    
    await waitFor(() => {
      expect(screen.getByText('Preview (2 categories)')).toBeInTheDocument()
      expect(screen.getByText('Development')).toBeInTheDocument()
      expect(screen.getByText('Design')).toBeInTheDocument()
      expect(screen.getByText('$85.00')).toBeInTheDocument()
      expect(screen.getByText('$75.00')).toBeInTheDocument()
    })
  })

  it('uploads categories successfully', async () => {
    const onUploadComplete = jest.fn()
    render(<CategoryBulkUpload onUploadComplete={onUploadComplete} />)
    
    ;(fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        data: { success: 2, errors: 0 }
      })
    })
    
    const csvContent = 'name,hourly_rate_usd\nDevelopment,85.00\nDesign,75.00'
    const file = createMockFile(csvContent)
    
    const input = document.querySelector('input[type="file"]') as HTMLInputElement
    Object.defineProperty(input, 'files', {
      value: [file],
      writable: false,
    })
    
    fireEvent.change(input, { target: { files: [file] } })
    fireEvent.click(screen.getByText('Upload'))
    
    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith('/api/categories/bulk-upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          categories: [
            { name: 'Development', hourly_rate_usd: '85.00', description: '' },
            { name: 'Design', hourly_rate_usd: '75.00', description: '' }
          ]
        })
      })
    })
    
    await waitFor(() => {
      expect(screen.getByText('Upload Complete')).toBeInTheDocument()
      expect(screen.getByText('✅ Successfully uploaded: 2 categories')).toBeInTheDocument()
      expect(onUploadComplete).toHaveBeenCalledWith(2)
    })
  })

  it('handles upload errors', async () => {
    render(<CategoryBulkUpload />)
    
    ;(fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 500
    })
    
    const csvContent = 'name,hourly_rate_usd\nDevelopment,85.00'
    const file = createMockFile(csvContent)
    
    const input = document.querySelector('input[type="file"]') as HTMLInputElement
    Object.defineProperty(input, 'files', {
      value: [file],
      writable: false,
    })
    
    fireEvent.change(input, { target: { files: [file] } })
    fireEvent.click(screen.getByText('Upload'))
    
    await waitFor(() => {
      expect(screen.getByText(/Validation Errors/)).toBeInTheDocument()
      expect(screen.getByText(/HTTP error! status: 500/)).toBeInTheDocument()
    })
  })

  it('downloads CSV template', () => {
    const mockLink = document.createElement('a')
    const createElementSpy = jest.spyOn(document, 'createElement').mockReturnValue(mockLink)
    const appendChildSpy = jest.spyOn(document.body, 'appendChild').mockImplementation()
    const removeChildSpy = jest.spyOn(document.body, 'removeChild').mockImplementation()
    
    render(<CategoryBulkUpload />)
    
    fireEvent.click(screen.getByText('Download Template'))
    
    expect(createElementSpy).toHaveBeenCalledWith('a')
    expect(mockLink.download).toBe('category_template.csv')
    expect(appendChildSpy).toHaveBeenCalledWith(mockLink)
    expect(removeChildSpy).toHaveBeenCalledWith(mockLink)
    
    createElementSpy.mockRestore()
    appendChildSpy.mockRestore()
    removeChildSpy.mockRestore()
  })

  it('rejects non-CSV files', () => {
    const alertSpy = jest.spyOn(window, 'alert').mockImplementation()
    render(<CategoryBulkUpload />)
    
    const file = new File(['content'], 'test.txt', { type: 'text/plain' })
    const input = document.querySelector('input[type="file"]') as HTMLInputElement
    
    Object.defineProperty(input, 'files', {
      value: [file],
      writable: false,
    })
    
    fireEvent.change(input, { target: { files: [file] } })
    
    expect(alertSpy).toHaveBeenCalledWith('Please select a valid CSV file')
    expect(screen.getByText('No file selected')).toBeInTheDocument()
    
    alertSpy.mockRestore()
  })

  it('calls onClose when close button is clicked', () => {
    const onClose = jest.fn()
    render(<CategoryBulkUpload onClose={onClose} />)
    
    const closeButton = screen.getByRole('button', { name: '' })
    fireEvent.click(closeButton)
    
    expect(onClose).toHaveBeenCalled()
  })

  it('displays CSV format instructions', () => {
    render(<CategoryBulkUpload />)
    
    expect(screen.getByText('CSV Format Instructions')).toBeInTheDocument()
    expect(screen.getByText(/Required columns:/)).toBeInTheDocument()
    expect(screen.getByText(/Optional columns:/)).toBeInTheDocument()
    expect(screen.getByText(/Name must be at least 2 characters/)).toBeInTheDocument()
  })
}) 