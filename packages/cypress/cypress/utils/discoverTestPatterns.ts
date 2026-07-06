import { execSync } from 'child_process';
import * as path from 'path';

interface CypressConfig {
  mocked?: string;
  e2e?: string;
}

interface WorkspacePackage {
  name: string;
  path: string;
  cypress?: CypressConfig;
}

const getWorkspacePackages = (): WorkspacePackage[] => {
  const stdout = execSync('npm query .workspace --json', { encoding: 'utf8' });
  return JSON.parse(stdout);
};

/**
 * Discovers Cypress test patterns from workspace packages that have registered
 * them in their package.json under the "cypress" field.
 *
 * @param type - The type of test patterns to discover ('mocked' or 'e2e')
 * @returns An array of spec patterns relative to the cypress package root
 *
 * @example
 * // In a package.json:
 * // {
 * //   "cypress": {
 * //     "mocked": "cypress/tests/mocked/**\/*.cy.ts"
 * //   }
 * // }
 *
 * getCypressTestPatterns('mocked');
 * // Returns: ['../observability/cypress/tests/mocked/**\/*.cy.ts', ...]
 */
export const getCypressTestPatterns = (type: 'mocked' | 'e2e' = 'mocked'): string[] => {
  const cypressPkgPath = path.resolve(__dirname, '../..');
  const packages = getWorkspacePackages();

  return packages
    .map((pkg) => {
      if (!pkg.cypress?.[type]) {
        return null;
      }
      const relativePkgPath = path.relative(cypressPkgPath, pkg.path);
      return path.join(relativePkgPath, pkg.cypress[type]);
    })
    .filter((x) => x != null);
};
