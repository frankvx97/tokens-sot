import type { ExportOptions } from '@/shared/types';
import type { TokenSection, TokenSectionEntry } from './types';
import { toCasing } from '../utils/casing';
import { rgbaToHex } from '../utils/color';
import { shouldShowModeNames, buildSectionLabel } from './sections';

export function renderJSON(sections: TokenSection[], options: ExportOptions): string {
  if (!sections.length) {
    return '{\n  "tokens": {}\n}\n';
  }

  const properties: string[] = [];
  const showModes = shouldShowModeNames(sections);

  sections.forEach((section, sectionIndex) => {
    const label = buildSectionLabel(section, showModes);
    const commentKey = `// ${label} ${sectionIndex}`;
    properties.push(`    "${escapeJson(commentKey)}": null`);

    section.entries.forEach((entry) => {
      const key = generateJSONKey(entry.token, options.casing);
      const value = buildJSONValue(entry, options);
      if (!value) return;
      properties.push(`    "${escapeJson(key)}": ${value}`);
    });
  });

  const body = properties.join(',\n');
  const closingComma = body ? `\n${body}\n` : '\n';

  return `{"tokens": {${closingComma}  }}\n`;
}

function escapeJson(value: string): string {
  return value.replace(/"/g, '\\"');
}

function buildJSONValue(entry: TokenSectionEntry, options: ExportOptions): string | null {
  if (entry.aliasTarget) {
    const aliasKey = generateJSONKey(entry.aliasTarget, options.casing);
    return JSON.stringify(`@alias ${aliasKey}`);
  }

  const rawValue = formatTokenValue(entry.mode.value);
  if (rawValue === null) return null;
  return JSON.stringify(rawValue);
}

function generateJSONKey(token: TokenSectionEntry['token'], casing: ExportOptions['casing']): string {
  const parts: string[] = [];

  if (token.collection) {
    parts.push(token.collection);
  }

  if (token.groupPath?.length) {
    parts.push(...token.groupPath);
  }

  parts.push(token.name);

  return toCasing(parts.join('/'), casing);
}

function formatTokenValue(value: TokenSectionEntry['mode']['value']): unknown {
  if (!value) return null;

  switch (value.type) {
    case 'color':
      return rgbaToHex(value.value);
    case 'dimension':
      return `${value.value}${value.unit || 'px'}`;
    case 'number':
      return value.value;
    case 'string':
      return value.value;
    case 'boolean':
      return value.value;
    case 'typography':
      return value.value;
    case 'shadow':
      return value.value;
    case 'gradient':
      return {
        type: value.gradientType,
        stops: value.value
      };
    default:
      return null;
  }
}
