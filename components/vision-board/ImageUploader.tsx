import React, { useState, useCallback, useRef, useEffect } from 'react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { supabase } from '@/lib/supabase';
import { 
  DueDateInterval, 
  INTERVAL_OPTIONS, 
  getDateFromInterval, 
  getDateColorStyles,
  formatDueDateISO
} from '@/lib/utils/due-date-intervals';

interface MediaFile {
  file: File;
  id: string;
  preview: string;
  uploading: boolean;
  error?: string;
  mediaType: 'image' | 'video';
}

interface ImageUploaderProps {
  userId: string;
  onUploadComplete?: (imageId: string, imageUrl: string) => void;
  onUploadError?: (error: string) => void;
  maxFiles?: number;
  maxFileSize?: number; // in MB (deprecated - no longer enforced)
  className?: string;
}

export const ImageUploader: React.FC<ImageUploaderProps> = ({
  userId,
  onUploadComplete,
  onUploadError,
  maxFiles = 10,
  maxFileSize = 5,
  className = ''
}) => {
  const [mediaFiles, setMediaFiles] = useState<MediaFile[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Goal and due date state
  const [goal, setGoal] = useState('');
  const [selectedInterval, setSelectedInterval] = useState<DueDateInterval>('one_month');
  const [customDate, setCustomDate] = useState<Date | null>(null);
  const [goalError, setGoalError] = useState<string | undefined>();
  const [dueDateError, setDueDateError] = useState<string | undefined>();

  // Calculate due date based on interval or custom date
  const calculatedDueDate = selectedInterval === 'custom' && customDate
    ? customDate
    : getDateFromInterval(selectedInterval);

  // Get color styles for the calculated due date
  const dateColorStyles = getDateColorStyles(calculatedDueDate);

  // Validate goal and due date
  const validateGoalAndDueDate = useCallback((): boolean => {
    let isValid = true;

    if (!goal.trim()) {
      setGoalError('Goal is required');
      isValid = false;
    } else if (goal.trim().length > 500) {
      setGoalError('Goal must be 500 characters or less');
      isValid = false;
    } else {
      setGoalError(undefined);
    }

    if (selectedInterval === 'custom' && !customDate) {
      setDueDateError('Please select a custom date');
      isValid = false;
    } else {
      setDueDateError(undefined);
    }

    return isValid;
  }, [goal, selectedInterval, customDate]);

  const validateFile = useCallback((file: File): string | null => {
    const isImage = file.type.startsWith('image/');
    const isVideo = file.type.startsWith('video/');
    
    if (!isImage && !isVideo) {
      return 'Please select an image or video file';
    }
    // File size limit removed - no size restrictions
    return null;
  }, []);

  const uploadMedia = useCallback(async (mediaFile: MediaFile) => {
    // Validate goal and due date before upload
    if (!goal.trim() || (selectedInterval === 'custom' && !customDate)) {
      setMediaFiles(prev => prev.map(file => 
        file.id === mediaFile.id ? { ...file, error: 'Please fill in goal and due date' } : file
      ));
      return;
    }

    try {
      setMediaFiles(prev => prev.map(file => 
        file.id === mediaFile.id ? { ...file, uploading: true, error: undefined } : file
      ));

      // Calculate due date
      const dueDate = selectedInterval === 'custom' && customDate
        ? customDate
        : getDateFromInterval(selectedInterval);

      // Upload to Supabase Storage
      const fileExt = mediaFile.file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('vision-board')
        .upload(fileName, mediaFile.file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('vision-board')
        .getPublicUrl(fileName);

      // Save to database via API
      const dueDateISO = formatDueDateISO(dueDate);
      const response = await fetch('/api/vision-board', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          user_id: userId,
          file_name: fileName,
          file_path: publicUrl,
          title: mediaFile.file.name.split('.')[0],
          description: '',
          is_active: true,
          goal: goal.trim(),
          due_date: dueDateISO,
          media_type: mediaFile.mediaType
        })
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || `Failed to save ${mediaFile.mediaType}`);
      }

      // Update local state
      setMediaFiles(prev => prev.filter(file => file.id !== mediaFile.id));
      
      onUploadComplete?.(result.data.id, publicUrl);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Upload failed';
      setMediaFiles(prev => prev.map(file => 
        file.id === mediaFile.id ? { ...file, uploading: false, error: errorMessage } : file
      ));
      onUploadError?.(errorMessage);
    }
  }, [goal, selectedInterval, customDate, userId, onUploadComplete, onUploadError]);

  const addFiles = useCallback((files: FileList | File[]) => {
    const fileArray = Array.from(files);
    const currentCount = mediaFiles.length;
    
    if (currentCount + fileArray.length > maxFiles) {
      onUploadError?.(`Maximum ${maxFiles} files allowed`);
      return;
    }

    const newMediaFiles: MediaFile[] = [];
    
    fileArray.forEach(file => {
      const error = validateFile(file);
      if (error) {
        onUploadError?.(error);
        return;
      }

      const id = Date.now().toString() + Math.random().toString(36).substring(2);
      const preview = URL.createObjectURL(file);
      const mediaType = file.type.startsWith('video/') ? 'video' : 'image';
      
      newMediaFiles.push({
        file,
        id,
        preview,
        uploading: false,
        mediaType
      });
    });

    setMediaFiles(prev => [...prev, ...newMediaFiles]);
    
    // Auto-upload all valid files (will validate goal/due_date in uploadMedia)
    newMediaFiles.forEach(uploadMedia);
  }, [mediaFiles.length, maxFiles, validateFile, onUploadError, uploadMedia]);

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

  const removeMedia = useCallback((id: string) => {
    setMediaFiles(prev => {
      const mediaFile = prev.find(file => file.id === id);
      if (mediaFile) {
        URL.revokeObjectURL(mediaFile.preview);
      }
      return prev.filter(file => file.id !== id);
    });
  }, []);

  const openFileDialog = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  // Update custom date when interval changes
  useEffect(() => {
    if (selectedInterval !== 'custom') {
      setCustomDate(null);
    }
  }, [selectedInterval]);

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Goal and Due Date Fields */}
      <div className="space-y-4 bg-white/5 rounded-lg p-4 border border-white/10">
        <h3 className="text-sm font-medium text-white mb-3">Required Information</h3>
        
        {/* Goal Input */}
        <div>
          <label htmlFor="upload-goal" className="block text-sm font-medium text-white mb-2">
            Goal <span className="text-red-400">*</span>
          </label>
          <input
            id="upload-goal"
            type="text"
            value={goal}
            onChange={(e) => {
              setGoal(e.target.value);
              if (goalError) {
                setGoalError(undefined);
              }
            }}
            maxLength={500}
            className={`w-full px-4 py-2 bg-white/10 border rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              goalError ? 'border-red-500' : 'border-white/20'
            }`}
            placeholder="Enter your goal for this vision..."
            required
          />
          {goalError && (
            <p className="mt-1 text-sm text-red-400">{goalError}</p>
          )}
          <p className="mt-1 text-xs text-white/60">{goal.length}/500 characters</p>
        </div>

        {/* Due Date Selection */}
        <div>
          <label className="block text-sm font-medium text-white mb-2">
            Due Date <span className="text-red-400">*</span>
          </label>
          
          {/* Interval Dropdown */}
          <select
            value={selectedInterval}
            onChange={(e) => {
              setSelectedInterval(e.target.value as DueDateInterval);
              if (dueDateError) {
                setDueDateError(undefined);
              }
            }}
            className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 mb-3"
          >
            {INTERVAL_OPTIONS.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

          {/* Custom Date Picker */}
          {selectedInterval === 'custom' && (
            <div className="mb-3">
              <DatePicker
                selected={customDate}
                onChange={(date: Date | null) => {
                  setCustomDate(date);
                  if (dueDateError) {
                    setDueDateError(undefined);
                  }
                }}
                dateFormat="MMMM d, yyyy"
                className={`w-full px-4 py-2 bg-white/10 border rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  dueDateError ? 'border-red-500' : 'border-white/20'
                }`}
                placeholderText="Select a custom date"
                required={selectedInterval === 'custom'}
              />
              {dueDateError && (
                <p className="mt-1 text-sm text-red-400">{dueDateError}</p>
              )}
            </div>
          )}

          {/* Date Preview with Color */}
          <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-lg border ${dateColorStyles.bgColor} ${dateColorStyles.borderColor}`}>
            <span className={`text-sm font-medium ${dateColorStyles.textColor}`}>
              Due: {calculatedDueDate.toLocaleDateString('en-US', { 
                year: 'numeric', 
                month: 'short', 
                day: 'numeric' 
              })}
            </span>
            <div 
              className="w-2 h-2 rounded-full"
              style={{ 
                backgroundColor: dateColorStyles.bgColor.includes('red') ? '#ef4444' : 
                                  dateColorStyles.bgColor.includes('rose') ? '#f43f5e' :
                                  dateColorStyles.bgColor.includes('orange') ? '#f97316' :
                                  dateColorStyles.bgColor.includes('amber') ? '#f59e0b' :
                                  dateColorStyles.bgColor.includes('yellow') ? '#eab308' :
                                  dateColorStyles.bgColor.includes('lime') ? '#84cc16' :
                                  dateColorStyles.bgColor.includes('green') ? '#22c55e' :
                                  dateColorStyles.bgColor.includes('cyan') ? '#06b6d4' :
                                  dateColorStyles.bgColor.includes('blue') ? '#3b82f6' : '#6b7280' 
              }}
            />
          </div>
        </div>
      </div>

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
            Images (PNG, JPG, GIF) or Videos (MP4, MOV, WEBM) (max {maxFiles} files)
          </div>
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,video/*"
        multiple
        onChange={handleFileSelect}
        className="hidden"
      />

      {/* Preview Grid */}
      {mediaFiles.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {mediaFiles.map((mediaFile) => (
            <div key={mediaFile.id} className="relative group">
              <div className="aspect-square rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800">
                {mediaFile.mediaType === 'video' ? (
                  <video
                    src={mediaFile.preview}
                    className="w-full h-full object-cover"
                    controls={false}
                    muted
                    playsInline
                  />
                ) : (
                  <img
                    src={mediaFile.preview}
                    alt="Preview"
                    className="w-full h-full object-cover"
                  />
                )}
                
                {/* Media type badge */}
                <div className="absolute top-2 left-2 bg-black bg-opacity-70 text-white text-xs px-2 py-1 rounded uppercase">
                  {mediaFile.mediaType}
                </div>
                
                {/* Upload overlay */}
                {mediaFile.uploading && (
                  <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                    <div className="flex flex-col items-center text-white">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
                      <span className="text-xs mt-2">Uploading...</span>
                    </div>
                  </div>
                )}

                {/* Error overlay */}
                {mediaFile.error && (
                  <div className="absolute inset-0 bg-red-500 bg-opacity-90 flex items-center justify-center p-2">
                    <span className="text-white text-xs text-center">{mediaFile.error}</span>
                  </div>
                )}

                {/* Remove button */}
                <button
                  onClick={() => removeMedia(mediaFile.id)}
                  className="absolute top-2 right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  disabled={mediaFile.uploading}
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <div className="mt-1 text-xs text-gray-500 dark:text-gray-400 truncate">
                {mediaFile.file.name}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ImageUploader;