const packagePath = process.argv[2] ?? require.resolve('../package.json');
const { packageManager } = require(packagePath);

if (!packageManager?.startsWith('pnpm@')) {
  throw new Error('Root package.json must define packageManager as pnpm@<version>');
}

const version = packageManager.slice('pnpm@'.length);
if (!/^\d+\.\d+\.\d+$/.test(version)) {
  throw new Error(`Invalid pnpm version in package.json: ${version}`);
}

process.stdout.write(version);
