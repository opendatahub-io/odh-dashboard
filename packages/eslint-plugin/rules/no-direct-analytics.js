const restrictedModules = [
  '@odh-dashboard/internal/concepts/analyticsTracking/segmentIOUtils',
  '@odh-dashboard/analytics',
  '@odh-dashboard/ui-core/useAnalytics',
  'analytics-node',
  'analytics.js',
];
const uiCoreModules = new Set([
  '@odh-dashboard/ui-core',
  '@odh-dashboard/ui-core/contexts/AnalyticsContext',
]);
const runtimeExports = new Set(['useAnalytics', 'AnalyticsContext']);
const globalObjects = new Set(['window', 'globalThis', 'self']);
const globalProperties = new Set(['analytics']);
const propertyName = (node) => (node.computed ? node.property.value : node.property.name);
const isTypeOnly = (node) => node.importKind === 'type' || node.exportKind === 'type';

module.exports = {
  meta: {
    type: 'problem',
    docs: { description: 'Keep feature analytics behind the host tracking contract.' },
    schema: [],
    messages: {
      directAnalytics:
        'Feature analytics must use useTrackEvent() from @odh-dashboard/plugin-core/host-api or an injected host callback.',
    },
  },
  create(context) {
    const report = (node) => context.report({ node, messageId: 'directAnalytics' });
    const valueVariable = (name) => {
      let scope = context.getScope();
      while (scope) {
        const candidate = scope.set.get(name);
        // TypeScript type-only bindings do not shadow runtime values. Plain
        // JavaScript scope variables do not expose isValueVariable.
        if (candidate && candidate.isValueVariable !== false) {
          return candidate;
        }
        scope = scope.upper;
      }
      return undefined;
    };
    const isGlobalObject = (node) =>
      node?.type === 'Identifier' &&
      globalObjects.has(node.name) &&
      !valueVariable(node.name)?.defs.length;
    const isUiCoreNamespace = (node) =>
      (node?.type === 'Identifier' || node?.type === 'JSXIdentifier') &&
      valueVariable(node.name)?.defs.some(
        (definition) =>
          definition.type === 'ImportBinding' &&
          definition.node.type === 'ImportNamespaceSpecifier' &&
          !isTypeOnly(definition.parent) &&
          uiCoreModules.has(definition.parent.source.value),
      );
    const checkModule = (node) => {
      const name = node.source?.value;
      if (!name) {
        return;
      }
      if (
        name.startsWith('@segment/') ||
        restrictedModules.some((module) => name === module || name.startsWith(`${module}/`))
      ) {
        report(node);
      } else if (uiCoreModules.has(name) && !isTypeOnly(node)) {
        if (node.type === 'ExportAllDeclaration') {
          report(node);
        } else {
          for (const specifier of node.specifiers) {
            const imported = specifier.imported || specifier.local;
            if (
              ['ImportSpecifier', 'ExportSpecifier'].includes(specifier.type) &&
              !isTypeOnly(specifier) &&
              runtimeExports.has(imported.name || imported.value)
            ) {
              report(specifier);
            }
          }
        }
      }
    };
    const checkMember = (node) => {
      const name = propertyName(node);
      if (
        (isGlobalObject(node.object) && name === 'analytics') ||
        (isUiCoreNamespace(node.object) && runtimeExports.has(name))
      ) {
        report(node);
      }
    };
    const checkDestructuring = (pattern, source) => {
      if (pattern?.type !== 'ObjectPattern') {
        return;
      }
      const restricted = isGlobalObject(source)
        ? globalProperties
        : isUiCoreNamespace(source)
        ? runtimeExports
        : undefined;
      if (!restricted) {
        return;
      }
      for (const property of pattern.properties) {
        if (property.type === 'Property') {
          const name = property.computed
            ? property.key.value
            : property.key.name || property.key.value;
          if (restricted.has(name)) {
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
      JSXMemberExpression: checkMember,
      VariableDeclarator: (node) => checkDestructuring(node.id, node.init),
      AssignmentExpression: (node) => checkDestructuring(node.left, node.right),
    };
  },
};
