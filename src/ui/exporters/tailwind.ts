import type { ExportOptions } from '@/shared/types';
import type { TokenSection, TokenSectionEntry } from './types';
import { toCasing } from '../utils/casing';
import { formatColor, formatCompositeColor } from '../utils/color';
import { pxToRem, roundTo, quoteFontFamily, mapFontWeightString } from '../utils/units';

export function renderTailwind(sections: TokenSection[], options: ExportOptions, _modeInFileName?: boolean): string {
  if (!sections.length) {
    return `// No tokens selected\nmodule.exports = {\n  theme: {\n    extend: {},\n  },\n};\n`;
  }

  const useRem = options.unit === 'rem';
  const categorized = categorizeEntries(sections);
  const lines: string[] = [];

  lines.push('module.exports = {');
  lines.push('  theme: {');
  lines.push('    extend: {');

  renderCategory(lines, 'colors', categorized.colors, options.includeTopLevelName, (payload) =>
    formatColorPayload(payload.entry, options, options.includeTopLevelName)
  );
  renderCategory(lines, 'spacing', categorized.spacing, options.includeTopLevelName, (payload) =>
    formatSpacingPayload(payload.entry, useRem, options.includeTopLevelName)
  );
  renderCategory(lines, 'fontFamily', categorized.fontFamily, options.includeTopLevelName, (payload) =>
    formatFontFamilyPayload(payload.entry, options.includeTopLevelName)
  );
  renderCategory(lines, 'fontSize', categorized.fontSize, options.includeTopLevelName, (payload) =>
    formatFontSizePayload(payload.entry, useRem, options.includeTopLevelName)
  );
  renderCategory(lines, 'fontWeight', categorized.fontWeight, options.includeTopLevelName, (payload) =>
    formatFontWeightPayload(payload.entry, options.includeTopLevelName)
  );
  renderCategory(lines, 'letterSpacing', categorized.letterSpacing, options.includeTopLevelName, (payload) =>
    formatLetterSpacingPayload(payload.entry, useRem, options.includeTopLevelName)
  );
  renderCategory(lines, 'boxShadow', categorized.boxShadow, options.includeTopLevelName, (payload) =>
    formatShadowPayload(payload.entry, options.includeTopLevelName)
  );
  renderCategory(lines, 'blur', categorized.blur, options.includeTopLevelName, (payload) =>
    formatBlurPayload(payload.entry, useRem, options.includeTopLevelName)
  );
  renderCategory(lines, 'backdropBlur', categorized.backdropBlur, options.includeTopLevelName, (payload) =>
    formatBlurPayload(payload.entry, useRem, options.includeTopLevelName)
  );

  lines.push('    },');
  lines.push('  },');
  lines.push('};\n');

  return lines.join('\n');
}

interface CategorizedEntries {
  colors: SectionEntryWithLabel[];
  spacing: SectionEntryWithLabel[];
  fontFamily: SectionEntryWithLabel[];
  fontSize: SectionEntryWithLabel[];
  fontWeight: SectionEntryWithLabel[];
  letterSpacing: SectionEntryWithLabel[];
  boxShadow: SectionEntryWithLabel[];
  blur: SectionEntryWithLabel[];
  backdropBlur: SectionEntryWithLabel[];
}

interface SectionEntryWithLabel {
  label: string;
  entry: TokenSectionEntry;
}

function categorizeEntries(sections: TokenSection[]): CategorizedEntries {
  const bucket: CategorizedEntries = {
    colors: [],
    spacing: [],
    fontFamily: [],
    fontSize: [],
    fontWeight: [],
    letterSpacing: [],
    boxShadow: [],
    blur: [],
    backdropBlur: []
  };

  sections.forEach((section) => {
    const label = section.modeName ? `${section.collectionName} — ${section.modeName}` : section.collectionName;
    section.entries.forEach((entry) => {
      const payload = { label, entry } satisfies SectionEntryWithLabel;
      switch (entry.token.kind) {
        case 'color':
        case 'gradient':
          bucket.colors.push(payload);
          break;
        case 'number':
        case 'dimension':
          bucket.spacing.push(payload);
          break;
        case 'typography':
          bucket.fontFamily.push(payload);
          bucket.fontSize.push(payload);
          bucket.fontWeight.push(payload);
          bucket.letterSpacing.push(payload);
          break;
        case 'custom': {
          if (entry.mode.value?.type === 'string' && mapFontWeightString(entry.mode.value.value) !== null) {
            bucket.fontWeight.push(payload);
          }
          break;
        }
        case 'shadow': {
          const v = entry.mode.value;
          if (v?.type === 'shadow') {
            const arr = v.value;
            const onlyLayerBlur = arr.length > 0 && arr.every((e) => e.type === 'layer-blur');
            const onlyBackdropBlur = arr.length > 0 && arr.every((e) => e.type === 'background-blur');
            if (onlyLayerBlur) {
              bucket.blur.push(payload);
              break;
            }
            if (onlyBackdropBlur) {
              bucket.backdropBlur.push(payload);
              break;
            }
          }
          bucket.boxShadow.push(payload);
          break;
        }
      }
    });
  });

  return bucket;
}

