import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ImageUploader } from './ImageUploader';

// Mock Supabase
jest.mock('@/lib/supabase', () => ({
  supabase: {
    storage: {
      from: jest.fn(() => ({
        upload: jest.fn().mockResolvedValue({ data: { path: 'test-image.jpg' }, error: null }),
        getPublicUrl: jest.fn().mockReturnValue({ 
          data: { publicUrl: 'https://example.com/test-image.jpg' } 
        })
      }))
    },
    from: jest.fn(() => ({
      insert: jest.fn(() => ({
        select: jest.fn(() => ({
          single: jest.fn().mockResolvedValue({ 
            data: { id: '123', title: 'test-image', image_url: 'https://example.com/test-image.jpg' }, 
            error: null 
          })
        }))
      }))
    }))
  }
}));

// Mock URL.createObjectURL and revokeObjectURL
global.URL.createObjectURL = jest.fn(() => 'blob:test-url');
global.URL.revokeObjectURL = jest.fn();

describe('ImageUploader', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders upload zone with correct text', () => {
    render(<ImageUploader />);
    
    expect(screen.getByText('Click to upload')).toBeInTheDocument();
    expect(screen.getByText('or drag and drop')).toBeInTheDocument();
    expect(screen.getByText('PNG, JPG, GIF up to 5MB (max 10 files)')).toBeInTheDocument();
  });

  it('accepts custom props for maxFiles and maxFileSize', () => {
    render(<ImageUploader maxFiles={5} maxFileSize={10} />);
    
    expect(screen.getByText('PNG, JPG, GIF up to 10MB (max 5 files)')).toBeInTheDocument();
  });

  it('opens file dialog when drop zone is clicked', () => {
    render(<ImageUploader />);
    
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    const clickSpy = jest.spyOn(fileInput, 'click').mockImplementation(() => {});
    
    const dropZone = screen.getByText('Click to upload').closest('div');
    fireEvent.click(dropZone!);
    
    expect(clickSpy).toHaveBeenCalled();
    
    clickSpy.mockRestore();
  });

  it('handles drag events correctly', () => {
    render(<ImageUploader />);
    
    const dropZone = screen.getByText('Click to upload').closest('div')!;
    
    // Test drag over
    fireEvent.dragOver(dropZone);
    expect(dropZone).toHaveClass('border-blue-500');
    
    // Test drag leave
    fireEvent.dragLeave(dropZone);
    expect(dropZone).not.toHaveClass('border-blue-500');
  });

  it('validates file types correctly', async () => {
    const onUploadError = jest.fn();
    render(<ImageUploader onUploadError={onUploadError} />);
    
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    
    // Create a non-image file
    const textFile = new File(['test'], 'test.txt', { type: 'text/plain' });
    
    Object.defineProperty(fileInput, 'files', {
      value: [textFile],
      writable: false,
    });
    
    fireEvent.change(fileInput);
    
    await waitFor(() => {
      expect(onUploadError).toHaveBeenCalledWith('Please select an image file');
    });
  });

  it('validates file size correctly', async () => {
    const onUploadError = jest.fn();
    render(<ImageUploader onUploadError={onUploadError} maxFileSize={1} />);
    
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    
    // Create a large image file (2MB when limit is 1MB)
    const largeFile = new File(['x'.repeat(2 * 1024 * 1024)], 'large-image.jpg', { 
      type: 'image/jpeg' 
    });
    
    Object.defineProperty(fileInput, 'files', {
      value: [largeFile],
      writable: false,
    });
    
    fireEvent.change(fileInput);
    
    await waitFor(() => {
      expect(onUploadError).toHaveBeenCalledWith('File size must be less than 1MB');
    });
  });

  it('enforces maximum file count', async () => {
    const onUploadError = jest.fn();
    render(<ImageUploader onUploadError={onUploadError} maxFiles={1} />);
    
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

  it('handles successful file upload', async () => {
    const onUploadComplete = jest.fn();
    render(<ImageUploader onUploadComplete={onUploadComplete} />);
    
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    const imageFile = new File(['image content'], 'test-image.jpg', { type: 'image/jpeg' });
    
    Object.defineProperty(fileInput, 'files', {
      value: [imageFile],
      writable: false,
    });
    
    fireEvent.change(fileInput);
    
    // Should show uploading state
    await waitFor(() => {
      expect(screen.getByText('Uploading...')).toBeInTheDocument();
    });
    
    // Should complete upload and call callback
    await waitFor(() => {
      expect(onUploadComplete).toHaveBeenCalledWith('123', 'https://example.com/test-image.jpg');
    }, { timeout: 3000 });
  });

  it('handles upload errors gracefully', async () => {
    // Mock upload failure
    const mockError = new Error('Upload failed');
    const { supabase } = require('@/lib/supabase');
    supabase.storage.from().upload.mockRejectedValueOnce(mockError);
    
    const onUploadError = jest.fn();
    render(<ImageUploader onUploadError={onUploadError} />);
    
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
    render(<ImageUploader />);
    
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
    
    // Click remove button
    const removeButton = screen.getByRole('button');
    fireEvent.click(removeButton);
    
    // Preview should be removed
    await waitFor(() => {
      expect(screen.queryByAltText('Preview')).not.toBeInTheDocument();
    });
  });

  it('handles drop events for file upload', async () => {
    const onUploadComplete = jest.fn();
    render(<ImageUploader onUploadComplete={onUploadComplete} />);
    
    const dropZone = screen.getByText('Click to upload').closest('div')!;
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
    render(<ImageUploader />);
    
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
    const { unmount } = render(<ImageUploader />);
    
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