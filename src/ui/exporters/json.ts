import type { ExportOptions } from '@/shared/types';
import type { TokenSection, TokenSectionEntry } from './types';
import { toCasing } from '../utils/casing';
import { rgbaToHex } from '../utils/color';
import { roundTo, isLikelyFontWeight, mapFontWeightString } from '../utils/units';
import { shouldShowModeNames, buildSectionLabel } from './sections';

export function renderJSON(sections: TokenSection[], options: ExportOptions, modeInFileName?: boolean): string {
  if (options.useDTCG) {
    return renderDTCGJSON(sections, options);
  }

  if (!sections.length) {
    return '{\n  "tokens": {}\n}\n';
  }

  const showModes = shouldShowModeNames(sections);
  // Use parent key grouping for modes when they share the same file
  const useModeKey = showModes && !modeInFileName;

  if (useModeKey) {
    // Structured output with mode as parent key: { "Collection/Mode": { ...tokens } }
    const result: Record<string, Record<string, unknown>> = {};

    sections.forEach((section) => {
      const sectionKey = `${section.collectionName}/${section.modeName}`;
      const sectionTokens: Record<string, unknown> = {};

      section.entries.forEach((entry) => {
        const key = generateJSONKey(entry.token, options.casing, null, options.includeTopLevelName);
        const value = buildJSONValue(entry, options, null);
        if (!value) return;
        sectionTokens[key] = JSON.parse(value);
      });

      result[sectionKey] = sectionTokens;
    });

    return JSON.stringify(result, null, 2) + '\n';
  }

  // Flat output (original behavior)
  const properties: string[] = [];

  sections.forEach((section, sectionIndex) => {
    const label = buildSectionLabel(section, showModes);
    const commentKey = `// ${label} ${sectionIndex}`;
    properties.push(`    "${escapeJson(commentKey)}": null`);

    section.entries.forEach((entry) => {
      const key = generateJSONKey(entry.token, options.casing, null, options.includeTopLevelName);
      const value = buildJSONValue(entry, options, null);
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

function buildJSONValue(entry: TokenSectionEntry, options: ExportOptions, _modeName: string | null): string | null {
  if (entry.aliasTarget) {
    const aliasKey = generateJSONKey(entry.aliasTarget, options.casing, null, options.includeTopLevelName);
    return JSON.stringify(`@alias ${aliasKey}`);
  }

  // Convert font weight strings to numeric CSS values
  if (entry.mode.value?.type === 'string' && isLikelyFontWeight(entry.token.name, entry.token.groupPath)) {
    const numericWeight = mapFontWeightString(entry.mode.value.value);
    if (numericWeight !== null) return JSON.stringify(numericWeight);
  }

  const rawValue = formatTokenValue(entry.mode.value);
  if (rawValue === null) return null;
  return JSON.stringify(rawValue);
}

function generateJSONKey(
  token: TokenSectionEntry['token'],
  casing: ExportOptions['casing'],
  _modeName: string | null,
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
    case 'typography': {
      const typo = { ...value.value };
      // Round letter-spacing to clean up float garbage
      if (typeof typo.letterSpacing === 'number') {
        typo.letterSpacing = roundTo(typo.letterSpacing, 3);
      }
      return typo;
    }
    case 'shadow':
      return value.value;
    case 'gradient':
      return {
        type: value.gradientType,
        angle: value.gradientAngle,
        stops: value.value
      };
    case 'compositeColor':
      return {
        type: 'compositeColor',
        layers: value.value
      };
    default:
      return null;
  }
}

// --- DTCG Format (Design Tokens Community Group) ---

const DTCG_TYPE_MAP: Record<string, string> = {
  color: 'color',
  dimension: 'dimension',
  number: 'number',
  typography: 'typography',
  shadow: 'shadow',
  gradient: 'gradient',
  string: 'string',
  boolean: 'boolean',
};

function renderDTCGJSON(sections: TokenSection[], options: ExportOptions): string {
  if (!sections.length) {
    return '{}\n';
  }

  const root: Record<string, unknown> = {};

  sections.forEach((section) => {
    section.entries.forEach((entry) => {
      const token = entry.token;

      // Build the nested path: groupPath segments + token name
      const pathParts = [...(token.groupPath ?? [])];
      const tokenName = token.name;

      // Navigate/create nested groups
      let current = root;
      for (const segment of pathParts) {
        // Sanitize segment: DTCG names must not start with $ or contain {, }, .
        const safeName = sanitizeDTCGName(segment);
        if (!current[safeName] || typeof current[safeName] !== 'object') {
          current[safeName] = {};
        }
        current = current[safeName] as Record<string, unknown>;
      }

      const safeTokenName = sanitizeDTCGName(tokenName);

      // Build DTCG token object
      const dtcgToken: Record<string, unknown> = {};

      // $type
      const valueType = entry.mode.value?.type;
      if (valueType && DTCG_TYPE_MAP[valueType]) {
        dtcgToken.$type = DTCG_TYPE_MAP[valueType];
      }

      // $value
      if (entry.aliasTarget) {
        // DTCG alias syntax: "{group.token}"
        const aliasPath = [
          ...(entry.aliasTarget.groupPath ?? []),
          entry.aliasTarget.name
        ].map(sanitizeDTCGName).join('.');
        dtcgToken.$value = `{${aliasPath}}`;
      } else {
        dtcgToken.$value = formatDTCGValue(entry.mode.value, options);
      }

      // $description
      if (token.description) {
        dtcgToken.$description = token.description;
      }

      current[safeTokenName] = dtcgToken;
    });
  });

  return JSON.stringify(root, null, 2) + '\n';
}

function sanitizeDTCGName(name: string): string {
  return name.replace(/[{}.]/g, '-').replace(/^\$/, '_');
}

function formatDTCGValue(value: TokenSectionEntry['mode']['value'], options: ExportOptions): unknown {
  if (!value) return null;

  switch (value.type) {
    case 'color': {
      const { r, g, b, a } = value.value;
      const result: Record<string, unknown> = {
        colorSpace: 'srgb',
        components: [roundTo(r, 4), roundTo(g, 4), roundTo(b, 4)]
      };
      if (a < 1) result.alpha = roundTo(a, 4);
      return result;
    }
    case 'dimension': {
      const unit = options.unit === 'rem' ? 'rem' : (value.unit || 'px');
      const numericValue = options.unit === 'rem'
        ? roundTo(value.value / 16, 4)
        : roundTo(value.value, 3);
      return { value: numericValue, unit };
    }
    case 'number':
      return roundTo(value.value, 3);
    case 'string':
      return value.value;
    case 'boolean':
      return value.value;
    case 'typography': {
      const typo = value.value;
      const result: Record<string, unknown> = {
        fontFamily: [typo.fontFamily],
        fontSize: { value: typo.fontSize, unit: 'px' },
        fontWeight: typo.fontWeight,
        letterSpacing: { value: roundTo(typo.letterSpacing, 3), unit: 'px' }
      };
      if (typo.lineHeight === 'AUTO') {
        result.lineHeight = 1.5;
      } else {
        result.lineHeight = { value: typo.lineHeight, unit: 'px' };
      }
      return result;
    }
    case 'shadow': {
      // DTCG shadow can be a single object or array
      const shadows = value.value.map((s) => {
        const { r, g, b, a } = s.color;
        return {
          color: { colorSpace: 'srgb' as const, components: [roundTo(r, 4), roundTo(g, 4), roundTo(b, 4)], ...(a < 1 ? { alpha: roundTo(a, 4) } : {}) },
          offsetX: { value: s.x, unit: 'px' as const },
          offsetY: { value: s.y, unit: 'px' as const },
          blur: { value: s.blur, unit: 'px' as const },
          spread: { value: s.spread, unit: 'px' as const }
        };
      });
      return shadows.length === 1 ? shadows[0] : shadows;
    }
    case 'gradient': {
      return value.value.map((stop) => {
        const { r, g, b, a } = stop.color;
        return {
          color: { colorSpace: 'srgb', components: [roundTo(r, 4), roundTo(g, 4), roundTo(b, 4)], ...(a < 1 ? { alpha: roundTo(a, 4) } : {}) },
          position: stop.position
        };
      });
    }
    default:
      return null;
  }
}
