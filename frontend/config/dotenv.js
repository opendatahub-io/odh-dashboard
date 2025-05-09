const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
const dotenvExpand = require('dotenv-expand');
const Dotenv = require('dotenv-webpack');

/**
 * Determine if the project is standalone or nested.
 *
 * @param {string} directory
 * @returns {boolean}
 */
const getProjectIsRootDir = (directory) => {
  const dotenvLocalFile = path.resolve(directory, '.env.local');
  const dotenvFile = path.resolve(directory, '.env');
  let localIsRoot;
  let isRoot;

  if (fs.existsSync(dotenvLocalFile)) {
    const { ODH_IS_PROJECT_ROOT_DIR: DOTENV_LOCAL_ROOT } = dotenv.parse(
      fs.readFileSync(dotenvLocalFile),
    );
    localIsRoot = DOTENV_LOCAL_ROOT;
  }

  if (fs.existsSync(dotenvFile)) {
    const { ODH_IS_PROJECT_ROOT_DIR: DOTENV_ROOT } = dotenv.parse(fs.readFileSync(dotenvFile));
    isRoot = DOTENV_ROOT;
  }

  return localIsRoot !== undefined ? localIsRoot !== 'false' : isRoot !== 'false';
};

/**
 * Return tsconfig compilerOptions.
 *
 * @param {string} directory
 * @returns {object}
 */
const getTsCompilerOptions = (directory) => {
  const tsconfigFile = path.resolve(directory, './tsconfig.json');
  let tsCompilerOptions = {};

  if (fs.existsSync(tsconfigFile)) {
    const { compilerOptions = { outDir: './dist', baseUrl: './src' } } = require(tsconfigFile);
    tsCompilerOptions = compilerOptions;
  }

  return tsCompilerOptions;
};

/**
 * Setup a webpack dotenv plugin config.
 *
 * @param {string} filePath
 * @returns {*}
 */
const setupWebpackDotenvFile = (dotEnvFilePath) => {
  const settings = {
    systemvars: true,
    silent: true,
  };

  if (dotEnvFilePath) {
    settings.path = dotEnvFilePath;
  }

  return new Dotenv(settings);
};

/**
 * Setup multiple webpack dotenv file parameters.
 *
 * @param {string} directory
 * @param {string} env
 * @param {boolean} isRoot
 * @returns {Array}
 */
const setupWebpackDotenvFilesForEnv = ({ directory, env, isRoot = true }) => {
  const dotenvWebpackSettings = [];

  if (env) {
    dotenvWebpackSettings.push(
      setupWebpackDotenvFile(path.resolve(directory, `.env.${env}.local`)),
    );
    dotenvWebpackSettings.push(setupWebpackDotenvFile(path.resolve(directory, `.env.${env}`)));
  }

  dotenvWebpackSettings.push(setupWebpackDotenvFile(path.resolve(directory, '.env.local')));
  dotenvWebpackSettings.push(setupWebpackDotenvFile(path.resolve(directory, '.env')));

  if (!isRoot) {
    if (env) {
      dotenvWebpackSettings.push(
        setupWebpackDotenvFile(path.resolve(directory, '..', `.env.${env}.local`)),
      );
      dotenvWebpackSettings.push(
        setupWebpackDotenvFile(path.resolve(directory, '..', `.env.${env}`)),
      );
    }

    dotenvWebpackSettings.push(setupWebpackDotenvFile(path.resolve(directory, '..', '.env.local')));
    dotenvWebpackSettings.push(setupWebpackDotenvFile(path.resolve(directory, '..', '.env')));
  }

  return dotenvWebpackSettings;
};

/**
 * Setup, and access, a dotenv file and the related set of parameters.
 *
 * @param {string} dotEnvFilePath
 * @returns {*}
 */
const setupDotenvFile = (dotEnvFilePath) => {
  const dotenvInitial = dotenv.config({ path: dotEnvFilePath });
  dotenvExpand(dotenvInitial);
};

/**
 * Setup and access local and specific dotenv file parameters.
 *
 * @param {string} env
 */
const setupDotenvFilesForEnv = ({ env }) => {
  const RELATIVE_DIRNAME = path.resolve(__dirname, '..');
  const IS_ROOT = getProjectIsRootDir(RELATIVE_DIRNAME);
  const { baseUrl: TS_BASE_URL, outDir: TS_OUT_DIR } = getTsCompilerOptions(RELATIVE_DIRNAME);

  if (!IS_ROOT) {
    if (env) {
      setupDotenvFile(path.resolve(RELATIVE_DIRNAME, '..', `.env.${env}.local`));
      setupDotenvFile(path.resolve(RELATIVE_DIRNAME, '..', `.env.${env}`));
    }

    setupDotenvFile(path.resolve(RELATIVE_DIRNAME, '..', '.env.local'));
    setupDotenvFile(path.resolve(RELATIVE_DIRNAME, '..', '.env'));
  }

  if (env) {
    setupDotenvFile(path.resolve(RELATIVE_DIRNAME, `.env.${env}.local`));
    setupDotenvFile(path.resolve(RELATIVE_DIRNAME, `.env.${env}`));
  }

  setupDotenvFile(path.resolve(RELATIVE_DIRNAME, '.env.local'));
  setupDotenvFile(path.resolve(RELATIVE_DIRNAME, '.env'));

  const IMAGES_DIRNAME = process.env.ODH_IMAGES_DIRNAME || 'images';
  const PUBLIC_PATH = process.env.ODH_PUBLIC_PATH || '/';
  const SRC_DIR = path.resolve(RELATIVE_DIRNAME, process.env.ODH_SRC_DIR || TS_BASE_URL || 'src');
  const COMMON_DIR = path.resolve(RELATIVE_DIRNAME, process.env.ODH_COMMON_DIR || 'packages');
  const DIST_DIR = path.resolve(
    RELATIVE_DIRNAME,
    process.env.ODH_DIST_DIR || TS_OUT_DIR || 'public',
  );
  const HOST = process.env.ODH_HOST || 'localhost';
  const PORT = process.env.ODH_PORT || '3000';
  const BACKEND_PORT = process.env.PORT || process.env.BACKEND_PORT || 8080;
  const DEV_MODE = process.env.ODH_DEV_MODE || undefined;
  const OUTPUT_ONLY = process.env._ODH_OUTPUT_ONLY === 'true';

  process.env._ODH_RELATIVE_DIRNAME = RELATIVE_DIRNAME;
  process.env._ODH_IS_PROJECT_ROOT_DIR = IS_ROOT;
  process.env._ODH_IMAGES_DIRNAME = IMAGES_DIRNAME;
  process.env._ODH_PUBLIC_PATH = PUBLIC_PATH;
  process.env._ODH_SRC_DIR = SRC_DIR;
  process.env._ODH_COMMON_DIR = COMMON_DIR;
  process.env._ODH_DIST_DIR = DIST_DIR;
  process.env._ODH_HOST = HOST;
  process.env._ODH_PORT = PORT;
  process.env._ODH_OUTPUT_ONLY = OUTPUT_ONLY;
  process.env._ODH_DEV_MODE = DEV_MODE;
  process.env._BACKEND_PORT = BACKEND_PORT;
};

module.exports = { setupWebpackDotenvFilesForEnv, setupDotenvFilesForEnv };
