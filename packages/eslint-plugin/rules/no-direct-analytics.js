// Keep feature analytics behind the host-provided tracking callback so the host
// controls delivery and metadata. In guarded files, reject direct implementation,
// SDK, and global access while allowing SDK-free contracts.

// Allow only SDK-free contracts and React APIs by default.
const allowedModules = new Set([
  '@odh-dashboard/analytics/types',
  '@odh-dashboard/analytics/react',
]);
// Direct adapters and SDK imports bypass host tracking; block their subpaths too.
const blockedModules = [
  '@odh-dashboard/internal/concepts/analyticsTracking/segmentIOUtils',
  '@odh-dashboard/analytics',
  'analytics-node',
  'analytics.js',
];
// Cover all SDK packages in the Segment scope.
const blockedModulePrefixes = ['@segment/'];
// Global SDK access also bypasses host tracking.
const globalObjects = new Set(['window', 'globalThis', 'self']);
const blockedGlobalProperties = new Set(['analytics']);
const typeWrappers = new Set([
  'TSAsExpression',
  'TSTypeAssertion',
  'TSNonNullExpression',
  'TSSatisfiesExpression',
]);
const unwrapTypeWrappers = (node) => {
  let expression = node;
  while (typeWrappers.has(expression?.type)) {
    expression = expression.expression;
  }
  return expression;
};
const propertyName = (node) =>
  node.computed ? unwrapTypeWrappers(node.property)?.value : node.property.name;
const isAmbientDefinition = (definition) => {
  let { node } = definition;
  while (node) {
    if (node.declare) {
      return true;
    }
    node = node.parent;
  }
  return false;
};

module.exports = {
  meta: {
    type: 'problem',
    docs: { description: 'Keep feature analytics behind the host tracking contract.' },
    schema: [],
    messages: {
      directAnalytics:
        'Feature analytics must use useTrackEvent() from @odh-dashboard/analytics/react or an injected host callback.',
    },
  },
  create(context) {
    const report = (node) => context.report({ node, messageId: 'directAnalytics' });
    const valueVariable = (name) => {
      let scope = context.getScope();
      while (scope) {
        const candidate = scope.set.get(name);
        // Type-only and ambient declarations are erased and do not shadow a
        // runtime value. Plain JavaScript definitions omit these type flags.
        if (
          candidate &&
          candidate.isValueVariable !== false &&
          (!candidate.defs.length ||
            candidate.defs.some(
              (definition) =>
                definition.isVariableDefinition !== false && !isAmbientDefinition(definition),
            ))
        ) {
          return candidate;
        }
        scope = scope.upper;
      }
      return undefined;
    };
    const isGlobalObject = (node) => {
      const object = unwrapTypeWrappers(node);
      return (
        object?.type === 'Identifier' &&
        globalObjects.has(object.name) &&
        !valueVariable(object.name)?.defs.length
      );
    };
    const checkModule = (node) => {
      const name = node.source?.value;
      if (!name) {
        return;
      }
      if (allowedModules.has(name)) {
        return;
      }
      if (
        blockedModulePrefixes.some((prefix) => name.startsWith(prefix)) ||
        blockedModules.some((module) => name === module || name.startsWith(`${module}/`))
      ) {
        report(node);
      }
    };
    const checkMember = (node) => {
      const name = propertyName(node);
      if (isGlobalObject(node.object) && blockedGlobalProperties.has(name)) {
        report(node);
      }
    };
    const checkDestructuring = (pattern, source) => {
      if (pattern?.type !== 'ObjectPattern' || !isGlobalObject(source)) {
        return;
      }
      for (const property of pattern.properties) {
        if (property.type === 'Property') {
          const name = property.computed
            ? unwrapTypeWrappers(property.key)?.value
            : property.key.name || property.key.value;
          if (blockedGlobalProperties.has(name)) {
            report(property);
          }
        }
      }
    };
    return {
      ImportDeclaration: checkModule,
      ExportNamedDeclaration: checkModule,
      ExportAllDeclaration: checkModule,
      MemberExpression: checkMember,
      VariableDeclarator: (node) => checkDestructuring(node.id, node.init),
      AssignmentExpression: (node) => checkDestructuring(node.left, node.right),
    };
  },
};
