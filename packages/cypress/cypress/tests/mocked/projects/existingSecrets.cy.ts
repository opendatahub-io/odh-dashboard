import {
  mockDashboardConfig,
  mockK8sResourceList,
  mockStorageClassList,
} from '@odh-dashboard/internal/__mocks__';
import { mockProjectK8sResource } from '@odh-dashboard/internal/__mocks__/mockProjectK8sResource';
import { mockPVCK8sResource } from '@odh-dashboard/internal/__mocks__/mockPVCK8sResource';
import { mockImageStreamK8sResource } from '@odh-dashboard/internal/__mocks__/mockImageStreamK8sResource';
import { mockCustomSecretK8sResource } from '@odh-dashboard/internal/__mocks__/mockSecretK8sResource';
import { mockGlobalScopedHardwareProfiles } from '@odh-dashboard/internal/__mocks__/mockHardwareProfile';
import { mockDscStatus } from '@odh-dashboard/internal/__mocks__/mockDscStatus';
import type { SecretKind } from '@odh-dashboard/k8s-core';
// eslint-disable-next-line @odh-dashboard/no-restricted-imports
import { SpawnerPageSectionID } from '@odh-dashboard/internal/pages/projects/screens/spawner/types';
import {
  ImageStreamModel,
  PVCModel,
  ProjectModel,
  SecretModel,
  StorageClassModel,
  HardwareProfileModel,
} from '../../../utils/models';
import { asProductAdminUser } from '../../../utils/mockUsers';
import { createSpawnerPage, workbenchPage } from '../../../pages/workbench';

const mockOpaqueSecret = (name: string, keys: string[], namespace = 'test-project'): SecretKind =>
  mockCustomSecretK8sResource({
    name,
    namespace,
    data: keys.reduce<Record<string, string>>((acc, key) => {
      acc[key] = btoa(`value-for-${key}`);
      return acc;
    }, {}),
  });

const mockConnectionSecret = (name: string, namespace = 'test-project'): SecretKind =>
  mockCustomSecretK8sResource({
    name,
    namespace,
    annotations: {
      'opendatahub.io/connection-type': 's3',
      'openshift.io/display-name': name,
    },
    labels: {
      'opendatahub.io/dashboard': 'true',
    },
    data: { AWS_ACCESS_KEY_ID: btoa('key'), AWS_SECRET_ACCESS_KEY: btoa('secret') },
  });

const eligibleSecrets = [
  mockOpaqueSecret('db-credentials', ['DB_HOST', 'DB_PORT', 'DB_USER', 'DB_PASS']),
  mockOpaqueSecret('api-keys', ['API_KEY', 'API_SECRET']),
];

const connectionSecret = mockConnectionSecret('my-s3-connection');

const initIntercepts = (secrets: SecretKind[] = [...eligibleSecrets, connectionSecret]) => {
  asProductAdminUser();
  cy.interceptOdh('GET /api/config', mockDashboardConfig({}));
  cy.interceptOdh('GET /api/dsc/status', mockDscStatus({}));
  cy.interceptK8sList(ProjectModel, mockK8sResourceList([mockProjectK8sResource({})]));
  cy.interceptK8s(ProjectModel, mockProjectK8sResource({}));
  cy.interceptK8sList(StorageClassModel, mockStorageClassList());
  cy.interceptK8sList(
    ImageStreamModel,
    mockK8sResourceList([
      mockImageStreamK8sResource({ name: 'test-image', displayName: 'Test image' }),
    ]),
  );
  cy.interceptK8sList(HardwareProfileModel, mockK8sResourceList(mockGlobalScopedHardwareProfiles));
  cy.interceptK8sList(
    PVCModel,
    mockK8sResourceList([mockPVCK8sResource({ name: 'test-project-storage' })]),
  );
  cy.interceptK8sList({ model: SecretModel, ns: 'test-project' }, mockK8sResourceList(secrets));
};

