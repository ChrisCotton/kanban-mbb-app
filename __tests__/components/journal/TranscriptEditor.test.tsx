import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import TranscriptEditor from '../../../components/journal/TranscriptEditor'

// Mock the component
const mockEntry = {
  id: 'entry-1',
  title: 'Test Entry',
  transcription: 'Initial transcription text',
  transcription_status: 'completed' as const,
  created_at: '2026-01-25T00:00:00Z',
  updated_at: '2026-01-25T00:00:00Z'
}

describe('TranscriptEditor', () => {
  const mockOnSave = jest.fn()
  const mockOnCancel = jest.fn()
  const mockOnDelete = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Embedded Mode', () => {
    it('should render in embedded mode', () => {
      render(
        <TranscriptEditor
          entry={mockEntry}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
          onDelete={mockOnDelete}
          embedded={true}
        />
      )

      expect(screen.getByText('Edit')).toBeInTheDocument()
      expect(screen.getByText('Preview')).toBeInTheDocument()
      expect(screen.getByDisplayValue('Initial transcription text')).toBeInTheDocument()
    })

    it('should toggle between edit and preview modes', () => {
      render(
        <TranscriptEditor
          entry={mockEntry}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
          onDelete={mockOnDelete}
          embedded={true}
        />
      )

      const previewButton = screen.getByText('Preview')
      fireEvent.click(previewButton)

      expect(screen.queryByDisplayValue('Initial transcription text')).not.toBeInTheDocument()
      expect(screen.getByText('Initial transcription text')).toBeInTheDocument()

      const editButton = screen.getByText('Edit')
      fireEvent.click(editButton)

      expect(screen.getByDisplayValue('Initial transcription text')).toBeInTheDocument()
    })

    it('should show unsaved indicator when content changes', () => {
      render(
        <TranscriptEditor
          entry={mockEntry}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
          onDelete={mockOnDelete}
          embedded={true}
        />
      )

      const textarea = screen.getByDisplayValue('Initial transcription text')
      fireEvent.change(textarea, { target: { value: 'Modified text' } })

      expect(screen.getByText('Unsaved')).toBeInTheDocument()
    })

    it('should call onSave when save button is clicked', () => {
      render(
        <TranscriptEditor
          entry={mockEntry}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
          onDelete={mockOnDelete}
          embedded={true}
        />
      )

      const textarea = screen.getByDisplayValue('Initial transcription text')
      fireEvent.change(textarea, { target: { value: 'New transcription' } })

      const saveButton = screen.getByText('Save Transcription')
      fireEvent.click(saveButton)

      expect(mockOnSave).toHaveBeenCalledWith('Test Entry', 'New transcription')
    })

    it('should insert markdown formatting', () => {
      render(
        <TranscriptEditor
          entry={mockEntry}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
          onDelete={mockOnDelete}
          embedded={true}
        />
      )

      const textarea = screen.getByDisplayValue('Initial transcription text') as HTMLTextAreaElement
      textarea.setSelectionRange(0, 7) // Select "Initial"

      const boldButton = screen.getByTitle('Bold (Ctrl+B)')
      fireEvent.click(boldButton)

      expect(textarea.value).toContain('**Initial**')
    })
  })

  describe('Full Mode', () => {
    it('should render in full mode with title input', () => {
      render(
        <TranscriptEditor
          entry={mockEntry}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
          onDelete={mockOnDelete}
          embedded={false}
        />
      )

      expect(screen.getByText('Edit Journal Entry')).toBeInTheDocument()
      expect(screen.getByDisplayValue('Test Entry')).toBeInTheDocument()
      expect(screen.getByText('Back to List')).toBeInTheDocument()
      expect(screen.getByText('Delete Entry')).toBeInTheDocument()
    })

    it('should call onSave with updated title and content', () => {
      render(
        <TranscriptEditor
          entry={mockEntry}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
          onDelete={mockOnDelete}
          embedded={false}
        />
      )

      const titleInput = screen.getByDisplayValue('Test Entry')
      fireEvent.change(titleInput, { target: { value: 'Updated Title' } })

      const textarea = screen.getByDisplayValue('Initial transcription text')
      fireEvent.change(textarea, { target: { value: 'Updated content' } })

      const saveButton = screen.getByText('Save Changes')
      fireEvent.click(saveButton)

      expect(mockOnSave).toHaveBeenCalledWith('Updated Title', 'Updated content')
    })

    it('should call onCancel when cancel button is clicked', () => {
      render(
        <TranscriptEditor
          entry={mockEntry}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
          onDelete={mockOnDelete}
          embedded={false}
        />
      )

      const cancelButton = screen.getByText('Back to List')
      fireEvent.click(cancelButton)

      expect(mockOnCancel).toHaveBeenCalled()
    })

    it('should call onDelete when delete button is clicked', () => {
      render(
        <TranscriptEditor
          entry={mockEntry}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
          onDelete={mockOnDelete}
          embedded={false}
        />
      )

      const deleteButton = screen.getByText('Delete Entry')
      fireEvent.click(deleteButton)

      expect(mockOnDelete).toHaveBeenCalled()
    })

    it('should disable save button when no changes', () => {
      render(
        <TranscriptEditor
          entry={mockEntry}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
          onDelete={mockOnDelete}
          embedded={false}
        />
      )

      const saveButton = screen.getByText('Save Changes')
      expect(saveButton).toBeDisabled()
    })
  })

  describe('Keyboard Shortcuts', () => {
    it('should save on Ctrl+S', () => {
      render(
        <TranscriptEditor
          entry={mockEntry}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
          onDelete={mockOnDelete}
          embedded={true}
        />
      )

      const textarea = screen.getByDisplayValue('Initial transcription text')
      fireEvent.change(textarea, { target: { value: 'Modified' } })

      fireEvent.keyDown(textarea, { key: 's', ctrlKey: true, preventDefault: jest.fn() })

      expect(mockOnSave).toHaveBeenCalled()
    })

    it('should insert bold on Ctrl+B', () => {
      render(
        <TranscriptEditor
          entry={mockEntry}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
          onDelete={mockOnDelete}
          embedded={true}
        />
      )

      const textarea = screen.getByDisplayValue('Initial transcription text') as HTMLTextAreaElement
      textarea.setSelectionRange(0, 0)

      fireEvent.keyDown(textarea, { key: 'b', ctrlKey: true, preventDefault: jest.fn() })

      expect(textarea.value).toContain('**bold text**')
    })
  })

  describe('Markdown Preview', () => {
    it('should render markdown preview correctly', () => {
      const entryWithMarkdown = {
        ...mockEntry,
        transcription: '## Heading\n\n**Bold text** and *italic text*'
      }

      render(
        <TranscriptEditor
          entry={entryWithMarkdown}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
          onDelete={mockOnDelete}
          embedded={true}
        />
      )

      const previewButton = screen.getByText('Preview')
      fireEvent.click(previewButton)

      // Check that markdown is rendered as HTML
      const previewContent = screen.getByText('Heading')
      expect(previewContent.tagName).toBe('H2')
    })
  })

  describe('Sync with Entry Prop', () => {
    it('should update when entry prop changes', () => {
      const { rerender } = render(
        <TranscriptEditor
          entry={mockEntry}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
          onDelete={mockOnDelete}
          embedded={true}
        />
      )

      expect(screen.getByDisplayValue('Initial transcription text')).toBeInTheDocument()

      const updatedEntry = {
        ...mockEntry,
        transcription: 'Updated transcription'
      }

      rerender(
        <TranscriptEditor
          entry={updatedEntry}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
          onDelete={mockOnDelete}
          embedded={true}
        />
      )

      expect(screen.getByDisplayValue('Updated transcription')).toBeInTheDocument()
    })
  })
})
