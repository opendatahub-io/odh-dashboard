module.exports = require('@odh-dashboard/eslint-config')
  .extend({
    ignorePatterns: [
      // Include dotfile directories that contain markdown
      '!.github',
      // Ignore non-JS/TS files in api (OpenAPI specs)
      'api/**/*',
      // Ignore Go backend sources; keep bff/*.md and bff/docs/*.md lintable (bff/**/* + negation is unreliable in ESLint)
      'bff/cmd/**',
      'bff/internal/**',
      'bff/bin/**',
      'bff/static/**',
      'bff/go.mod',
      'bff/go.sum',
      'bff/go.work.sum',
      'bff/Makefile',
      'bff/.golangci.yaml',
      'bff/.gitignore',
      'bff/**/*.go',
      // Ignore frontend (has its own eslint config) but allow markdown
      'frontend/**/*',
      '!frontend/**/*.md',
    ],
  })
  .recommendedReactTypescript(__dirname);
