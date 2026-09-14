const { merge } = require('rspack-merge');
const { rspack } = require('@rspack/core');
const { setupWebpackDotenvFilesForEnv, setupDotenvFilesForEnv } = require('./dotenv');

const getRsdoctorPlugin = () => {
  if (process.env.RSDOCTOR !== 'true') {
    return [];
  }
  // Lazy-require: @rsdoctor/rspack-plugin depends on @rspack/resolver, which has no
  // native bindings for s390x/ppc64le. Container builds must not load it.
  const { RsdoctorRspackPlugin } = require('@rsdoctor/rspack-plugin');
  return [new RsdoctorRspackPlugin()];
};

setupDotenvFilesForEnv({ env: 'production' });
const common = require('./rspack.common.js');

const RELATIVE_DIRNAME = process.env._RELATIVE_DIRNAME;
const IS_PROJECT_ROOT_DIR = process.env._IS_PROJECT_ROOT_DIR;
const DIST_DIR = process.env._DIST_DIR;
const OUTPUT_ONLY = process.env._OUTPUT_ONLY;

if (OUTPUT_ONLY !== 'true') {
  console.info(`Cleaning OUTPUT DIR...\n  ${DIST_DIR}\n`);
}

module.exports = merge(
  {
    plugins: [
      ...setupWebpackDotenvFilesForEnv({
        directory: RELATIVE_DIRNAME,
        env: 'production',
        isRoot: IS_PROJECT_ROOT_DIR,
      }),
    ],
  },
  common('production'),
  {
    mode: 'production',
    devtool: 'source-map',
    output: {
      filename: '[name].[contenthash].js',
    },
    optimization: {
      minimize: true,
      minimizer: [
        new rspack.SwcJsMinimizerRspackPlugin(),
        new rspack.LightningCssMinimizerRspackPlugin(),
      ],
    },
    plugins: [
      new rspack.CssExtractRspackPlugin({
        filename: '[name].[contenthash].css',
        ignoreOrder: true,
      }),
      // Only enable when analyzing — increases build time.
      // See https://rspack.rs/guide/optimization/use-rsdoctor
      ...getRsdoctorPlugin(),
    ],
    module: {
      rules: [
        {
          test: /\.css$/,
          use: [rspack.CssExtractRspackPlugin.loader, 'css-loader'],
        },
      ],
    },
  },
);
