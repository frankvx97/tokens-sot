import type { ExportOptions, NormalizedToken, TokenModeValue, TokenFormat } from '@/shared/types';

export interface TokenSectionEntry {
  token: NormalizedToken;
  mode: TokenModeValue;
  aliasTarget?: NormalizedToken | null;
}

export interface TokenSection {
  id: string;
  collectionName: string;
  modeId: string | null;
  modeName: string | null;
  entries: TokenSectionEntry[];
}

export interface ExportChunk {
  fileName: string;
  sections: TokenSection[];
  /** Whether the mode is already encoded in the file name (separate-mode files) */
  modeInFileName?: boolean;
  /** When set, overrides the artifact's collectionName so sidebar preview-routing can match a sub-group (e.g. split-effects mode). */
  collectionLabel?: string;
}

export interface BuildContext {
  format: TokenFormat;
  options: ExportOptions;
  tokenLookup: Map<string, NormalizedToken>;
}
