import type { ExportOptions } from '@/shared/types';
import type { TokenSection, TokenSectionEntry } from './types';
import { toCasing } from '../utils/casing';
import { formatColor, formatCompositeColor } from '../utils/color';
import { pxToRem, roundTo, formatWithUnit, formatLineHeight, formatLetterSpacing, buildFontStack, mapTextCase, mapTextDecoration, mapFontWeightString } from '../utils/units';
import { getEffectGroupHeadings } from './effects';

/**
 * Tailwind v4 exporter — outputs CSS with @theme directive
 * instead of the v3 CommonJS module.exports format.
 */
export function renderTailwindV4(sections: TokenSection[], options: ExportOptions, _modeInFileName?: boolean): string {
  if (!sections.length) {
    return '/* No tokens selected */\n';
  }

  const useRem = options.unit === 'rem';
  const themeLines: string[] = [];
  const componentLines: string[] = [];

  sections.forEach((section) => {
    const label = section.modeName
      ? `${section.collectionName} — ${section.modeName}`
      : section.collectionName;
    themeLines.push(`  /* ${label} */`);

    let prevEffectGroupPath: string[] = [];
    section.entries.forEach((entry) => {
      const key = generateV4Key(entry.token, options.includeTopLevelName);

      // Sub-headings reflecting the user's full Figma folder hierarchy
      const { headings, nextPrev } = getEffectGroupHeadings(
        entry.token,
        prevEffectGroupPath,
        section.collectionName
      );
      headings.forEach((h) => themeLines.push(`  /* ${h} */`));
      prevEffectGroupPath = nextPrev;

      if (entry.aliasTarget) {
        const aliasKey = generateV4Key(entry.aliasTarget, options.includeTopLevelName);
        const aliasDecls = buildAliasDeclarations(key, aliasKey, entry);
        aliasDecls.forEach((d) => themeLines.push(`  ${d}`));
        return;
      }

      const value = entry.mode.value;
      if (!value) return;

      switch (value.type) {
        case 'color': {
          themeLines.push(`  --color-${key}: ${formatColor(value.value, options.color)};`);
          break;
        }
        case 'dimension':
        case 'number': {
          const formatted = useRem ? `${roundTo(pxToRem(value.value), 4)}rem` : `${roundTo(value.value, 3)}px`;
          themeLines.push(`  --spacing-${key}: ${formatted};`);
          break;
        }
        case 'typography': {
          const typo = value.value;
          const v4Alias = (a: string | undefined) => a ? `var(--${toCasing(a, 'kebab-case')})` : null;
          themeLines.push(`  --font-${key}: ${v4Alias(typo.fontFamilyAlias) ?? buildFontStack(typo.fontFamily, options.fontFallbacks)};`);
          themeLines.push(`  --text-${key}: ${v4Alias(typo.fontSizeAlias) ?? formatWithUnit(typo.fontSize, options.unit)};`);
          themeLines.push(`  --text-${key}--line-height: ${v4Alias(typo.lineHeightAlias) ?? formatLineHeight(typo.lineHeight, options.unit)};`);
          themeLines.push(`  --text-${key}--font-weight: ${v4Alias(typo.fontWeightAlias) ?? typo.fontWeight};`);
          themeLines.push(`  --text-${key}--letter-spacing: ${v4Alias(typo.letterSpacingAlias) ?? formatLetterSpacing(typo.letterSpacing, options.unit)};`);

          if (typo.paragraphSpacing && typo.paragraphSpacing > 0) {
            themeLines.push(`  --text-${key}--paragraph-spacing: ${formatWithUnit(typo.paragraphSpacing, options.unit)};`);
          }

          // textCase/textDecoration require companion utility in @layer components
          const textTransform = mapTextCase(typo.textCase);
          const textDecoration = mapTextDecoration(typo.textDecoration);
          if (textTransform || textDecoration) {
            const rules: string[] = [];
            if (textTransform) rules.push(`    text-transform: ${textTransform};`);
            if (textDecoration) rules.push(`    text-decoration: ${textDecoration};`);
            componentLines.push(`  .text-${key} {`);
            rules.forEach((r) => componentLines.push(r));
            componentLines.push('  }');
          }
          break;
        }
        case 'shadow': {
          const arr = value.value;
          const shadowEntries = arr.filter(
            (e): e is Extract<typeof e, { type: 'drop-shadow' | 'inner-shadow' }> =>
              e.type === 'drop-shadow' || e.type === 'inner-shadow'
          );
          const blurEntries = arr.filter(
            (e): e is Extract<typeof e, { type: 'layer-blur' | 'background-blur' }> =>
              e.type === 'layer-blur' || e.type === 'background-blur'
          );

          if (shadowEntries.length) {
            const shadowStr = shadowEntries
              .map((shadow) => {
                const color = formatColor(shadow.color, 'rgb');
                const inset = shadow.type === 'inner-shadow' ? 'inset ' : '';
                return `${inset}${shadow.x}px ${shadow.y}px ${shadow.blur}px ${shadow.spread}px ${color}`;
              })
              .join(', ');
            themeLines.push(`  --shadow-${key}: ${shadowStr};`);
          }

          if (blurEntries.length && !shadowEntries.length) {
            const blur = blurEntries[0];
            const radius = useRem ? `${roundTo(pxToRem(blur.radius), 4)}rem` : `${roundTo(blur.radius, 3)}px`;
            const prefix = blur.type === 'background-blur' ? '--backdrop-blur' : '--blur';
            themeLines.push(`  ${prefix}-${key}: ${radius};`);
          }
          break;
        }
        case 'gradient': {
          const stops = value.value
            .map((stop) => `${formatColor(stop.color, options.color)} ${Math.round(stop.position * 100)}%`)
            .join(', ');
          const angle = value.gradientAngle ?? 180;
          themeLines.push(`  --color-${key}: linear-gradient(${angle}deg, ${stops});`);
          break;
        }
        case 'compositeColor': {
          themeLines.push(`  --color-${key}: ${formatCompositeColor(value.value, options.color)};`);
          break;
        }
        case 'string': {
          const numericWeight = mapFontWeightString(value.value);
          if (numericWeight !== null) {
            themeLines.push(`  --font-weight-${key}: ${numericWeight};`);
          }
          break;
        }
      }
    });

    themeLines.push('');
  });

  const output: string[] = [];
  output.push('@theme {');
  themeLines.forEach((line) => output.push(line));
  output.push('}');

  if (componentLines.length > 0) {
    output.push('');
    output.push('@layer components {');
    componentLines.forEach((line) => output.push(line));
    output.push('}');
  }

  output.push('');
  return output.join('\n');
}

function buildAliasDeclarations(key: string, aliasKey: string, entry: TokenSectionEntry): string[] {
  const value = entry.mode.value;
  if (!value) return [];

  switch (value.type) {
    case 'color':
    case 'gradient':
    case 'compositeColor':
      return [`--color-${key}: var(--color-${aliasKey});`];
    case 'dimension':
    case 'number':
      return [`--spacing-${key}: var(--spacing-${aliasKey});`];
    case 'typography':
      return [
        `--font-${key}: var(--font-${aliasKey});`,
        `--text-${key}: var(--text-${aliasKey});`,
        `--text-${key}--line-height: var(--text-${aliasKey}--line-height);`,
        `--text-${key}--font-weight: var(--text-${aliasKey}--font-weight);`,
        `--text-${key}--letter-spacing: var(--text-${aliasKey}--letter-spacing);`,
      ];
    case 'shadow':
      return [`--shadow-${key}: var(--shadow-${aliasKey});`];
    default:
      return [];
  }
}

function generateV4Key(token: TokenSectionEntry['token'], includeTopLevelName: boolean): string {
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
