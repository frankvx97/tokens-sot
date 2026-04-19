/**
 * Unit conversion utilities for token values
 */

export type UnitType = 'px' | 'rem';

/**
 * Round a number to a given number of decimal places.
 * Cleans up IEEE 754 float garbage (e.g. -0.6000000238418579 → -0.6).
 */
export function roundTo(value: number, decimals: number = 3): number {
  const factor = Math.pow(10, decimals);
  return Math.round(value * factor) / factor;
}

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
    return `${roundTo(remValue, 4)}rem`;
  }
  return `${roundTo(value, 3)}px`;
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

  return formatWithUnit(roundTo(letterSpacing, 3), unit, baseFontSize);
}

/**
 * Wrap a font family name in double quotes if it contains spaces.
 */
export function quoteFontFamily(family: string): string {
  if (/^".*"$/.test(family)) {
    return family;
  }
  if (/\s/.test(family)) {
    return `"${family}"`;
  }
  return family;
}

/**
 * Build a font stack string: quoted family name + optional user-configured fallback.
 */
export function buildFontStack(family: string, fallbacks?: Record<string, string>): string {
  const quoted = quoteFontFamily(family);
  const fallback = fallbacks?.[family]?.trim();
  if (fallback) {
    return `${quoted}, ${fallback}`;
  }
  return quoted;
}

/**
 * Map Figma textCase to CSS text-transform value.
 * Returns null for default/ORIGINAL (should be omitted from output).
 */
export function mapTextCase(textCase?: string): string | null {
  switch (textCase) {
    case 'UPPER': return 'uppercase';
    case 'LOWER': return 'lowercase';
    case 'TITLE': return 'capitalize';
    case 'ORIGINAL':
    default: return null;
  }
}

/**
 * Check if a token likely represents a font weight based on its name or group path.
 */
export function isLikelyFontWeight(name: string, groupPath?: string[]): boolean {
  const fullPath = [...(groupPath ?? []), name].join('/').toLowerCase();
  return /weight/.test(fullPath);
}

/**
 * Map a font weight name string to its CSS numeric value.
 * Returns the numeric string if recognized, or null if not a known weight name.
 * Reference: https://docs.tokens.studio/manage-tokens/token-types/typography/font-weight
 */
export function mapFontWeightString(value: string): number | null {
  const normalized = value.toLowerCase().replace(/[\s-_]+/g, '');
  switch (normalized) {
    case 'thin':
    case 'hairline':
      return 100;
    case 'extralight':
    case 'ultralight':
      return 200;
    case 'light':
      return 300;
    case 'regular':
    case 'normal':
      return 400;
    case 'medium':
      return 500;
    case 'semibold':
    case 'demibold':
      return 600;
    case 'bold':
      return 700;
    case 'extrabold':
    case 'ultrabold':
      return 800;
    case 'black':
    case 'heavy':
      return 900;
    case 'extrablack':
    case 'ultrablack':
      return 950;
    default:
      return null;
  }
}

/**
 * Describes how a typography property should be rendered:
 * either as a resolved literal value or as a variable reference.
 */
export interface TypoPropertyValue {
  value: string;
  isAlias: boolean;
}

/**
 * Map Figma textDecoration to CSS text-decoration value.
 * Returns null for default/NONE (should be omitted from output).
 */
export function mapTextDecoration(textDecoration?: string): string | null {
  switch (textDecoration) {
    case 'UNDERLINE': return 'underline';
    case 'STRIKETHROUGH': return 'line-through';
    case 'NONE':
    default: return null;
  }
}
