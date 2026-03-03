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
      description: 'Require cleanup of setTimeout/setInterval in useEffect',
      recommended: true,
    },
    messages: {
      missingCleanupReturn:
        'useEffect uses {{ timerFn }} but has no cleanup return. ' +
        'Return a function that calls {{ cleanupFn }} to prevent timers running after unmount.',
      missingTimerCleanup:
        'useEffect uses {{ timerFn }} but the cleanup function does not call {{ cleanupFn }}. ' +
        'Uncleared timers cause memory leaks and state updates on unmounted components.',
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

        const hasSetTimeout = bodyContainsCallTo(callback, ['setTimeout']);
        const hasSetInterval = bodyContainsCallTo(callback, ['setInterval']);

        if (!hasSetTimeout && !hasSetInterval) {
          return;
        }

        const cleanupFn = getCleanupFunction(callback);

        if (!cleanupFn) {
          // Check for conditional cleanup: the cleanup return may be inside an
          // if/else branch rather than at the top level of the callback body.
          // Only count cleanup calls inside actual returned functions, not bare calls.
          const conditionalCleanups = findAllCleanupFunctions(callback.body);
          const hasConditionalCleanup = conditionalCleanups.some(
            (fn) =>
              (hasSetTimeout && containsCallTo(fn.body, ['clearTimeout'])) ||
              (hasSetInterval && containsCallTo(fn.body, ['clearInterval'])),
          );

          if (!hasConditionalCleanup) {
            context.report({
              node: node.callee,
              messageId: 'missingCleanupReturn',
              data: {
                timerFn: hasSetInterval ? 'setInterval' : 'setTimeout',
                cleanupFn: hasSetInterval ? 'clearInterval' : 'clearTimeout',
              },
            });
          }
          return;
        }

        if (hasSetTimeout && !containsCallTo(cleanupFn.body, ['clearTimeout'])) {
          context.report({
            node: node.callee,
            messageId: 'missingTimerCleanup',
            data: { timerFn: 'setTimeout', cleanupFn: 'clearTimeout' },
          });
        }

        if (hasSetInterval && !containsCallTo(cleanupFn.body, ['clearInterval'])) {
          context.report({
            node: node.callee,
            messageId: 'missingTimerCleanup',
            data: { timerFn: 'setInterval', cleanupFn: 'clearInterval' },
          });
        }
      },
    };
  },
};
