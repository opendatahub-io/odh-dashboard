module.exports = require('@odh-dashboard/eslint-config')
  .extend({
    ignorePatterns: [
      // Include dotfile directories that contain markdown
      '!.github',
      // Ignore Go services files but allow markdown
      'services/**/*',
      '!services/**/*.md',
      // Ignore ui (has its own eslint config) but allow markdown
      'ui/**/*',
      '!ui/**/*.md',
    ],
  })
  .recommendedReactTypescript(__dirname);
