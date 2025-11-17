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

function selectModes(token: NormalizedToken, includeAllModes: boolean): TokenModeValue[] {
  if (!token.modes?.length) {
    return [];
  }

  if (includeAllModes) {
    return token.modes;
  }

  return token.modes.slice(0, 1);
}

function ensureCollectionName(token: NormalizedToken): string {
  return token.collection?.trim() || 'Uncategorized';
}

export function buildTokenSections(
  tokens: NormalizedToken[],
  options: ExportOptions,
  tokenLookup: Map<string, NormalizedToken>
): TokenSection[] {
  if (!tokens.length) return [];

  const grouped = new Map<string, NormalizedToken[]>();

  tokens.forEach((token) => {
    const collectionName = ensureCollectionName(token);
    if (!grouped.has(collectionName)) {
      grouped.set(collectionName, []);
    }
    grouped.get(collectionName)!.push(token);
  });

  const sections: TokenSection[] = [];

  grouped.forEach((collectionTokens, collectionName) => {
    const modeMap = new Map<string, { id: string; name: string }>();

    collectionTokens.forEach((token) => {
      selectModes(token, options.includeAllModes).forEach((mode) => {
        if (!mode?.value && !mode?.aliasOf) return;
        if (!modeMap.has(mode.modeId)) {
          modeMap.set(mode.modeId, { id: mode.modeId, name: mode.modeName });
        }
      });
    });

    // If no modes were added (e.g., tokens missing values), fall back to the first available mode on first token
    if (!modeMap.size) {
      const fallbackToken = collectionTokens[0];
      const fallbackMode = fallbackToken?.modes?.[0];
      if (fallbackMode) {
        modeMap.set(fallbackMode.modeId, { id: fallbackMode.modeId, name: fallbackMode.modeName });
      }
    }

    modeMap.forEach((modeInfo) => {
      const entries = collectionTokens
        .map((token) => {
          const mode = token.modes.find((item) => item.modeId === modeInfo.id) ?? token.modes[0];
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
          id: `${collectionName}::${modeInfo.id}`,
          collectionName,
          modeId: modeInfo.id,
          modeName: modeInfo.name,
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
        sections
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
        chunks.push({
          fileName: buildCollectionFileName(collectionName, section.modeName, format),
          sections: [section]
        });
      });
    } else {
      chunks.push({
        fileName: buildCollectionFileName(collectionName, null, format),
        sections: collectionSections
      });
    }
  });

  // Return chunks in the order they were built (preserves collection order)
  return chunks;
}
