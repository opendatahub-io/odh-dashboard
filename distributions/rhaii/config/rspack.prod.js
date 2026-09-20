const { merge } = require('rspack-merge');
const rspackCommon = require('./rspack.common.js');

module.exports = merge(rspackCommon(), {
  mode: 'production',
  devtool: 'source-map',
});
