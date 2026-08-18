/* eslint-disable @typescript-eslint/restrict-template-expressions */
const path = require('path');
const { merge } = require('rspack-merge');
const { rspack } = require('@rspack/core');
const { rimrafSync } = require('rimraf');
const { setupWebpackDotenvFilesForEnv, setupDotenvFilesForEnv } = require('./dotenv');

const getRsdoctorPlugin = () => {
  if (process.env.RSDOCTOR !== 'true') {
    return [];
  }
  // Lazy-require: @rsdoctor/rspack-plugin depends on @rspack/resolver, which has no
  // native bindings for s390x/ppc64le. Container builds must not load it.
  // eslint-disable-next-line import/no-extraneous-dependencies -- optional dev-only analyzer; lazy-loaded when RSDOCTOR=true
  const { RsdoctorRspackPlugin } = require('@rsdoctor/rspack-plugin');
  return [new RsdoctorRspackPlugin()];
};

setupDotenvFilesForEnv({ env: 'production' });
const rspackCommon = require('./rspack.common.js');
const { patternFlyCssIncludes } = require('../../scripts/webpack/pnpmResolverIncludes');

const RELATIVE_DIRNAME = process.env._ODH_RELATIVE_DIRNAME;
const IS_PROJECT_ROOT_DIR = process.env._ODH_IS_PROJECT_ROOT_DIR;
const SRC_DIR = process.env._ODH_SRC_DIR;
const COMMON_DIR = process.env._ODH_COMMON_DIR;
const DIST_DIR = process.env._ODH_DIST_DIR;
const OUTPUT_ONLY = process.env._ODH_OUTPUT_ONLY;
const ROOT_NODE_MODULES = path.resolve(RELATIVE_DIRNAME, '../node_modules');

if (OUTPUT_ONLY !== 'true') {
  console.info(`Cleaning OUTPUT DIR...\n  ${DIST_DIR}\n`);
}

rimrafSync(DIST_DIR);

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
  rspackCommon('production'),
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
          include: patternFlyCssIncludes(RELATIVE_DIRNAME, ROOT_NODE_MODULES, SRC_DIR, COMMON_DIR),
          use: [rspack.CssExtractRspackPlugin.loader, 'css-loader'],
        },
      ],
    },
  },
);
