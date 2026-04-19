/**
 * Tests for the CSS exporter.
 *
 * Focus:
 *   - Empty `:root { }` wrapper is omitted when export is typography-only.
 *   - `:root { ... }` is still emitted when non-typography tokens are present.
 *   - Heading / body group-path detection helpers.
 *   - HTML element defaults (body baseline + h1–h6 + text-wrap: balance).
 *
 * Run only this file: npx vitest src/ui/exporters/css.test.ts
 */

import { describe, it, expect } from 'vitest';

import type { NormalizedToken, TokenModeValue } from '@/shared/types';
import type { TokenSection } from './types';
import { defaultOptions, optionsWith } from '@/test/fixtures/options';
import { renderCSS, isHeadingToken, isBodyToken } from './css';

// ---------------------------------------------------------------------------
// Fixture helpers
// ---------------------------------------------------------------------------

interface TypoFixtureInput {
  id: string;
  name: string;
  groupPath?: string[];
  fontFamily?: string;
  fontSize?: number;
  lineHeight?: number;
  fontWeight?: number;
  letterSpacing?: number;
}

function typoToken(input: TypoFixtureInput): NormalizedToken {
  return {
    id: input.id,
    key: input.id,
    name: input.name,
    kind: 'typography',
    collection: 'typography',
    groupPath: input.groupPath ?? [],
    sourceType: 'variable',
    sourceId: input.id,
    modes: [],
  } as NormalizedToken;
}

function typoEntry(input: TypoFixtureInput) {
  const token = typoToken(input);
  const mode: TokenModeValue = {
    modeId: 'default',
    modeName: 'default',
    value: {
      type: 'typography',
      value: {
        fontFamily: input.fontFamily ?? 'Outfit',
        fontStyle: 'Regular',
        fontWeight: input.fontWeight ?? 600,
        fontSize: input.fontSize ?? 16,
        lineHeight: input.lineHeight ?? 24,
        letterSpacing: input.letterSpacing ?? 0,
        paragraphSpacing: 0,
        textCase: 'ORIGINAL',
        textDecoration: 'NONE',
      },
    } as any,
  };
  return { token, mode };
}

function section(entries: ReturnType<typeof typoEntry>[]): TokenSection {
  return {
    id: 'section:1',
    collectionName: 'Typography',
    modeId: null,
    modeName: null,
    entries,
  };
}

function dimensionEntry(id: string, name: string, value: number) {
  const token = {
    id,
    key: id,
    name,
    kind: 'dimension',
    collection: 'spacing',
    groupPath: ['spacing'],
    sourceType: 'variable',
    sourceId: id,
    modes: [],
  } as NormalizedToken;
  const mode: TokenModeValue = {
    modeId: 'default',
    modeName: 'default',
    value: { type: 'dimension', value } as any,
  };
  return { token, mode };
}

// ---------------------------------------------------------------------------
// group-path detection
// ---------------------------------------------------------------------------

describe('isHeadingToken', () => {
  it('matches "heading" group (singular)', () => {
    expect(isHeadingToken(typoToken({ id: 't1', name: 'xl', groupPath: ['heading'] }))).toBe(true);
  });

  it('matches "headings" group (plural)', () => {
    expect(isHeadingToken(typoToken({ id: 't1', name: 'xl', groupPath: ['headings'] }))).toBe(true);
  });

  it('is case-insensitive', () => {
    expect(isHeadingToken(typoToken({ id: 't1', name: 'xl', groupPath: ['Headings'] }))).toBe(true);
  });

  it('matches heading group nested under parent groups', () => {
    expect(isHeadingToken(typoToken({ id: 't1', name: 'xl', groupPath: ['typography', 'heading'] }))).toBe(true);
  });

  it('does not match paragraph/body groups', () => {
    expect(isHeadingToken(typoToken({ id: 't1', name: 'md', groupPath: ['paragraph'] }))).toBe(false);
    expect(isHeadingToken(typoToken({ id: 't1', name: 'md', groupPath: ['body'] }))).toBe(false);
  });

  it('returns false for empty group path', () => {
    expect(isHeadingToken(typoToken({ id: 't1', name: 'xl', groupPath: [] }))).toBe(false);
  });
});

