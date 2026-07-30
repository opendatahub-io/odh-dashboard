import * as fs from 'fs';
import * as path from 'path';

describe('@odh-dashboard/k8s-core Prometheus export surface', () => {
  it('declares ./prometheus export in k8s-core package.json', () => {
    const entryPath = require.resolve('@odh-dashboard/k8s-core/prometheus');
    const packageRoot = path.resolve(path.dirname(entryPath), '..');
    const pkg = JSON.parse(fs.readFileSync(path.join(packageRoot, 'package.json'), 'utf-8'));
    expect(pkg.exports).toMatchObject({
      './prometheus': './src/prometheusTypes.ts',
    });
    const resolvedTarget = path.join(packageRoot, pkg.exports['./prometheus']);
    expect(fs.existsSync(resolvedTarget)).toBe(true);
  });
});
