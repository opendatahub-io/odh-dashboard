const path = require('path');
const webpack = require('webpack');
const HtmlWebpackPlugin = require('html-webpack-plugin');

const BASE_DIR = path.resolve(__dirname, '..');
const BASE_SRC_DIR = path.resolve(BASE_DIR, 'src');
const REPO_ROOT = path.resolve(BASE_DIR, '../..');
const INTERNAL_DIR = path.resolve(REPO_ROOT, 'frontend/src');

const IMAGES_SEGMENT = `${path.sep}images${path.sep}`;
const PACKAGES_DIR = path.join(REPO_ROOT, 'packages');
// SVGs from @odh-dashboard/internal (frontend/src/images/) need svg-url-loader too.
// Remove once those images move to their own packages.
const FRONTEND_IMAGES_DIR = path.join(REPO_ROOT, 'frontend', 'src', 'images');

const isImagesDirSvg = (input) =>
  input.indexOf(IMAGES_SEGMENT) > -1 &&
  (input.startsWith(PACKAGES_DIR) || input.startsWith(FRONTEND_IMAGES_DIR));

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
            INTERNAL_DIR,
            // Monorepo packages ship TS source with no precompile step — swc must transpile them when imported.
            path.resolve(REPO_ROOT, 'packages'),
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
          // SVGs under packages/*/images/ are used as <img src> — they need a
          // URL (data URI), not raw markup. bgimages/ also needs data URIs.
          // Base shell logos (distributions/base/src/images/) intentionally use
          // raw-loader so ShellHeader can encodeURIComponent the markup itself.
          include: (input) => input.indexOf('bgimages') > -1 || isImagesDirSvg(input),
          use: {
            loader: 'svg-url-loader',
            options: { limit: 10000 },
          },
        },
        {
          test: /\.svg$/,
          include: (input) => {
            if (
              input.indexOf('bgimages') > -1 ||
              input.indexOf('fonts') > -1 ||
              input.indexOf('pficon') > -1
            ) {
              return false;
            }
            return !isImagesDirSvg(input);
          },
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
      new webpack.DefinePlugin({
        'process.env': '({})',
      }),
    ],
    resolve: {
      extensions: ['.js', '.ts', '.tsx', '.jsx'],
      symlinks: true,
      cacheWithContext: false,
    },
  };
};
