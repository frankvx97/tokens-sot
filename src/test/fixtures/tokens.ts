/**
 * Shared test fixtures for NormalizedToken inputs.
 *
 * IMPORTANT: This file makes assumptions about the shape of NormalizedToken
 * and TypographyTokenValue from src/shared/types.ts. The fields below match
 * what's described in bugs-typography-improvements.md, but if your actual
 * type definitions differ, adjust the casts/shapes here in ONE place rather
 * than scattered across exporter test files.
 *
 * Every exporter test should import scenarios from this file. Do not inline
 * token literals in test files — keep them centralized so a NormalizedToken
 * change is a one-file fix.
 */

import type { NormalizedToken } from '@/shared/types';

// ---------------------------------------------------------------------------
// Generic builders
// ---------------------------------------------------------------------------

/**
 * Base shape every token shares. Override per fixture as needed.
 * If your NormalizedToken interface has more required fields, add them here.
 */
const baseToken = (overrides: Partial<NormalizedToken> = {}): NormalizedToken =>
  ({
    id: 'token:default',
    key: 'default',
    name: 'default',
    groupPath: [],
    description: '',
    ...overrides,
  } as NormalizedToken);

export const colorToken = (overrides: Partial<NormalizedToken> = {}): NormalizedToken =>
  baseToken({
    id: 'token:color',
    key: 'color-primary-500',
    name: 'primary-500',
    groupPath: ['color'],
    kind: 'color',
    value: { r: 0.231, g: 0.510, b: 0.965, a: 1 },
    ...overrides,
  } as Partial<NormalizedToken>);

export const dimensionToken = (overrides: Partial<NormalizedToken> = {}): NormalizedToken =>
  baseToken({
    id: 'token:dim',
    key: 'spacing-md',
    name: 'md',
    groupPath: ['spacing'],
    kind: 'dimension',
    value: 16, // px
    ...overrides,
  } as Partial<NormalizedToken>);

export const shadowToken = (overrides: Partial<NormalizedToken> = {}): NormalizedToken =>
  baseToken({
    id: 'token:shadow',
    key: 'shadow-md',
    name: 'md',
    groupPath: ['shadow'],
    kind: 'shadow',
    value: [
      {
        type: 'DROP_SHADOW',
        offset: { x: 0, y: 4 },
        radius: 6,
        spread: -1,
        color: { r: 0, g: 0, b: 0, a: 0.1 },
      },
    ],
    ...overrides,
  } as Partial<NormalizedToken>);

export const typographyToken = (overrides: Partial<NormalizedToken> = {}): NormalizedToken =>
  baseToken({
    id: 'token:typo',
    key: 'heading-2xl',
    name: '2xl',
    groupPath: ['heading'],
    kind: 'typography',
    value: {
      fontFamily: 'Outfit',
      fontSize: 56,
      fontWeight: 600,
      lineHeight: 64,
      letterSpacing: -0.6,
      textCase: 'ORIGINAL',
      textDecoration: 'NONE',
    },
    ...overrides,
  } as Partial<NormalizedToken>);

export const fontWeightStringToken = (weight: string): NormalizedToken =>
  baseToken({
    id: `token:weight:${weight}`,
    key: `fonts-weight-${weight.toLowerCase()}`,
    name: weight.toLowerCase(),
    groupPath: ['fonts', 'weight'],
    kind: 'string',
    value: weight, // e.g., 'Regular', 'Semibold', 'Bold'
  } as Partial<NormalizedToken>);

// ---------------------------------------------------------------------------
// Pre-baked scenarios from the spec
// ---------------------------------------------------------------------------

/** Heading 2XL — fully resolved values, no aliases. */
export const HEADING_2XL_RESOLVED: NormalizedToken = typographyToken();

