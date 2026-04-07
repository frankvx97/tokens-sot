/**
 * Shared ExportOptions fixtures.
 *
 * `defaultOptions` mirrors the defaults defined in src/ui/state/app-state.tsx.
 * If you change the defaults in app-state, mirror them here.
 *
 * Use `optionsWith({ key: value })` for tests that need to override one or
 * two fields without redefining the entire options object.
 */

import type { ExportOptions } from '@/shared/types';

export const defaultOptions: ExportOptions = {
  // Existing options (adjust to match your real defaults)
  unit: 'px',
  colorFormat: 'hex',
  casing: 'kebab',
  exportStrategy: 'singleFile',

  // New options added in bugs-typography-improvements (Phase 0.2)
  typographyFormat: 'default',
  useDTCG: false,
  emitUtilityClasses: false,
  fontFallbacks: {},
} as ExportOptions;

export const optionsWith = (overrides: Partial<ExportOptions>): ExportOptions => ({
  ...defaultOptions,
  ...overrides,
});