describe('isBodyToken', () => {
  it('matches "body"', () => {
    expect(isBodyToken(typoToken({ id: 't1', name: 'md', groupPath: ['body'] }))).toBe(true);
  });

  it('matches "paragraph" singular and plural', () => {
    expect(isBodyToken(typoToken({ id: 't1', name: 'md', groupPath: ['paragraph'] }))).toBe(true);
    expect(isBodyToken(typoToken({ id: 't1', name: 'md', groupPath: ['paragraphs'] }))).toBe(true);
  });

  it('does not match heading groups', () => {
    expect(isBodyToken(typoToken({ id: 't1', name: 'md', groupPath: ['heading'] }))).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// :root handling
// ---------------------------------------------------------------------------

describe('renderCSS — :root wrapper', () => {
  it('omits :root { } entirely when export is typography-only (classes mode)', () => {
    const sections: TokenSection[] = [
      section([
        typoEntry({ id: 't:h1', name: 'xl', groupPath: ['heading'], fontSize: 48 }),
        typoEntry({ id: 't:p1', name: 'md', groupPath: ['paragraph'], fontSize: 16 }),
      ]),
    ];

    const out = renderCSS(sections, defaultOptions);

    expect(out).not.toMatch(/:root\s*\{/);
    expect(out).toMatch(/\/\* Typography \*\//);
    expect(out).toMatch(/\.text-heading-xl\s*\{/);
  });

  it('emits :root { ... } when non-typography tokens are present', () => {
    const sections: TokenSection[] = [
      {
        id: 'section:spacing',
        collectionName: 'Spacing',
        modeId: null,
        modeName: null,
        entries: [dimensionEntry('d:md', 'md', 16)],
      },
      section([typoEntry({ id: 't:h1', name: 'xl', groupPath: ['heading'] })]),
    ];

    const out = renderCSS(sections, defaultOptions);

    expect(out).toMatch(/:root\s*\{/);
    expect(out).toMatch(/--spacing-md:\s*16px;/);
  });

  it('emits populated :root when cssTypographyFormat is "properties"', () => {
    const sections: TokenSection[] = [
      section([typoEntry({ id: 't:h1', name: 'xl', groupPath: ['heading'] })]),
    ];

    const out = renderCSS(sections, optionsWith({ cssTypographyFormat: 'properties' }));

    expect(out).toMatch(/:root\s*\{/);
    expect(out).toMatch(/-font-family:/);
  });
});

// ---------------------------------------------------------------------------
// HTML element defaults
// ---------------------------------------------------------------------------

describe('renderCSS — element defaults', () => {
  it('emits body { ... } when cssIncludeBodyBaseline + cssBodyBaselineTokenId are set', () => {
    const sections: TokenSection[] = [
      section([
        typoEntry({ id: 't:body', name: 'md', groupPath: ['paragraph'], fontSize: 16, lineHeight: 24, fontWeight: 400 }),
      ]),
    ];

    const out = renderCSS(
      sections,
      optionsWith({ cssIncludeBodyBaseline: true, cssBodyBaselineTokenId: 't:body' })
    );

    expect(out).toMatch(/\/\* Base element defaults \*\//);
    const bodyBlock = out.match(/body\s*\{[\s\S]*?\}/);
    expect(bodyBlock?.[0]).toMatch(/font-size:\s*16px;/);
    expect(bodyBlock?.[0]).toMatch(/font-weight:\s*400;/);
  });

  it('skips body block when the configured id does not match any token', () => {
    const sections: TokenSection[] = [
      section([typoEntry({ id: 't:body', name: 'md', groupPath: ['paragraph'] })]),
    ];

    const out = renderCSS(
      sections,
      optionsWith({ cssIncludeBodyBaseline: true, cssBodyBaselineTokenId: 't:missing' })
    );

    expect(out).not.toMatch(/^body\s*\{/m);
  });

  it('maps heading tokens to h1..h6 in descending font-size order', () => {
    const sections: TokenSection[] = [
      section([
        typoEntry({ id: 'h:xs', name: 'xs', groupPath: ['heading'], fontSize: 20 }),
        typoEntry({ id: 'h:2xl', name: '2xl', groupPath: ['heading'], fontSize: 56 }),
        typoEntry({ id: 'h:md', name: 'md', groupPath: ['heading'], fontSize: 32 }),
      ]),
    ];

    const out = renderCSS(sections, optionsWith({ cssIncludeHeadingDefaults: true }));

    expect(out).toMatch(/h1\s*\{[\s\S]*?font-size:\s*56px;/);
    expect(out).toMatch(/h2\s*\{[\s\S]*?font-size:\s*32px;/);
    expect(out).toMatch(/h3\s*\{[\s\S]*?font-size:\s*20px;/);
    expect(out).not.toMatch(/h4\s*\{/);
  });

  it('caps at h6 when more than 6 headings exist', () => {
    const entries = Array.from({ length: 8 }, (_, i) =>
      typoEntry({ id: `h:${i}`, name: `h${i}`, groupPath: ['heading'], fontSize: 100 - i * 5 })
    );
    const out = renderCSS([section(entries)], optionsWith({ cssIncludeHeadingDefaults: true }));

    expect(out).toMatch(/^h6\s*\{/m);
    expect(out).not.toMatch(/^h7\s*\{/m);
  });

  it('adds text-wrap: balance to heading utility classes when enabled', () => {
    const sections: TokenSection[] = [
      section([
        typoEntry({ id: 'h:xl', name: 'xl', groupPath: ['heading'] }),
        typoEntry({ id: 'p:md', name: 'md', groupPath: ['paragraph'] }),
      ]),
    ];

    const out = renderCSS(sections, optionsWith({ cssHeadingTextWrapBalance: true }));

    // The heading class should include text-wrap: balance; the paragraph class should not.
    const headingMatch = out.match(/\.text-heading-xl\s*\{[\s\S]*?\}/);
    const paragraphMatch = out.match(/\.text-paragraph-md\s*\{[\s\S]*?\}/);

    expect(headingMatch?.[0]).toMatch(/text-wrap:\s*balance;/);
    expect(paragraphMatch?.[0]).not.toMatch(/text-wrap:\s*balance;/);
  });

  it('does not emit any element defaults when all toggles are off (default)', () => {
    const sections: TokenSection[] = [
      section([typoEntry({ id: 'h:xl', name: 'xl', groupPath: ['heading'] })]),
    ];

    const out = renderCSS(sections, defaultOptions);

    expect(out).not.toMatch(/\/\* Base element defaults \*\//);
    expect(out).not.toMatch(/^body\s*\{/m);
    expect(out).not.toMatch(/^h1\s*\{/m);
    expect(out).not.toMatch(/text-wrap:\s*balance/);
  });
});
