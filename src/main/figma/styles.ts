import type {
  NormalizedToken,
  TokenKind,
  TokenTreeNode
} from '@/shared/types';

const STYLE_ROOTS = [
  {
    id: 'paint-styles',
    label: 'Color',
    kind: 'color' as TokenKind,
    loader: () => figma.getLocalPaintStylesAsync()
  },
  {
    id: 'text-styles',
    label: 'Text',
    kind: 'typography' as TokenKind,
    loader: () => figma.getLocalTextStylesAsync()
  },
  {
    id: 'effect-styles',
    label: 'Effect',
    kind: 'shadow' as TokenKind,
    loader: () => figma.getLocalEffectStylesAsync()
  }
];

interface StyleGroupNode extends TokenTreeNode {
  children: TokenTreeNode[];
}

interface LoadStyleTreeOptions {
  includeValues?: boolean;
  /** User overrides for style group display names. Key = style root key (e.g. "paint-styles"), Value = custom label */
  nameOverrides?: Record<string, string>;
}

export async function loadStyleTree(options: LoadStyleTreeOptions = {}): Promise<TokenTreeNode[]> {
  console.log('Loading style tree...');
  try {
    const includeValues = options.includeValues ?? false;
    const nameOverrides = options.nameOverrides ?? {};

    const roots: StyleGroupNode[] = STYLE_ROOTS.map((root) => {
      const label = nameOverrides[root.id] ?? root.label;
      return {
        id: `style-root:${root.id}`,
        key: root.id,
        name: label,
        type: 'collection',
        sourceType: 'style',
        selectable: true,
        path: [label],
        children: [],
        collapsed: true
      };
    });

    for (const root of STYLE_ROOTS) {
      const destination = roots.find((node) => node.key === root.id);
      if (!destination) continue;

      // The effective label used for this root (may be overridden)
      const effectiveLabel = nameOverrides[root.id] ?? root.label;

      const styles = await root.loader();
      console.log(`Loaded ${styles.length} ${root.label}`);
      // Process styles in the order returned by Figma API to preserve panel order
      for (const style of styles) {
        const segments = normalizeName(style.name);
        const tokenNode = await createStyleTokenNode(style, root, effectiveLabel, segments, includeValues);
        insertStyleToken(destination, segments, tokenNode, effectiveLabel);
      }
    }

    console.log('Style tree loaded successfully');
    // Return without sorting - preserve Figma's native order
    return roots;
  } catch (error) {
    console.error('Error loading style tree:', error);
    return [];
  }
}

function normalizeName(name: string): string[] {
  return name
    .split('/')
    .map((segment) => segment.trim())
    .filter(Boolean);
}

async function createStyleTokenNode(
  style: BaseStyle,
  root: (typeof STYLE_ROOTS)[number],
  effectiveLabel: string,
  segments: string[],
  includeValues: boolean
): Promise<TokenTreeNode> {
  const name = segments[segments.length - 1] ?? style.name;
  const path = [effectiveLabel, ...segments.slice(0, -1)];

  const token: NormalizedToken = {
    id: style.id,
    key: `style:${style.key ?? style.id}`,
    name,
    kind: root.kind,
    description: style.description ?? undefined,
    collection: effectiveLabel,
    groupPath: segments.slice(0, -1),
    sourceType: 'style',
    sourceId: style.id,
    modes: [
      {
        modeId: 'default',
        modeName: 'Default',
        value: includeValues ? await toStyleValue(style, root.kind) : null
      }
    ]
  };

  return {
    id: `style:${style.id}`,
    key: `style:${style.id}`,
    name,
    type: 'token',
    sourceType: 'style',
    selectable: true,
    path,
    description: style.description ?? undefined,
    token
  } satisfies TokenTreeNode;
}

function insertStyleToken(
  root: StyleGroupNode,
  segments: string[],
  token: TokenTreeNode,
  effectiveLabel: string
) {
  let current = root;
  const groupSegments = segments.slice(0, -1);

  groupSegments.forEach((segment, index) => {
    const currentPath = [effectiveLabel, ...groupSegments.slice(0, index + 1)];
    const existing = current.children.find((child) => child.type === 'group' && child.name === segment) as
      | StyleGroupNode
      | undefined;

    if (existing) {
      current = existing;
      return;
    }

    const newGroup: StyleGroupNode = {
      id: `style-group:${root.key}:${currentPath.join('/')}`,
      key: `style-group:${root.key}:${currentPath.join('/')}`,
      name: segment,
      type: 'group',
      sourceType: 'style',
      selectable: true,
      path: currentPath,
      children: [],
      collapsed: true
    };

    current.children.push(newGroup);
    current = newGroup;
  });

  current.children.push(token);
}

