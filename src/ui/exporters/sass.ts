import type { ExportOptions } from '@/shared/types';
import type { TokenSection, TokenSectionEntry } from './types';
import { shouldShowModeNames, buildSectionLabel } from './sections';
import { toCasing } from '../utils/casing';
import { formatColor, formatGradient, formatCompositeColor } from '../utils/color';
import { formatWithUnit, formatLineHeight, formatLetterSpacing } from '../utils/units';

export function renderSass(sections: TokenSection[], options: ExportOptions, modeInFileName?: boolean): string {
  if (!sections.length) {
    return '// No tokens selected\n';
  }

  const lines: string[] = [];
  const showModes = shouldShowModeNames(sections);
  const includeModeInName = showModes && !modeInFileName;

  sections.forEach((section, index) => {
    const label = buildSectionLabel(section, showModes);
    lines.push(`/* ${label} */`);

    section.entries.forEach((entry) => {
      const declaration = buildSassDeclaration(entry, options, includeModeInName ? section.modeName : null);
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

function buildSassDeclaration(entry: TokenSectionEntry, options: ExportOptions, modeName: string | null): string | null {
  const varName = generateSassVarName(entry.token, options.casing, modeName, options.includeTopLevelName);
  const aliasName = entry.aliasTarget ? `$${generateSassVarName(entry.aliasTarget, options.casing, modeName, options.includeTopLevelName)}` : null;
  const value = aliasName ?? formatTokenValue(entry.mode.value, options);
  if (!value) return null;
  return `$${varName}: ${value};`;
}

function generateSassVarName(
  token: TokenSectionEntry['token'],
  casing: ExportOptions['casing'],
  modeName?: string | null,
  includeTopLevelName?: boolean
): string {
  const parts: string[] = [];

  if (includeTopLevelName && token.collection) {
    parts.push(token.collection);
  }

  if (modeName) {
    parts.push(modeName);
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
      // Dimension tokens (radius, spacing, etc.) - use the token's unit or fall back to options.unit
      return formatWithUnit(value.value, options.unit);
    case 'number':
      return formatWithUnit(value.value, options.unit);
    case 'string':
      return `"${value.value}"`;
    case 'boolean':
      return value.value ? 'true' : 'false';
    case 'typography': {
      const typo = value.value;
      return `(\n  font-family: ${typo.fontFamily},\n  font-size: ${typo.fontSize}px,\n  font-weight: ${typo.fontWeight},\n  line-height: ${formatLineHeight(typo.lineHeight, options.unit)},\n  letter-spacing: ${formatLetterSpacing(typo.letterSpacing, options.unit)}\n)`;
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
      const gradientType = value.gradientType === 'LINEAR_GRADIENT' ? 'linear-gradient' : 
                           value.gradientType === 'RADIAL_GRADIENT' ? 'radial-gradient' :
                           value.gradientType === 'ANGULAR_GRADIENT' ? 'conic-gradient' : 'radial-gradient';
      return formatGradient(gradientType as any, value.value, value.gradientAngle, options.color);
    }
    case 'compositeColor': {
      return formatCompositeColor(value.value, options.color);
    }
    default:
      return null;
  }
}
