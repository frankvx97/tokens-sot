import type { ExportOptions, NormalizedToken, TokenFormat, TokenModeValue } from '@/shared/types';
import type { TokenSection, ExportChunk } from './types';

// Helper to determine if mode names should be shown in comments
// Show mode names only when a collection has multiple modes
export function shouldShowModeNames(sections: TokenSection[]): boolean {
  // Group sections by collection name
  const collectionModes = new Map<string, Set<string>>();
  sections.forEach((section) => {
    if (!collectionModes.has(section.collectionName)) {
      collectionModes.set(section.collectionName, new Set());
    }
    if (section.modeId) {
      collectionModes.get(section.collectionName)!.add(section.modeId);
    }
  });
  
  // If any collection has more than 1 mode, show mode names for all
  for (const modes of collectionModes.values()) {
    if (modes.size > 1) return true;
  }
  return false;
}

// Helper to build section label
export function buildSectionLabel(section: TokenSection, showMode: boolean): string {
  if (showMode && section.modeName) {
    return `${section.collectionName} — ${section.modeName}`;
  }
  return section.collectionName;
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/gi, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .trim() || 'tokens';
}

const FORMAT_EXTENSIONS: Record<TokenFormat, string> = {
  css: 'css',
  sass: 'scss',
  tailwind: 'js',
  stylus: 'styl',
  js: 'js',
  json: 'json',
  less: 'less'
};

function ensureCollectionName(token: NormalizedToken): string {
  return token.collection?.trim() || 'Uncategorized';
}

/**
 * Build token sections from the selected tokens.
 * With the new mode-per-branch tree, each token has exactly one mode value.
 * Tokens are grouped by collection + mode.
 */
export function buildTokenSections(
  tokens: NormalizedToken[],
  options: ExportOptions,
  tokenLookup: Map<string, NormalizedToken>
): TokenSection[] {
  if (!tokens.length) return [];

  // Group by collection name, then by mode
  const grouped = new Map<string, Map<string, { modeId: string; modeName: string; tokens: NormalizedToken[] }>>();

  tokens.forEach((token) => {
    const collectionName = ensureCollectionName(token);
    if (!grouped.has(collectionName)) {
      grouped.set(collectionName, new Map());
    }
    const collectionMap = grouped.get(collectionName)!;

    // Each token now has exactly one mode (from the mode-branched tree)
    const mode = token.modes[0];
    if (!mode) return;

    const modeKey = mode.modeId;
    if (!collectionMap.has(modeKey)) {
      collectionMap.set(modeKey, { modeId: mode.modeId, modeName: mode.modeName, tokens: [] });
    }
    collectionMap.get(modeKey)!.tokens.push(token);
  });

  const sections: TokenSection[] = [];

  grouped.forEach((modeMap, collectionName) => {
    modeMap.forEach((modeInfo) => {
      const entries = modeInfo.tokens
        .map((token) => {
          const mode = token.modes[0];
          if (!mode?.value && !mode?.aliasOf) return null;
          const aliasTarget = !options.ignoreAliases && mode.aliasOf ? tokenLookup.get(mode.aliasOf) ?? null : null;
          return {
            token,
            mode,
            aliasTarget
          };
        })
        .filter((entry): entry is NonNullable<typeof entry> => Boolean(entry));

      if (entries.length) {
        sections.push({
          id: `${collectionName}::${modeInfo.modeId}`,
          collectionName,
          modeId: modeInfo.modeId,
          modeName: modeInfo.modeName,
          entries
        });
      }
    });
  });

  // Return sections in the order they were built (preserves token/collection order)
  return sections;
}

function buildFileName(base: string, format: TokenFormat): string {
  const extension = FORMAT_EXTENSIONS[format];
  return `${slugify(base)}.${extension}`;
}

function buildCollectionFileName(collection: string, modeName: string | null, format: TokenFormat) {
  const base = modeName ? `${collection} ${modeName}` : collection;
  return buildFileName(base, format);
}

export function buildExportChunks(
  sections: TokenSection[],
  options: ExportOptions,
  format: TokenFormat
): ExportChunk[] {
  if (!sections.length) return [];

  if (options.exportFileStrategy === 'single') {
    return [
      {
        fileName: buildFileName('tokens', format),
        sections,
        modeInFileName: false
      }
    ];
  }

  const grouped = new Map<string, TokenSection[]>();

  sections.forEach((section) => {
    if (!grouped.has(section.collectionName)) {
      grouped.set(section.collectionName, []);
    }
    grouped.get(section.collectionName)!.push(section);
  });

  const chunks: ExportChunk[] = [];
  grouped.forEach((collectionSections, collectionName) => {
    if (options.separateModes) {
      collectionSections.forEach((section) => {
        // Only add mode suffix to filename when the collection has multiple modes
        const effectiveModeName = collectionSections.length > 1 ? section.modeName : null;
        chunks.push({
          fileName: buildCollectionFileName(collectionName, effectiveModeName, format),
          sections: [section],
          modeInFileName: effectiveModeName !== null
        });
      });
    } else {
      chunks.push({
        fileName: buildCollectionFileName(collectionName, null, format),
        sections: collectionSections,
        modeInFileName: false
      });
    }
  });

  // Return chunks in the order they were built (preserves collection order)
  return chunks;
}
