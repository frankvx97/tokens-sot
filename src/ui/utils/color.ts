/**
 * Color conversion utilities for token values
 */

export interface RGBA {
  r: number;
  g: number;
  b: number;
  a: number;
}

/**
 * Convert RGBA (0-1 range) to hex color string
 */
export function rgbaToHex(rgba: RGBA): string {
  const r = Math.round(rgba.r * 255);
  const g = Math.round(rgba.g * 255);
  const b = Math.round(rgba.b * 255);

  const toHex = (n: number) => n.toString(16).padStart(2, '0');

  if (rgba.a < 1) {
    const a = Math.round(rgba.a * 255);
    return `#${toHex(r)}${toHex(g)}${toHex(b)}${toHex(a)}`;
  }

  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

/**
 * Convert RGBA (0-1 range) to rgb/rgba CSS function
 */
export function rgbaToRgbString(rgba: RGBA): string {
  const r = Math.round(rgba.r * 255);
  const g = Math.round(rgba.g * 255);
  const b = Math.round(rgba.b * 255);

  if (rgba.a < 1) {
    return `rgba(${r}, ${g}, ${b}, ${rgba.a.toFixed(2)})`;
  }

  return `rgb(${r}, ${g}, ${b})`;
}

/**
 * Convert RGBA (0-1 range) to HSL
 */
export function rgbaToHsl(rgba: RGBA): { h: number; s: number; l: number; a: number } {
  const r = rgba.r;
  const g = rgba.g;
  const b = rgba.b;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const delta = max - min;

  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (delta !== 0) {
    s = l > 0.5 ? delta / (2 - max - min) : delta / (max + min);

    switch (max) {
      case r:
        h = ((g - b) / delta + (g < b ? 6 : 0)) / 6;
        break;
      case g:
        h = ((b - r) / delta + 2) / 6;
        break;
      case b:
        h = ((r - g) / delta + 4) / 6;
        break;
    }
  }

  return {
    h: Math.round(h * 360),
    s: Math.round(s * 100),
    l: Math.round(l * 100),
    a: rgba.a
  };
}

/**
 * Convert RGBA (0-1 range) to hsl/hsla CSS function
 */
export function rgbaToHslString(rgba: RGBA): string {
  const hsl = rgbaToHsl(rgba);

  if (rgba.a < 1) {
    return `hsla(${hsl.h}, ${hsl.s}%, ${hsl.l}%, ${rgba.a.toFixed(2)})`;
  }

  return `hsl(${hsl.h}, ${hsl.s}%, ${hsl.l}%)`;
}

/**
 * Format color based on user preference
 */
export type ColorFormat = 'hex' | 'rgb' | 'hsl';

export function formatColor(rgba: RGBA, format: ColorFormat): string {
  switch (format) {
    case 'hex':
      return rgbaToHex(rgba);
    case 'rgb':
      return rgbaToRgbString(rgba);
    case 'hsl':
      return rgbaToHslString(rgba);
    default:
      return rgbaToHex(rgba);
  }
}