/** Heading 2XL — every typography axis bound to a primitives variable. */
export const HEADING_2XL_BOUND: NormalizedToken = typographyToken({
  value: {
    fontFamily: 'Outfit',
    fontSize: 56,
    fontWeight: 600,
    lineHeight: 64,
    letterSpacing: -0.6,
    textCase: 'ORIGINAL',
    textDecoration: 'NONE',
    fontFamilyAlias: 'fonts/family/headings',
    fontSizeAlias: 'fonts/size/2xl',
    fontWeightAlias: 'fonts/weight/semibold',
    lineHeightAlias: 'fonts/lineHeight/2xl',
    letterSpacingAlias: 'fonts/tracking/2xl',
  },
} as Partial<NormalizedToken>);

/** Partial binding — only fontFamily and fontWeight are aliased. */
export const HEADING_2XL_PARTIAL_BOUND: NormalizedToken = typographyToken({
  value: {
    fontFamily: 'Outfit',
    fontSize: 56,
    fontWeight: 600,
    lineHeight: 64,
    letterSpacing: -0.6,
    textCase: 'ORIGINAL',
    textDecoration: 'NONE',
    fontFamilyAlias: 'fonts/family/headings',
    fontWeightAlias: 'fonts/weight/semibold',
  },
} as Partial<NormalizedToken>);

/** Subheading with textCase: UPPER. */
export const SUBHEADING_UPPER: NormalizedToken = typographyToken({
  id: 'token:subheading',
  key: 'subheading-md',
  name: 'md',
  groupPath: ['subheading'],
  value: {
    fontFamily: 'Outfit',
    fontSize: 14,
    fontWeight: 500,
    lineHeight: 20,
    letterSpacing: 0.5,
    textCase: 'UPPER',
    textDecoration: 'NONE',
  },
} as Partial<NormalizedToken>);

/** Paragraph link with textDecoration: UNDERLINE. */
export const PARAGRAPH_LINK_UNDER: NormalizedToken = typographyToken({
  id: 'token:paragraph-link',
  key: 'paragraph-md-link',
  name: 'md-link',
  groupPath: ['paragraph'],
  value: {
    fontFamily: 'Outfit',
    fontSize: 16,
    fontWeight: 400,
    lineHeight: 24,
    letterSpacing: 0,
    textCase: 'ORIGINAL',
    textDecoration: 'UNDERLINE',
  },
} as Partial<NormalizedToken>);

/** Token using a multi-word font family that must be quoted. */
export const DM_MONO_TOKEN: NormalizedToken = typographyToken({
  id: 'token:code',
  key: 'code-md',
  name: 'md',
  groupPath: ['code'],
  value: {
    fontFamily: 'DM Mono',
    fontSize: 14,
    fontWeight: 400,
    lineHeight: 20,
    letterSpacing: 0,
    textCase: 'ORIGINAL',
    textDecoration: 'NONE',
  },
} as Partial<NormalizedToken>);

/** Token with the float-garbage letter-spacing value from the bug report. */
export const TRACKING_FLOAT_GARBAGE: NormalizedToken = typographyToken({
  id: 'token:tracking-bug',
  key: 'heading-xl',
  name: 'xl',
  groupPath: ['heading'],
  value: {
    fontFamily: 'Outfit',
    fontSize: 48,
    fontWeight: 600,
    lineHeight: 56,
    letterSpacing: -0.6000000238418579, // the actual value Figma returns
    textCase: 'ORIGINAL',
    textDecoration: 'NONE',
  },
} as Partial<NormalizedToken>);

/** Style with AUTO line-height. Figma represents this as a sentinel value. */
export const AUTO_LINE_HEIGHT: NormalizedToken = typographyToken({
  id: 'token:auto-lh',
  key: 'body-md',
  name: 'md',
  groupPath: ['body'],
  value: {
    fontFamily: 'Outfit',
    fontSize: 16,
    fontWeight: 400,
    lineHeight: 'AUTO', // adjust if your normalized form uses null/undefined
    letterSpacing: 0,
    textCase: 'ORIGINAL',
    textDecoration: 'NONE',
  },
} as Partial<NormalizedToken>);
