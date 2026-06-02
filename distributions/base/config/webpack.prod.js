const { merge } = require('webpack-merge');
const webpackCommon = require('./webpack.common.js');

module.exports = merge(webpackCommon('production'), {
  mode: 'production',
  devtool: 'source-map',
});
