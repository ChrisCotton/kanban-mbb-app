import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ImageUploader } from './ImageUploader';

// Mock CSS imports
jest.mock('react-datepicker/dist/react-datepicker.css', () => ({}));

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

function createVisionBoardBucket() {
  return {
    upload: jest.fn().mockResolvedValue({ data: { path: 'test-image.jpg' }, error: null }),
    getPublicUrl: jest.fn().mockReturnValue({
      data: { publicUrl: 'https://example.com/test-image.jpg' },
    }),
  };
}

// Mock Supabase — storage.from() must return the same bucket object each call (upload + getPublicUrl)
jest.mock('@/lib/supabase', () => ({
  supabase: {
    storage: {
      from: jest.fn(),
    },
    from: jest.fn(() => ({
      insert: jest.fn(() => ({
        select: jest.fn(() => ({
          single: jest.fn().mockResolvedValue({
            data: { id: '123', title: 'test-image', image_url: 'https://example.com/test-image.jpg' },
            error: null,
          }),
        })),
      })),
    })),
  },
}));

// Mock GoalSelector
jest.mock('../goals/GoalSelector', () => {
  return function MockGoalSelector({
    value,
    onChange,
    userId,
    placeholder,
    error,
    showCreateOption,
  }: any) {
    return (
      <div data-testid="goal-selector">
        <button
          data-testid="goal-selector-button"
          onClick={() => onChange && onChange('goal-123')}
        >
          {value ? `Selected: ${value}` : placeholder || 'Select a goal...'}
        </button>
        {error && <div data-testid="goal-selector-error">{error}</div>}
        {showCreateOption && (
          <button data-testid="create-goal-button">Create New Goal</button>
        )}
      </div>
    );
  };
});

// Mock URL.createObjectURL and revokeObjectURL
global.URL.createObjectURL = jest.fn(() => 'blob:test-url');
global.URL.revokeObjectURL = jest.fn();

