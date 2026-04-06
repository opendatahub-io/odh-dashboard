import * as yaml from 'js-yaml';
import {
  validateManifestUrlFormats,
  validateManifestUrlReachability,
} from '../../../utils/manifestUrlValidator';

interface ManifestTestConfig {
  excludedSubstrings?: string[];
}

describe('Verify that all the URLs referenced in the Manifest directory are operational', () => {
  let excludedSubstrings: string[] = [];

  before(() => {
    cy.fixture('e2e/dashboardNavigation/testManifestLinks.yaml').then((yamlString) => {
      try {
        const yamlData = yaml.load(yamlString) as ManifestTestConfig;
        excludedSubstrings = yamlData.excludedSubstrings ?? [];
        cy.step(`Loaded ${excludedSubstrings.length} excluded substrings`);
      } catch (error: unknown) {
        cy.step(
          `Error parsing YAML configuration: ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
        excludedSubstrings = [];
      }
    });
  });

  it(
    'Validates URL format and checks for common mistakes in manifest files (fast, stable)',
    {
      tags: ['@Smoke', '@SmokeSet1', '@ODS-327', '@ODS-492', '@Dashboard'],
    },
    () => {
      const manifestsDir = '../../manifests';
      validateManifestUrlFormats(manifestsDir, excludedSubstrings);
    },
  );

  it(
    'Checks URL reachability with tolerance for transient errors (429, 502, 503, 504)',
    {
      tags: ['@Smoke', '@SmokeSet1', '@ODS-327', '@ODS-492', '@Dashboard', '@RHOAIENG-9235'],
    },
    () => {
      // Allow skipping external URL validation in fast CI runs
      if (Cypress.env('SKIP_EXTERNAL_URL_VALIDATION')) {
        cy.step('Skipping external URL validation (SKIP_EXTERNAL_URL_VALIDATION=true)');
        return;
      }

      const manifestsDir = '../../manifests';
      validateManifestUrlReachability(manifestsDir, excludedSubstrings);
    },
  );
});
