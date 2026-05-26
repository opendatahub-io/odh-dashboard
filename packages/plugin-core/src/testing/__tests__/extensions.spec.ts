import { execSync } from 'child_process';
import type { Extension } from '@openshift/dynamic-plugin-sdk';
import { expectExtensionsToBeValid } from '../utils';

describe('workspace extensions', () => {
  it('should be valid', () => {
    const stdout = execSync('npm query .workspace --json', { encoding: 'utf-8' });
    const packages: { name: string; exports?: { [key: string]: string } }[] = JSON.parse(stdout);

    const extensionPackages = packages.filter((pkg) => pkg.exports?.['./extensions']);

    const allExtensions: Extension[] = extensionPackages.flatMap(
      (pkg) => require(`${pkg.name}/extensions`).default,
    );

    expect(allExtensions.length).toBeGreaterThan(0);
    expectExtensionsToBeValid(allExtensions);
  });
});
