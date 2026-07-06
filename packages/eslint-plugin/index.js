module.exports = {
  rules: {
    'no-restricted-imports': require('./rules/no-restricted-imports'),
    'require-effect-timer-cleanup': require('./rules/require-effect-timer-cleanup'),
    'require-effect-listener-cleanup': require('./rules/require-effect-listener-cleanup'),
  },
};
