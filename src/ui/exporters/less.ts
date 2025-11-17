import type { ExportOptions } from '@/shared/types';
import type { TokenSection, TokenSectionEntry } from './types';
import { toCasing } from '../utils/casing';
import { formatColor } from '../utils/color';
import { formatWithUnit, formatLineHeight } from '../utils/units';
import { shouldShowModeNames, buildSectionLabel } from './sections';

export function renderLess(sections: TokenSection[], options: ExportOptions): string {
  if (!sections.length) {
    return '// No tokens selected\n';
  }

  const lines: string[] = [];
  const showModes = shouldShowModeNames(sections);

  sections.forEach((section, index) => {
    const label = buildSectionLabel(section, showModes);
    lines.push(`// ${label}`);

    section.entries.forEach((entry) => {
      const declaration = buildLessDeclaration(entry, options);
      if (declaration) {
        lines.push(declaration);
      }
    });

    if (index !== sections.length - 1) {
      lines.push('');
    }
  });

  return lines.join('\n') + '\n';
}

function buildLessDeclaration(entry: TokenSectionEntry, options: ExportOptions): string | null {
  const varName = generateLessVarName(entry.token, options.casing);
  const aliasName = entry.aliasTarget ? `@${generateLessVarName(entry.aliasTarget, options.casing)}` : null;
  const value = aliasName ?? formatTokenValue(entry.mode.value, options);
  if (!value) return null;
  return `@${varName}: ${value};`;
}

function generateLessVarName(token: TokenSectionEntry['token'], casing: ExportOptions['casing']): string {
  const parts: string[] = [];

  if (token.collection) {
    parts.push(token.collection);
  }

  if (token.groupPath?.length) {
    parts.push(...token.groupPath);
  }

  parts.push(token.name);

  const fullName = parts.join('/');
  return toCasing(fullName, casing);
}

function formatTokenValue(
  value: TokenSectionEntry['mode']['value'],
  options: ExportOptions
): string | null {
  if (!value) return null;

  switch (value.type) {
    case 'color':
      return formatColor(value.value, options.color);
    case 'dimension':
      return formatWithUnit(value.value, options.unit);
    case 'number':
      return formatWithUnit(value.value, options.unit);
    case 'string':
      return `"${value.value}"`;
    case 'boolean':
      return value.value ? 'true' : 'false';
    case 'typography': {
      const typo = value.value;
      return `${typo.fontWeight} ${typo.fontSize}px/${formatLineHeight(typo.lineHeight, options.unit)} ${typo.fontFamily}`;
    }
    case 'shadow':
      return value.value
        .map((shadow) => {
          const colorStr = formatColor(shadow.color, options.color);
          const inset = shadow.type === 'inner-shadow' ? 'inset ' : '';
          return `${inset}${shadow.x}px ${shadow.y}px ${shadow.blur}px ${shadow.spread}px ${colorStr}`;
        })
        .join(', ');
    case 'gradient': {
      const gradientType = value.gradientType === 'LINEAR_GRADIENT' ? 'linear-gradient' : 'radial-gradient';
      const stops = value.value
        .map((stop) => {
          const color = formatColor(stop.color, options.color);
          return `${color} ${Math.round(stop.position * 100)}%`;
        })
        .join(', ');
      return `${gradientType}(${stops})`;
    }
    default:
      return null;
  }
}
