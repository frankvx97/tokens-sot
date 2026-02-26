import type { ExportOptions } from '@/shared/types';
import type { TokenSection, TokenSectionEntry } from './types';
import { toCasing } from '../utils/casing';
import { formatColor, formatCompositeColor } from '../utils/color';
import { formatWithUnit } from '../utils/units';
import { shouldShowModeNames, buildSectionLabel } from './sections';

export function renderJavaScript(sections: TokenSection[], options: ExportOptions, modeInFileName?: boolean): string {
  if (!sections.length) {
    return '// No tokens selected\nexport const tokens = {};\n';
  }

  const showModes = shouldShowModeNames(sections);
  const useModeKey = showModes && !modeInFileName;

  const lines: string[] = ['export const tokens = {'];

  sections.forEach((section) => {
    const label = buildSectionLabel(section, showModes);

    if (useModeKey) {
      // Group under mode key: { "Collection/Mode": { ...tokens } }
      const sectionKey = toCasing(`${section.collectionName}/${section.modeName}`, options.casing);
      lines.push(`  // ${label}`);
      lines.push(`  '${sectionKey}': {`);

      section.entries.forEach((entry) => {
        const property = generateJSKey(entry.token, options.casing, options.includeTopLevelName);
        const value = buildJSValue(entry, options);
        if (!value) return;
        lines.push(indentValue(`${property}: ${value},`, 2));
      });

      lines.push('  },');
      lines.push('');
    } else {
      lines.push(`  // ${label}`);

      section.entries.forEach((entry) => {
        const property = generateJSKey(entry.token, options.casing, options.includeTopLevelName);
        const value = buildJSValue(entry, options);
        if (!value) return;
        lines.push(indentValue(`${property}: ${value},`, 1));
      });

      lines.push('');
    }
  });

  lines.push('};\n');

  return lines.join('\n');
}

function indentValue(value: string, indentLevel: number): string {
  const indent = '  '.repeat(indentLevel);
  return value
    .split('\n')
    .map((line, index) => (index === 0 ? `${indent}${line}` : `${indent}  ${line}`))
    .join('\n');
}

function buildJSValue(entry: TokenSectionEntry, options: ExportOptions): string | null {
  if (entry.aliasTarget) {
    const aliasKey = generateJSKey(entry.aliasTarget, options.casing, options.includeTopLevelName);
    return `'@alias ${aliasKey}'`;
  }

  const rawValue = formatTokenValueForJS(entry.mode.value, options);
  if (rawValue === null) return null;
  return formatLiteral(rawValue);
}

function generateJSKey(
  token: TokenSectionEntry['token'],
  casing: ExportOptions['casing'],
  includeTopLevelName: boolean
): string {
  const parts: string[] = [];

  if (includeTopLevelName && token.collection) {
    parts.push(token.collection);
  }

  if (token.groupPath?.length) {
    parts.push(...token.groupPath);
  }

  parts.push(token.name);

  const fullName = parts.join('/');
  return toCasing(fullName, casing);
}

function formatLiteral(value: unknown): string {
  if (typeof value === 'string') {
    return `'${value.replace(/'/g, "\\'")}'`;
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }

  return JSON.stringify(value, null, 2);
}

function formatTokenValueForJS(
  value: TokenSectionEntry['mode']['value'],
  options: ExportOptions
): unknown {
  if (!value) return null;

  switch (value.type) {
    case 'color':
      return formatColor(value.value, options.color);
    case 'dimension':
      return formatWithUnit(value.value, options.unit);
    case 'number':
      return formatWithUnit(value.value, options.unit);
    case 'string':
      return value.value;
    case 'boolean':
      return value.value;
    case 'typography': {
      const typo = value.value;
      return {
        fontFamily: typo.fontFamily,
        fontSize: formatWithUnit(typo.fontSize, options.unit),
        fontWeight: typo.fontWeight,
        lineHeight: typo.lineHeight === 'AUTO' ? 'normal' : formatWithUnit(typo.lineHeight as number, options.unit),
        letterSpacing: formatWithUnit(typo.letterSpacing, options.unit)
      };
    }
    case 'shadow':
      return value.value.map((shadow) => ({
        x: `${shadow.x}px`,
        y: `${shadow.y}px`,
        blur: `${shadow.blur}px`,
        spread: `${shadow.spread}px`,
        color: formatColor(shadow.color, options.color),
        type: shadow.type
      }));
    case 'gradient':
      return {
        type: value.gradientType,
        angle: value.gradientAngle,
        stops: value.value.map((stop) => ({
          position: stop.position,
          color: formatColor(stop.color, options.color)
        }))
      };
    case 'compositeColor':
      return formatCompositeColor(value.value, options.color);
    default:
      return null;
  }
}
