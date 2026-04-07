export type TokenSourceType = 'variable' | 'style' | 'manual';

export type TokenNodeType = 'collection' | 'mode' | 'group' | 'token';

export type TokenKind =
  | 'color'
  | 'number'
  | 'dimension'
  | 'typography'
  | 'shadow'
  | 'gradient'
  | 'custom';

export interface TokenTreeNode {
  id: string;
  key: string;
  name: string;
  type: TokenNodeType;
  sourceType: TokenSourceType;
  selectable: boolean;
  description?: string;
  path: string[];
  children?: TokenTreeNode[];
  token?: NormalizedToken;
  collapsed?: boolean;
  /** Mode ID for mode-type nodes */
  modeId?: string;
  /** Mode name for mode-type nodes */
  modeName?: string;
}

export interface TokenModeValue<T = TokenValue | null> {
  modeId: string;
  modeName: string;
  value: T;
  aliasOf?: string | null;
}

export type TokenValue =
  | ColorTokenValue
  | DimensionTokenValue
  | TypographyTokenValue
  | ShadowTokenValue
  | NumberTokenValue
  | GradientTokenValue
  | CompositeColorTokenValue
  | StringTokenValue
  | BooleanTokenValue;

export interface ColorTokenValue {
  type: 'color';
  value: RGBA;
}

export interface DimensionTokenValue {
  type: 'dimension';
  value: number;
  unit: DimensionUnit;
}

export interface NumberTokenValue {
  type: 'number';
  value: number;
}

export interface ShadowTokenValue {
  type: 'shadow';
  value: Array<{
    x: number;
    y: number;
    blur: number;
    spread: number;
    color: RGBA;
    type: 'drop-shadow' | 'inner-shadow';
  }>;
}

export interface TypographyTokenValue {
  type: 'typography';
  value: {
    fontFamily: string;
    fontStyle: string;
    fontWeight: number;
    fontSize: number;
    lineHeight: number | 'AUTO';
    letterSpacing: number;
    paragraphSpacing: number;
    textCase?: string;
    textDecoration?: string;
    // Alias references (variable binding names from Figma bound variables)
    fontFamilyAlias?: string;
    fontSizeAlias?: string;
    lineHeightAlias?: string;
    letterSpacingAlias?: string;
    fontWeightAlias?: string;
  };
}

export interface StringTokenValue {
  type: 'string';
  value: string;
}

export interface BooleanTokenValue {
  type: 'boolean';
  value: boolean;
}

export interface GradientTokenValue {
  type: 'gradient';
  value: Array<{
    position: number;
    color: RGBA;
  }>;
  gradientType: 'LINEAR_GRADIENT' | 'RADIAL_GRADIENT' | 'ANGULAR_GRADIENT' | 'DIAMOND_GRADIENT';
  gradientAngle?: number; // Angle in degrees for linear gradients
}

export interface CompositeColorTokenValue {
  type: 'compositeColor';
  value: Array<{
    layerType: 'solid' | 'linear-gradient' | 'radial-gradient' | 'angular-gradient' | 'diamond-gradient';
    color?: RGBA;           // for solid fills
    stops?: Array<{         // for gradient fills
      position: number;
      color: RGBA;
    }>;
    angle?: number;         // for linear gradients (in degrees)
  }>;
}

export interface NormalizedToken {
  id: string;
  key: string;
  name: string;
  kind: TokenKind;
  description?: string;
  collection: string;
  groupPath: string[];
  sourceType: TokenSourceType;
  sourceId: string;
  modes: TokenModeValue[];
  createdAt?: string;
  updatedAt?: string;
}

export type DimensionUnit = 'px' | 'rem';

export interface RGBA {
  r: number;
  g: number;
  b: number;
  a: number;
}

export type TokenFormat = 'css' | 'sass' | 'tailwind' | 'tailwindv4' | 'stylus' | 'js' | 'json' | 'less';

export type TokenCasing =
  | 'lowerCamelCase'
  | 'UPPER_SNAKE_CASE'
  | 'kebab-case'
  | 'snake_case'
  | 'PascalCase';

export type ColorFormat = 'hex' | 'rgb' | 'hsl';

export type ExportFileStrategy = 'single' | 'multiple';

export type TypographyFormat = 'default' | 'mixins';

export interface ExportOptions {
  format: TokenFormat;
  casing: TokenCasing;
  color: ColorFormat;
  unit: DimensionUnit;
  exportFileStrategy: ExportFileStrategy;
  includeTopLevelName: boolean;
  includeAllModes: boolean;
  ignoreAliases: boolean;
  useRootAlias: boolean;
  addFallback: boolean;
  separateModes: boolean;
  includeIndexFile: boolean;
  /** Controls whether Sass/Less emit map/shorthand (default) or mixin format */
  typographyFormat?: TypographyFormat;
  /** When true and format is JSON, emit DTCG-compliant structure */
  useDTCG?: boolean;
  /** Emit .text-{name} CSS utility classes alongside custom properties (CSS format only) */
  emitUtilityClasses?: boolean;
  /** Per-family font fallback stacks, e.g. { "Outfit": "system-ui, sans-serif" } */
  fontFallbacks?: Record<string, string>;
}

export interface PluginSettings {
  lastOpenedAt: string;
  exportOptions: ExportOptions;
  selectedTokenIds: string[];
  manualSources: ManualTokenGroup[];
  activeSource: 'variables' | 'styles';
  collectionOrder?: string[]; // Array of collection names in user's preferred order
  selectedModeId?: string; // Currently selected mode ID for preview
  /** User overrides for style group display names. Key = style root key (e.g. "paint-styles"), Value = custom label */
  styleGroupNames?: Record<string, string>;
}

export interface ManualTokenGroup {
  id: string;
  name: string;
  description?: string;
  tokens: ManualToken[];
}

export interface ManualToken {
  id: string;
  name: string;
  kind: TokenKind;
  value: TokenValue;
  metadata?: Record<string, unknown>;
}

export interface BootstrapPayload {
  user: {
    id: string;
    name: string;
    isDevMode?: boolean;
  };
  documentName: string;
  fetchedAt: string;
  tokens: {
    variables: TokenTreeNode[];
    styles: TokenTreeNode[];
  };
  settings: PluginSettings;
}

export interface ExportRequest {
  selections: string[];
  options: ExportOptions;
}

export interface ExportArtifact {
  fileName: string;
  contents: string;
  format: TokenFormat;
  /** Collection name for multi-file exports, used to identify which preview to show */
  collectionName?: string;
}

export interface ExportResult {
  artifacts: ExportArtifact[];
  summary: {
    tokenCount: number;
    generatedAt: string;
  };
}
