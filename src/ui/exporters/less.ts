import type { ExportOptions } from '@/shared/types';
import type { TokenSection, TokenSectionEntry } from './types';
import { toCasing } from '../utils/casing';
import { formatColor, formatGradient, formatCompositeColor } from '../utils/color';
import { formatWithUnit, formatLineHeight, formatLetterSpacing, buildFontStack, mapTextCase, mapTextDecoration, mapFontWeightString } from '../utils/units';
import { shouldShowModeNames, buildSectionLabel } from './sections';
import { classifyShadowToken, formatShadowList, formatBlurRadius, getEffectGroupHeadings } from './effects';

export function renderLess(sections: TokenSection[], options: ExportOptions, modeInFileName?: boolean): string {
  if (!sections.length) {
    return '// No tokens selected\n';
  }

  const lines: string[] = [];
  const showModes = shouldShowModeNames(sections);
  const includeModeInName = showModes && !modeInFileName;

  sections.forEach((section, index) => {
    const label = buildSectionLabel(section, showModes);
    lines.push(`// ${label}`);

    let prevEffectGroupPath: string[] = [];
    section.entries.forEach((entry) => {
      const modeName = includeModeInName ? section.modeName : null;

      const { headings, nextPrev } = getEffectGroupHeadings(
        entry.token,
        prevEffectGroupPath,
        section.collectionName
      );
      headings.forEach((h) => {
        lines.push('');
        lines.push(`// ${h}`);
      });
      prevEffectGroupPath = nextPrev;

      const declarations = buildLessDeclarations(entry, options, modeName);
      declarations.forEach((decl) => lines.push(decl));
    });

    if (index !== sections.length - 1) {
      lines.push('');
    }
  });

  return lines.join('\n') + '\n';
}

function buildLessDeclarations(entry: TokenSectionEntry, options: ExportOptions, modeName: string | null): string[] {
  const varName = generateLessVarName(entry.token, options.casing, modeName, options.includeTopLevelName);

  // Blur-only effect tokens: variable + companion Less mixin (.name()).
  // The grouping comment is emitted once per blur-kind run by the section iterator.
  if (entry.mode.value?.type === 'shadow' && !entry.aliasTarget) {
    const shadowValue = entry.mode.value;
    const classification = classifyShadowToken(shadowValue);
    if (classification.kind === 'layer-blur' || classification.kind === 'background-blur') {
      const blurEntry = shadowValue.value.find(
        (e) => e.type === 'layer-blur' || e.type === 'background-blur'
      ) as Extract<typeof shadowValue.value[number], { type: 'layer-blur' | 'background-blur' }> | undefined;
      const radius = formatBlurRadius(
        classification.radius,
        options.unit,
        blurEntry?.radiusAlias,
        options.ignoreAliases ? undefined : (alias) => `@${toCasing(alias, options.casing)}`
      );
      const property = classification.kind === 'background-blur' ? 'backdrop-filter' : 'filter';
      return [
        `@${varName}: ${radius};`,
        `.${varName}() {`,
        `  ${property}: blur(@${varName});`,
        `}`
      ];
    }
  }

  // Typography tokens: mixin or individual variable format
  if (entry.mode.value?.type === 'typography' && !entry.aliasTarget) {
    const useMixins = options.typographyFormat === 'mixins';
    if (useMixins) {
      return buildLessTypographyMixin(varName, entry.mode.value.value, options);
    }
    return buildLessTypographyVars(varName, entry.mode.value.value, options);
  }

  // Non-typography or aliased
  const aliasName = entry.aliasTarget ? `@${generateLessVarName(entry.aliasTarget, options.casing, modeName, options.includeTopLevelName)}` : null;
  let value = aliasName ?? formatTokenValue(entry.mode.value, options);
  if (!value) return [];

  // Convert font weight strings to numeric CSS values
  if (!aliasName && entry.mode.value?.type === 'string') {
    const numericWeight = mapFontWeightString(entry.mode.value.value);
    if (numericWeight !== null) value = String(numericWeight);
  }

  return [`@${varName}: ${value};`];
}

function formatLessAliasRef(aliasName: string | undefined, casing: ExportOptions['casing'], ignore?: boolean): string | null {
  if (ignore || !aliasName) return null;
  return `@${toCasing(aliasName, casing)}`;
}

