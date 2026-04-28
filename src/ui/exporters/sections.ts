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
  tailwindv4: 'css',
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

function buildFileName(base: string, format: TokenFormat, options?: ExportOptions): string {
  if (format === 'json' && options?.useDTCG) {
    return `${slugify(base)}.tokens.json`;
  }
  const extension = FORMAT_EXTENSIONS[format];
  return `${slugify(base)}.${extension}`;
}

function buildCollectionFileName(collection: string, modeName: string | null, format: TokenFormat, options?: ExportOptions) {
  const base = modeName ? `${collection} ${modeName}` : collection;
  return buildFileName(base, format, options);
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
        fileName: buildFileName('tokens', format, options),
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
    const effectSplitGroups = options.splitEffectGroups
      ? splitEffectSections(collectionSections)
      : null;

    if (effectSplitGroups) {
      effectSplitGroups.forEach(({ groupKey, sections: groupSections }) => {
        if (options.separateModes) {
          groupSections.forEach((section) => {
            const effectiveModeName = groupSections.length > 1 ? section.modeName : null;
            chunks.push({
              fileName: buildFileName(groupKey, format, options),
              sections: [section],
              modeInFileName: effectiveModeName !== null,
              collectionLabel: groupKey
            });
          });
        } else {
          chunks.push({
            fileName: buildFileName(groupKey, format, options),
            sections: groupSections,
            modeInFileName: false,
            collectionLabel: groupKey
          });
        }
      });
      return;
    }

    if (options.separateModes) {
      collectionSections.forEach((section) => {
        const effectiveModeName = collectionSections.length > 1 ? section.modeName : null;
        chunks.push({
          fileName: buildCollectionFileName(collectionName, effectiveModeName, format, options),
          sections: [section],
          modeInFileName: effectiveModeName !== null
        });
      });
    } else {
      chunks.push({
        fileName: buildCollectionFileName(collectionName, null, format, options),
        sections: collectionSections,
        modeInFileName: false
      });
    }
  });

  // Return chunks in the order they were built (preserves collection order)
  return chunks;
}

/**
 * If every entry in the given collection sections is an effect token (kind === 'shadow'),
 * partition them into sub-collections keyed by the first segment of their groupPath.
 * Returns null when the collection isn't entirely effects (so default chunking applies).
 */
function splitEffectSections(
  collectionSections: TokenSection[]
): Array<{ groupKey: string; sections: TokenSection[] }> | null {
  const allEffects = collectionSections.every((section) =>
    section.entries.every((entry) => entry.token.kind === 'shadow')
  );
  if (!allEffects) return null;

  // Map<groupKey, Map<modeId, TokenSection>> preserving insertion order
  const groups = new Map<string, Map<string, TokenSection>>();

  collectionSections.forEach((section) => {
    section.entries.forEach((entry) => {
      const groupKey = (entry.token.groupPath?.[0] ?? entry.token.name) || 'effect';
      if (!groups.has(groupKey)) {
        groups.set(groupKey, new Map());
      }
      const modeMap = groups.get(groupKey)!;
      const modeKey = section.modeId ?? '__default__';
      if (!modeMap.has(modeKey)) {
        modeMap.set(modeKey, {
          id: `${section.id}::${groupKey}`,
          // In split mode, use the group key as the section label so the inline
          // comment matches the file (e.g. /* shadow */ inside shadow.css instead
          // of /* Elevation */).
          collectionName: groupKey,
          modeId: section.modeId,
          modeName: section.modeName,
          entries: []
        });
      }
      modeMap.get(modeKey)!.entries.push(entry);
    });
  });

  if (!groups.size) return null;

  const result: Array<{ groupKey: string; sections: TokenSection[] }> = [];
  groups.forEach((modeMap, groupKey) => {
    result.push({ groupKey, sections: Array.from(modeMap.values()) });
  });
  return result;
}
