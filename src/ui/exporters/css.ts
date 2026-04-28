import type { ExportOptions, NormalizedToken } from '@/shared/types';
import type { TokenSection, TokenSectionEntry } from './types';
import { toCasing } from '../utils/casing';
import { formatColor, formatGradient, formatCompositeColor } from '../utils/color';
import { formatWithUnit, formatLineHeight, formatLetterSpacing, buildFontStack, mapTextCase, mapTextDecoration, mapFontWeightString } from '../utils/units';
import { shouldShowModeNames, buildSectionLabel } from './sections';
import { classifyShadowToken, formatShadowList, formatBlurRadius, getEffectGroupHeadings } from './effects';

interface TypographyClassEntry {
  entry: TokenSectionEntry;
  modeName: string | null;
}

interface BlurClassEntry {
  entry: TokenSectionEntry;
  modeName: string | null;
  blurType: 'layer-blur' | 'background-blur';
}

export function isHeadingToken(token: NormalizedToken): boolean {
  // Match either a "heading(s)" group, or a token name like "Heading 1" / "h1".
  if (token.groupPath?.some((g) => /^headings?$/i.test(g))) return true;
  return /^(h[1-6]|heading\s*[1-6])$/i.test(token.name.trim());
}

export function isBodyToken(token: NormalizedToken): boolean {
  return token.groupPath?.some((g) => /^(body|paragraphs?)$/i.test(g)) ?? false;
}

export function renderCSS(sections: TokenSection[], options: ExportOptions, modeInFileName?: boolean): string {
  if (!sections.length) {
    return '/* No tokens selected */\n';
  }

  const showModes = shouldShowModeNames(sections);
  const includeModeInName = showModes && !modeInFileName;
  const classesMode = (options.cssTypographyFormat ?? 'classes') === 'classes';
  const typographyClassEntries: TypographyClassEntry[] = [];
  const blurClassEntries: BlurClassEntry[] = [];
  const rootLines: string[] = [];

  sections.forEach((section) => {
    const label = buildSectionLabel(section, showModes);
    const modeName = includeModeInName ? section.modeName : null;
    const sectionLines: string[] = [];
    let prevEffectGroupPath: string[] = [];

    section.entries.forEach((entry) => {
      const isTypography = entry.mode.value?.type === 'typography';
      if (classesMode && isTypography) {
        typographyClassEntries.push({ entry, modeName });
        return;
      }

      // Detect blur-only effect tokens so we can emit a companion utility class
      // with the correct CSS property (filter vs backdrop-filter).
      if (entry.mode.value?.type === 'shadow' && !entry.aliasTarget) {
        const classification = classifyShadowToken(entry.mode.value);
        if (classification.kind === 'layer-blur' || classification.kind === 'background-blur') {
          blurClassEntries.push({ entry, modeName, blurType: classification.kind });
        }
      }

      // Emit sub-headings reflecting the user's full Figma folder hierarchy.
      const { headings, nextPrev } = getEffectGroupHeadings(
        entry.token,
        prevEffectGroupPath,
        section.collectionName
      );
      headings.forEach((h) => {
        if (sectionLines.length > 0) sectionLines.push('');
        sectionLines.push(`  /* ${h} */`);
      });
      prevEffectGroupPath = nextPrev;

      const declarations = buildCSSDeclarations(entry, options, modeName);
      declarations.forEach((decl) => sectionLines.push(`  ${decl}`));
    });

    if (sectionLines.length > 0) {
      rootLines.push('');
      rootLines.push(`  /* ${label} */`);
      rootLines.push(...sectionLines);
    }
  });

  const output: string[] = [];

  if (rootLines.length > 0) {
    output.push(':root {');
    output.push(...rootLines);
    output.push('');
    output.push('}');
  }

  if (typographyClassEntries.length > 0) {
    if (output.length > 0) output.push('');
    output.push('/* Typography */');
    typographyClassEntries.forEach(({ entry, modeName }) => {
      const varName = generateCSSVarName(entry.token, options.casing, modeName, options.includeTopLevelName);
      const className = varName.replace(/^--/, '.text-');
      const body = buildCSSTypographyClassBody(entry, options, isHeadingToken(entry.token));
      output.push('');
      output.push(`${className} {`);
      body.forEach((line) => output.push(`  ${line}`));
      output.push('}');
    });
  }

  if (blurClassEntries.length > 0) {
    if (output.length > 0) output.push('');
    output.push('/* Blur utilities */');
    blurClassEntries.forEach(({ entry, modeName, blurType }) => {
      const varName = generateCSSVarName(entry.token, options.casing, modeName, options.includeTopLevelName);
      const className = varName.replace(/^--/, '.');
      const property = blurType === 'background-blur' ? 'backdrop-filter' : 'filter';
      output.push('');
      output.push(`${className} {`);
      output.push(`  ${property}: blur(var(${varName}));`);
      output.push('}');
    });
  }

  const elementBlocks = buildElementDefaultBlocks(sections, options);
  if (elementBlocks.length > 0) {
    if (output.length > 0) output.push('');
    output.push('/* Base element defaults */');
    elementBlocks.forEach((block) => {
      output.push('');
      output.push(...block);
    });
  }

  if (output.length === 0) {
    return '/* No tokens selected */\n';
  }

  output.push('');
  return output.join('\n');
}