function renderCategory(
  lines: string[],
  categoryName: string,
  entries: SectionEntryWithLabel[],
  includeTopLevelName: boolean,
  formatter: (payload: SectionEntryWithLabel) => string | null
) {
  if (!entries.length) return;

  const grouped = groupByLabel(entries);
  lines.push(`      ${categoryName}: {`);

  grouped.forEach((groupEntries, label) => {
    lines.push(`        // ${label}`);
    groupEntries.forEach((payload) => {
      const key = generateTailwindKey(payload.entry.token, includeTopLevelName);
      const value = formatter(payload);
      if (!value) return;
      lines.push(`        '${key}': ${value},`);
    });
    lines.push('');
  });

  lines.push('      },');
}

function groupByLabel(entries: SectionEntryWithLabel[]): Map<string, SectionEntryWithLabel[]> {
  const grouped = new Map<string, SectionEntryWithLabel[]>();
  entries.forEach((payload) => {
    if (!grouped.has(payload.label)) {
      grouped.set(payload.label, []);
    }
    grouped.get(payload.label)!.push(payload);
  });
  return grouped;
}

function formatColorPayload(entry: TokenSectionEntry, options: ExportOptions, includeTopLevelName: boolean): string | null {
  if (entry.aliasTarget) {
    const aliasKey = generateTailwindKey(entry.aliasTarget, includeTopLevelName);
    return `'@alias ${aliasKey}'`;
  }
  if (entry.mode.value?.type === 'color') {
    return `'${formatColor(entry.mode.value.value, options.color)}'`;
  }
  if (entry.mode.value?.type === 'gradient') {
    // Tailwind doesn't have built-in gradient colors, so we need to use arbitrary values
    // For now, we'll just format as a string that can be used with arbitrary values
    const stops = entry.mode.value.value
      .map((stop) => `${formatColor(stop.color, options.color)} ${Math.round(stop.position * 100)}%`)
      .join(', ');
    const angle = entry.mode.value.gradientAngle ?? 180;
    return `'linear-gradient(${angle}deg, ${stops})'`;
  }
  if (entry.mode.value?.type === 'compositeColor') {
    return `'${formatCompositeColor(entry.mode.value.value, options.color)}'`;
  }
  return null;
}

function formatSpacingPayload(entry: TokenSectionEntry, useRem: boolean, includeTopLevelName: boolean): string | null {
  if (entry.aliasTarget) {
    const aliasKey = generateTailwindKey(entry.aliasTarget, includeTopLevelName);
    return `'@alias ${aliasKey}'`;
  }
  if (entry.mode.value?.type !== 'number' && entry.mode.value?.type !== 'dimension') return null;
  const numeric = entry.mode.value.value;
  const value = useRem ? `${pxToRem(numeric)}rem` : `${numeric}px`;
  return `'${value}'`;
}

function formatFontFamilyPayload(entry: TokenSectionEntry, includeTopLevelName: boolean): string | null {
  if (entry.aliasTarget) {
    const aliasKey = generateTailwindKey(entry.aliasTarget, includeTopLevelName);
    return `'@alias ${aliasKey}'`;
  }
  if (entry.mode.value?.type !== 'typography') return null;
  const fontFamily = quoteFontFamily(entry.mode.value.value.fontFamily);
  return `['${fontFamily}']`;
}

