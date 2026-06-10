const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');

const BASE_DIR = path.resolve(__dirname, '..');
const BASE_SRC_DIR = path.resolve(BASE_DIR, 'src');
const REPO_ROOT = path.resolve(BASE_DIR, '../..');
const PLUGIN_CORE_DIR = path.resolve(REPO_ROOT, 'packages/plugin-core/src');
const INTERNAL_DIR = path.resolve(REPO_ROOT, 'frontend/src');

/**
 * Shared webpack configuration factory for all distributions.
 *
 * Distributions use static imports (no Module Federation) — all extensions
 * are bundled at build time via normal import statements.
 *
 * @param {object} [options]
 * @param {string} [options.distributionSrcDir] - Source directory for the distribution. Defaults to base's src/.
 * @param {string} [options.outputDir] - Output directory. Defaults to <distributionSrcDir>/../public.
 * @param {string} [options.title] - HTML page title. Defaults to 'App Shell'.
 * @param {string[]} [options.additionalIncludes] - Extra directories to compile with swc-loader.
 */
module.exports = ({
  distributionSrcDir = BASE_SRC_DIR,
  outputDir,
  title = 'App Shell',
  additionalIncludes = [],
} = {}) => {
  const normalizedDistDir = path.resolve(distributionSrcDir);
  const normalizedIncludes = additionalIncludes.map((p) => path.resolve(p));
  const resolvedOutputDir = outputDir
    ? path.resolve(outputDir)
    : path.resolve(path.dirname(normalizedDistDir), 'public');

  return {
    entry: {
      app: path.join(normalizedDistDir, 'index.tsx'),
    },
    module: {
      rules: [
        {
          test: /\.(tsx|ts|jsx|js)?$/,
          exclude: /node_modules/,
          include: [
            normalizedDistDir,
            BASE_SRC_DIR,
            PLUGIN_CORE_DIR,
            INTERNAL_DIR,
            ...normalizedIncludes,
          ],
          use: [{ loader: 'swc-loader' }],
        },
        {
          test: /\.(svg|ttf|eot|woff|woff2)$/,
          include: [
            path.resolve(REPO_ROOT, 'node_modules/@patternfly/patternfly/assets/fonts'),
            path.resolve(REPO_ROOT, 'node_modules/@patternfly/patternfly/assets/pficon'),
          ],
          use: {
            loader: 'file-loader',
            options: {
              outputPath: 'fonts',
              name: '[name].[ext]',
            },
          },
        },
        {
          test: /\.svg$/,
          include: (input) => input.indexOf('bgimages') > -1,
          use: {
            loader: 'svg-url-loader',
            options: { limit: 10000 },
          },
        },
        {
          test: /\.svg$/,
          include: (input) =>
            input.indexOf('bgimages') === -1 &&
            input.indexOf('fonts') === -1 &&
            input.indexOf('pficon') === -1,
          use: { loader: 'raw-loader' },
        },
        {
          test: /\.(jpg|jpeg|png|gif)$/i,
          include: [
            normalizedDistDir,
            BASE_SRC_DIR,
            path.resolve(REPO_ROOT, 'node_modules/@patternfly/patternfly/assets/images'),
          ],
          use: [
            {
              loader: 'url-loader',
              options: { limit: 5000, outputPath: 'images', name: '[name].[ext]' },
            },
          ],
        },
        {
          test: /\.s[ac]ss$/i,
          use: ['style-loader', 'css-loader', 'sass-loader'],
        },
        {
          test: /\.css$/i,
          use: ['style-loader', 'css-loader'],
        },
      ],
    },
    output: {
      filename: '[name].js',
      path: resolvedOutputDir,
      publicPath: '/',
    },
    plugins: [
      new HtmlWebpackPlugin({
        template: path.join(normalizedDistDir, 'index.html'),
        title,
      }),
    ],
    resolve: {
      extensions: ['.js', '.ts', '.tsx', '.jsx'],
      symlinks: true,
      cacheWithContext: false,
    },
  };
};
