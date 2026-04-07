import type { ExportOptions } from '@/shared/types';
import type { TokenSection, TokenSectionEntry } from './types';
import { toCasing } from '../utils/casing';
import { formatColor, formatGradient, formatCompositeColor } from '../utils/color';
import { formatWithUnit, formatLineHeight, formatLetterSpacing, buildFontStack, mapTextCase, mapTextDecoration, isLikelyFontWeight, mapFontWeightString } from '../utils/units';
import { shouldShowModeNames, buildSectionLabel } from './sections';

interface TypographyUtilityEntry {
  varName: string;
  properties: string[];
}

export function renderCSS(sections: TokenSection[], options: ExportOptions, modeInFileName?: boolean): string {
  if (!sections.length) {
    return '/* No tokens selected */\n';
  }

  const lines: string[] = [':root {'];
  const showModes = shouldShowModeNames(sections);
  const includeModeInName = showModes && !modeInFileName;
  const utilityEntries: TypographyUtilityEntry[] = [];

  sections.forEach((section, sectionIndex) => {
    const label = buildSectionLabel(section, showModes);
    lines.push('');
    lines.push(`  /* ${label} */`);
    section.entries.forEach((entry) => {
      const modeName = includeModeInName ? section.modeName : null;
      const declarations = buildCSSDeclarations(entry, options, modeName);
      declarations.forEach((decl) => lines.push(`  ${decl}`));

      // Collect typography entries for utility classes
      if (options.emitUtilityClasses && entry.mode.value?.type === 'typography') {
        const varName = generateCSSVarName(entry.token, options.casing, modeName, options.includeTopLevelName);
        const props = buildTypographyPropertyNames(entry.mode.value.value);
        utilityEntries.push({ varName, properties: props });
      }
    });
    if (sectionIndex === sections.length - 1) {
      lines.push('');
    }
  });

  lines.push('}');

  // Emit composite utility classes if enabled
  if (options.emitUtilityClasses && utilityEntries.length > 0) {
    lines.push('');
    lines.push('/* Typography Utilities */');
    utilityEntries.forEach(({ varName, properties }) => {
      // .text-heading-2xl from --heading-2xl
      const className = varName.replace(/^--/, '.text-');
      lines.push(`${className} {`);
      properties.forEach((prop) => {
        lines.push(`  ${prop}: var(${varName}-${prop});`);
      });
      lines.push('}');
      lines.push('');
    });
  } else {
    lines.push('');
  }

  return lines.join('\n');
}

function buildTypographyPropertyNames(typo: { textCase?: string; textDecoration?: string }): string[] {
  const props = ['font-family', 'font-size', 'line-height', 'font-weight', 'letter-spacing'];
  if (mapTextCase(typo.textCase)) props.push('text-transform');
  if (mapTextDecoration(typo.textDecoration)) props.push('text-decoration');
  return props;
}

function buildCSSDeclarations(entry: TokenSectionEntry, options: ExportOptions, modeName: string | null): string[] {
  const varName = generateCSSVarName(entry.token, options.casing, modeName, options.includeTopLevelName);

  // Typography tokens emit multiple CSS custom properties per axis
  if (entry.mode.value?.type === 'typography' && !entry.aliasTarget) {
    return buildCSSTypographyDeclarations(varName, entry.mode.value.value, options);
  }

  // Alias for typography tokens: reference each sub-property
  if (entry.mode.value?.type === 'typography' && entry.aliasTarget) {
    const aliasVarName = generateCSSVarName(entry.aliasTarget, options.casing, modeName, options.includeTopLevelName);
    const props = ['font-family', 'font-size', 'line-height', 'font-weight', 'letter-spacing'];
    const typo = entry.mode.value.value;
    if (mapTextCase(typo.textCase)) props.push('text-transform');
    if (mapTextDecoration(typo.textDecoration)) props.push('text-decoration');
    return props.map((prop) => `${varName}-${prop}: var(${aliasVarName}-${prop});`);
  }

  // Non-typography: single declaration
  const aliasName = entry.aliasTarget ? `var(${generateCSSVarName(entry.aliasTarget, options.casing, modeName, options.includeTopLevelName)})` : null;
  let value = aliasName ?? formatTokenValue(entry.mode.value, options);
  if (!value) return [];

  // Convert font weight strings to numeric CSS values
  if (!aliasName && entry.mode.value?.type === 'string' && isLikelyFontWeight(entry.token.name, entry.token.groupPath)) {
    const numericWeight = mapFontWeightString(entry.mode.value.value);
    if (numericWeight !== null) value = String(numericWeight);
  }

  return [`${varName}: ${value};`];
}

function formatCSSAliasRef(aliasName: string | undefined, casing: ExportOptions['casing']): string | null {
  if (!aliasName) return null;
  return `var(--${toCasing(aliasName, casing)})`;
}

function buildCSSTypographyDeclarations(
  varName: string,
  typo: NonNullable<import('@/shared/types').TypographyTokenValue['value']>,
  options: ExportOptions
): string[] {
  const decls: string[] = [];
  const cas = options.casing;

  const fontFamilyVal = formatCSSAliasRef(typo.fontFamilyAlias, cas) ?? buildFontStack(typo.fontFamily, options.fontFallbacks);
  const fontSizeVal = formatCSSAliasRef(typo.fontSizeAlias, cas) ?? formatWithUnit(typo.fontSize, options.unit);
  const lineHeightVal = formatCSSAliasRef(typo.lineHeightAlias, cas) ?? formatLineHeight(typo.lineHeight, options.unit);
  const fontWeightVal = formatCSSAliasRef(typo.fontWeightAlias, cas) ?? String(typo.fontWeight);
  const letterSpacingVal = formatCSSAliasRef(typo.letterSpacingAlias, cas) ?? formatLetterSpacing(typo.letterSpacing, options.unit);

  decls.push(`${varName}-font-family: ${fontFamilyVal};`);
  decls.push(`${varName}-font-size: ${fontSizeVal};`);
  decls.push(`${varName}-line-height: ${lineHeightVal};`);
  decls.push(`${varName}-font-weight: ${fontWeightVal};`);
  decls.push(`${varName}-letter-spacing: ${letterSpacingVal};`);

  const textTransform = mapTextCase(typo.textCase);
  if (textTransform) {
    decls.push(`${varName}-text-transform: ${textTransform};`);
  }

  const textDecoration = mapTextDecoration(typo.textDecoration);
  if (textDecoration) {
    decls.push(`${varName}-text-decoration: ${textDecoration};`);
  }

  return decls;
}

function generateCSSVarName(
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
  const casedName = toCasing(fullName, casing);
  return `--${casedName}`;
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
      return value.value;
    case 'boolean':
      return value.value ? 'true' : 'false';
    case 'shadow': {
      return value.value
        .map((shadow) => {
          const colorStr = formatColor(shadow.color, options.color);
          const inset = shadow.type === 'inner-shadow' ? 'inset ' : '';
          return `${inset}${shadow.x}px ${shadow.y}px ${shadow.blur}px ${shadow.spread}px ${colorStr}`;
        })
        .join(', ');
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

export function renderCSSGrouped(sections: TokenSection[], options: ExportOptions): string {
  return renderCSS(sections, options);
}
