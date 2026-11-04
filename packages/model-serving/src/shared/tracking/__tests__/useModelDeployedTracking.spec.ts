import { MetadataAnnotation } from '@odh-dashboard/k8s-core';
import type { WizardFormState } from '../../../components/deploymentWizard/useDeploymentWizardReducer';
import { getBaseModelDeployedTrackingProperties } from '../useModelDeployedTracking';

const createMinimalFormState = (
  overrides: {
    templateLabels?: Record<string, string>;
    templateAnnotations?: Record<string, string>;
  } = {},
): WizardFormState =>
  ({
    modelServer: {
      data: {
        selection: {
          name: 'test-template',
          label: 'Test Template',
          template: {
            metadata: {
              name: 'test-template',
              labels: overrides.templateLabels ?? {},
              annotations: overrides.templateAnnotations ?? {},
            },
          },
        },
      },
    },
    modelType: { data: { type: 'generative' } },
    numReplicas: { data: 1 },
    modelFormatState: { modelFormat: { name: 'vLLM' } },
    modelLocationData: { data: { type: 's3' } },
    validatedConfigurationSelection: { selectedValidatedConfigurations: {} },
    runtimeArgs: {},
  } as unknown as WizardFormState);

describe('getBaseModelDeployedTrackingProperties', () => {
  it('should emit servingRuntimeSource "preinstalled" when platform.opendatahub.io/part-of label is present', () => {
    const formState = createMinimalFormState({
      templateLabels: { 'platform.opendatahub.io/part-of': 'modelcontroller' },
    });
    const result = getBaseModelDeployedTrackingProperties(formState);
    expect(result.servingRuntimeSource).toBe('preinstalled');
  });

  it('should emit servingRuntimeSource "created-from-catalog" when installed-from-catalog annotation is present', () => {
    const formState = createMinimalFormState({
      templateAnnotations: { [MetadataAnnotation.InstalledFromCatalog]: 'true' },
    });
    const result = getBaseModelDeployedTrackingProperties(formState);
    expect(result.servingRuntimeSource).toBe('created-from-catalog');
  });

  it('should prefer "preinstalled" over "created-from-catalog" when both markers are present', () => {
    const formState = createMinimalFormState({
      templateLabels: { 'platform.opendatahub.io/part-of': 'modelcontroller' },
      templateAnnotations: { [MetadataAnnotation.InstalledFromCatalog]: 'true' },
    });
    const result = getBaseModelDeployedTrackingProperties(formState);
    expect(result.servingRuntimeSource).toBe('preinstalled');
  });

  it('should omit servingRuntimeSource when neither marker is present (custom runtime)', () => {
    const formState = createMinimalFormState();
    const result = getBaseModelDeployedTrackingProperties(formState);
    expect(result.servingRuntimeSource).toBeUndefined();
  });
});
