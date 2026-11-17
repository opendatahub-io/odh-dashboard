import { k8sCreateResource } from '@openshift/dynamic-plugin-sdk-utils';
import { MetadataAnnotation } from '@odh-dashboard/k8s-core';
import type { HardwareProfileConfig } from '@odh-dashboard/hardware-profiles/shared';
import {
  ModelLocationType,
  type WizardFormData,
} from '@odh-dashboard/model-serving/shared/types/form-data';
import { assembleLLMdDeployment, deployLLMdDeployment } from '../deploy';
import { mockLLMInferenceServiceK8sResource } from '../../__mocks__/mockLLMInferenceServiceK8sResource';
import type { LLMInferenceServiceKind } from '../../types';

jest.mock('@openshift/dynamic-plugin-sdk-utils', () => ({
  ...jest.requireActual('@openshift/dynamic-plugin-sdk-utils'),
  k8sCreateResource: jest.fn(),
}));

const createResource = jest.mocked(k8sCreateResource);
const form = (uri = 'hf://org/model'): WizardFormData =>
  ({
    state: {
      project: { projectName: 'test-project' },
      k8sNameDesc: { data: { name: 'My model', description: '', k8sName: { value: 'my-model' } } },
      hardwareProfileConfig: { formData: { useExistingSettings: true } as HardwareProfileConfig },
      modelLocationData: {
        data: {
          type: uri.startsWith('pvc:') ? ModelLocationType.PVC : ModelLocationType.NEW,
          fieldValues: { URI: uri },
          additionalFields: {},
        },
      },
      createConnectionData: { data: {} },
      numReplicas: { data: 1 },
      runtimeArgs: { data: undefined },
      environmentVariables: { data: undefined },
      modelAvailability: { data: undefined },
      tokenAuthentication: { data: [] },
      huggingFaceApiKey: { data: { token: '' } },
      modelServer: { data: undefined },
      deploymentMethod: { method: 'llm-inference-service-llmd' },
    },
  } as unknown as WizardFormData);

describe('LLM inference service preview and submission', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    createResource.mockImplementation(async ({ resource }) => resource);
  });

  it.each(['hf://org/model', 'https://example.com/model', 'pvc://models/weights'])(
    'should submit the URI and namespace shown by assembly for %s',
    async (uri) => {
      const wizard = form(uri);
      const preview = assembleLLMdDeployment(wizard).model;
      expect(preview.spec.model.uri).toBe(uri);
      const snapshot = structuredClone(preview);
      const deployment = await deployLLMdDeployment(
        wizard.state,
        {},
        'test-project',
        undefined,
        preview,
      );
      expect(createResource).toHaveBeenCalledWith(expect.objectContaining({ resource: snapshot }));
      expect(deployment.model.spec.model.uri).toBe(uri);
      expect(deployment.model.metadata.namespace).toBe(preview.metadata.namespace);
      expect(preview).toEqual(snapshot);
    },
  );

  it.each([false, true])(
    'should reject unresolved model locations before API writes (dryRun=%s)',
    async (dryRun) => {
      const wizard = form('');
      const preview = assembleLLMdDeployment(wizard).model;
      await expect(
        deployLLMdDeployment(
          wizard.state,
          {},
          'test-project',
          undefined,
          preview,
          undefined,
          undefined,
          dryRun,
        ),
      ).rejects.toThrow('model URI');
      expect(createResource).not.toHaveBeenCalled();
    },
  );

  it('should preserve a supported connection resolution reference during a dry run', async () => {
    const wizard = form('');
    wizard.state.modelLocationData.data = {
      type: ModelLocationType.EXISTING,
      connection: 'existing-connection',
      fieldValues: {},
      additionalFields: {},
    };
    const resource = mockLLMInferenceServiceK8sResource({ modelUri: '' });
    // Shared submission deliberately removes the connection annotation for dry-run validation.
    delete resource.metadata.annotations?.[MetadataAnnotation.ConnectionName];
    await expect(
      deployLLMdDeployment(
        wizard.state,
        {},
        'test-project',
        undefined,
        resource,
        undefined,
        undefined,
        true,
      ),
    ).resolves.toBeDefined();
    expect(createResource).toHaveBeenCalledWith(
      expect.objectContaining({ queryOptions: { queryParams: { dryRun: 'All' } } }),
    );
  });

  it.each(['model', 'spec'])(
    'should reject YAML missing %s before creating supporting resources',
    async (field) => {
      const wizard = form('');
      wizard.state.huggingFaceApiKey.data = { token: 'test-only-token' };
      const resource = assembleLLMdDeployment(wizard).model;
      Reflect.deleteProperty(field === 'model' ? resource.spec : resource, field);
      await expect(
        deployLLMdDeployment(wizard.state, {}, 'test-project', undefined, resource),
      ).rejects.toThrow('model URI');
      expect(createResource).not.toHaveBeenCalled();
    },
  );

  it('should preserve an explicit connection reference on a resource submitted from YAML', async () => {
    const wizard = form('');
    const resource: LLMInferenceServiceKind = mockLLMInferenceServiceK8sResource({
      modelUri: '',
      secretName: 'existing-connection',
    });
    await expect(
      deployLLMdDeployment(wizard.state, {}, 'test-project', undefined, resource),
    ).resolves.toBeDefined();
  });

  it('should validate a separately preserved YAML connection without adding its annotation to the dry run', async () => {
    const wizard = form('');
    const resource = mockLLMInferenceServiceK8sResource({ modelUri: '' });
    delete resource.metadata.annotations?.[MetadataAnnotation.ConnectionName];

    await expect(
      deployLLMdDeployment(
        wizard.state,
        {},
        'test-project',
        undefined,
        resource,
        undefined,
        undefined,
        true,
        'yaml-connection',
      ),
    ).resolves.toBeDefined();

    expect(createResource).toHaveBeenCalledWith(
      expect.objectContaining({
        queryOptions: { queryParams: { dryRun: 'All' } },
        resource: expect.objectContaining({
          metadata: expect.objectContaining({
            annotations: expect.not.objectContaining({
              [MetadataAnnotation.ConnectionName]: expect.anything(),
            }),
          }),
        }),
      }),
    );
  });
});