function buildLessTypographyVars(
  varName: string,
  typo: NonNullable<import('@/shared/types').TypographyTokenValue['value']>,
  options: ExportOptions
): string[] {
  const cas = options.casing;
  const decls: string[] = [];
  decls.push(`@${varName}-font-family: ${formatLessAliasRef(typo.fontFamilyAlias, cas, options.ignoreAliases) ?? buildFontStack(typo.fontFamily, options.fontFallbacks)};`);
  decls.push(`@${varName}-font-size: ${formatLessAliasRef(typo.fontSizeAlias, cas, options.ignoreAliases) ?? formatWithUnit(typo.fontSize, options.unit)};`);
  decls.push(`@${varName}-font-weight: ${formatLessAliasRef(typo.fontWeightAlias, cas, options.ignoreAliases) ?? typo.fontWeight};`);
  decls.push(`@${varName}-line-height: ${formatLessAliasRef(typo.lineHeightAlias, cas, options.ignoreAliases) ?? formatLineHeight(typo.lineHeight, options.unit)};`);
  decls.push(`@${varName}-letter-spacing: ${formatLessAliasRef(typo.letterSpacingAlias, cas, options.ignoreAliases) ?? formatLetterSpacing(typo.letterSpacing, options.unit)};`);

  const textTransform = mapTextCase(typo.textCase);
  if (textTransform) {
    decls.push(`@${varName}-text-transform: ${textTransform};`);
  }

  const textDecoration = mapTextDecoration(typo.textDecoration);
  if (textDecoration) {
    decls.push(`@${varName}-text-decoration: ${textDecoration};`);
  }

  if (typo.paragraphSpacing && typo.paragraphSpacing > 0) {
    decls.push(`@${varName}-paragraph-spacing: ${formatWithUnit(typo.paragraphSpacing, options.unit)};`);
  }

  return decls;
}

function buildLessTypographyMixin(
  varName: string,
  typo: NonNullable<import('@/shared/types').TypographyTokenValue['value']>,
  options: ExportOptions
): string[] {
  const cas = options.casing;
  const lines: string[] = [];
  lines.push(`.${varName}() {`);
  lines.push(`  font-family: ${formatLessAliasRef(typo.fontFamilyAlias, cas, options.ignoreAliases) ?? buildFontStack(typo.fontFamily, options.fontFallbacks)};`);
  lines.push(`  font-size: ${formatLessAliasRef(typo.fontSizeAlias, cas, options.ignoreAliases) ?? formatWithUnit(typo.fontSize, options.unit)};`);
  lines.push(`  font-weight: ${formatLessAliasRef(typo.fontWeightAlias, cas, options.ignoreAliases) ?? typo.fontWeight};`);
  lines.push(`  line-height: ${formatLessAliasRef(typo.lineHeightAlias, cas, options.ignoreAliases) ?? formatLineHeight(typo.lineHeight, options.unit)};`);
  lines.push(`  letter-spacing: ${formatLessAliasRef(typo.letterSpacingAlias, cas, options.ignoreAliases) ?? formatLetterSpacing(typo.letterSpacing, options.unit)};`);

  const textTransform = mapTextCase(typo.textCase);
  if (textTransform) {
    lines.push(`  text-transform: ${textTransform};`);
  }

  const textDecoration = mapTextDecoration(typo.textDecoration);
  if (textDecoration) {
    lines.push(`  text-decoration: ${textDecoration};`);
  }

  if (typo.paragraphSpacing && typo.paragraphSpacing > 0) {
    lines.push(`  --paragraph-spacing: ${formatWithUnit(typo.paragraphSpacing, options.unit)};`);
  }

  lines.push('}');
  return lines;
}

function generateLessVarName(
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
    case 'shadow': {
      const c = classifyShadowToken(value);
      const aliasResolver = options.ignoreAliases
        ? undefined
        : (alias: string) => `@${toCasing(alias, options.casing)}`;
      const blurEntry = value.value.find(
        (e) => e.type === 'layer-blur' || e.type === 'background-blur'
      ) as Extract<typeof value.value[number], { type: 'layer-blur' | 'background-blur' }> | undefined;
      if (c.kind === 'shadow' || c.kind === 'mixed') return formatShadowList(c.shadows, options.color, aliasResolver);
      if (c.kind === 'layer-blur' || c.kind === 'background-blur') return formatBlurRadius(c.radius, options.unit, blurEntry?.radiusAlias, aliasResolver);
      return null;
    }
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