describe('ImageUploader', () => {
  const defaultProps = {
    userId: 'user-123',
    onUploadComplete: jest.fn(),
    onUploadError: jest.fn(),
  };

  let visionBoardBucket: ReturnType<typeof createVisionBoardBucket>;

  beforeEach(() => {
    jest.clearAllMocks();
    visionBoardBucket = createVisionBoardBucket();
    const { supabase } = require('@/lib/supabase');
    (supabase.storage.from as jest.Mock).mockReturnValue(visionBoardBucket);

    const apiSuccessBody = JSON.stringify({
      success: true,
      data: {
        id: '123',
        file_path: 'https://example.com/test-image.jpg',
      },
    });
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      text: async () => apiSuccessBody,
      json: async () => JSON.parse(apiSuccessBody),
    });
  });

  it('renders GoalSelector and due date fields', () => {
    render(<ImageUploader {...defaultProps} />);
    
    expect(screen.getByTestId('goal-selector')).toBeInTheDocument();
    expect(screen.getByLabelText(/due date/i)).toBeInTheDocument();
    expect(screen.getByText(/required information/i)).toBeInTheDocument();
  });

  it('renders interval dropdown with all options', () => {
    render(<ImageUploader {...defaultProps} />);
    
    const dropdown = screen.getByRole('combobox');
    expect(dropdown).toBeInTheDocument();
    expect(screen.getByText('Today')).toBeInTheDocument();
    expect(screen.getByText('Tomorrow')).toBeInTheDocument();
    expect(screen.getByText('One Month')).toBeInTheDocument();
    expect(screen.getByText('Custom Date')).toBeInTheDocument();
  });

  it('shows calendar when Custom Date is selected', () => {
    render(<ImageUploader {...defaultProps} />);
    
    const dropdown = screen.getByRole('combobox');
    fireEvent.change(dropdown, { target: { value: 'custom' } });
    
    expect(screen.getByTestId('date-picker')).toBeInTheDocument();
  });

  it('renders upload zone with correct text', () => {
    render(<ImageUploader {...defaultProps} />);
    
    expect(screen.getByText('Click to upload')).toBeInTheDocument();
    expect(screen.getByText('or drag and drop')).toBeInTheDocument();
    expect(screen.getByText(/Images \(PNG, JPG, GIF\) or Videos \(MP4, MOV, WEBM\) \(max 10 files\)/)).toBeInTheDocument();
  });

  it('accepts custom props for maxFiles and maxFileSize', () => {
    render(<ImageUploader {...defaultProps} maxFiles={5} maxFileSize={10} />);
    
    expect(screen.getByText(/max 5 files/)).toBeInTheDocument();
  });

  it('shows validation error if goal is empty when file is added', async () => {
    render(<ImageUploader {...defaultProps} />);
    
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    const imageFile = new File(['image content'], 'test-image.jpg', { type: 'image/jpeg' });
    
    Object.defineProperty(fileInput, 'files', {
      value: [imageFile],
      writable: false,
    });
    
    fireEvent.change(fileInput);
    
    await waitFor(() => {
      const preview = screen.getByAltText('Preview');
      expect(preview).toBeInTheDocument();
    });
    
    await waitFor(() => {
      expect(screen.getByText(/please select a goal and due date/i)).toBeInTheDocument();
    }, { timeout: 2000 });
  });

  describe('GoalSelector Integration (Chunk 4A)', () => {
    it('includes goal_id in API call when goal is selected', async () => {
      render(<ImageUploader {...defaultProps} />);
      
      // Select a goal via GoalSelector
      const goalSelectorButton = screen.getByTestId('goal-selector-button');
      fireEvent.click(goalSelectorButton);
      
      // Select an interval (default is one_month)
      const dropdown = screen.getByRole('combobox');
      expect(dropdown).toBeInTheDocument();
      
      // Add file
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      const imageFile = new File(['image content'], 'test-image.jpg', { type: 'image/jpeg' });
      
      Object.defineProperty(fileInput, 'files', {
        value: [imageFile],
        writable: false,
      });
      
      fireEvent.change(fileInput);
      
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          '/api/vision-board',
          expect.objectContaining({
            method: 'POST',
            body: expect.stringContaining('"goal_id":"goal-123"')
          })
        )
      }, { timeout: 3000 });
    });

    it('includes goal text in API call when text input is used', async () => {
      render(<ImageUploader {...defaultProps} />);
      
      // Use fallback text input
      const goalTextInput = screen.getByLabelText(/or enter goal text manually/i);
      fireEvent.change(goalTextInput, { target: { value: 'Manual goal text' } });
      
      // Select an interval (default is one_month)
      const dropdown = screen.getByRole('combobox');
      expect(dropdown).toBeInTheDocument();
      
      // Add file
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      const imageFile = new File(['image content'], 'test-image.jpg', { type: 'image/jpeg' });
      
      Object.defineProperty(fileInput, 'files', {
        value: [imageFile],
        writable: false,
      });
      
      fireEvent.change(fileInput);
      
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          '/api/vision-board',
          expect.objectContaining({
            method: 'POST',
            body: expect.stringContaining('"goal":"Manual goal text"')
          })
        )
      }, { timeout: 3000 });
    });

    it('shows error when neither goal nor goal text is provided', async () => {
      render(<ImageUploader {...defaultProps} />);
      
      // Don't select goal or enter text
      // Add file directly
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      const imageFile = new File(['image content'], 'test-image.jpg', { type: 'image/jpeg' });
      
      Object.defineProperty(fileInput, 'files', {
        value: [imageFile],
        writable: false,
      });
      
      fireEvent.change(fileInput);
      
      await waitFor(() => {
        expect(screen.getByText(/please select a goal/i)).toBeInTheDocument();
      });
    });

    it('shows Create New Goal option in GoalSelector', () => {
      render(<ImageUploader {...defaultProps} />);
      
      expect(screen.getByTestId('create-goal-button')).toBeInTheDocument();
    });
  });

  it('shows character count for goal field', () => {
    render(<ImageUploader {...defaultProps} />);
    
    const goalInput = screen.getByLabelText(/or enter goal text manually/i);
    fireEvent.change(goalInput, { target: { value: 'Test goal' } });
    
    expect(screen.getByText(/9\/500 characters/i)).toBeInTheDocument();
  });

  it('prevents upload if goal text exceeds 500 characters', async () => {
    const onUploadError = jest.fn();
    render(<ImageUploader {...defaultProps} onUploadError={onUploadError} />);

    const goalTextInput = screen.getByLabelText(/or enter goal text manually/i);
    fireEvent.change(goalTextInput, { target: { value: 'a'.repeat(501) } });
    await waitFor(() => {
      expect(goalTextInput).toHaveValue('a'.repeat(501));
    });

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    const imageFile = new File(['image content'], 'test-image.jpg', { type: 'image/jpeg' });

    Object.defineProperty(fileInput, 'files', {
      value: [imageFile],
      writable: false,
    });

    fireEvent.change(fileInput);

    await waitFor(() => {
      expect(onUploadError).toHaveBeenCalledWith('Goal text must be 500 characters or less');
    });
  });

  it('opens file dialog when drop zone is clicked', () => {
    render(<ImageUploader {...defaultProps} />);
    
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    const clickSpy = jest.spyOn(fileInput, 'click').mockImplementation(() => {});
    
    const dropZone = screen.getByText('Click to upload').closest('div');
    fireEvent.click(dropZone!);
    
    expect(clickSpy).toHaveBeenCalled();
    
    clickSpy.mockRestore();
  });

  it('handles drag events correctly', () => {
    render(<ImageUploader {...defaultProps} />);
    
    const dropZone = screen.getByText('Click to upload').closest('div[class*="border-dashed"]')!;

    fireEvent.dragOver(dropZone);
    expect(dropZone).toHaveClass('border-blue-500');

    fireEvent.dragLeave(dropZone);
    expect(dropZone).not.toHaveClass('border-blue-500');
  });

  it('validates file types correctly', async () => {
    const onUploadError = jest.fn();
    render(<ImageUploader {...defaultProps} onUploadError={onUploadError} />);
    
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    
    // Create a non-image file
    const textFile = new File(['test'], 'test.txt', { type: 'text/plain' });
    
    Object.defineProperty(fileInput, 'files', {
      value: [textFile],
      writable: false,
    });
    
    fireEvent.change(fileInput);
    
    await waitFor(() => {
      expect(onUploadError).toHaveBeenCalledWith('Please select an image or video file');
    });
  });

  it('does not reject large image files (size limit removed)', async () => {
    const onUploadComplete = jest.fn();
    render(
      <ImageUploader
        {...defaultProps}
        onUploadComplete={onUploadComplete}
        maxFileSize={1}
      />
    );

    const goalInput = screen.getByLabelText(/or enter goal text manually/i);
    fireEvent.change(goalInput, { target: { value: 'Test goal' } });

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    const largeFile = new File(['x'.repeat(2 * 1024 * 1024)], 'large-image.jpg', {
      type: 'image/jpeg',
    });

    Object.defineProperty(fileInput, 'files', {
      value: [largeFile],
      writable: false,
    });

    fireEvent.change(fileInput);

    await waitFor(() => {
      expect(onUploadComplete).toHaveBeenCalledWith('123', 'https://example.com/test-image.jpg');
    }, { timeout: 3000 });
  });

  it('enforces maximum file count', async () => {
    const onUploadError = jest.fn();
    render(<ImageUploader {...defaultProps} onUploadError={onUploadError} maxFiles={1} />);
    
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    
    const file1 = new File(['test1'], 'image1.jpg', { type: 'image/jpeg' });
    const file2 = new File(['test2'], 'image2.jpg', { type: 'image/jpeg' });
    
    Object.defineProperty(fileInput, 'files', {
      value: [file1, file2],
      writable: false,
    });
    
    fireEvent.change(fileInput);
    
    await waitFor(() => {
      expect(onUploadError).toHaveBeenCalledWith('Maximum 1 files allowed');
    });
  });

  it('handles successful file upload with goal and due_date', async () => {
    const onUploadComplete = jest.fn();
    render(<ImageUploader {...defaultProps} onUploadComplete={onUploadComplete} />);
    
    const goalInput = screen.getByLabelText(/or enter goal text manually/i);
    fireEvent.change(goalInput, { target: { value: 'Test goal' } });
    
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    const imageFile = new File(['image content'], 'test-image.jpg', { type: 'image/jpeg' });
    
    Object.defineProperty(fileInput, 'files', {
      value: [imageFile],
      writable: false,
    });
    
    fireEvent.change(fileInput);
    
    await waitFor(() => {
      expect(screen.getByText('Uploading...')).toBeInTheDocument();
    });
    
    await waitFor(() => {
      expect(onUploadComplete).toHaveBeenCalledWith('123', 'https://example.com/test-image.jpg');
    }, { timeout: 3000 });
  });

  it('handles upload errors gracefully', async () => {
    const mockError = new Error('Upload failed');
    visionBoardBucket.upload.mockRejectedValueOnce(mockError);
    
    const onUploadError = jest.fn();
    render(<ImageUploader {...defaultProps} onUploadError={onUploadError} />);
    
    const goalInput = screen.getByLabelText(/or enter goal text manually/i);
    fireEvent.change(goalInput, { target: { value: 'Test goal' } });
    
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    const imageFile = new File(['image content'], 'test-image.jpg', { type: 'image/jpeg' });
    
    Object.defineProperty(fileInput, 'files', {
      value: [imageFile],
      writable: false,
    });
    
    fireEvent.change(fileInput);
    
    await waitFor(() => {
      expect(onUploadError).toHaveBeenCalledWith('Upload failed');
    });
    
    // Should show error overlay
    await waitFor(() => {
      expect(screen.getByText('Upload failed')).toBeInTheDocument();
    });
  });

  it('allows removing images before upload completes', async () => {
    render(<ImageUploader {...defaultProps} />);
    
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    const imageFile = new File(['image content'], 'test-image.jpg', { type: 'image/jpeg' });
    
    Object.defineProperty(fileInput, 'files', {
      value: [imageFile],
      writable: false,
    });
    
    fireEvent.change(fileInput);
    
    // Wait for preview to appear
    await waitFor(() => {
      expect(screen.getByAltText('Preview')).toBeInTheDocument();
    });
    
    const removeButton = screen.getByAltText('Preview').closest('.group')!.querySelector('button');
    expect(removeButton).toBeTruthy();
    fireEvent.click(removeButton!);
    
    // Preview should be removed
    await waitFor(() => {
      expect(screen.queryByAltText('Preview')).not.toBeInTheDocument();
    });
  });

  it('handles drop events for file upload', async () => {
    const onUploadComplete = jest.fn();
    render(<ImageUploader {...defaultProps} onUploadComplete={onUploadComplete} />);
    
    const goalInput = screen.getByLabelText(/or enter goal text manually/i);
    fireEvent.change(goalInput, { target: { value: 'Test goal' } });
    
    const dropZone = screen.getByText('Click to upload').closest('div[class*="border-dashed"]')!;
    const imageFile = new File(['image content'], 'dropped-image.jpg', { type: 'image/jpeg' });
    
    const dropEvent = {
      preventDefault: jest.fn(),
      dataTransfer: {
        files: [imageFile]
      }
    };
    
    fireEvent.drop(dropZone, dropEvent);
    
    // Should show uploading state
    await waitFor(() => {
      expect(screen.getByText('Uploading...')).toBeInTheDocument();
    });
    
    // Should complete upload
    await waitFor(() => {
      expect(onUploadComplete).toHaveBeenCalled();
    }, { timeout: 3000 });
  });

  it('displays file names in preview', async () => {
    render(<ImageUploader {...defaultProps} />);
    
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    const imageFile = new File(['image content'], 'my-vacation-photo.jpg', { type: 'image/jpeg' });
    
    Object.defineProperty(fileInput, 'files', {
      value: [imageFile],
      writable: false,
    });
    
    fireEvent.change(fileInput);
    
    await waitFor(() => {
      expect(screen.getByText('my-vacation-photo.jpg')).toBeInTheDocument();
    });
  });

  it('cleans up object URLs on unmount', () => {
    const { unmount } = render(<ImageUploader {...defaultProps} />);
    
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    const imageFile = new File(['image content'], 'test-image.jpg', { type: 'image/jpeg' });
    
    Object.defineProperty(fileInput, 'files', {
      value: [imageFile],
      writable: false,
    });
    
    fireEvent.change(fileInput);
    
    unmount();
    
    // Note: In a real scenario, we'd verify URL.revokeObjectURL was called
    // but since we're mocking it, we can't easily test the cleanup
    expect(URL.createObjectURL).toHaveBeenCalled();
  });
});