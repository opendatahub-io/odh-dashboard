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
import { mockConnectionTypeConfigMap } from '@odh-dashboard/internal/__mocks__/mockConnectionType';
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
  cy.interceptOdh('GET /api/connection-types', [mockConnectionTypeConfigMap({})]);
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

    const envField = createSpawnerPage.getEnvironmentVariableTypeField(0);
    envField.findSecretCategoryRadio('generic').should('exist');
    envField.findSecretCategoryRadio('upload').should('exist');
    envField.findSecretCategoryRadio('existing').should('exist');
  });

  it('should render typeahead dropdown and list eligible secrets when "Existing secret" is selected', () => {
    initIntercepts();
    navigateToExistingSecretSection();

    const envField = createSpawnerPage.getEnvironmentVariableTypeField(0);
    envField.findSecretCategoryRadio('existing').click();
    cy.testA11y();

    // Verify the typeahead toggle appears
    envField.findExistingSecretTypeaheadToggle().should('exist');

    // Open the dropdown
    envField.findExistingSecretTypeaheadToggle().click();

    // Verify eligible secrets are listed
    envField.findExistingSecretOption('db-credentials').should('exist');
    envField.findExistingSecretOption('api-keys').should('exist');

    // Verify connection secret is NOT listed (filtered out by eligibility logic)
    envField.findExistingSecretOption('my-s3-connection').should('not.exist');
  });

  it('should show key checkboxes when a secret is selected and expanded', () => {
    initIntercepts();
    navigateToExistingSecretSection();

    const envField = createSpawnerPage.getEnvironmentVariableTypeField(0);
    envField.findSecretCategoryRadio('existing').click();

    // Open dropdown and select db-credentials
    envField.findExistingSecretTypeaheadToggle().click();
    envField.findExistingSecretOption('db-credentials').click();

    // Badge should show 1 secret selected
    envField.findExistingSecretCountBadge().should('have.text', '1');

    // Expand the secret section
    envField.findExistingSecretExpandable('db-credentials').click();

    // Verify checkboxes appear for each key
    envField.findSecretKeyCheckbox('db-credentials', 'DB_HOST').should('exist');
    envField.findSecretKeyCheckbox('db-credentials', 'DB_PORT').should('exist');
    envField.findSecretKeyCheckbox('db-credentials', 'DB_USER').should('exist');
    envField.findSecretKeyCheckbox('db-credentials', 'DB_PASS').should('exist');

    // Verify key count badge
    envField.findSecretKeyCount('db-credentials').should('contain.text', '4 of 4 keys');
  });

  it('should show collision warning when keys conflict across secrets', () => {
    // Create two secrets with overlapping key names
    const secretWithOverlap1 = mockOpaqueSecret('secret-a', ['SHARED_KEY', 'UNIQUE_A']);
    const secretWithOverlap2 = mockOpaqueSecret('secret-b', ['SHARED_KEY', 'UNIQUE_B']);
    initIntercepts([secretWithOverlap1, secretWithOverlap2]);

    navigateToExistingSecretSection();

    const envField = createSpawnerPage.getEnvironmentVariableTypeField(0);
    envField.findSecretCategoryRadio('existing').click();

    // Select both secrets
    envField.findExistingSecretTypeaheadToggle().click();
    envField.findExistingSecretOption('secret-a').click();
    envField.findExistingSecretOption('secret-b').click();

    // Close dropdown to see the warning
    envField.findExistingSecretTypeaheadToggle().click();

    // Verify collision warning is shown
    envField.findExistingSecretCollisionWarning().should('exist');
    envField.findExistingSecretCollisionWarning().should('contain.text', 'SHARED_KEY');
    cy.testA11y();
  });

  it('should disable submit button when conflicts exist', () => {
    // Create two secrets with overlapping key names
    const secretWithOverlap1 = mockOpaqueSecret('secret-a', ['SHARED_KEY', 'UNIQUE_A']);
    const secretWithOverlap2 = mockOpaqueSecret('secret-b', ['SHARED_KEY', 'UNIQUE_B']);
    initIntercepts([secretWithOverlap1, secretWithOverlap2]);

    navigateToExistingSecretSection();

    const envField = createSpawnerPage.getEnvironmentVariableTypeField(0);
    envField.findSecretCategoryRadio('existing').click();

    // Select both secrets to trigger key collision
    envField.findExistingSecretTypeaheadToggle().click();
    envField.findExistingSecretOption('secret-a').click();
    envField.findExistingSecretOption('secret-b').click();

    // Close dropdown
    envField.findExistingSecretTypeaheadToggle().click();

    // Verify collision warning is present
    envField.findExistingSecretCollisionWarning().should('exist');

    // Verify submit button is disabled when conflicts exist
    createSpawnerPage.findSubmitButton().should('be.disabled');
  });

  it('should show helper text about restart requirement', () => {
    initIntercepts();
    navigateToExistingSecretSection();

    const envField = createSpawnerPage.getEnvironmentVariableTypeField(0);
    envField.findSecretCategoryRadio('existing').click();
    cy.testA11y();

    envField.findExistingSecretHelperText().should('exist');
    envField.findExistingSecretHelperText().should('contain.text', 'restart the workbench');
  });
});
