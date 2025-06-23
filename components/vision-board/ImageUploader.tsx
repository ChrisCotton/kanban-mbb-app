import React, { useState, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';

interface ImageFile {
  file: File;
  id: string;
  preview: string;
  uploading: boolean;
  error?: string;
}

interface ImageUploaderProps {
  onUploadComplete?: (imageId: string, imageUrl: string) => void;
  onUploadError?: (error: string) => void;
  maxFiles?: number;
  maxFileSize?: number; // in MB
  className?: string;
}

export const ImageUploader: React.FC<ImageUploaderProps> = ({
  onUploadComplete,
  onUploadError,
  maxFiles = 10,
  maxFileSize = 5,
  className = ''
}) => {
  const [images, setImages] = useState<ImageFile[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateFile = useCallback((file: File): string | null => {
    if (!file.type.startsWith('image/')) {
      return 'Please select an image file';
    }
    if (file.size > maxFileSize * 1024 * 1024) {
      return `File size must be less than ${maxFileSize}MB`;
    }
    return null;
  }, [maxFileSize]);

  const uploadImage = async (imageFile: ImageFile) => {
    try {
      setImages(prev => prev.map(img => 
        img.id === imageFile.id ? { ...img, uploading: true, error: undefined } : img
      ));

      // Upload to Supabase Storage
      const fileExt = imageFile.file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('vision-board')
        .upload(fileName, imageFile.file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('vision-board')
        .getPublicUrl(fileName);

      // Save to database
      const { data: dbData, error: dbError } = await supabase
        .from('vision_board_images')
        .insert({
          title: imageFile.file.name.split('.')[0],
          image_url: publicUrl,
          description: '',
          active: true
        })
        .select()
        .single();

      if (dbError) throw dbError;

      // Update local state
      setImages(prev => prev.filter(img => img.id !== imageFile.id));
      
      onUploadComplete?.(dbData.id, publicUrl);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Upload failed';
      setImages(prev => prev.map(img => 
        img.id === imageFile.id ? { ...img, uploading: false, error: errorMessage } : img
      ));
      onUploadError?.(errorMessage);
    }
  };

  const addFiles = useCallback((files: FileList | File[]) => {
    const fileArray = Array.from(files);
    const currentCount = images.length;
    
    if (currentCount + fileArray.length > maxFiles) {
      onUploadError?.(`Maximum ${maxFiles} files allowed`);
      return;
    }

    const newImages: ImageFile[] = [];
    
    fileArray.forEach(file => {
      const error = validateFile(file);
      if (error) {
        onUploadError?.(error);
        return;
      }

      const id = Date.now().toString() + Math.random().toString(36).substring(2);
      const preview = URL.createObjectURL(file);
      
      newImages.push({
        file,
        id,
        preview,
        uploading: false
      });
    });

    setImages(prev => [...prev, ...newImages]);
    
    // Auto-upload all valid files
    newImages.forEach(uploadImage);
  }, [images.length, maxFiles, validateFile, onUploadError]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    addFiles(e.dataTransfer.files);
  }, [addFiles]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      addFiles(e.target.files);
    }
  }, [addFiles]);

  const removeImage = useCallback((id: string) => {
    setImages(prev => {
      const image = prev.find(img => img.id === id);
      if (image) {
        URL.revokeObjectURL(image.preview);
      }
      return prev.filter(img => img.id !== id);
    });
  }, []);

  const openFileDialog = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Drop Zone */}
      <div
        className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
          isDragOver
            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
            : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
        }`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={openFileDialog}
      >
        <div className="space-y-2">
          <div className="mx-auto w-12 h-12 text-gray-400">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
              />
            </svg>
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400">
            <span className="font-medium text-blue-600 hover:text-blue-500 cursor-pointer">
              Click to upload
            </span>
            {' '}or drag and drop
          </div>
          <div className="text-xs text-gray-500">
            PNG, JPG, GIF up to {maxFileSize}MB (max {maxFiles} files)
          </div>
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={handleFileSelect}
        className="hidden"
      />

      {/* Preview Grid */}
      {images.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {images.map((image) => (
            <div key={image.id} className="relative group">
              <div className="aspect-square rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800">
                <img
                  src={image.preview}
                  alt="Preview"
                  className="w-full h-full object-cover"
                />
                
                {/* Upload overlay */}
                {image.uploading && (
                  <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                    <div className="flex flex-col items-center text-white">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
                      <span className="text-xs mt-2">Uploading...</span>
                    </div>
                  </div>
                )}

                {/* Error overlay */}
                {image.error && (
                  <div className="absolute inset-0 bg-red-500 bg-opacity-90 flex items-center justify-center p-2">
                    <span className="text-white text-xs text-center">{image.error}</span>
                  </div>
                )}

                {/* Remove button */}
                <button
                  onClick={() => removeImage(image.id)}
                  className="absolute top-2 right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  disabled={image.uploading}
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <div className="mt-1 text-xs text-gray-500 dark:text-gray-400 truncate">
                {image.file.name}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ImageUploader;