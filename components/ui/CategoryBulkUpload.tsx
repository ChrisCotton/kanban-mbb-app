'use client'

import React, { useState, useRef } from 'react'
import { parseCSV, ParsedCategoryRow, CSVParseError } from '../../lib/utils/csv-parser'

interface CategoryBulkUploadProps {
  onUploadComplete?: (uploadedCount: number) => void
  onClose?: () => void
  className?: string
}

interface ValidationError {
  row: number
  field: string
  message: string
  data: { name: string, hourly_rate_usd: string }
}

const CategoryBulkUpload: React.FC<CategoryBulkUploadProps> = ({
  onUploadComplete,
  onClose,
  className = ''
}) => {
  const [file, setFile] = useState<File | null>(null)
  const [parseErrors, setParseErrors] = useState<ValidationError[]>([])
  const [previewData, setPreviewData] = useState<ParsedCategoryRow[]>([])
  const [showPreview, setShowPreview] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadResult, setUploadResult] = useState<{
    success: number
    errors: number
    total: number
  } | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Handle file selection
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0]
    if (!selectedFile) return

    if (selectedFile.type !== 'text/csv' && !selectedFile.name.endsWith('.csv')) {
      alert('Please select a valid CSV file')
      return
    }

    setFile(selectedFile)
    setParseErrors([])
    setUploadResult(null)
    setShowPreview(false)
    setPreviewData([])
  }

  // Preview CSV data
  const handlePreview = async () => {
    if (!file) return

    const content = await file.text()
    const parseResult = parseCSV(content)
    
    // Convert CSVParseError to ValidationError format for display
    const errors: ValidationError[] = parseResult.errors.map(error => ({
      row: error.line,
      field: error.field,
      message: error.message,
      data: { name: error.value, hourly_rate_usd: '' }
    }))
    
    setParseErrors(errors)
    setPreviewData(parseResult.data)
    setShowPreview(true)
  }

  // Handle upload using FormData to the correct endpoint
  const handleUpload = async () => {
    if (!file) return

    setUploading(true)
    setParseErrors([])
    setUploadResult(null)

    try {
      // Create FormData to upload the file
      const formData = new FormData()
      formData.append('file', file)

      // Upload to correct import API endpoint
      const response = await fetch('/api/categories/import', {
        method: 'POST',
        body: formData
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result = await response.json()
      if (!result.success) {
        throw new Error(result.error || 'Failed to upload categories')
      }

      setUploadResult({
        success: result.imported || 0,
        errors: result.errors?.length || 0,
        total: result.imported + result.skipped + (result.errors?.length || 0)
      })

      onUploadComplete?.(result.imported || 0)

    } catch (err) {
      console.error('Error uploading categories:', err)
      setParseErrors([{
        row: 0,
        field: 'upload',
        message: err instanceof Error ? err.message : 'Failed to upload categories',
        data: { name: '', hourly_rate_usd: '' }
      }])
    } finally {
      setUploading(false)
    }
  }

  // Download CSV template
  const downloadTemplate = () => {
    const csvContent = 'name,hourly_rate_usd,description\n' +
                      'Software Development,85.00,Programming and coding tasks\n' +
                      'UI/UX Design,75.00,User interface and experience design\n' +
                      'Project Management,95.00,Managing projects and teams'
    
    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'category_template.csv'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.URL.revokeObjectURL(url)
  }

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg shadow-lg ${className}`}>
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Bulk Upload Categories
          </h3>
          {onClose && (
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        {/* Upload Section */}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Select CSV File
            </label>
            <div className="flex items-center space-x-4">
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={handleFileSelect}
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Choose File
              </button>
              <span className="text-sm text-gray-600 dark:text-gray-400">
                {file ? file.name : 'No file selected'}
              </span>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <button
              onClick={downloadTemplate}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
            >
              Download Template
            </button>
            {file && (
              <>
                <button
                  onClick={handlePreview}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                  Preview
                </button>
                <button
                  onClick={handleUpload}
                  disabled={uploading}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {uploading ? 'Uploading...' : 'Upload'}
                </button>
              </>
            )}
          </div>
        </div>

        {/* Error Display */}
        {parseErrors.length > 0 && (
          <div className="mt-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <h4 className="text-sm font-medium text-red-800 dark:text-red-400 mb-3">
              Validation Errors ({parseErrors.length})
            </h4>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {parseErrors.map((error, index) => (
                <div key={index} className="text-sm text-red-700 dark:text-red-300">
                  <span className="font-medium">Row {error.row}:</span> {error.message}
                  {error.data.name && (
                    <span className="ml-2 text-gray-600 dark:text-gray-400">
                      ({error.data.name})
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Preview Display */}
        {showPreview && previewData.length > 0 && (
          <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg">
            <h4 className="text-sm font-medium text-gray-800 dark:text-gray-200 mb-3">
              Preview ({previewData.length} categories)
            </h4>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-300 dark:border-gray-600">
                    <th className="text-left py-2 px-3 text-gray-700 dark:text-gray-300">Name</th>
                    <th className="text-left py-2 px-3 text-gray-700 dark:text-gray-300">Hourly Rate</th>
                    <th className="text-left py-2 px-3 text-gray-700 dark:text-gray-300">Color</th>
                    <th className="text-left py-2 px-3 text-gray-700 dark:text-gray-300">Active</th>
                  </tr>
                </thead>
                <tbody>
                  {previewData.slice(0, 5).map((row, index) => (
                    <tr key={index} className="border-b border-gray-200 dark:border-gray-600">
                      <td className="py-2 px-3 text-gray-900 dark:text-white">{row.name}</td>
                      <td className="py-2 px-3 text-gray-900 dark:text-white">${row.hourly_rate_usd}</td>
                      <td className="py-2 px-3 text-gray-600 dark:text-gray-400">
                        {row.color ? (
                          <span className="flex items-center">
                            <span 
                              className="w-4 h-4 rounded mr-2 border border-gray-300" 
                              style={{ backgroundColor: row.color }}
                            ></span>
                            {row.color}
                          </span>
                        ) : '-'}
                      </td>
                      <td className="py-2 px-3 text-gray-600 dark:text-gray-400">
                        {row.is_active ? '✅ Yes' : '❌ No'}
                      </td>
                    </tr>
                  ))}
                  {previewData.length > 5 && (
                    <tr>
                      <td colSpan={4} className="py-2 px-3 text-center text-gray-500 dark:text-gray-400">
                        ... and {previewData.length - 5} more rows
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Upload Result */}
        {uploadResult && (
          <div className="mt-6 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
            <h4 className="text-sm font-medium text-green-800 dark:text-green-400 mb-2">
              Upload Complete
            </h4>
            <div className="text-sm text-green-700 dark:text-green-300">
              <p>✅ Successfully uploaded: {uploadResult.success} categories</p>
              {uploadResult.errors > 0 && (
                <p>❌ Failed: {uploadResult.errors} categories</p>
              )}
              <p>📊 Total processed: {uploadResult.total} categories</p>
            </div>
          </div>
        )}

        {/* Instructions */}
        <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
          <h4 className="text-sm font-medium text-blue-800 dark:text-blue-400 mb-2">
            CSV Format Instructions
          </h4>
          <div className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
            <p>• Required columns: <code>name</code></p>
            <p>• Optional columns: <code>hourly_rate_usd</code>, <code>description</code>, <code>color</code>, <code>is_active</code></p>
            <p>• Name must be at least 2 characters long</p>
            <p>• Hourly rate defaults to $0 if empty (great for personal activities)</p>
            <p>• Hourly rate must be a valid number (0 or greater) when provided</p>
            <p>• Download the template above for the correct format</p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default CategoryBulkUpload 