import * as React from 'react';
import { z } from 'zod';
import type { ManualTokenGroup, RGBA, TokenKind, TokenValue } from '@/shared/types';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '../ui/dialog';
import { Button } from '../ui/button';
import { Textarea } from '../ui/textarea';
import { Label } from '../ui/label';

interface ManualTokenModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (groups: ManualTokenGroup[]) => void;
}

const hexRegex = /^#([0-9a-f]{3,8})$/i;

const tokenSchema = z.object({
  id: z.string().optional(),
  name: z.string(),
  value: z.any(),
  kind: z
    .enum(['color', 'dimension', 'typography', 'shadow', 'number', 'string', 'custom'])
    .optional(),
  description: z.string().optional(),
  metadata: z.record(z.any()).optional()
});

const groupSchema = z.object({
  id: z.string().optional(),
  name: z.string(),
  description: z.string().optional(),
  tokens: z.array(tokenSchema)
});

const payloadSchema = z.union([
  groupSchema,
  z.array(groupSchema),
  z.record(tokenSchema)
]);

export const ManualTokenModal: React.FC<ManualTokenModalProps> = (props: ManualTokenModalProps) => {
  const { open, onClose, onSubmit } = props;
  const [rawJson, setRawJson] = React.useState('');
  const [error, setError] = React.useState<string | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);

  const handleUpload = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      setRawJson(text);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to read file');
    } finally {
      event.target.value = '';
    }
  };

  const resetModal = () => {
    setRawJson('');
    setError(null);
    onClose();
  };

  const handleSubmit = () => {
    try {
      const parsed = payloadSchema.parse(JSON.parse(rawJson));
      const groups = normalizePayload(parsed);
      if (!groups.length) {
        setError('No tokens detected in the provided JSON.');
        return;
      }
      onSubmit(groups);
      resetModal();
    } catch (err: unknown) {
      if (err instanceof z.ZodError) {
        setError(err.issues.map((issue: z.ZodIssue) => issue.message).join('\n'));
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Unknown error while parsing JSON');
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={(next: boolean) => (!next ? onClose() : null)}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Import manual tokens</DialogTitle>
          <DialogDescription>
            Paste a JSON payload or upload a file containing token definitions. Existing manual tokens will be kept and the imported ones appended.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="manual-json">JSON payload</Label>
            <Button variant="secondary" size="sm" type="button" onClick={handleUpload}>
              Upload JSON
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept="application/json"
              hidden
              onChange={handleFileChange}
            />
          </div>
          <Textarea
            id="manual-json"
            placeholder='{ "name": "Brand colors", "tokens": [{ "name": "Primary", "value": "#3366FF" }] }'
            value={rawJson}
            onChange={(event: React.ChangeEvent<HTMLTextAreaElement>) => setRawJson(event.target.value)}
          />
          {error && (
            <p className="rounded-md border border-red-500/60 bg-red-500/10 p-2 text-xs text-red-200">
              {error}
            </p>
          )}
        </div>

        <DialogFooter>
          <Button variant="ghost" type="button" onClick={resetModal}>
            Cancel
          </Button>
          <Button type="button" onClick={handleSubmit} disabled={!rawJson.trim()}>
            Add tokens
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

function normalizePayload(value: z.infer<typeof payloadSchema>): ManualTokenGroup[] {
  if (Array.isArray(value)) {
    return value.flatMap(normalizeGroupLike);
  }

  if (isGroupValue(value)) {
    return normalizeGroupLike(value);
  }

  const record = value as Record<string, z.infer<typeof tokenSchema>>;
  const tokens = Object.entries(record).map(([key, token]) => ({
    ...token,
    name: token.name ?? key
  }));

  return normalizeGroupLike({
    name: 'Imported tokens',
    tokens
  });
}

function isGroupValue(value: unknown): value is z.infer<typeof groupSchema> {
  return (
    typeof value === 'object' &&
    value !== null &&
    'tokens' in value &&
    Array.isArray((value as { tokens?: unknown }).tokens)
  );
}

function normalizeGroupLike(input: z.infer<typeof groupSchema>): ManualTokenGroup[] {
  if (!input.tokens?.length) return [];

  const groupId = input.id ?? randomId('manual-group');
  return [
    {
      id: groupId,
      name: input.name,
      description: input.description,
      tokens: input.tokens.map((token) => normalizeToken(token, groupId))
    }
  ];
}

function normalizeToken(token: z.infer<typeof tokenSchema>, groupId: string) {
  const value = toTokenValue(token.value, token.kind);
  const explicitKind = token.kind && token.kind !== 'string' ? (token.kind as TokenKind) : undefined;
  const kind: TokenKind = explicitKind ?? inferKind(value);

  return {
    id: token.id ?? randomId('manual-token'),
    name: token.name,
    kind,
    value,
    metadata: {
      ...token.metadata,
      description: token.description,
      groupId
    }
  } satisfies ManualTokenGroup['tokens'][number];
}

function inferKind(value: TokenValue): TokenKind {
  switch (value.type) {
    case 'color':
      return 'color';
    case 'dimension':
      return 'dimension';
    case 'typography':
      return 'typography';
    case 'shadow':
      return 'shadow';
    case 'number':
      return 'number';
    case 'gradient':
      return 'gradient';
    case 'string':
    default:
      return 'custom';
  }
}

function toTokenValue(raw: unknown, kind?: string): TokenValue {
  if (kind === 'color' || (typeof raw === 'string' && hexRegex.test(raw))) {
    const rgba = hexToRgba(typeof raw === 'string' ? raw : String(raw));
    return {
      type: 'color',
      value: rgba
    } satisfies TokenValue;
  }

  if (kind === 'dimension') {
    return {
      type: 'dimension',
      value: typeof raw === 'number' ? raw : Number(raw),
      unit: 'px'
    } satisfies TokenValue;
  }

  if (kind === 'number' || typeof raw === 'number') {
    return {
      type: 'number',
      value: typeof raw === 'number' ? raw : Number(raw)
    } satisfies TokenValue;
  }

  if (kind === 'typography' && typeof raw === 'object' && raw !== null) {
    const value = raw as Record<string, unknown>;
    return {
      type: 'typography',
      value: {
        fontFamily: String(value.fontFamily ?? 'Inter'),
        fontStyle: String(value.fontStyle ?? 'Regular'),
        fontWeight: Number(value.fontWeight ?? 400),
        fontSize: Number(value.fontSize ?? 16),
        lineHeight: typeof value.lineHeight === 'number' ? value.lineHeight : 'AUTO',
        letterSpacing: Number(value.letterSpacing ?? 0),
        paragraphSpacing: Number(value.paragraphSpacing ?? 0),
        textCase: typeof value.textCase === 'string' ? value.textCase : undefined,
        textDecoration: typeof value.textDecoration === 'string' ? value.textDecoration : undefined
      }
    } satisfies TokenValue;
  }

  if (kind === 'shadow' && Array.isArray(raw)) {
    return {
      type: 'shadow',
      value: raw.map((entry) => ({
        x: Number(entry?.x ?? 0),
        y: Number(entry?.y ?? 0),
        blur: Number(entry?.blur ?? 0),
        spread: Number(entry?.spread ?? 0),
        color: hexRegex.test(entry?.color ?? '')
          ? hexToRgba(entry.color)
          : {
              r: Number(entry?.color?.r ?? 0),
              g: Number(entry?.color?.g ?? 0),
              b: Number(entry?.color?.b ?? 0),
              a: Number(entry?.color?.a ?? 1)
            },
        type: entry?.type === 'inner-shadow' ? 'inner-shadow' : 'drop-shadow'
      }))
    } satisfies TokenValue;
  }

  return {
    type: 'string',
    value: typeof raw === 'string' ? raw : JSON.stringify(raw)
  } satisfies TokenValue;
}

function hexToRgba(input: string): RGBA {
  const hex = input.replace('#', '');
  if (hex.length === 3) {
    return {
      r: parseInt(hex[0] + hex[0], 16) / 255,
      g: parseInt(hex[1] + hex[1], 16) / 255,
      b: parseInt(hex[2] + hex[2], 16) / 255,
      a: 1
    } satisfies RGBA;
  }
  if (hex.length === 6 || hex.length === 8) {
    return {
      r: parseInt(hex.slice(0, 2), 16) / 255,
      g: parseInt(hex.slice(2, 4), 16) / 255,
      b: parseInt(hex.slice(4, 6), 16) / 255,
      a: hex.length === 8 ? parseInt(hex.slice(6, 8), 16) / 255 : 1
    } satisfies RGBA;
  }
  throw new Error(`Unsupported color: ${input}`);
}

function randomId(prefix: string) {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return `${prefix}:${crypto.randomUUID()}`;
  }
  return `${prefix}:${Math.random().toString(36).slice(2, 10)}`;
}
