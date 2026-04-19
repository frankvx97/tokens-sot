import type { NormalizedToken, TokenModeValue, TokenValue, TypographyTokenValue } from '@/shared/types';

const DEFAULT_MODE_ID = 'mode:default';
const DEFAULT_MODE_NAME = 'Default';

function withMode<T extends TokenValue>(value: T): TokenModeValue<T> {
  return {
    modeId: DEFAULT_MODE_ID,
    modeName: DEFAULT_MODE_NAME,
    value,
  };
}

const baseToken = (overrides: Partial<NormalizedToken> = {}): NormalizedToken => ({
  id: 'token:default',
  key: 'default',
  name: 'default',
  kind: 'custom',
  groupPath: [],
  collection: 'Test Collection',
  sourceType: 'manual',
  sourceId: 'source:default',
  modes: [withMode({ type: 'string', value: 'default' })],
  description: '',
  ...overrides,
});

export const colorToken = (overrides: Partial<NormalizedToken> = {}): NormalizedToken =>
  baseToken({
    id: 'token:color',
    key: 'color-primary-500',
    name: 'primary-500',
    kind: 'color',
    groupPath: ['color'],
    modes: [withMode({ type: 'color', value: { r: 0.231, g: 0.51, b: 0.965, a: 1 } })],
    ...overrides,
  });

export const dimensionToken = (overrides: Partial<NormalizedToken> = {}): NormalizedToken =>
  baseToken({
    id: 'token:dim',
    key: 'spacing-md',
    name: 'md',
    kind: 'dimension',
    groupPath: ['spacing'],
    modes: [withMode({ type: 'dimension', value: 16, unit: 'px' })],
    ...overrides,
  });

export const shadowToken = (overrides: Partial<NormalizedToken> = {}): NormalizedToken =>
  baseToken({
    id: 'token:shadow',
    key: 'shadow-md',
    name: 'md',
    kind: 'shadow',
    groupPath: ['shadow'],
    modes: [
      withMode({
        type: 'shadow',
        value: [{ type: 'drop-shadow', x: 0, y: 4, blur: 6, spread: -1, color: { r: 0, g: 0, b: 0, a: 0.1 } }],
      }),
    ],
    ...overrides,
  });

const baseTypographyValue: TypographyTokenValue = {
  type: 'typography',
  value: {
    fontFamily: 'Outfit',
    fontStyle: 'SemiBold',
    fontWeight: 600,
    fontSize: 56,
    lineHeight: 64,
    letterSpacing: -0.6,
    paragraphSpacing: 0,
    textCase: 'ORIGINAL',
    textDecoration: 'NONE',
  },
};

export const typographyToken = (overrides: Partial<NormalizedToken> = {}): NormalizedToken =>
  baseToken({
    id: 'token:typo',
    key: 'heading-2xl',
    name: '2xl',
    kind: 'typography',
    groupPath: ['heading'],
    modes: [withMode(baseTypographyValue)],
    ...overrides,
  });

export const fontWeightStringToken = (weight: string): NormalizedToken =>
  baseToken({
    id: `token:weight:${weight}`,
    key: `fonts-weight-${weight.toLowerCase()}`,
    name: weight.toLowerCase(),
    kind: 'custom',
    groupPath: ['fonts', 'weight'],
    modes: [withMode({ type: 'string', value: weight })],
  });

export const HEADING_2XL_RESOLVED: NormalizedToken = typographyToken();

export const HEADING_2XL_BOUND: NormalizedToken = typographyToken({
  modes: [
    withMode({
      ...baseTypographyValue,
      value: {
        ...baseTypographyValue.value,
        fontFamilyAlias: 'fonts/family/headings',
        fontSizeAlias: 'fonts/size/2xl',
        fontWeightAlias: 'fonts/weight/semibold',
        lineHeightAlias: 'fonts/lineHeight/2xl',
        letterSpacingAlias: 'fonts/tracking/2xl',
      },
    }),
  ],
});

export const HEADING_2XL_PARTIAL_BOUND: NormalizedToken = typographyToken({
  modes: [
    withMode({
      ...baseTypographyValue,
      value: {
        ...baseTypographyValue.value,
        fontFamilyAlias: 'fonts/family/headings',
        fontWeightAlias: 'fonts/weight/semibold',
      },
    }),
  ],
});

export const SUBHEADING_UPPER: NormalizedToken = typographyToken({
  id: 'token:subheading',
  key: 'subheading-md',
  name: 'md',
  groupPath: ['subheading'],
  modes: [
    withMode({
      ...baseTypographyValue,
      value: {
        ...baseTypographyValue.value,
        fontWeight: 500,
        fontSize: 14,
        lineHeight: 20,
        letterSpacing: 0.5,
        textCase: 'UPPER',
      },
    }),
  ],
});

export const PARAGRAPH_LINK_UNDER: NormalizedToken = typographyToken({
  id: 'token:paragraph-link',
  key: 'paragraph-md-link',
  name: 'md-link',
  groupPath: ['paragraph'],
  modes: [
    withMode({
      ...baseTypographyValue,
      value: {
        ...baseTypographyValue.value,
        fontWeight: 400,
        fontSize: 16,
        lineHeight: 24,
        letterSpacing: 0,
        textDecoration: 'UNDERLINE',
      },
    }),
  ],
});

export const DM_MONO_TOKEN: NormalizedToken = typographyToken({
  id: 'token:code',
  key: 'code-md',
  name: 'md',
  groupPath: ['code'],
  modes: [
    withMode({
      ...baseTypographyValue,
      value: {
        ...baseTypographyValue.value,
        fontFamily: 'DM Mono',
        fontWeight: 400,
        fontSize: 14,
        lineHeight: 20,
        letterSpacing: 0,
      },
    }),
  ],
});

export const TRACKING_FLOAT_GARBAGE: NormalizedToken = typographyToken({
  id: 'token:tracking-bug',
  key: 'heading-xl',
  name: 'xl',
  groupPath: ['heading'],
  modes: [
    withMode({
      ...baseTypographyValue,
      value: {
        ...baseTypographyValue.value,
        fontSize: 48,
        lineHeight: 56,
        letterSpacing: -0.6000000238418579,
      },
    }),
  ],
});

export const AUTO_LINE_HEIGHT: NormalizedToken = typographyToken({
  id: 'token:auto-lh',
  key: 'body-md',
  name: 'md',
  groupPath: ['body'],
  modes: [
    withMode({
      ...baseTypographyValue,
      value: {
        ...baseTypographyValue.value,
        fontWeight: 400,
        fontSize: 16,
        lineHeight: 'AUTO',
        letterSpacing: 0,
      },
    }),
  ],
});
