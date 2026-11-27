const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const { parse } = require('yaml');

const repoRoot = path.resolve(__dirname, '../../..');

const getModelServingProfileEnvironment = () => {
  const distribution = parse(fs.readFileSync(path.join(__dirname, '../distribution.yaml'), 'utf8'));
  const profile = distribution?.extensionProfiles?.modelServing;
  if (typeof profile !== 'string' || !profile.trim()) {
    throw new Error('distribution.yaml must define extensionProfiles.modelServing');
  }
  return { MODEL_SERVING_EXTENSION_PROFILE: profile };
};

// Docker and Tilt use the same distribution-owned selection as the runtime audit.
const main = (args = process.argv.slice(2)) => {
  const [script] = args;
  if (args.length !== 1 || !['build:prod', 'start:dev'].includes(script)) {
    throw new Error('Expected a Model Serving script: build:prod or start:dev');
  }
  const result = spawnSync('pnpm', ['run', script], {
    cwd: path.join(repoRoot, 'packages/model-serving/frontend'),
    env: { ...process.env, ...getModelServingProfileEnvironment() },
    stdio: 'inherit',
  });
  if (result.error) throw result.error;
  if (result.signal) throw new Error(`Model Serving build stopped by ${result.signal}`);
  process.exitCode = result.status ?? 1;
};

if (require.main === module) main();

module.exports = { getModelServingProfileEnvironment, main };
