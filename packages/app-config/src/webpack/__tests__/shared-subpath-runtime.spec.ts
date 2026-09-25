/** @jest-environment node */

import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { webpack, type Configuration, type Stats, type WebpackPluginInstance } from 'webpack';

const { ModuleFederationPlugin } = require('@module-federation/enhanced/webpack') as {
  ModuleFederationPlugin: new (options: Record<string, unknown>) => WebpackPluginInstance;
};

jest.setTimeout(60_000);

const writeFile = (root: string, relativePath: string, contents: string): void => {
  const absolutePath = path.join(root, relativePath);
  fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
  fs.writeFileSync(absolutePath, contents);
};

const compile = (config: Configuration): Promise<Stats> =>
  new Promise((resolve, reject) => {
    webpack(config, (error, stats) => {
      if (error) {
        reject(error);
        return;
      }
      if (!stats) {
        reject(new Error('Webpack did not return compilation stats.'));
        return;
      }
      if (stats.hasErrors()) {
        reject(new Error(stats.toString({ all: false, errors: true, errorDetails: true })));
        return;
      }
      resolve(stats);
    });
  });

describe('shared package subpath runtime identity', () => {
  let root: string;

  beforeEach(() => {
    root = fs.mkdtempSync(path.join(os.tmpdir(), 'odh-mf-shared-subpath-'));
  });

  afterEach(() => {
    fs.rmSync(root, { recursive: true, force: true });
  });

  it('should share one context across host root, host subpath, and remote subpath consumers', async () => {
    const hostRoot = path.join(root, 'host');
    const remoteRoot = path.join(root, 'remote');
    for (const packageRoot of [hostRoot, remoteRoot]) {
      writeFile(
        packageRoot,
        'package.json',
        JSON.stringify({
          name: path.basename(packageRoot),
          version: '1.0.0',
          dependencies: { '@test/contexts': '1.0.0' },
        }),
      );
      writeFile(
        packageRoot,
        'node_modules/@test/contexts/package.json',
        JSON.stringify({
          name: '@test/contexts',
          version: '1.0.0',
          exports: { '.': './index.js', './host-api': './host-api.js' },
        }),
      );
      writeFile(packageRoot, 'node_modules/@test/contexts/host-api.js', 'exports.context = {};');
      writeFile(
        packageRoot,
        'node_modules/@test/contexts/index.js',
        "module.exports = require('./host-api');",
      );
    }

    writeFile(remoteRoot, 'src/index.js', 'module.exports = {};');
    writeFile(
      remoteRoot,
      'src/consumer.js',
      "module.exports = { context: require('@test/contexts/host-api').context };",
    );
    const remoteOutputPath = path.join(remoteRoot, 'dist');
    await compile({
      context: remoteRoot,
      mode: 'development',
      target: 'node',
      entry: './src/index.js',
      output: {
        path: remoteOutputPath,
        filename: 'main.js',
        publicPath: '/',
        uniqueName: 'identityRemote',
        library: { type: 'commonjs-module' },
      },
      plugins: [
        new ModuleFederationPlugin({
          name: 'identityRemote',
          filename: 'remoteEntry.js',
          library: { type: 'commonjs-module' },
          exposes: { './consumer': './src/consumer.js' },
          shared: {
            '@test/contexts': { singleton: true, requiredVersion: '*', import: false },
            '@test/contexts/host-api': { singleton: true, requiredVersion: '*', import: false },
          },
        }),
      ],
    });

    const remoteEntryPath = path.join(remoteOutputPath, 'remoteEntry.js');
    writeFile(
      hostRoot,
      'src/bootstrap.js',
      [
        "const root = require('@test/contexts');",
        "const hostApi = require('@test/contexts/host-api');",
        "module.exports = import('identityRemote/consumer').then((module) => {",
        '  const consumer = module.default ?? module;',
        '  return root.context === hostApi.context && hostApi.context === consumer.context;',
        '});',
      ].join('\n'),
    );
    writeFile(
      hostRoot,
      'src/index.js',
      "module.exports = import('./bootstrap.js').then((module) => module.default ?? module);",
    );
    const hostOutputPath = path.join(hostRoot, 'dist');
    await compile({
      context: hostRoot,
      mode: 'development',
      target: 'node',
      entry: './src/index.js',
      output: {
        path: hostOutputPath,
        filename: 'main.js',
        publicPath: '/',
        uniqueName: 'identityHost',
        library: { type: 'commonjs2' },
      },
      plugins: [
        new ModuleFederationPlugin({
          name: 'identityHost',
          remotes: {
            identityRemote: `promise Promise.resolve(require(${JSON.stringify(remoteEntryPath)}))`,
          },
          shared: {
            '@test/contexts': { singleton: true, requiredVersion: '*' },
            '@test/contexts/host-api': { singleton: true, requiredVersion: '*' },
          },
        }),
      ],
    });

    const result = (await require(path.join(hostOutputPath, 'main.js'))) as boolean;
    expect(result).toBe(true);
  });
});