function buildElementDefaultBlocks(sections: TokenSection[], options: ExportOptions): string[][] {
  const blocks: string[][] = [];

  const typographyEntries: TokenSectionEntry[] = [];
  sections.forEach((section) => {
    section.entries.forEach((entry) => {
      if (entry.mode.value?.type === 'typography') {
        typographyEntries.push(entry);
      }
    });
  });

  if (options.cssIncludeBodyBaseline && options.cssBodyBaselineTokenId) {
    const bodyEntry = typographyEntries.find((e) => e.token.id === options.cssBodyBaselineTokenId);
    if (bodyEntry && bodyEntry.mode.value?.type === 'typography') {
      const typo = bodyEntry.mode.value.value;
      const cas = options.casing;
      const block: string[] = ['body {'];
      block.push(`  font-family: ${formatCSSAliasRef(typo.fontFamilyAlias, cas) ?? buildFontStack(typo.fontFamily, options.fontFallbacks)};`);
      block.push(`  font-size: ${formatCSSAliasRef(typo.fontSizeAlias, cas) ?? formatWithUnit(typo.fontSize, options.unit)};`);
      block.push(`  line-height: ${formatCSSAliasRef(typo.lineHeightAlias, cas) ?? formatLineHeight(typo.lineHeight, options.unit)};`);
      block.push(`  font-weight: ${formatCSSAliasRef(typo.fontWeightAlias, cas) ?? String(typo.fontWeight)};`);
      block.push('}');
      blocks.push(block);
    }
  }

  if (options.cssIncludeHeadingDefaults) {
    const headingEntries = typographyEntries.filter((e) => isHeadingToken(e.token));
    const seen = new Set<string>();
    const uniqueHeadings = headingEntries.filter((e) => {
      if (seen.has(e.token.id)) return false;
      seen.add(e.token.id);
      return true;
    });
    uniqueHeadings.sort((a, b) => {
      const aSize = a.mode.value?.type === 'typography' ? (a.mode.value.value.fontSize ?? 0) : 0;
      const bSize = b.mode.value?.type === 'typography' ? (b.mode.value.value.fontSize ?? 0) : 0;
      return bSize - aSize;
    });
    const top = uniqueHeadings.slice(0, 6);
    top.forEach((entry, index) => {
      const selector = `h${index + 1}`;
      const body = buildCSSTypographyClassBody(entry, options, true);
      if (body.length === 0) return;
      const block: string[] = [`${selector} {`];
      body.forEach((line) => block.push(`  ${line}`));
      block.push('}');
      blocks.push(block);
    });
  }

  return blocks;
}

function buildCSSDeclarations(entry: TokenSectionEntry, options: ExportOptions, modeName: string | null): string[] {
  const varName = generateCSSVarName(entry.token, options.casing, modeName, options.includeTopLevelName);

  // Blur-only effect tokens emit a bare length value; the surrounding loop adds
  // a single grouping comment per run of consecutive blurs of the same kind.
  if (entry.mode.value?.type === 'shadow' && !entry.aliasTarget) {
    const classification = classifyShadowToken(entry.mode.value);
    if (classification.kind === 'layer-blur' || classification.kind === 'background-blur') {
      const radius = formatBlurRadius(classification.radius, options.unit);
      return [`${varName}: ${radius};`];
    }
  }

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
  if (!aliasName && entry.mode.value?.type === 'string') {
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

  if (typo.paragraphSpacing && typo.paragraphSpacing > 0) {
    decls.push(`${varName}-paragraph-spacing: ${formatWithUnit(typo.paragraphSpacing, options.unit)};`);
  }

  return decls;
}

function buildCSSTypographyClassBody(entry: TokenSectionEntry, options: ExportOptions, isHeading = false): string[] {
  if (entry.mode.value?.type !== 'typography') return [];
  const typo = entry.mode.value.value;
  const cas = options.casing;
  const lines: string[] = [];

  lines.push(`font-family: ${formatCSSAliasRef(typo.fontFamilyAlias, cas) ?? buildFontStack(typo.fontFamily, options.fontFallbacks)};`);
  lines.push(`font-size: ${formatCSSAliasRef(typo.fontSizeAlias, cas) ?? formatWithUnit(typo.fontSize, options.unit)};`);
  lines.push(`line-height: ${formatCSSAliasRef(typo.lineHeightAlias, cas) ?? formatLineHeight(typo.lineHeight, options.unit)};`);
  lines.push(`font-weight: ${formatCSSAliasRef(typo.fontWeightAlias, cas) ?? String(typo.fontWeight)};`);
  lines.push(`letter-spacing: ${formatCSSAliasRef(typo.letterSpacingAlias, cas) ?? formatLetterSpacing(typo.letterSpacing, options.unit)};`);

  const tt = mapTextCase(typo.textCase);
  if (tt) lines.push(`text-transform: ${tt};`);
  const td = mapTextDecoration(typo.textDecoration);
  if (td) lines.push(`text-decoration: ${td};`);

  if (typo.paragraphSpacing && typo.paragraphSpacing > 0) {
    lines.push(`--paragraph-spacing: ${formatWithUnit(typo.paragraphSpacing, options.unit)};`);
  }

  if (isHeading && options.cssHeadingTextWrapBalance) {
    lines.push('text-wrap: balance;');
  }

  return lines;
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
      const classification = classifyShadowToken(value);
      switch (classification.kind) {
        case 'shadow':
          return formatShadowList(classification.shadows, options.color);
        case 'layer-blur':
        case 'background-blur':
          return formatBlurRadius(classification.radius, options.unit);
        case 'mixed':
          return formatShadowList(classification.shadows, options.color);
        case 'empty':
          return null;
      }
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

export function renderCSSGrouped(sections: TokenSection[], options: ExportOptions): string {
  return renderCSS(sections, options);
}
