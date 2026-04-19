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
  format: 'css',
  casing: 'kebab-case',
  color: 'hex',
  unit: 'px',
  exportFileStrategy: 'single',
  includeTopLevelName: false,
  includeAllModes: true,
  ignoreAliases: false,
  useRootAlias: false,
  addFallback: false,
  separateModes: false,
  includeIndexFile: false,
  typographyFormat: 'default',
  useDTCG: false,
  cssTypographyFormat: 'classes',
  cssIncludeBodyBaseline: false,
  cssIncludeHeadingDefaults: false,
  cssHeadingTextWrapBalance: false,
  fontFallbacks: {},
};

export const optionsWith = (overrides: Partial<ExportOptions>): ExportOptions => ({
  ...defaultOptions,
  ...overrides,
});
