const {
  isEffectHook,
  getEffectCallback,
  bodyContainsCallTo,
  getCleanupFunction,
  findAllCleanupFunctions,
  containsCallTo,
} = require('./utils/effect-cleanup-helpers');

module.exports = {
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Require cleanup of addEventListener in useEffect',
      recommended: true,
    },
    messages: {
      missingCleanupReturn:
        'useEffect uses addEventListener but has no cleanup return. ' +
        'Return a function that calls removeEventListener to prevent leaked listeners after unmount.',
      missingListenerCleanup:
        'useEffect uses addEventListener but the cleanup function does not call removeEventListener. ' +
        'Leaked event listeners cause memory leaks and unexpected behavior after unmount.',
    },
    schema: [],
  },
  create(context) {
    return {
      CallExpression(node) {
        if (!isEffectHook(node)) {
          return;
        }

        const callback = getEffectCallback(node);
        if (!callback) {
          return;
        }

        if (!bodyContainsCallTo(callback, ['addEventListener'])) {
          return;
        }

        const cleanupFn = getCleanupFunction(callback, context);

        if (!cleanupFn) {
          // Check for conditional cleanup: the cleanup return may be inside an
          // if/else branch rather than at the top level of the callback body.
          // Only count cleanup calls inside actual returned functions, not bare calls.
          const conditionalCleanups = findAllCleanupFunctions(callback.body, context);
          const hasConditionalCleanup = conditionalCleanups.some((fn) =>
            containsCallTo(fn.body, ['removeEventListener']),
          );

          if (!hasConditionalCleanup) {
            context.report({
              node: node.callee,
              messageId: 'missingCleanupReturn',
            });
          }
          return;
        }

        if (!containsCallTo(cleanupFn.body, ['removeEventListener'])) {
          context.report({
            node: node.callee,
            messageId: 'missingListenerCleanup',
          });
        }
      },
    };
  },
};
