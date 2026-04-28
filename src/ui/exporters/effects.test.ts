/**
 * Tests for the effects exporter helpers.
 *
 * Run only this file: npx vitest src/ui/exporters/effects.test.ts
 */

import { describe, it, expect } from 'vitest';

import type { ShadowEntry } from '@/shared/types';
import { formatShadowList } from './effects';

type DropOrInner = Extract<ShadowEntry, { type: 'drop-shadow' | 'inner-shadow' }>;

describe('formatShadowList', () => {
  it('reverses Figma effect order so the inner ring of a focus style paints on top', () => {
    // Figma stores effects bottom-to-top: outer blue ring is index 0, inner
    // white halo is index 1. CSS box-shadow paints the first comma-separated
    // layer on top, so the emitted string must list the inner halo first.
    // Spread values stay absolute per-layer (matching Figma's render model).
    const shadows: DropOrInner[] = [
      {
        type: 'drop-shadow',
        x: 0,
        y: 0,
        blur: 0,
        spread: 4,
        color: { r: 0.055, g: 0.647, b: 0.914, a: 1 }, // #0ea5e9
      },
      {
        type: 'drop-shadow',
        x: 0,
        y: 0,
        blur: 0,
        spread: 2,
        color: { r: 0.961, g: 0.961, b: 0.961, a: 1 }, // #f5f5f5
      },
    ];

    const out = formatShadowList(shadows, 'hex');

    expect(out).toBe(
      '0px 0px 0px 2px #f5f5f5, 0px 0px 0px 4px #0ea5e9'
    );
  });

  it('preserves inset markers after reversing', () => {
    const shadows: DropOrInner[] = [
      {
        type: 'drop-shadow',
        x: 0,
        y: 4,
        blur: 8,
        spread: 0,
        color: { r: 0, g: 0, b: 0, a: 0.1 },
      },
      {
        type: 'inner-shadow',
        x: 0,
        y: 1,
        blur: 0,
        spread: 0,
        color: { r: 1, g: 1, b: 1, a: 0.5 },
      },
    ];

    const out = formatShadowList(shadows, 'hex');

    expect(out.startsWith('inset ')).toBe(true);
  });
});
