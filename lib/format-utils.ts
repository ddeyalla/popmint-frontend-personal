/**
 * Utility functions for formatting data in the UI
 */

/**
 * Formats JSON data for display by removing special characters and escape sequences
 * @param data The data to format
 * @returns Formatted string or JSX element
 */
export function formatJsonData(data: any): string {
  if (!data) return '';

  // If it's already a string, clean it up
  if (typeof data === 'string') {
    try {
      // Try to parse it as JSON first
      const parsed = JSON.parse(data);
      return formatJsonData(parsed);
    } catch (e) {
      // Not valid JSON, just clean the string
      return cleanString(data);
    }
  }

  // Format object or array as JSON with proper indentation
  try {
    // Use a more readable format with proper indentation
    return cleanString(JSON.stringify(data, null, 2));
  } catch (e) {
    // Fallback if JSON.stringify fails
    console.error('Error formatting JSON data:', e);
    return 'Error formatting data';
  }
}

/**
 * Cleans a string by removing escape sequences and normalizing whitespace
 * @param str The string to clean
 * @returns Cleaned string
 */
export function cleanString(str: string): string {
  if (!str) return '';

  return str
    // Replace escape sequences
    .replace(/\\n/g, '\n')
    .replace(/\\t/g, '  ')
    .replace(/\\"/g, '"')
    .replace(/\\'/g, "'")
    .replace(/\\\\/g, '\\')
    // Handle Unicode escape sequences
    .replace(/\\u([0-9a-fA-F]{4})/g, (match, hex) => String.fromCharCode(parseInt(hex, 16)))
    // Remove control characters but preserve common ones
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F]/g, '')
    // Normalize whitespace
    .replace(/\s+\n/g, '\n')
    .replace(/\n\s+/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    // Clean up any remaining malformed characters
    .replace(/[^\x20-\x7E\n\r\t\u00A0-\uFFFF]/g, '');
}

/**
 * Enhanced text cleaning function for product research output display
 * Removes JSON formatting, markdown, and improves readability
 * @param text The text to clean
 * @returns Cleaned and formatted text suitable for display
 */
export function cleanTextForDisplay(text: string): string {
  if (!text) return '';

  let cleaned = text;

  // Step 1: Remove JSON structure elements
  cleaned = cleaned
    // Remove JSON code blocks
    .replace(/```json\s*/gi, '')
    .replace(/```\s*/g, '')
    // Remove JSON object/array wrappers
    .replace(/^\s*[\{\[]/, '')
    .replace(/[\}\]]\s*$/, '')
    // Remove quotes around JSON keys (but preserve quoted values)
    .replace(/"([^"]+)":\s*/g, '$1: ')
    // Clean up JSON commas and formatting
    .replace(/,\s*\n/g, '\n')
    .replace(/,\s*(?=\w)/g, ', ')
    // Remove trailing commas
    .replace(/,\s*$/gm, '');

  // Step 2: Enhanced markdown removal
  cleaned = cleaned
    // Remove bold formatting (**text** and __text__)
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/__(.*?)__/g, '$1')
    // Remove italic formatting (*text* and _text_)
    .replace(/\*(.*?)\*/g, '$1')
    .replace(/_(.*?)_/g, '$1')
    // Remove inline code (`text`)
    .replace(/`(.*?)`/g, '$1')
    // Remove links [text](url)
    .replace(/\[(.*?)\]\((.*?)\)/g, '$1')
    // Remove headers (# ## ### etc.)
    .replace(/^#{1,6}\s+/gm, '')
    // Remove horizontal rules
    .replace(/^[-*_]{3,}\s*$/gm, '')
    // Remove strikethrough (~~text~~)
    .replace(/~~(.*?)~~/g, '$1');

  // Step 3: Improve text formatting and readability
  cleaned = cleaned
    // Convert JSON-style colons to readable format
    .replace(/(\w+):\s*"([^"]+)"/g, '$1: $2')
    .replace(/(\w+):\s*([^,\n]+)/g, '$1: $2')
    // Add proper spacing after periods
    .replace(/\.(?=[A-Z])/g, '. ')
    // Clean up multiple spaces
    .replace(/\s{2,}/g, ' ')
    // Clean up line breaks
    .replace(/\n\s*\n\s*\n/g, '\n\n')
    .replace(/^\s+|\s+$/g, '')
    // Improve list formatting
    .replace(/^[-*+]\s+/gm, '• ')
    // Clean up any remaining JSON artifacts
    .replace(/[{}[\]]/g, '')
    .replace(/^\s*,\s*/gm, '')
    .replace(/,\s*$/gm, '');

  // Step 4: Final cleanup using existing cleanString function
  cleaned = cleanString(cleaned);

  return cleaned.trim();
}

