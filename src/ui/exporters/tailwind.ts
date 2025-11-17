import type { ExportOptions } from '@/shared/types';
import type { TokenSection, TokenSectionEntry } from './types';
import { toCasing } from '../utils/casing';
import { formatColor } from '../utils/color';
import { pxToRem } from '../utils/units';

export function renderTailwind(sections: TokenSection[], options: ExportOptions): string {
  if (!sections.length) {
    return `// No tokens selected\nmodule.exports = {\n  theme: {\n    extend: {},\n  },\n};\n`;
  }

  const useRem = options.unit === 'rem';
  const categorized = categorizeEntries(sections);
  const lines: string[] = [];

  lines.push('module.exports = {');
  lines.push('  theme: {');
  lines.push('    extend: {');

  renderCategory(lines, 'colors', categorized.colors, (payload) => formatColorPayload(payload.entry, options));
  renderCategory(lines, 'spacing', categorized.spacing, (payload) => formatSpacingPayload(payload.entry, useRem));
  renderCategory(lines, 'fontFamily', categorized.fontFamily, (payload) => formatFontFamilyPayload(payload.entry));
  renderCategory(lines, 'fontSize', categorized.fontSize, (payload) => formatFontSizePayload(payload.entry, useRem));
  renderCategory(lines, 'fontWeight', categorized.fontWeight, (payload) => formatFontWeightPayload(payload.entry));
  renderCategory(lines, 'boxShadow', categorized.boxShadow, (payload) => formatShadowPayload(payload.entry));

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
  boxShadow: SectionEntryWithLabel[];
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
    boxShadow: []
  };

  sections.forEach((section) => {
    const label = section.modeName ? `${section.collectionName} — ${section.modeName}` : section.collectionName;
    section.entries.forEach((entry) => {
      const payload = { label, entry } satisfies SectionEntryWithLabel;
      switch (entry.token.kind) {
        case 'color':
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
          break;
        case 'shadow':
          bucket.boxShadow.push(payload);
          break;
      }
    });
  });

  return bucket;
}

function renderCategory(
  lines: string[],
  categoryName: string,
  entries: SectionEntryWithLabel[],
  formatter: (payload: SectionEntryWithLabel) => string | null
) {
  if (!entries.length) return;

  const grouped = groupByLabel(entries);
  lines.push(`      ${categoryName}: {`);

  grouped.forEach((groupEntries, label) => {
    lines.push(`        // ${label}`);
    groupEntries.forEach((payload) => {
      const key = generateTailwindKey(payload.entry.token);
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

function formatColorPayload(entry: TokenSectionEntry, options: ExportOptions): string | null {
  if (entry.aliasTarget) {
    const aliasKey = generateTailwindKey(entry.aliasTarget);
    return `'@alias ${aliasKey}'`;
  }
  if (entry.mode.value?.type !== 'color') return null;
  return `'${formatColor(entry.mode.value.value, options.color)}'`;
}

function formatSpacingPayload(entry: TokenSectionEntry, useRem: boolean): string | null {
  if (entry.aliasTarget) {
    const aliasKey = generateTailwindKey(entry.aliasTarget);
    return `'@alias ${aliasKey}'`;
  }
  if (entry.mode.value?.type !== 'number' && entry.mode.value?.type !== 'dimension') return null;
  const numeric = entry.mode.value.value;
  const value = useRem ? `${pxToRem(numeric)}rem` : `${numeric}px`;
  return `'${value}'`;
}

function formatFontFamilyPayload(entry: TokenSectionEntry): string | null {
  if (entry.aliasTarget) {
    const aliasKey = generateTailwindKey(entry.aliasTarget);
    return `'@alias ${aliasKey}'`;
  }
  if (entry.mode.value?.type !== 'typography') return null;
  const fontFamily = entry.mode.value.value.fontFamily;
  return `['${fontFamily}']`;
}

function formatFontSizePayload(entry: TokenSectionEntry, useRem: boolean): string | null {
  if (entry.aliasTarget) {
    const aliasKey = generateTailwindKey(entry.aliasTarget);
    return `'@alias ${aliasKey}'`;
  }
  if (entry.mode.value?.type !== 'typography') return null;
  const { fontSize, lineHeight } = entry.mode.value.value;
  const sizeValue = useRem ? `${pxToRem(fontSize)}rem` : `${fontSize}px`;
  if (lineHeight === 'AUTO') {
    return `'${sizeValue}'`;
  }
  const lh = typeof lineHeight === 'number' ? (useRem ? `${pxToRem(lineHeight)}rem` : `${lineHeight}px`) : lineHeight;
  return `['${sizeValue}', { lineHeight: '${lh}' }]`;
}

function formatFontWeightPayload(entry: TokenSectionEntry): string | null {
  if (entry.aliasTarget) {
    const aliasKey = generateTailwindKey(entry.aliasTarget);
    return `'@alias ${aliasKey}'`;
  }
  if (entry.mode.value?.type !== 'typography') return null;
  return String(entry.mode.value.value.fontWeight);
}

function formatShadowPayload(entry: TokenSectionEntry): string | null {
  if (entry.aliasTarget) {
    const aliasKey = generateTailwindKey(entry.aliasTarget);
    return `'@alias ${aliasKey}'`;
  }
  if (entry.mode.value?.type !== 'shadow') return null;
  const value = entry.mode.value.value
    .map((shadow) => {
      const color = formatColor(shadow.color, 'rgb');
      const inset = shadow.type === 'inner-shadow' ? 'inset ' : '';
      return `${inset}${shadow.x}px ${shadow.y}px ${shadow.blur}px ${shadow.spread}px ${color}`;
    })
    .join(', ');
  return `'${value}'`;
}

function generateTailwindKey(token: TokenSectionEntry['token']): string {
  const parts: string[] = [];

  if (token.groupPath?.length) {
    parts.push(...token.groupPath);
  }

  parts.push(token.name);

  return toCasing(parts.join('/'), 'kebab-case');
}
