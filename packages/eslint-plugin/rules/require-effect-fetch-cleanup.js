const {
  isEffectHook,
  getEffectCallback,
  bodyContainsCallTo,
  getCleanupFunction,
  containsCallTo,
  containsNewExpression,
} = require('./utils/effect-cleanup-helpers');

module.exports = {
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Require AbortController for fetch calls in useEffect',
      recommended: true,
    },
    messages: {
      missingAbortController:
        'useEffect uses fetch() without an AbortController. ' +
        'Create an AbortController, pass its signal to fetch, and call controller.abort() in ' +
        'the cleanup return to cancel in-flight requests on unmount.',
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

        if (!bodyContainsCallTo(callback, ['fetch'])) {
          return;
        }

        const hasAbortControllerInBody = containsNewExpression(callback.body, 'AbortController');

        const cleanupFn = getCleanupFunction(callback);
        const hasAbortInCleanup = cleanupFn && containsCallTo(cleanupFn.body, ['abort']);

        if (!hasAbortControllerInBody && !hasAbortInCleanup) {
          context.report({
            node: node.callee,
            messageId: 'missingAbortController',
          });
        }
      },
    };
  },
};
