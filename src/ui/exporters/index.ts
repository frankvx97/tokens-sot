import type { ExportArtifact, TokenFormat, ExportOptions, NormalizedToken } from '@/shared/types';
import type { TokenSection } from './types';
import { buildTokenSections, buildExportChunks } from './sections';
import type { BuildContext } from './types';
import { renderCSS } from './css';
import { renderSass } from './sass';
import { renderTailwind } from './tailwind';
import { renderJavaScript } from './javascript';
import { renderJSON } from './json';
import { renderLess } from './less';
import { renderStylus } from './stylus';
import { renderTailwindV4 } from './tailwindv4';

type FormatRenderer = (sections: TokenSection[], options: ExportOptions, modeInFileName?: boolean) => string;

const RENDERERS: Record<TokenFormat, FormatRenderer> = {
	css: renderCSS,
	sass: renderSass,
	tailwind: renderTailwind,
	tailwindv4: renderTailwindV4,
	stylus: renderStylus,
	js: renderJavaScript,
	json: renderJSON,
	less: renderLess
};

interface BuildArtifactsArgs extends BuildContext {
	tokens: NormalizedToken[];
}

export function buildExportArtifacts({ tokens, format, options, tokenLookup }: BuildArtifactsArgs): ExportArtifact[] {
	const renderer = RENDERERS[format];
	if (!renderer) {
		throw new Error(`Unsupported export format: ${format}`);
	}

	const sections = buildTokenSections(tokens, options, tokenLookup);
	const chunks = buildExportChunks(sections, options, format);

	return chunks.map((chunk) => ({
		fileName: chunk.fileName,
		format,
		contents: renderer(chunk.sections, options, chunk.modeInFileName),
		// Include collection name for multi-file exports to enable preview targeting.
		// chunk.collectionLabel takes precedence (e.g. split-effects mode) so sidebar
		// group clicks can resolve to the specific sub-file.
		collectionName: chunk.collectionLabel ?? chunk.sections[0]?.collectionName
	}));
}

export { buildTokenSections, buildExportChunks };
