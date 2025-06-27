/**
 * CSV parsing utilities for category bulk upload
 * Task 4.5: Implement CSV parsing utility with validation for category data
 */

import { isValidCurrencyAmount, parseCurrency } from './currency-formatter'

export interface CategoryCSVRow {
  name: string
  hourly_rate_usd: number
  description?: string
  color?: string
  is_active?: boolean
}

export interface ParsedCSVResult {
  success: boolean
  data: CategoryCSVRow[]
  errors: CSVError[]
  warnings: CSVWarning[]
  summary: {
    totalRows: number
    validRows: number
    errorRows: number
    warningRows: number
  }
}

export interface CSVError {
  row: number
  field?: string
  message: string
  data?: any
}

export interface CSVWarning {
  row: number
  field?: string
  message: string
  data?: any
}

// Expected CSV headers (case insensitive)
const EXPECTED_HEADERS = {
  name: ['name', 'category_name', 'category', 'title'],
  hourly_rate_usd: ['hourly_rate_usd', 'hourly_rate', 'rate', 'hourly_rate_dollars', 'usd_rate'],
  description: ['description', 'desc', 'details', 'notes'],
  color: ['color', 'colour', 'hex_color', 'category_color'],
  is_active: ['is_active', 'active', 'enabled', 'status']
}

// Color validation regex for hex colors
const HEX_COLOR_REGEX = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/

/**
 * Parse CSV content for category data
 */
export function parseCSV(csvContent: string): ParsedCSVResult {
  const result: ParsedCSVResult = {
    success: false,
    data: [],
    errors: [],
    warnings: [],
    summary: {
      totalRows: 0,
      validRows: 0,
      errorRows: 0,
      warningRows: 0
    }
  }

  try {
    // Split into lines and filter out empty lines
    const lines = csvContent
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0)

    if (lines.length === 0) {
      result.errors.push({
        row: 0,
        message: 'CSV file is empty'
      })
      return result
    }

    // Parse header row
    const headerLine = lines[0]
    const headers = parseCSVLine(headerLine)
    
    if (headers.length === 0) {
      result.errors.push({
        row: 1,
        message: 'No headers found in CSV file'
      })
      return result
    }

    // Map headers to expected fields
    const headerMapping = mapHeaders(headers)
    
    // Validate required headers
    if (!headerMapping.name) {
      result.errors.push({
        row: 1,
        field: 'name',
        message: 'Required column "name" not found. Expected one of: ' + EXPECTED_HEADERS.name.join(', ')
      })
    }

    if (!headerMapping.hourly_rate_usd) {
      result.errors.push({
        row: 1,
        field: 'hourly_rate_usd', 
        message: 'Required column "hourly_rate_usd" not found. Expected one of: ' + EXPECTED_HEADERS.hourly_rate_usd.join(', ')
      })
    }

    // If we have critical header errors, return early
    if (result.errors.length > 0) {
      return result
    }

    // Process data rows
    const dataLines = lines.slice(1)
    result.summary.totalRows = dataLines.length

    dataLines.forEach((line, index) => {
      const rowNumber = index + 2 // +2 because we skipped header and arrays are 0-indexed
      const values = parseCSVLine(line)
      
      if (values.length === 0) {
        result.warnings.push({
          row: rowNumber,
          message: 'Empty row skipped'
        })
        return
      }

      const categoryData = parseRowData(values, headerMapping, rowNumber)
      
      if (categoryData.errors.length > 0) {
        result.errors.push(...categoryData.errors)
        result.summary.errorRows++
      } else {
        result.data.push(categoryData.data!)
        result.summary.validRows++
        
        if (categoryData.warnings.length > 0) {
          result.warnings.push(...categoryData.warnings)
          result.summary.warningRows++
        }
      }
    })

    // Check for duplicate names within the CSV
    const nameCount = new Map<string, number[]>()
    result.data.forEach((category, index) => {
      const normalizedName = category.name.toLowerCase().trim()
      if (!nameCount.has(normalizedName)) {
        nameCount.set(normalizedName, [])
      }
      nameCount.get(normalizedName)!.push(index + 2) // +2 for header and 1-indexed
    })

    nameCount.forEach((rows, name) => {
      if (rows.length > 1) {
        rows.forEach(row => {
          result.warnings.push({
            row,
            field: 'name',
            message: `Duplicate category name "${name}" found in rows: ${rows.join(', ')}`
          })
        })
      }
    })

    result.success = result.summary.validRows > 0 && result.errors.length === 0

  } catch (error) {
    result.errors.push({
      row: 0,
      message: `Failed to parse CSV: ${error instanceof Error ? error.message : 'Unknown error'}`
    })
  }

  return result
}

/**
 * Parse a single CSV line into array of values
 */
function parseCSVLine(line: string): string[] {
  const values: string[] = []
  let current = ''
  let inQuotes = false
  let i = 0

  while (i < line.length) {
    const char = line[i]
    const nextChar = line[i + 1]

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        // Escaped quote
        current += '"'
        i += 2
      } else {
        // Toggle quote mode
        inQuotes = !inQuotes
        i++
      }
    } else if (char === ',' && !inQuotes) {
      // End of field
      values.push(current.trim())
      current = ''
      i++
    } else {
      current += char
      i++
    }
  }

  // Add the last field
  values.push(current.trim())

  return values
}

/**
 * Map CSV headers to expected field names
 */
function mapHeaders(headers: string[]): Record<string, number> {
  const mapping: Record<string, number> = {}

  headers.forEach((header, index) => {
    const normalizedHeader = header.toLowerCase().trim()
    
    Object.entries(EXPECTED_HEADERS).forEach(([field, patterns]) => {
      if (patterns.includes(normalizedHeader)) {
        mapping[field] = index
      }
    })
  })

  return mapping
}

