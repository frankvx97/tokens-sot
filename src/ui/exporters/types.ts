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
}

export interface BuildContext {
  format: TokenFormat;
  options: ExportOptions;
  tokenLookup: Map<string, NormalizedToken>;
}
