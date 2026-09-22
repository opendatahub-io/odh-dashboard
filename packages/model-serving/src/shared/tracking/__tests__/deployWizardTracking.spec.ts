import { mockToolCallingValidatedConfiguration } from '@odh-dashboard/model-serving/__mocks__/mockValidatedConfigurations';
import {
  getDeployWizardEntryPoint,
  getDeployWizardStartedProperties,
} from '../deployWizardTracking';

describe('getDeployWizardEntryPoint', () => {
  it('should return project_deployments when fromProject is set without projectName', () => {
    expect(getDeployWizardEntryPoint({ fromProject: true })).toBe('project_deployments');
  });

  it('should return project_deployments when fromProject and projectName are set', () => {
    expect(getDeployWizardEntryPoint({ fromProject: true, projectName: 'my-project' })).toBe(
      'project_deployments',
    );
  });

  it('should return deployments_list when fromProject is not set', () => {
    expect(getDeployWizardEntryPoint({})).toBe('deployments_list');
    expect(getDeployWizardEntryPoint({ projectName: 'my-project' })).toBe('deployments_list');
  });

  it('should prefer edit, catalog, and navigator entry points over fromProject', () => {
    expect(getDeployWizardEntryPoint({ editMode: true, fromProject: true })).toBe('edit');
    expect(
      getDeployWizardEntryPoint({
        fromCatalog: true,
        catalogModelId: 'source/model',
        fromProject: true,
      }),
    ).toBe('model_details');
    expect(getDeployWizardEntryPoint({ fromProjectNavigator: true, fromProject: true })).toBe(
      'navigator',
    );
  });
});

describe('getDeployWizardStartedProperties', () => {
  it('should build wizard started properties from navigation source and initial data', () => {
    expect(
      getDeployWizardStartedProperties({
        navSource: { fromCatalog: true, catalogModelId: 'source/model' },
        projectName: 'my-project',
        isEditMode: false,
        validatedConfigurations: [mockToolCallingValidatedConfiguration()],
      }),
    ).toEqual({
      entryPoint: 'model_details',
      catalogModelId: 'source/model',
      hasValidatedArgumentsSection: true,
      isEditMode: false,
    });
  });

  it('should classify project deploy entry points from fromProject alone', () => {
    expect(
      getDeployWizardStartedProperties({
        navSource: { fromProject: true },
        isEditMode: false,
      }),
    ).toEqual({
      entryPoint: 'project_deployments',
      catalogModelId: undefined,
      hasValidatedArgumentsSection: false,
      isEditMode: false,
    });
  });
});