// sortStyleTree removed - we now preserve Figma's native ordering
// Styles appear in the exact order returned by Figma's style APIs
// Groups and tokens maintain insertion order without alphabetical sorting

async function toStyleValue(style: BaseStyle, kind: TokenKind) {
  switch (kind) {
    case 'color':
      return convertPaintStyle(style as PaintStyle);
    case 'typography':
      return await convertTextStyle(style as TextStyle);
    case 'shadow':
      return convertEffectStyle(style as EffectStyle);
    default:
      return {
        type: 'string',
        value: JSON.stringify(style)
      } as NormalizedToken['modes'][number]['value'];
  }
}

function convertPaintStyle(style: PaintStyle) {
  const paints = style.paints.filter((p) => p.visible !== false);
  
  if (paints.length === 0) {
    return null;
  }

  // Single paint - use existing format for backward compatibility
  if (paints.length === 1) {
    const paint = paints[0];
    if (paint.type === 'SOLID') {
      return {
        type: 'color',
        value: {
          r: paint.color.r,
          g: paint.color.g,
          b: paint.color.b,
          a: paint.opacity ?? 1
        }
      } as NormalizedToken['modes'][number]['value'];
    }
    if (paint.type === 'GRADIENT_LINEAR' || paint.type === 'GRADIENT_RADIAL' || paint.type === 'GRADIENT_ANGULAR' || paint.type === 'GRADIENT_DIAMOND') {
      const gradient = paint as GradientPaint;
      const gradientType = mapGradientPaintType(gradient.type);
      const angle = gradient.type === 'GRADIENT_LINEAR' ? getLinearGradientAngle(gradient.gradientTransform) : undefined;
      
      return {
        type: 'gradient',
        gradientType,
        gradientAngle: angle,
        value: gradient.gradientStops.map((stop) => ({
          position: stop.position,
          color: {
            r: stop.color.r,
            g: stop.color.g,
            b: stop.color.b,
            a: stop.color.a
          }
        }))
      } as NormalizedToken['modes'][number]['value'];
    }

    return {
      type: 'string',
      value: paint.type
    } as NormalizedToken['modes'][number]['value'];
  }

  // Multiple paints - use composite color format
  const layers = paints.map((paint) => {
    if (paint.type === 'SOLID') {
      return {
        layerType: 'solid' as const,
        color: {
          r: paint.color.r,
          g: paint.color.g,
          b: paint.color.b,
          a: paint.opacity ?? 1
        }
      };
    }
    
    if (paint.type === 'GRADIENT_LINEAR' || paint.type === 'GRADIENT_RADIAL' || paint.type === 'GRADIENT_ANGULAR' || paint.type === 'GRADIENT_DIAMOND') {
      const gradient = paint as GradientPaint;
      const layerType = mapGradientPaintTypeToLayerType(gradient.type);
      const angle = gradient.type === 'GRADIENT_LINEAR' ? getLinearGradientAngle(gradient.gradientTransform) : undefined;
      
      return {
        layerType,
        stops: gradient.gradientStops.map((stop) => ({
          position: stop.position,
          color: {
            r: stop.color.r,
            g: stop.color.g,
            b: stop.color.b,
            a: stop.color.a * (gradient.opacity ?? 1)
          }
        })),
        angle
      };
    }

    return null;
  }).filter((layer): layer is NonNullable<typeof layer> => layer !== null);

  return {
    type: 'compositeColor',
    value: layers
  } as NormalizedToken['modes'][number]['value'];
}

function mapGradientPaintType(type: GradientPaint['type']) {
  switch (type) {
    case 'GRADIENT_LINEAR':
      return 'LINEAR_GRADIENT';
    case 'GRADIENT_RADIAL':
      return 'RADIAL_GRADIENT';
    case 'GRADIENT_ANGULAR':
      return 'ANGULAR_GRADIENT';
    case 'GRADIENT_DIAMOND':
      return 'DIAMOND_GRADIENT';
    default:
      return 'LINEAR_GRADIENT';
  }
}

function mapGradientPaintTypeToLayerType(type: GradientPaint['type']): 'linear-gradient' | 'radial-gradient' | 'angular-gradient' | 'diamond-gradient' {
  switch (type) {
    case 'GRADIENT_LINEAR':
      return 'linear-gradient';
    case 'GRADIENT_RADIAL':
      return 'radial-gradient';
    case 'GRADIENT_ANGULAR':
      return 'angular-gradient';
    case 'GRADIENT_DIAMOND':
      return 'diamond-gradient';
    default:
      return 'linear-gradient';
  }
}

