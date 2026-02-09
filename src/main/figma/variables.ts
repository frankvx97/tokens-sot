import type {
  NormalizedToken,
  RGBA,
  TokenKind,
  TokenModeValue,
  TokenTreeNode
} from '@/shared/types';

type VariableCollection = Awaited<ReturnType<typeof figma.variables.getLocalVariableCollectionsAsync>>[number];
type VariableMode = VariableCollection['modes'][number];
type FigmaVariable = Awaited<ReturnType<typeof figma.variables.getLocalVariablesAsync>>[number];

interface VariableGroupNode extends TokenTreeNode {
  children: TokenTreeNode[];
}

interface LoadVariableTreeOptions {
  includeValues?: boolean;
  collectionOrder?: string[]; // User-defined collection order
}

export async function loadVariableTree(options: LoadVariableTreeOptions = {}): Promise<TokenTreeNode[]> {
  console.log('Loading variable tree...');
  try {
    const includeValues = options.includeValues ?? false;
    if (!figma.variables ||
      typeof figma.variables.getLocalVariableCollectionsAsync !== 'function' ||
      typeof figma.variables.getLocalVariablesAsync !== 'function'
    ) {
      console.log('Figma Variables API not available');
      return [];
    }

    const collections = await figma.variables.getLocalVariableCollectionsAsync();
    const variables = await figma.variables.getLocalVariablesAsync();

    console.log(`Loaded ${collections.length} collections and ${variables.length} variables`);
    
    // Sort collections by user-defined order if available
    const sortedCollections = [...collections].sort((a, b) => {
      if (!options.collectionOrder) {
        return 0; // Keep API order if no custom order defined
      }
      const orderA = options.collectionOrder.indexOf(a.name);
      const orderB = options.collectionOrder.indexOf(b.name);
      // Collections not in the order list appear at the end
      const indexA = orderA === -1 ? 9999 : orderA;
      const indexB = orderB === -1 ? 9999 : orderB;
      return indexA - indexB;
    });

  const variablesById = new Map<string, FigmaVariable>(
    variables.map((variable: FigmaVariable) => [variable.id, variable])
  );

  const result: TokenTreeNode[] = [];

  for (const collection of sortedCollections) {
    const collectionNode: TokenTreeNode = {
      id: `collection:${collection.id}`,
      key: collection.id,
      name: collection.name,
      type: 'collection',
      sourceType: 'variable',
      selectable: true,
      path: [collection.name],
      children: [],
      collapsed: true
    };

    const isSingleMode = collection.modes.length === 1;

    if (isSingleMode) {
      // Single mode: put tokens directly under the collection (no mode-level node)
      const mode = collection.modes[0];
      for (const variableId of collection.variableIds) {
        const variable = variablesById.get(variableId);
        if (!variable) continue;

        const segments = normalizeName(variable.name);
        const modeValue = includeValues
          ? await buildSingleModeValue(variable, mode, variablesById)
          : undefined;

        const tokenNode = createTokenNode(variable, collection.name, segments, modeValue ? [modeValue] : undefined);
        insertToken(collectionNode as VariableGroupNode, segments, tokenNode, collection.name);
      }
    } else {
      // Multiple modes: create a mode node for each mode
      for (const mode of collection.modes) {
        const modeNode: TokenTreeNode = {
          id: `mode:${collection.id}:${mode.modeId}`,
          key: `mode:${collection.id}:${mode.modeId}`,
          name: mode.name,
          type: 'mode',
          sourceType: 'variable',
          selectable: true,
          path: [collection.name, mode.name],
          children: [],
          collapsed: true,
          modeId: mode.modeId,
          modeName: mode.name
        };

        for (const variableId of collection.variableIds) {
          const variable = variablesById.get(variableId);
          if (!variable) continue;

          const segments = normalizeName(variable.name);
          const modeValue = includeValues
            ? await buildSingleModeValue(variable, mode, variablesById)
            : undefined;

          const tokenNode = createTokenNode(variable, collection.name, segments, modeValue ? [modeValue] : undefined);
          insertToken(modeNode as VariableGroupNode, segments, tokenNode, collection.name);
        }

        collectionNode.children!.push(modeNode);
      }
    }

    result.push(collectionNode);
  }

    console.log(`Variable tree loaded successfully with ${result.length} collections`);
    return result;
  } catch (error) {
    console.error('Error loading variable tree:', error);
    return [];
  }
}

function normalizeName(name: string): string[] {
  return name
    .split('/')
    .map((segment) => segment.trim())
    .filter(Boolean);
}

function createTokenNode(
  variable: FigmaVariable,
  collectionName: string,
  segments: string[],
  modes?: TokenModeValue[]
): TokenTreeNode {
  const kind = inferVariableKind(variable);
  const path = [collectionName, ...segments.slice(0, -1)];
  const name = segments[segments.length - 1] ?? variable.name;

  const token: NormalizedToken = {
    id: variable.id,
    key: `variable:${variable.key ?? variable.id}`,
    name,
    kind,
    description: variable.description ?? undefined,
    collection: collectionName,
    groupPath: segments.slice(0, -1),
    sourceType: 'variable',
    sourceId: variable.id,
    modes: modes ?? []
  };

  return {
    id: `variable:${variable.id}`,
    key: `variable:${variable.id}`,
    name,
    type: 'token',
    sourceType: 'variable',
    selectable: true,
    description: variable.description ?? undefined,
    path,
    token
  } satisfies TokenTreeNode;
}

