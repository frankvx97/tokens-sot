import type { ColorFormat, ShadowEntry, ShadowTokenValue, DimensionUnit } from '@/shared/types';
import { formatColor } from '../utils/color';
import { formatWithUnit } from '../utils/units';

export function isShadowEntry(
  entry: ShadowEntry
): entry is Extract<ShadowEntry, { type: 'drop-shadow' | 'inner-shadow' }> {
  return entry.type === 'drop-shadow' || entry.type === 'inner-shadow';
}

export function isBlurEntry(
  entry: ShadowEntry
): entry is Extract<ShadowEntry, { type: 'layer-blur' | 'background-blur' }> {
  return entry.type === 'layer-blur' || entry.type === 'background-blur';
}

export type ShadowTokenClassification =
  | { kind: 'shadow'; shadows: Extract<ShadowEntry, { type: 'drop-shadow' | 'inner-shadow' }>[] }
  | { kind: 'layer-blur'; radius: number }
  | { kind: 'background-blur'; radius: number }
  | { kind: 'mixed'; shadows: Extract<ShadowEntry, { type: 'drop-shadow' | 'inner-shadow' }>[]; blurs: Extract<ShadowEntry, { type: 'layer-blur' | 'background-blur' }>[] }
  | { kind: 'empty' };

export function classifyShadowToken(value: ShadowTokenValue): ShadowTokenClassification {
  const shadows = value.value.filter(isShadowEntry);
  const blurs = value.value.filter(isBlurEntry);

  if (!shadows.length && !blurs.length) return { kind: 'empty' };
  if (shadows.length && !blurs.length) return { kind: 'shadow', shadows };
  if (!shadows.length && blurs.length) {
    const allLayer = blurs.every((b) => b.type === 'layer-blur');
    const allBackground = blurs.every((b) => b.type === 'background-blur');
    const radius = blurs[0].radius;
    if (allLayer) return { kind: 'layer-blur', radius };
    if (allBackground) return { kind: 'background-blur', radius };
    return { kind: 'mixed', shadows, blurs };
  }
  return { kind: 'mixed', shadows, blurs };
}

export type ShadowAliasResolver = (aliasName: string) => string;

export function formatShadowList(
  shadows: Extract<ShadowEntry, { type: 'drop-shadow' | 'inner-shadow' }>[],
  color: ColorFormat,
  aliasResolver?: ShadowAliasResolver
): string {
  const resolve = (alias: string | undefined, fallback: string): string => {
    if (alias && aliasResolver) return aliasResolver(alias);
    return fallback;
  };
  // Figma stores effects bottom-to-top (first array entry paints below later
  // entries). CSS box-shadow paints the first comma-separated layer on top.
  // Reverse so the visually-topmost layer (e.g. the inner halo of a focus ring)
  // is emitted first and renders above the outer layers.
  return [...shadows]
    .reverse()
    .map((shadow) => {
      const colorStr = resolve(shadow.colorAlias, formatColor(shadow.color, color));
      const xStr = resolve(shadow.xAlias, `${shadow.x}px`);
      const yStr = resolve(shadow.yAlias, `${shadow.y}px`);
      const blurStr = resolve(shadow.blurAlias, `${shadow.blur}px`);
      const spreadStr = resolve(shadow.spreadAlias, `${shadow.spread}px`);
      const inset = shadow.type === 'inner-shadow' ? 'inset ' : '';
      return `${inset}${xStr} ${yStr} ${blurStr} ${spreadStr} ${colorStr}`;
    })
    .join(', ');
}

export function formatBlurRadius(
  radius: number,
  unit: DimensionUnit,
  radiusAlias?: string,
  aliasResolver?: ShadowAliasResolver
): string {
  if (radiusAlias && aliasResolver) return aliasResolver(radiusAlias);
  return formatWithUnit(radius, unit);
}

/**
 * Computes the new heading lines to emit for an effect token, given the previous
 * token's group-path. Reflects the user's full Figma folder hierarchy — emits a
 * heading for every group segment that changed since the previous entry.
 *
 * Returns the headings to print AND the next "previous path" to track.
 *
 * - Non-effect tokens: returns no headings, resets prev to [].
 * - Leading segments that match the section/file label are dropped (avoids
 *   redundancy with the section comment).
 *
 * Example, with sectionLabel="tailwind":
 *   prev=[]                       token=tailwind/box-shadow/sm  → ["box-shadow"]
 *   prev=["box-shadow"]           token=tailwind/box-shadow/md  → []
 *   prev=["box-shadow"]           token=tailwind/blur/sm        → ["blur"]
 *   prev=["blur"]                 token=tailwind/backdrop-blur/sm → ["backdrop-blur"]
 */
export function getEffectGroupHeadings(
  token: { kind: string; groupPath?: string[] },
  prev: string[],
  sectionLabel?: string | null
): { headings: string[]; nextPrev: string[] } {
  if (token.kind !== 'shadow') return { headings: [], nextPrev: [] };
  let path = (token.groupPath ?? []).slice();
  if (sectionLabel && path[0] === sectionLabel) {
    path = path.slice(1);
  }
  let i = 0;
  while (i < prev.length && i < path.length && prev[i] === path[i]) i++;
  return { headings: path.slice(i), nextPrev: path };
}