const navigateToExistingSecretSection = () => {
  workbenchPage.visit('test-project');
  workbenchPage.findCreateButton().click();

  createSpawnerPage.findSideBarItems(SpawnerPageSectionID.ENVIRONMENT_VARIABLES).click();
  createSpawnerPage.findAddVariableButton().click();

  const envField = createSpawnerPage.getEnvironmentVariableTypeField(0);
  envField.selectEnvironmentVariableType('Secret');
};

describe('Existing Secrets in Workbench Environment Variables', () => {
  it('should show "Existing secret" radio option when Secret type is selected', () => {
    initIntercepts();
    navigateToExistingSecretSection();

    cy.findByTestId('secret-category-generic-radio').should('exist');
    cy.findByTestId('secret-category-upload-radio').should('exist');
    cy.findByTestId('secret-category-existing-radio').should('exist');
  });

  it('should render typeahead dropdown and list eligible secrets when "Existing secret" is selected', () => {
    initIntercepts();
    navigateToExistingSecretSection();

    cy.findByTestId('secret-category-existing-radio').click();

    // Verify the typeahead toggle appears
    cy.findByTestId('existing-secret-typeahead-toggle').should('exist');

    // Open the dropdown
    cy.findByTestId('existing-secret-typeahead-toggle').click();

    // Verify eligible secrets are listed
    cy.findByTestId('existing-secret-option-db-credentials').should('exist');
    cy.findByTestId('existing-secret-option-api-keys').should('exist');

    // Verify connection secret is NOT listed (filtered out by eligibility logic)
    cy.findByTestId('existing-secret-option-my-s3-connection').should('not.exist');
  });

  it('should show key checkboxes when a secret is selected and expanded', () => {
    initIntercepts();
    navigateToExistingSecretSection();

    cy.findByTestId('secret-category-existing-radio').click();

    // Open dropdown and select db-credentials
    cy.findByTestId('existing-secret-typeahead-toggle').click();
    cy.findByTestId('existing-secret-option-db-credentials').click();

    // Badge should show 1 secret selected
    cy.findByTestId('existing-secret-count-badge').should('have.text', '1');

    // Expand the secret section
    cy.findByTestId('existing-secret-expandable-db-credentials').click();

    // Verify checkboxes appear for each key
    cy.findByTestId('secret-key-checkbox-db-credentials-DB_HOST').should('exist');
    cy.findByTestId('secret-key-checkbox-db-credentials-DB_PORT').should('exist');
    cy.findByTestId('secret-key-checkbox-db-credentials-DB_USER').should('exist');
    cy.findByTestId('secret-key-checkbox-db-credentials-DB_PASS').should('exist');

    // Verify key count badge
    cy.findByTestId('secret-key-count-db-credentials').should('contain.text', '4 of 4 keys');
  });

  it('should show collision warning when keys conflict across secrets', () => {
    // Create two secrets with overlapping key names
    const secretWithOverlap1 = mockOpaqueSecret('secret-a', ['SHARED_KEY', 'UNIQUE_A']);
    const secretWithOverlap2 = mockOpaqueSecret('secret-b', ['SHARED_KEY', 'UNIQUE_B']);
    initIntercepts([secretWithOverlap1, secretWithOverlap2]);

    navigateToExistingSecretSection();

    cy.findByTestId('secret-category-existing-radio').click();

    // Select both secrets
    cy.findByTestId('existing-secret-typeahead-toggle').click();
    cy.findByTestId('existing-secret-option-secret-a').click();
    cy.findByTestId('existing-secret-option-secret-b').click();

    // Close dropdown to see the warning
    cy.findByTestId('existing-secret-typeahead-toggle').click();

    // Verify collision warning is shown
    cy.findByTestId('existing-secret-collision-warning').should('exist');
    cy.findByTestId('existing-secret-collision-warning').should('contain.text', 'SHARED_KEY');
  });

  it('should show helper text about restart requirement', () => {
    initIntercepts();
    navigateToExistingSecretSection();

    cy.findByTestId('secret-category-existing-radio').click();

    cy.findByTestId('existing-secret-helper-text').should('exist');
    cy.findByTestId('existing-secret-helper-text').should('contain.text', 'restart the workbench');
  });
});
