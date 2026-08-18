import { execSync } from 'child_process';
import path from 'path';
import type { Extension } from '@openshift/dynamic-plugin-sdk';
import { expectExtensionsToBeValid } from '../utils';

describe('workspace extensions', () => {
  it('should be valid', () => {
    const repoRoot = path.resolve(__dirname, '../../../../..');
    const scriptPath = path.join(repoRoot, 'scripts/query-workspace-packages.js');
    const stdout = execSync(`node "${scriptPath}"`, { encoding: 'utf-8', cwd: repoRoot });
    const packages: { name: string; exports?: { [key: string]: string } }[] = JSON.parse(stdout);

    const extensionPackages = packages.filter((pkg) => pkg.exports?.['./extensions']);

    const allExtensions: Extension[] = extensionPackages.flatMap(
      (pkg) => require(`${pkg.name}/extensions`).default,
    );

    expect(allExtensions.length).toBeGreaterThan(0);
    expectExtensionsToBeValid(allExtensions);
  });
});
