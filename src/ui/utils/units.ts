/**
 * Unit conversion utilities for token values
 */

export type UnitType = 'px' | 'rem';

/**
 * Convert pixel value to rem
 * Default base font size is 16px
 */
export function pxToRem(px: number, baseFontSize: number = 16): number {
  return px / baseFontSize;
}

/**
 * Format a numeric value with the specified unit
 */
export function formatWithUnit(value: number, unit: UnitType, baseFontSize?: number): string {
  if (unit === 'rem') {
    const remValue = pxToRem(value, baseFontSize);
    // Round to 4 decimal places to avoid floating point issues
    return `${Math.round(remValue * 10000) / 10000}rem`;
  }
  return `${value}px`;
}

/**
 * Format typography line height
 * Can be 'AUTO', a pixel value, or a percentage
 */
export function formatLineHeight(lineHeight: number | string, unit: UnitType, baseFontSize?: number): string {
  if (lineHeight === 'AUTO') {
    return 'normal';
  }

  if (typeof lineHeight === 'string') {
    return lineHeight;
  }

  return formatWithUnit(lineHeight, unit, baseFontSize);
}

/**
 * Format letter spacing (can be percentage or pixel value)
 */
export function formatLetterSpacing(letterSpacing: number, unit: UnitType, baseFontSize?: number): string {
  if (letterSpacing === 0) {
    return 'normal';
  }

  return formatWithUnit(letterSpacing, unit, baseFontSize);
}
