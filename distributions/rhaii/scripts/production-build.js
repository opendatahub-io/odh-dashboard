const fs = require('fs');
const path = require('path');
const { STATS_OPTIONS, MODEL_SERVING_REMOTE_ENTRY } = require('./runtime-audit');

const repoRoot = path.resolve(__dirname, '../../..');
const outputDir = path.resolve(__dirname, '../dist/runtime-audit');
const productionTargets = {
  host: {
    workspace: 'distributions/rhaii',
    config: 'distributions/rhaii/config/rspack.prod.js',
    environment: { MODEL_SERVING_REMOTE_ENTRY, RHAII_TILT_FIXTURES: 'false' },
  },
  'model-serving': {
    workspace: 'packages/model-serving/frontend',
    config: 'packages/model-serving/frontend/config/rspack.prod.js',
    environment: {
      DEPLOYMENT_MODE: 'federated',
      PUBLIC_PATH: '/_mf/modelServing/',
      COVERAGE: 'false',
    },
  },
};

// Run each configuration in its own process: dotenv and federation discovery use
// the working directory and mutate process.env while loading the remote config.
const buildProductionTarget = async (name) => {
  if (!Object.hasOwn(productionTargets, name)) throw new Error(`Unknown audit build: ${name}`);
  const target = productionTargets[name];
  const context = path.join(repoRoot, target.workspace);
  const targetDir = path.join(outputDir, name);
  const assetsDir = path.join(targetDir, 'assets');
  process.chdir(context);
  Object.assign(process.env, target.environment);
  if (name === 'model-serving') process.env.DIST_DIR = assetsDir;
  const { rspack } = require('@rspack/core');
  const config = require(path.join(repoRoot, target.config));
  const compiler = rspack({
    ...config,
    context,
    output: { ...config.output, path: assetsDir, clean: true },
  });
  try {
    const stats = await new Promise((resolve, reject) => {
      compiler.run((error, result) => (error ? reject(error) : resolve(result)));
    });
    if (!stats) throw new Error(`${name} compilation returned no statistics`);
    fs.mkdirSync(targetDir, { recursive: true });
    fs.writeFileSync(
      path.join(targetDir, 'stats.json'),
      JSON.stringify(stats.toJson(STATS_OPTIONS)),
    );
    if (stats.hasErrors()) throw new Error(stats.toString({ all: false, errors: true }));
  } finally {
    await new Promise((resolve, reject) => {
      compiler.close((error) => (error ? reject(error) : resolve()));
    });
  }
};

if (require.main === module) {
  buildProductionTarget(process.argv[2]).catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}

module.exports = { buildProductionTarget, productionTargets, MODEL_SERVING_REMOTE_ENTRY };
