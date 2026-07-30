import * as fs from 'fs';
import * as path from 'path';
import {
  BiasMetricType as BiasMetricTypeFromSubpath,
  TrustyInstallState as TrustyInstallStateFromSubpath,
} from '@odh-dashboard/k8s-core/trustyai';
import {
  BiasMetricType as BiasMetricTypeFromRoot,
  TrustyInstallState as TrustyInstallStateFromRoot,
} from '@odh-dashboard/k8s-core';

describe('@odh-dashboard/k8s-core TrustyAI export surface', () => {
  it('exposes the same BiasMetricType from root barrel and ./trustyai subpath', () => {
    expect(BiasMetricTypeFromRoot).toBe(BiasMetricTypeFromSubpath);
  });

  it('exposes the same TrustyInstallState from root barrel and ./trustyai subpath', () => {
    expect(TrustyInstallStateFromRoot).toBe(TrustyInstallStateFromSubpath);
  });

  it('preserves BiasMetricType string values', () => {
    expect(BiasMetricTypeFromSubpath.SPD).toBe('SPD');
    expect(BiasMetricTypeFromSubpath.DIR).toBe('DIR');
    expect(Object.values(BiasMetricTypeFromSubpath).toSorted()).toEqual(['DIR', 'SPD']);
  });

  it('preserves TrustyInstallState string values', () => {
    expect(TrustyInstallStateFromSubpath).toEqual({
      UNINSTALLING: 'uninstalling',
      INSTALLED: 'installed',
      INSTALLING: 'installing',
      INFRA_ERROR: 'infra-error',
      CR_ERROR: 'error',
      UNINSTALLED: 'uninstalled',
      LOADING_INITIAL_STATE: 'unknown',
    });
  });

  it('declares ./trustyai export in k8s-core package.json', () => {
    const entryPath = require.resolve('@odh-dashboard/k8s-core/trustyai');
    const packageRoot = path.resolve(path.dirname(entryPath), '..');
    const pkg = JSON.parse(fs.readFileSync(path.join(packageRoot, 'package.json'), 'utf-8'));
    expect(pkg.exports).toMatchObject({
      './trustyai': './src/trustyaiTypes.ts',
    });
    const resolvedTarget = path.join(packageRoot, pkg.exports['./trustyai']);
    expect(fs.existsSync(resolvedTarget)).toBe(true);
  });
});