/**
 * Extract the angle in degrees from a linear gradient transform matrix.
 * Figma's gradient transform is a 2x3 matrix: [[a, c, e], [b, d, f]]
 * The angle can be derived from the rotation component of the matrix.
 */
function getLinearGradientAngle(transform: Transform): number {
  // Transform is [[a, c, e], [b, d, f]]
  // For a linear gradient, the angle is determined by the direction vector
  // The gradient flows perpendicular to the line from (0,0) to (1,0) after transformation
  const [[a, c], [b, d]] = transform;
  
  // Calculate angle in radians from the transform matrix
  // The gradient direction is given by the vector (a, b)
  let angleRad = Math.atan2(b, a);
  
  // Convert to degrees
  let angleDeg = angleRad * (180 / Math.PI);
  
  // Adjust to CSS gradient coordinate system
  // CSS: 0deg = top, 90deg = right, 180deg = bottom, 270deg = left
  // Add 90 to convert from standard math angle (0 = right) to CSS angle (0 = top)
  angleDeg = angleDeg + 90;
  
  // Normalize to 0-360 range
  if (angleDeg < 0) angleDeg += 360;
  if (angleDeg >= 360) angleDeg -= 360;
  
  // Round to 1 decimal place
  return Math.round(angleDeg * 10) / 10;
}

async function resolveVariableName(binding: { id: string } | undefined): Promise<string | undefined> {
  if (!binding?.id) return undefined;
  try {
    const variable = await figma.variables.getVariableByIdAsync(binding.id);
    if (!variable) return undefined;
    return variable.name;
  } catch {
    return undefined;
  }
}

async function convertTextStyle(style: TextStyle) {
  // Check for bound variables on the text style
  const bindings = (style as any).boundVariables as Record<string, { id: string }> | undefined;

  const [fontFamilyAlias, fontSizeAlias, fontWeightAlias, lineHeightAlias, letterSpacingAlias] =
    await Promise.all([
      resolveVariableName(bindings?.fontFamily),
      resolveVariableName(bindings?.fontSize),
      // Figma binds font weight through the "fontStyle" key (the named weight like "SemiBold")
      resolveVariableName(bindings?.fontStyle ?? bindings?.fontWeight),
      resolveVariableName(bindings?.lineHeight),
      resolveVariableName(bindings?.letterSpacing),
    ]);

  return {
    type: 'typography',
    value: {
      fontFamily: style.fontName.family,
      fontStyle: style.fontName.style,
      fontWeight: mapFontWeight(style.fontName.style),
      fontSize: style.fontSize,
      lineHeight: style.lineHeight.unit === 'AUTO' ? 'AUTO' : style.lineHeight.value,
      letterSpacing: style.letterSpacing.value ?? 0,
      paragraphSpacing: style.paragraphSpacing ?? 0,
      textCase: style.textCase ?? 'ORIGINAL',
      textDecoration: style.textDecoration ?? 'NONE',
      ...(fontFamilyAlias && { fontFamilyAlias }),
      ...(fontSizeAlias && { fontSizeAlias }),
      ...(fontWeightAlias && { fontWeightAlias }),
      ...(lineHeightAlias && { lineHeightAlias }),
      ...(letterSpacingAlias && { letterSpacingAlias }),
    }
  } as NormalizedToken['modes'][number]['value'];
}

function convertEffectStyle(style: EffectStyle) {
  const shadows = style.effects
    .filter((effect) => effect.type === 'DROP_SHADOW' || effect.type === 'INNER_SHADOW')
    .map((effect) => ({
      x: effect.offset.x,
      y: effect.offset.y,
      blur: effect.radius,
      spread: 'spread' in effect ? effect.spread : 0,
      color: {
        r: effect.color.r,
        g: effect.color.g,
        b: effect.color.b,
        a: effect.color.a
      },
      type: effect.type === 'DROP_SHADOW' ? 'drop-shadow' : 'inner-shadow'
    }));

  return {
    type: 'shadow',
    value: shadows
  } as NormalizedToken['modes'][number]['value'];
}

function mapFontWeight(style: string): number {
  const match = style.match(/\d{3}/);
  if (match) {
    return Number(match[0]);
  }
  switch (style.toLowerCase()) {
    case 'thin':
      return 100;
    case 'extra light':
    case 'extralight':
      return 200;
    case 'light':
      return 300;
    case 'regular':
    case 'normal':
      return 400;
    case 'medium':
      return 500;
    case 'semibold':
    case 'semi bold':
      return 600;
    case 'bold':
      return 700;
    case 'extra bold':
    case 'extrabold':
      return 800;
    case 'black':
    case 'heavy':
      return 900;
    default:
      return 400;
  }
}
