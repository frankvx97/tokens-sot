/**
 * Casing transformation utilities for token names
 */

export type CasingStyle = 'lowerCamelCase' | 'UPPER_SNAKE_CASE' | 'kebab-case' | 'snake_case' | 'PascalCase';

/**
 * Convert a string to the specified casing style
 */
export function toCasing(str: string, style: CasingStyle): string {
  // First, split the string into words
  const words = splitIntoWords(str);

  switch (style) {
    case 'lowerCamelCase':
      return words
        .map((word, index) => (index === 0 ? word.toLowerCase() : capitalize(word)))
        .join('');

    case 'PascalCase':
      return words.map(capitalize).join('');

    case 'kebab-case':
      return words.map((w) => w.toLowerCase()).join('-');

    case 'snake_case':
      return words.map((w) => w.toLowerCase()).join('_');

    case 'UPPER_SNAKE_CASE':
      return words.map((w) => w.toUpperCase()).join('_');

    default:
      return str;
  }
}

/**
 * Split a string into words, handling various formats
 */
function splitIntoWords(str: string): string[] {
  // First, sanitize special characters that can cause syntax errors
  // Replace parentheses, brackets, and other special chars with separators
  const sanitized = str
    .replace(/[()[\]{}]/g, '-') // Replace brackets/parens with hyphens
    .replace(/[<>|\\@#$%^&*+=`~"':;,?.!]/g, '') // Remove other special chars
    .trim();
  
  // Handle different separators: spaces, hyphens, underscores, slashes
  return sanitized
    .replace(/([a-z])([A-Z])/g, '$1 $2') // camelCase -> camel Case
    .replace(/([A-Z])([A-Z][a-z])/g, '$1 $2') // ABCDef -> ABC Def
    .split(/[\s\-_/]+/) // Split on separators
    .filter(Boolean);
}

/**
 * Capitalize first letter of a word
 */
function capitalize(word: string): string {
  return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
}