function formatLetterSpacingPayload(entry: TokenSectionEntry, useRem: boolean, includeTopLevelName: boolean): string | null {
  if (entry.aliasTarget) {
    const aliasKey = generateTailwindKey(entry.aliasTarget, includeTopLevelName);
    return `'@alias ${aliasKey}'`;
  }
  if (entry.mode.value?.type !== 'typography') return null;
  const ls = entry.mode.value.value.letterSpacing;
  if (ls === 0) return `'0px'`;
  const value = useRem ? `${roundTo(pxToRem(ls), 4)}rem` : `${roundTo(ls, 3)}px`;
  return `'${value}'`;
}

function formatFontSizePayload(entry: TokenSectionEntry, useRem: boolean, includeTopLevelName: boolean): string | null {
  if (entry.aliasTarget) {
    const aliasKey = generateTailwindKey(entry.aliasTarget, includeTopLevelName);
    return `'@alias ${aliasKey}'`;
  }
  if (entry.mode.value?.type !== 'typography') return null;
  const { fontSize, lineHeight } = entry.mode.value.value;
  const sizeValue = useRem ? `${pxToRem(fontSize)}rem` : `${fontSize}px`;
  if (lineHeight === 'AUTO') {
    return `'${sizeValue}'`;
  }
  let lh: string;
  if (typeof lineHeight === 'object' && lineHeight && lineHeight.unit === 'percent') {
    lh = String(roundTo(lineHeight.value, 3));
  } else if (typeof lineHeight === 'number') {
    lh = useRem ? `${pxToRem(lineHeight)}rem` : `${lineHeight}px`;
  } else {
    lh = String(lineHeight);
  }
  return `['${sizeValue}', { lineHeight: '${lh}' }]`;
}

function formatFontWeightPayload(entry: TokenSectionEntry, includeTopLevelName: boolean): string | null {
  if (entry.aliasTarget) {
    const aliasKey = generateTailwindKey(entry.aliasTarget, includeTopLevelName);
    return `'@alias ${aliasKey}'`;
  }
  if (entry.mode.value?.type === 'string') {
    const numericWeight = mapFontWeightString(entry.mode.value.value);
    return numericWeight !== null ? String(numericWeight) : null;
  }
  if (entry.mode.value?.type !== 'typography') return null;
  return String(entry.mode.value.value.fontWeight);
}

function formatShadowPayload(entry: TokenSectionEntry, includeTopLevelName: boolean): string | null {
  if (entry.aliasTarget) {
    const aliasKey = generateTailwindKey(entry.aliasTarget, includeTopLevelName);
    return `'@alias ${aliasKey}'`;
  }
  if (entry.mode.value?.type !== 'shadow') return null;
  const shadowEntries = entry.mode.value.value.filter(
    (e): e is Extract<typeof e, { type: 'drop-shadow' | 'inner-shadow' }> =>
      e.type === 'drop-shadow' || e.type === 'inner-shadow'
  );
  if (!shadowEntries.length) return null;
  const value = shadowEntries
    .map((shadow) => {
      const color = formatColor(shadow.color, 'rgb');
      const inset = shadow.type === 'inner-shadow' ? 'inset ' : '';
      return `${inset}${shadow.x}px ${shadow.y}px ${shadow.blur}px ${shadow.spread}px ${color}`;
    })
    .join(', ');
  return `'${value}'`;
}

function formatBlurPayload(entry: TokenSectionEntry, useRem: boolean, includeTopLevelName: boolean): string | null {
  if (entry.aliasTarget) {
    const aliasKey = generateTailwindKey(entry.aliasTarget, includeTopLevelName);
    return `'@alias ${aliasKey}'`;
  }
  if (entry.mode.value?.type !== 'shadow') return null;
  const blurEntry = entry.mode.value.value.find(
    (e): e is Extract<typeof e, { type: 'layer-blur' | 'background-blur' }> =>
      e.type === 'layer-blur' || e.type === 'background-blur'
  );
  if (!blurEntry) return null;
  const radius = blurEntry.radius;
  const value = useRem ? `${roundTo(pxToRem(radius), 4)}rem` : `${roundTo(radius, 3)}px`;
  return `'${value}'`;
}

function generateTailwindKey(token: TokenSectionEntry['token'], includeTopLevelName: boolean): string {
  const parts: string[] = [];

  if (includeTopLevelName && token.collection) {
    parts.push(token.collection);
  }

  if (token.groupPath?.length) {
    parts.push(...token.groupPath);
  }

  parts.push(token.name);

  return toCasing(parts.join('/'), 'kebab-case');
}
