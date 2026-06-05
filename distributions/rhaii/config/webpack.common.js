const path = require('path');
const createWebpackCommon = require('../../base/config/webpack.common.js');

const SRC_DIR = path.resolve(__dirname, '../src');

module.exports = (overrides = {}) =>
  createWebpackCommon({ distributionSrcDir: SRC_DIR, title: 'RHAII', ...overrides });