/**
 * Truncates text to a specified length and adds an ellipsis
 * @param text The text to truncate
 * @param maxLength Maximum length before truncation
 * @returns Truncated text with ellipsis if needed
 */
export function truncateText(text: string, maxLength: number = 300): string {
  if (!text || text.length <= maxLength) return text;

  // Find a good breaking point (end of sentence or paragraph)
  const breakPoints = [
    text.lastIndexOf('. ', maxLength),
    text.lastIndexOf('! ', maxLength),
    text.lastIndexOf('? ', maxLength),
    text.lastIndexOf('\n', maxLength)
  ];

  const bestBreakPoint = Math.max(...breakPoints);

  if (bestBreakPoint > maxLength * 0.7) {
    // If we found a good breaking point, use it
    return text.substring(0, bestBreakPoint + 1) + '...';
  }

  // Otherwise just cut at maxLength
  return text.substring(0, maxLength) + '...';
}

/**
 * Checks if the data is a concept or array of concepts
 * @param data The data to check
 * @returns Boolean indicating if it's concept data
 */
export function isConceptData(data: any): boolean {
  if (!data) return false;

  // Check if it's an array of concepts
  if (Array.isArray(data)) {
    return data.some(item =>
      item &&
      typeof item === 'object' &&
      ('concept_name' in item || 'title' in item || 'headline' in item)
    );
  }

  // Check if it's a single concept
  return (
    data &&
    typeof data === 'object' &&
    ('concept_name' in data || 'title' in data || 'headline' in data)
  );
}

/**
 * Extracts concepts from data and deduplicates them
 * @param data The data to extract concepts from
 * @returns Array of concept objects
 */
export function extractConcepts(data: any): any[] {
  if (!data) return [];

  // If it's already an array, filter for concepts
  if (Array.isArray(data)) {
    const concepts = data.filter(item =>
      item &&
      typeof item === 'object' &&
      ('concept_name' in item || 'title' in item || 'headline' in item)
    );

    // Deduplicate concepts based on concept_name or title
    return deduplicateConcepts(concepts);
  }

  // If it's a string, try to parse it
  if (typeof data === 'string') {
    try {
      const parsed = JSON.parse(data);
      return extractConcepts(parsed);
    } catch (e) {
      return [];
    }
  }

  // If it's a single concept, return it in an array
  if (isConceptData(data)) {
    return [data];
  }

  // If it's an object that might contain concepts
  if (data && typeof data === 'object') {
    // Look for arrays that might contain concepts
    for (const key in data) {
      if (Array.isArray(data[key])) {
        const concepts = extractConcepts(data[key]);
        if (concepts.length > 0) {
          return concepts;
        }
      }
    }
  }

  return [];
}

/**
 * Deduplicates concepts based on concept_name or title
 * @param concepts Array of concept objects
 * @returns Deduplicated array of concept objects
 */
function deduplicateConcepts(concepts: any[]): any[] {
  const uniqueConcepts = new Map();

  concepts.forEach(concept => {
    const key = concept.concept_name || concept.title || JSON.stringify(concept);
    if (!uniqueConcepts.has(key)) {
      uniqueConcepts.set(key, concept);
    }
  });

  return Array.from(uniqueConcepts.values());
}
