import { parse } from 'csv-parse/sync'
import { stringify } from 'csv-stringify/sync'

/**
 * Structure of a CSV row as read from file
 */
export interface CategoryCSVRow {
  name: string
  hourly_rate_usd: string
  color?: string
  is_active?: string
  created_at?: string
}

/**
 * Structure of a parsed and validated category row
 */
export interface ParsedCategoryRow {
  name: string
  hourly_rate_usd: number
  color?: string
  is_active: boolean
  line_number: number
}

/**
 * Structure of validation errors
 */
export interface CSVParseError {
  line: number
  field: string
  value: string
  message: string
}

/**
 * Result of CSV parsing operation
 */
export interface CSVParseResult {
  success: boolean
  data: ParsedCategoryRow[]
  errors: CSVParseError[]
  totalRows: number
  validRows: number
}

/**
 * Parse and validate CSV content
 */
export function parseCSV(csvContent: string): CSVParseResult {
  try {
    const records = parse(csvContent, {
      columns: true,
      skip_empty_lines: true,
      trim: true
    }) as CategoryCSVRow[]

    const validRows: ParsedCategoryRow[] = []
    const errors: CSVParseError[] = []

    records.forEach((row, index) => {
      const lineNumber = index + 2 // +1 for 0-based index, +1 for header row
      const parsedRow: Partial<ParsedCategoryRow> = {
        line_number: lineNumber
      }

      // Validate name (required)
      if (!row.name || row.name.trim() === '') {
        errors.push({
          line: lineNumber,
          field: 'name',
          value: row.name || '',
          message: 'Category name is required'
        })
      } else if (row.name.trim().length > 100) {
        errors.push({
          line: lineNumber,
          field: 'name',
          value: row.name,
          message: 'Category name must be 100 characters or less'
        })
      } else {
        parsedRow.name = row.name.trim()
      }

      // Validate hourly_rate_usd (optional, defaults to 0)
      if (!row.hourly_rate_usd || row.hourly_rate_usd.trim() === '') {
        parsedRow.hourly_rate_usd = 0 // Default to 0 for activities without hourly rates
      } else {
        const rate = parseFloat(row.hourly_rate_usd)
        if (isNaN(rate) || rate < 0) {
          errors.push({
            line: lineNumber,
            field: 'hourly_rate_usd',
            value: row.hourly_rate_usd,
            message: 'Hourly rate must be a valid number (0 or greater)'
          })
        } else if (rate > 10000) {
          errors.push({
            line: lineNumber,
            field: 'hourly_rate_usd',
            value: row.hourly_rate_usd,
            message: 'Hourly rate seems unusually high (over $10,000/hr)'
          })
        } else {
          parsedRow.hourly_rate_usd = rate
        }
      }

      // Validate color (optional)
      if (row.color && row.color.trim() !== '') {
        const colorValue = row.color.trim()
        // Basic hex color validation
        if (!/^#[0-9A-F]{6}$/i.test(colorValue) && !/^#[0-9A-F]{3}$/i.test(colorValue)) {
          errors.push({
            line: lineNumber,
            field: 'color',
            value: colorValue,
            message: 'Color must be a valid hex color (e.g., #FF0000 or #F00)'
          })
        } else {
          parsedRow.color = colorValue
        }
      }

      // Validate is_active (optional, defaults to true)
      if (row.is_active && row.is_active.trim() !== '') {
        const activeValue = row.is_active.trim().toLowerCase()
        if (['true', '1', 'yes', 'active'].includes(activeValue)) {
          parsedRow.is_active = true
        } else if (['false', '0', 'no', 'inactive'].includes(activeValue)) {
          parsedRow.is_active = false
        } else {
          errors.push({
            line: lineNumber,
            field: 'is_active',
            value: row.is_active,
            message: 'is_active must be true, false, 1, 0, yes, no, active, or inactive'
          })
        }
      } else {
        parsedRow.is_active = true // Default to true
      }

      // If this row has all required fields, add it to valid rows
      if (parsedRow.name && parsedRow.hourly_rate_usd !== undefined) {
        validRows.push(parsedRow as ParsedCategoryRow)
      }
    })

    return {
      success: errors.length === 0,
      data: validRows,
      errors,
      totalRows: records.length,
      validRows: validRows.length
    }

  } catch (error) {
    return {
      success: false,
      data: [],
      errors: [{
        line: 1,
        field: 'file',
        value: '',
        message: `CSV parsing error: ${error instanceof Error ? error.message : 'Unknown error'}`
      }],
      totalRows: 0,
      validRows: 0
    }
  }
}

/**
 * Generate CSV content from category data
 */
export function generateCSV(categories: any[]): string {
  const headers = ['name', 'hourly_rate_usd', 'color', 'is_active', 'total_hours', 'created_at']
  
  const csvData = categories.map(category => ({
    name: category.name,
    hourly_rate_usd: category.hourly_rate_usd || category.hourly_rate,
    color: category.color || '',
    is_active: category.is_active !== false ? 'true' : 'false',
    total_hours: category.total_hours || 0,
    created_at: category.created_at || new Date().toISOString()
  }))

  return stringify([headers, ...csvData.map(row => [
    row.name,
    row.hourly_rate_usd,
    row.color,
    row.is_active,
    row.total_hours,
    row.created_at
  ])], {
    header: false
  })
}

/**
 * Generate CSV template with sample data
 */
export function generateCSVTemplate(): string {
  const headers = ['name', 'hourly_rate_usd', 'color', 'is_active', 'total_hours', 'created_at']
  const sampleData = [
    ['Development', '75.00', '#3B82F6', 'true', '45.5', '2024-01-01T00:00:00Z'],
    ['Design', '65.00', '#10B981', 'true', '32.25', '2024-01-01T00:00:00Z'],
    ['Research', '55.00', '#F59E0B', 'true', '18.75', '2024-01-01T00:00:00Z'],
    ['Management', '85.00', '#8B5CF6', 'true', '25.0', '2024-01-01T00:00:00Z']
  ]

  return stringify([headers, ...sampleData], {
    header: false
  })
}

/**
 * Validate file size and type
 */
export function validateCSVFile(file: File): { valid: boolean; error?: string } {
  // Check file size (max 5MB)
  if (file.size > 5 * 1024 * 1024) {
    return { valid: false, error: 'File size must be less than 5MB' }
  }

  // Check file type
  const validTypes = ['text/csv', 'application/csv', 'text/plain']
  const validExtensions = ['.csv', '.txt']
  
  const hasValidType = validTypes.includes(file.type)
  const hasValidExtension = validExtensions.some(ext => file.name.toLowerCase().endsWith(ext))
  
  if (!hasValidType && !hasValidExtension) {
    return { valid: false, error: 'File must be a CSV file (.csv extension)' }
  }

  return { valid: true }
}

/**
 * Check for duplicate category names
 */
export function findDuplicateNames(categories: ParsedCategoryRow[]): string[] {
  const nameCount: Record<string, number> = {}
  const duplicates: string[] = []

  categories.forEach(category => {
    const name = category.name.toLowerCase()
    nameCount[name] = (nameCount[name] || 0) + 1
    if (nameCount[name] === 2) {
      duplicates.push(category.name)
    }
  })

  return duplicates
}

/**
 * Read file content as text
 */
export function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    
    reader.onload = (event) => {
      const result = event.target?.result
      if (typeof result === 'string') {
        resolve(result)
      } else {
        reject(new Error('Failed to read file as text'))
      }
    }
    
    reader.onerror = () => {
      reject(new Error('Failed to read file'))
    }
    
    reader.readAsText(file)
  })
} 