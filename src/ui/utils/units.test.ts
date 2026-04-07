/**
 * Unit tests for typography formatting helpers.
 *
 * These helpers are added in Phase 0.3 of bugs-typography-improvements.md.
 * Until the helpers are implemented, every test in this file will FAIL —
 * that's expected and correct (test-driven development). As each helper
 * lands in src/ui/utils/units.ts, its corresponding tests turn green.
 *
 * Run with:  npm test
 * Run only this file:  npx vitest src/ui/utils/units.test.ts
 */

import { describe, it, expect } from 'vitest';

import {
  roundTo,
  quoteFontFamily,
  buildFontStack,
  mapTextCase,
  mapTextDecoration,
  formatLetterSpacing,
  formatWithUnit,
} from './units';

// ---------------------------------------------------------------------------
// roundTo
// ---------------------------------------------------------------------------

describe('roundTo', () => {
  it('rounds floats to 3 decimals by default', () => {
    expect(roundTo(-0.6000000238418579)).toBe(-0.6);
  });

  it('rounds positive floats with float drift', () => {
    expect(roundTo(0.30000000000000004)).toBe(0.3);
  });

  it('preserves integers', () => {
    expect(roundTo(16)).toBe(16);
    expect(roundTo(-1)).toBe(-1);
  });

  it('handles zero', () => {
    expect(roundTo(0)).toBe(0);
  });

  it('respects custom precision', () => {
    expect(roundTo(1.23456, 2)).toBe(1.23);
    expect(roundTo(1.23456, 4)).toBe(1.2346);
  });

  it('handles already-clean values', () => {
    expect(roundTo(1.5)).toBe(1.5);
    expect(roundTo(-0.5)).toBe(-0.5);
  });

  it('does not introduce trailing zeros', () => {
    // Numbers don't carry display precision; 1.5 and 1.500 are the same value.
    // This test guards against any helper that returns a string by accident.
    expect(typeof roundTo(1.5)).toBe('number');
  });
});

// ---------------------------------------------------------------------------
// quoteFontFamily
// ---------------------------------------------------------------------------

describe('quoteFontFamily', () => {
  it('wraps multi-word names in double quotes', () => {
    expect(quoteFontFamily('DM Mono')).toBe('"DM Mono"');
  });

  it('wraps three-word names', () => {
    expect(quoteFontFamily('Source Sans Pro')).toBe('"Source Sans Pro"');
  });

  it('leaves single-word names unquoted', () => {
    expect(quoteFontFamily('Outfit')).toBe('Outfit');
    expect(quoteFontFamily('Manrope')).toBe('Manrope');
  });

  it('handles empty string without producing empty quotes', () => {
    expect(quoteFontFamily('')).toBe('');
  });

  it('does not double-quote already-quoted strings', () => {
    // Defensive: if upstream code accidentally quotes twice, we still get one pair.
    expect(quoteFontFamily('"DM Mono"')).toBe('"DM Mono"');
  });
});

// ---------------------------------------------------------------------------
// buildFontStack
// ---------------------------------------------------------------------------

describe('buildFontStack', () => {
  it('combines a quoted multi-word family with a fallback string', () => {
    expect(buildFontStack('DM Mono', 'ui-monospace, monospace')).toBe(
      '"DM Mono", ui-monospace, monospace',
    );
  });

  it('combines an unquoted single-word family with a fallback', () => {
    expect(buildFontStack('Outfit', 'system-ui, sans-serif')).toBe(
      'Outfit, system-ui, sans-serif',
    );
  });

  it('omits the fallback when empty', () => {
    expect(buildFontStack('Outfit', '')).toBe('Outfit');
  });

  it('omits the fallback when undefined', () => {
    expect(buildFontStack('Outfit', undefined)).toBe('Outfit');
  });

  it('trims whitespace around the fallback', () => {
    expect(buildFontStack('Outfit', '  system-ui, sans-serif  ')).toBe(
      'Outfit, system-ui, sans-serif',
    );
  });
});

// ---------------------------------------------------------------------------
// mapTextCase
// ---------------------------------------------------------------------------

describe('mapTextCase', () => {
  it('maps UPPER to "uppercase"', () => {
    expect(mapTextCase('UPPER')).toBe('uppercase');
  });

  it('maps LOWER to "lowercase"', () => {
    expect(mapTextCase('LOWER')).toBe('lowercase');
  });

  it('maps TITLE to "capitalize"', () => {
    expect(mapTextCase('TITLE')).toBe('capitalize');
  });

  it('returns null for ORIGINAL so callers can omit the property', () => {
    expect(mapTextCase('ORIGINAL')).toBeNull();
  });

  it('returns null for unknown values rather than throwing', () => {
    // Defensive: Figma occasionally adds new enum values.
    expect(mapTextCase('SMALL_CAPS' as never)).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// mapTextDecoration
// ---------------------------------------------------------------------------

describe('mapTextDecoration', () => {
  it('maps UNDERLINE to "underline"', () => {
    expect(mapTextDecoration('UNDERLINE')).toBe('underline');
  });

  it('maps STRIKETHROUGH to "line-through"', () => {
    expect(mapTextDecoration('STRIKETHROUGH')).toBe('line-through');
  });

  it('returns null for NONE', () => {
    expect(mapTextDecoration('NONE')).toBeNull();
  });

  it('returns null for unknown values', () => {
    expect(mapTextDecoration('OVERLINE' as never)).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// formatLetterSpacing
// ---------------------------------------------------------------------------

describe('formatLetterSpacing', () => {
  it('rounds float garbage before formatting (px)', () => {
    expect(formatLetterSpacing(-0.6000000238418579, 'px')).toBe('-0.6px');
  });

  it('rounds float garbage before formatting (rem)', () => {
    // -0.6px / 16 = -0.0375rem — must be clean
    expect(formatLetterSpacing(-0.6000000238418579, 'rem')).toBe('-0.0375rem');
  });

  it('returns "normal" for zero', () => {
    expect(formatLetterSpacing(0, 'px')).toBe('normal');
    expect(formatLetterSpacing(0, 'rem')).toBe('normal');
  });

  it('formats positive values in px', () => {
    expect(formatLetterSpacing(0.5, 'px')).toBe('0.5px');
  });

  it('formats positive values in rem', () => {
    expect(formatLetterSpacing(16, 'rem')).toBe('1rem');
  });
});

// ---------------------------------------------------------------------------
// formatWithUnit
// ---------------------------------------------------------------------------

describe('formatWithUnit', () => {
  it('appends px to integer values', () => {
    expect(formatWithUnit(16, 'px')).toBe('16px');
  });

  it('converts to rem with no float drift', () => {
    expect(formatWithUnit(16, 'rem')).toBe('1rem');
    expect(formatWithUnit(24, 'rem')).toBe('1.5rem');
    expect(formatWithUnit(56, 'rem')).toBe('3.5rem');
  });

  it('rounds rem conversions cleanly', () => {
    // 14 / 16 = 0.875 — must not produce 0.8750000000001
    expect(formatWithUnit(14, 'rem')).toBe('0.875rem');
  });

  it('returns "normal" for the AUTO sentinel value', () => {
    // Adjust the sentinel if your normalized form uses null/undefined.
    expect(formatWithUnit('AUTO' as never, 'px')).toBe('normal');
    expect(formatWithUnit('AUTO' as never, 'rem')).toBe('normal');
  });

  it('handles zero', () => {
    expect(formatWithUnit(0, 'px')).toBe('0px');
    expect(formatWithUnit(0, 'rem')).toBe('0rem');
  });
});
