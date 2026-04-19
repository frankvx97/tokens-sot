import type { ExportOptions } from '@/shared/types';
import type { TokenSection, TokenSectionEntry } from './types';
import { shouldShowModeNames, buildSectionLabel } from './sections';
import { toCasing } from '../utils/casing';
import { formatColor, formatGradient, formatCompositeColor } from '../utils/color';
import { formatWithUnit, formatLineHeight, formatLetterSpacing, buildFontStack, mapTextCase, mapTextDecoration, isLikelyFontWeight, mapFontWeightString } from '../utils/units';

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
      const modeName = includeModeInName ? section.modeName : null;
      const declarations = buildSassDeclarations(entry, options, modeName);
      declarations.forEach((decl) => lines.push(decl));
    });

    if (index !== sections.length - 1) {
      lines.push('');
    }
  });

  return lines.join('\n') + '\n';
}

function buildSassDeclarations(entry: TokenSectionEntry, options: ExportOptions, modeName: string | null): string[] {
  const varName = generateSassVarName(entry.token, options.casing, modeName, options.includeTopLevelName);

  // Typography tokens: mixin or map format
  if (entry.mode.value?.type === 'typography' && !entry.aliasTarget) {
    const useMixins = options.typographyFormat === 'mixins';
    if (useMixins) {
      return buildSassTypographyMixin(varName, entry.mode.value.value, options);
    }
    return buildSassTypographyMap(varName, entry.mode.value.value, options);
  }

  // Non-typography or aliased
  const aliasName = entry.aliasTarget ? `$${generateSassVarName(entry.aliasTarget, options.casing, modeName, options.includeTopLevelName)}` : null;
  let value = aliasName ?? formatTokenValue(entry.mode.value, options);
  if (!value) return [];

  // Convert font weight strings to numeric CSS values
  if (!aliasName && entry.mode.value?.type === 'string' && isLikelyFontWeight(entry.token.name, entry.token.groupPath)) {
    const numericWeight = mapFontWeightString(entry.mode.value.value);
    if (numericWeight !== null) value = String(numericWeight);
  }

  return [`$${varName}: ${value};`];
}

function formatSassAliasRef(aliasName: string | undefined, casing: ExportOptions['casing']): string | null {
  if (!aliasName) return null;
  return `$${toCasing(aliasName, casing)}`;
}

function buildSassTypographyMap(
  varName: string,
  typo: NonNullable<import('@/shared/types').TypographyTokenValue['value']>,
  options: ExportOptions
): string[] {
  const cas = options.casing;
  const pairs: string[] = [];
  pairs.push(`  font-family: ${formatSassAliasRef(typo.fontFamilyAlias, cas) ?? buildFontStack(typo.fontFamily, options.fontFallbacks)}`);
  pairs.push(`  font-size: ${formatSassAliasRef(typo.fontSizeAlias, cas) ?? formatWithUnit(typo.fontSize, options.unit)}`);
  pairs.push(`  font-weight: ${formatSassAliasRef(typo.fontWeightAlias, cas) ?? typo.fontWeight}`);
  pairs.push(`  line-height: ${formatSassAliasRef(typo.lineHeightAlias, cas) ?? formatLineHeight(typo.lineHeight, options.unit)}`);
  pairs.push(`  letter-spacing: ${formatSassAliasRef(typo.letterSpacingAlias, cas) ?? formatLetterSpacing(typo.letterSpacing, options.unit)}`);

  const textTransform = mapTextCase(typo.textCase);
  if (textTransform) {
    pairs.push(`  text-transform: ${textTransform}`);
  }

  const textDecoration = mapTextDecoration(typo.textDecoration);
  if (textDecoration) {
    pairs.push(`  text-decoration: ${textDecoration}`);
  }

  return [`$${varName}: (\n${pairs.join(',\n')}\n);`];
}

function buildSassTypographyMixin(
  varName: string,
  typo: NonNullable<import('@/shared/types').TypographyTokenValue['value']>,
  options: ExportOptions
): string[] {
  const cas = options.casing;
  const lines: string[] = [];
  lines.push(`@mixin ${varName} {`);
  lines.push(`  font-family: ${formatSassAliasRef(typo.fontFamilyAlias, cas) ?? buildFontStack(typo.fontFamily, options.fontFallbacks)};`);
  lines.push(`  font-size: ${formatSassAliasRef(typo.fontSizeAlias, cas) ?? formatWithUnit(typo.fontSize, options.unit)};`);
  lines.push(`  font-weight: ${formatSassAliasRef(typo.fontWeightAlias, cas) ?? typo.fontWeight};`);
  lines.push(`  line-height: ${formatSassAliasRef(typo.lineHeightAlias, cas) ?? formatLineHeight(typo.lineHeight, options.unit)};`);
  lines.push(`  letter-spacing: ${formatSassAliasRef(typo.letterSpacingAlias, cas) ?? formatLetterSpacing(typo.letterSpacing, options.unit)};`);

  const textTransform = mapTextCase(typo.textCase);
  if (textTransform) {
    lines.push(`  text-transform: ${textTransform};`);
  }

  const textDecoration = mapTextDecoration(typo.textDecoration);
  if (textDecoration) {
    lines.push(`  text-decoration: ${textDecoration};`);
  }

  lines.push('}');
  return lines;
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
      return formatWithUnit(value.value, options.unit);
    case 'number':
      return formatWithUnit(value.value, options.unit);
    case 'string':
      return `"${value.value}"`;
    case 'boolean':
      return value.value ? 'true' : 'false';
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
