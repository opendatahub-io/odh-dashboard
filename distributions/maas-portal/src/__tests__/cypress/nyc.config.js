const path = require('path');

module.exports = {
  cwd: path.resolve(__dirname, '../../../../..'),
  'report-dir': path.resolve(__dirname, 'results/coverage'),
  reporter: ['json', 'lcovonly', 'text-summary'],
  exclude: ['**/distribution-extensions.ts'],
  excludeAfterRemap: true,
};
