const path = require('path');

module.exports = {
  preset: '../../../packages/contract-tests/jest.preset.js',
  moduleDirectories: ['node_modules', path.resolve(__dirname, '../../../node_modules')],
};