/**
 * Parse and validate a single row of data
 */
function parseRowData(
  values: string[], 
  headerMapping: Record<string, number>, 
  rowNumber: number
): {
  data?: CategoryCSVRow
  errors: CSVError[]
  warnings: CSVWarning[]
} {
  const errors: CSVError[] = []
  const warnings: CSVWarning[] = []
  
  // Extract values based on header mapping
  const name = values[headerMapping.name]?.trim()
  const hourlyRateStr = values[headerMapping.hourly_rate_usd]?.trim()
  const description = values[headerMapping.description]?.trim()
  const color = values[headerMapping.color]?.trim()
  const isActiveStr = values[headerMapping.is_active]?.trim()

  // Validate name (required)
  if (!name) {
    errors.push({
      row: rowNumber,
      field: 'name',
      message: 'Category name is required'
    })
  } else if (name.length < 2) {
    errors.push({
      row: rowNumber,
      field: 'name',
      message: 'Category name must be at least 2 characters long'
    })
  } else if (name.length > 100) {
    errors.push({
      row: rowNumber,
      field: 'name',
      message: 'Category name must be less than 100 characters'
    })
  }

  // Validate hourly rate (required)
  let hourlyRate = 0
  if (!hourlyRateStr) {
    errors.push({
      row: rowNumber,
      field: 'hourly_rate_usd',
      message: 'Hourly rate is required'
    })
  } else if (!isValidCurrencyAmount(hourlyRateStr)) {
    errors.push({
      row: rowNumber,
      field: 'hourly_rate_usd',
      message: 'Invalid hourly rate format. Use format like: 50.00'
    })
  } else {
    hourlyRate = parseCurrency(hourlyRateStr)
    if (hourlyRate < 0) {
      errors.push({
        row: rowNumber,
        field: 'hourly_rate_usd',
        message: 'Hourly rate must be positive'
      })
    } else if (hourlyRate > 1000) {
      warnings.push({
        row: rowNumber,
        field: 'hourly_rate_usd',
        message: 'Hourly rate is unusually high (over $1,000/hr)'
      })
    }
  }

  // Validate color (optional)
  let validColor: string | undefined
  if (color) {
    if (HEX_COLOR_REGEX.test(color)) {
      validColor = color
    } else {
      warnings.push({
        row: rowNumber,
        field: 'color',
        message: 'Invalid color format. Use hex format like #FF0000. Using default color.'
      })
    }
  }

  // Validate is_active (optional)
  let isActive = true // default
  if (isActiveStr) {
    const normalized = isActiveStr.toLowerCase()
    if (['true', 'yes', '1', 'active', 'enabled'].includes(normalized)) {
      isActive = true
    } else if (['false', 'no', '0', 'inactive', 'disabled'].includes(normalized)) {
      isActive = false
    } else {
      warnings.push({
        row: rowNumber,
        field: 'is_active',
        message: 'Invalid active status. Use true/false, yes/no, or 1/0. Using default (true).'
      })
    }
  }

  // If we have errors, don't create the data object
  if (errors.length > 0) {
    return { errors, warnings }
  }

  const data: CategoryCSVRow = {
    name: name!,
    hourly_rate_usd: hourlyRate,
    is_active: isActive
  }

  if (description && description.length > 0) {
    data.description = description
  }

  if (validColor) {
    data.color = validColor
  }

  return { data, errors, warnings }
}

/**
 * Generate a CSV template for category upload
 */
export function generateCSVTemplate(): string {
  const headers = ['name', 'hourly_rate_usd', 'description', 'color', 'is_active']
  const sampleData = [
    ['Development', '85.00', 'Software development and programming', '#3B82F6', 'true'],
    ['Design', '75.00', 'UI/UX design and graphics', '#10B981', 'true'],
    ['Research', '65.00', 'Market research and analysis', '#F59E0B', 'true'],
    ['Writing', '55.00', 'Content writing and documentation', '#EF4444', 'true'],
    ['Consulting', '125.00', 'Business consulting and strategy', '#8B5CF6', 'false']
  ]

  const lines = [
    headers.join(','),
    ...sampleData.map(row => 
      row.map(value => value.includes(',') ? `"${value}"` : value).join(',')
    )
  ]

  return lines.join('\n')
}

/**
 * Convert category data to CSV format
 */
export function categoriesToCSV(categories: CategoryCSVRow[]): string {
  const headers = ['name', 'hourly_rate_usd', 'description', 'color', 'is_active']
  
  const lines = [
    headers.join(','),
    ...categories.map(category => [
      category.name.includes(',') ? `"${category.name}"` : category.name,
      category.hourly_rate_usd.toString(),
      category.description && category.description.includes(',') 
        ? `"${category.description}"` 
        : (category.description || ''),
      category.color || '',
      category.is_active !== false ? 'true' : 'false'
    ].join(','))
  ]

  return lines.join('\n')
}

/**
 * Validate uploaded file before parsing
 */
export function validateCSVFile(file: File): string | null {
  if (!file) {
    return 'No file selected'
  }

  if (file.type !== 'text/csv' && !file.name.toLowerCase().endsWith('.csv')) {
    return 'Please upload a CSV file'
  }

  if (file.size === 0) {
    return 'File is empty'
  }

  if (file.size > 1024 * 1024) { // 1MB limit
    return 'File is too large. Maximum size is 1MB'
  }

  return null
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

export default {
  parse: parseCSV,
  generateTemplate: generateCSVTemplate,
  categoriesToCSV,
  validateFile: validateCSVFile,
  readFile: readFileAsText
} 