function insertToken(root: VariableGroupNode, segments: string[], token: TokenTreeNode, collectionName: string) {
  let current = root as VariableGroupNode;
  const groupSegments = segments.slice(0, -1);

  groupSegments.forEach((segment, index) => {
    const currentPath = [collectionName, root.name, ...groupSegments.slice(0, index + 1)];
    const existing = current.children.find((child) => child.type === 'group' && child.name === segment) as
      | VariableGroupNode
      | undefined;

    if (existing) {
      current = existing;
      return;
    }

    const newGroup: VariableGroupNode = {
      id: `variable-group:${current.key}:${currentPath.join('/')}`,
      key: `variable-group:${current.key}:${currentPath.join('/')}`,
      name: segment,
      type: 'group',
      sourceType: 'variable',
      selectable: true,
      path: currentPath,
      description: undefined,
      children: [],
      collapsed: true
    };
    current.children.push(newGroup);
    current = newGroup;
  });

  current.children.push(token);
}

// sortTree removed - we now preserve Figma's native ordering
// Variables appear in the exact order defined in collection.variableIds
// Groups and tokens maintain insertion order without alphabetical sorting

function inferVariableKind(variable: FigmaVariable): TokenKind {
  if (variable.resolvedType === 'COLOR') return 'color';
  if (variable.resolvedType === 'FLOAT') {
    if (variable.scopes?.some((scope: string) => scope.includes('RADIUS'))) return 'dimension';
    if (variable.scopes?.some((scope: string) => scope.includes('SPACING'))) return 'dimension';
    if (
      variable.scopes?.some((scope: string) => scope.includes('WIDTH')) ||
      variable.scopes?.some((scope: string) => scope.includes('HEIGHT'))
    ) {
      return 'dimension';
    }
    return 'number';
  }
  if (variable.resolvedType === 'STRING') return 'custom';
  if (variable.resolvedType === 'BOOLEAN') return 'custom';
  return 'custom';
}

async function buildSingleModeValue(
  variable: FigmaVariable,
  mode: VariableMode,
  variablesById: Map<string, FigmaVariable>
): Promise<TokenModeValue> {
  const { value, aliasOf } = await resolveVariableValue(variable, mode.modeId, new Set(), variablesById);
  return {
    modeId: mode.modeId,
    modeName: mode.name,
    value,
    aliasOf
  } satisfies TokenModeValue;
}

async function buildVariableModes(
  variable: FigmaVariable,
  collection: VariableCollection,
  variablesById: Map<string, FigmaVariable>
): Promise<TokenModeValue[]> {
  if (!collection) return [];

  return Promise.all(
    collection.modes.map(async (mode: VariableMode) => {
      const { value, aliasOf } = await resolveVariableValue(variable, mode.modeId, new Set(), variablesById);

      return {
        modeId: mode.modeId,
        modeName: mode.name,
        value,
        aliasOf
      } satisfies TokenModeValue;
    })
  );
}

async function resolveVariableValue(
  variable: FigmaVariable,
  modeId: string,
  visited: Set<string>,
  variablesById: Map<string, FigmaVariable>
): Promise<{ value: TokenModeValue['value']; aliasOf?: string | null }> {
  const fallbackModeId = Object.keys(variable.valuesByMode)[0];
  const rawValue =
    variable.valuesByMode[modeId] ?? (fallbackModeId ? variable.valuesByMode[fallbackModeId] : null);

  if (isAlias(rawValue)) {
    const aliasId = rawValue.id;
    if (!aliasId || visited.has(aliasId)) {
      return { value: toTokenValue(variable, rawValue?.fallback ?? null), aliasOf: aliasId };
    }
    visited.add(aliasId);
    const aliasVariable = variablesById.get(aliasId) ?? (await figma.variables.getVariableByIdAsync(aliasId));
    if (!aliasVariable) {
      return { value: toTokenValue(variable, rawValue.fallback ?? null), aliasOf: aliasId };
    }
    variablesById.set(aliasId, aliasVariable as FigmaVariable);
    const resolved = await resolveVariableValue(aliasVariable as FigmaVariable, modeId, visited, variablesById);
    return {
      value: resolved.value,
      aliasOf: resolved.aliasOf ?? aliasId
    };
  }

  return {
    value: toTokenValue(variable, rawValue),
    aliasOf: null
  };
}

type VariableValue = FigmaVariable['valuesByMode'][string];

type VariableAliasValue = {
  type: 'VARIABLE_ALIAS';
  id: string;
  fallback?: VariableValue | null;
};

function isAlias(value: VariableValue | null | undefined): value is VariableAliasValue {
  return Boolean(value && typeof value === 'object' && 'type' in value && value.type === 'VARIABLE_ALIAS');
}

function toTokenValue(variable: FigmaVariable, value: VariableValue | null | undefined) {
  if (value == null) {
    return null;
  }

  switch (variable.resolvedType) {
    case 'COLOR':
      return {
        type: 'color',
        value: value as RGBA
      } as TokenModeValue['value'];
    case 'FLOAT':
      if (
        variable.scopes?.some(
          (scope: string) =>
            scope.includes('RADIUS') ||
            scope.includes('SPACING') ||
            scope.includes('WIDTH') ||
            scope.includes('HEIGHT')
        )
      ) {
        return {
          type: 'dimension',
          value: typeof value === 'number' ? value : 0,
          unit: 'px'
        } as TokenModeValue['value'];
      }
      return {
        type: 'number',
        value: typeof value === 'number' ? value : 0
      } as TokenModeValue['value'];
    case 'STRING':
      return {
        type: 'string',
        value: String(value)
      } as TokenModeValue['value'];
    case 'BOOLEAN':
      return {
        type: 'string',
        value: String(Boolean(value))
      } as TokenModeValue['value'];
    default:
      return {
        type: 'string',
        value: JSON.stringify(value)
      } as TokenModeValue['value'];
  }
}
