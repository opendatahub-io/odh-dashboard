import { MetadataAnnotation } from '@odh-dashboard/k8s-core';
import { ModelLocationType } from '@odh-dashboard/model-serving/shared/types/form-data';
import {
  mockConnectionTypeConfigMapObj,
  mockModelServingFields,
  mockOciConnectionType,
} from '@odh-dashboard/k8s-core/__mocks__/mockConnectionType';

import { mockLLMInferenceServiceK8sResource } from '../../__mocks__/mockLLMInferenceServiceK8sResource';
import {
  applyDefaultScheduler,
  applyK8sNameAndNamespace,
  applyModelLocation,
  extractModelLocationData,
} from '../model';
import { validateExtraction } from '../validateExtraction';

describe('extractModelLocationData', () => {
  it('should leave a model location inherited from a config in YAML', () => {
    const model = mockLLMInferenceServiceK8sResource({});
    delete model.spec.model;
    model.spec.baseRefs = [{ name: 'model-location-preset' }];

    expect(extractModelLocationData({ model }).fieldValues.URI).toBeUndefined();
    expect(validateExtraction({ model, modelServingPlatformId: 'llmd-serving' })).toContain(
      'No connection could be resolved for this deployment.',
    );
  });
});

describe('applyDefaultScheduler', () => {
  it('should preserve a configured scheduler when llm-d is selected', () => {
    const scheduler = {
      config: {
        ref: {
          name: 'llm-scheduler-config',
          key: 'default-scheduler',
        },
      },
      template: {
        containers: [{ name: 'main', args: ['--grpc-port', '9002'] }],
      },
    };
    const service = mockLLMInferenceServiceK8sResource({ isLLMd: false });
    service.spec.router = { ...service.spec.router, scheduler };

    const result = applyDefaultScheduler(service, true);

    expect(result.spec.router?.scheduler).toEqual(scheduler);
  });

  it('should add an empty scheduler when llm-d is selected and none exists', () => {
    const service = mockLLMInferenceServiceK8sResource({ isLLMd: false });

    const result = applyDefaultScheduler(service, true);

    expect(result.spec.router?.scheduler).toEqual({});
  });

  it('should remove the scheduler when simple vLLM is selected', () => {
    const service = mockLLMInferenceServiceK8sResource({});

    const result = applyDefaultScheduler(service, false);

    expect(result.spec.router?.scheduler).toBeUndefined();
  });

  it('should remove the scheduler when no deployment method is selected', () => {
    const service = mockLLMInferenceServiceK8sResource({});

    const result = applyDefaultScheduler(service);

    expect(result.spec.router?.scheduler).toBeUndefined();
  });

  it('should not add a router when simple vLLM is selected', () => {
    const service = mockLLMInferenceServiceK8sResource({});
    delete service.spec.router;

    const result = applyDefaultScheduler(service, false);

    expect(result.spec.router).toBeUndefined();
  });
});

describe('applyK8sNameAndNamespace', () => {
  it('should keep the name and namespace of a resource that already exists', () => {
    const service = mockLLMInferenceServiceK8sResource({ name: 'existing', modelName: 'existing' });

    const result = applyK8sNameAndNamespace(service, 'renamed', 'other-project');

    expect(result.metadata.name).toBe('existing');
    expect(result.metadata.namespace).toBe('test-project');
    expect(result.spec.model?.name).toBe('existing');
  });

  it('should apply the name and namespace to a resource that does not exist yet', () => {
    const service = mockLLMInferenceServiceK8sResource({
      name: 'from-yaml',
      modelName: 'from-yaml',
      isExistingResource: false,
    });

    const result = applyK8sNameAndNamespace(service, 'renamed', 'other-project');

    expect(result.metadata.name).toBe('renamed');
    expect(result.metadata.namespace).toBe('other-project');
    // The served model name followed the resource name, so it follows the rename
    expect(result.spec.model?.name).toBe('renamed');
  });

  it('should keep a served model name that was set apart from the resource name', () => {
    const service = mockLLMInferenceServiceK8sResource({
      name: 'from-yaml',
      modelName: 'facebook/opt-125m',
      isExistingResource: false,
    });

    const result = applyK8sNameAndNamespace(service, 'renamed', 'test-project');

    expect(result.metadata.name).toBe('renamed');
    expect(result.spec.model?.name).toBe('facebook/opt-125m');
  });

  it('should rename a resource whose model is inherited from a config', () => {
    const service = mockLLMInferenceServiceK8sResource({
      name: 'from-yaml',
      isExistingResource: false,
    });
    service.spec = { baseRefs: [{ name: 'model-location-preset' }] };

    const result = applyK8sNameAndNamespace(service, 'renamed', 'other-project');

    expect(result.metadata.name).toBe('renamed');
    expect(result.metadata.namespace).toBe('other-project');
    expect(result.spec).toEqual({ baseRefs: [{ name: 'model-location-preset' }] });
  });
});

describe('applyModelLocation', () => {
  it.each(['hf://org/model', 'https://example.com/model', 'pvc://models/weights'])(
    'should include the entered URI in the resource: %s',
    (uri) => {
      const service = mockLLMInferenceServiceK8sResource({ modelUri: '' });
      const result = applyModelLocation(service, {
        type: uri.startsWith('pvc:') ? ModelLocationType.PVC : ModelLocationType.NEW,
        fieldValues: { URI: uri },
        additionalFields: {},
      });
      expect(result.spec.model?.uri).toBe(uri);
      expect(service.spec.model?.uri).toBe('');
    },
  );

  it('should clear the previous URI when the entered URI is cleared', () => {
    const service = mockLLMInferenceServiceK8sResource({ modelUri: 'hf://org/old-model' });
    const result = applyModelLocation(service, {
      type: ModelLocationType.NEW,
      fieldValues: { URI: '' },
      additionalFields: {},
    });
    expect(result.spec.model?.uri).toBe('');
  });

  it('should retain connection-based resolution when selecting an existing connection', () => {
    const service = mockLLMInferenceServiceK8sResource({ modelUri: '' });
    const result = applyModelLocation(
      service,
      {
        type: ModelLocationType.EXISTING,
        connection: 'existing-connection',
        fieldValues: {},
        additionalFields: {},
      },
      'existing-connection',
    );
    expect(result.metadata.annotations?.[MetadataAnnotation.ConnectionName]).toBe(
      'existing-connection',
    );
    expect(result.spec.model?.uri).toBe('');
  });

  it.each([false, true])('should apply a URI-compatible connection field (dryRun=%s)', (dryRun) => {
    const result = applyModelLocation(
      mockLLMInferenceServiceK8sResource({ modelUri: '' }),
      {
        type: ModelLocationType.NEW,
        connectionTypeObject: mockConnectionTypeConfigMapObj({
          fields: [{ type: 'uri', name: 'URI', envVar: 'URI', required: true, properties: {} }],
        }),
        fieldValues: { URI: '  hf://org/model  ' },
        additionalFields: {},
      },
      'new-connection',
      undefined,
      dryRun,
    );
    expect(result.spec.model?.uri).toBe('hf://org/model');
    expect(result.metadata.annotations?.[MetadataAnnotation.ConnectionName]).toBe(
      dryRun ? undefined : 'new-connection',
    );
  });

  it('should remove a stale connection reference when changing to a PVC', () => {
    const result = applyModelLocation(
      mockLLMInferenceServiceK8sResource({ secretName: 'old-connection' }),
      {
        type: ModelLocationType.PVC,
        fieldValues: { URI: 'pvc://models/weights' },
        additionalFields: {},
      },
      'old-connection',
    );
    expect(result.spec.model?.uri).toBe('pvc://models/weights');
    expect(result.metadata.annotations?.[MetadataAnnotation.ConnectionName]).toBeUndefined();
  });

  it('should retain the S3 path annotation and connection resolution', () => {
    const result = applyModelLocation(
      mockLLMInferenceServiceK8sResource({ modelUri: '' }),
      {
        type: ModelLocationType.EXISTING,
        connectionTypeObject: mockConnectionTypeConfigMapObj({ fields: mockModelServingFields }),
        fieldValues: {},
        additionalFields: { modelPath: 'models/weights' },
      },
      's3-connection',
    );
    expect(result.spec.model?.uri).toBe('');
    expect(result.metadata.annotations).toEqual(
      expect.objectContaining({
        [MetadataAnnotation.ConnectionName]: 's3-connection',
        'opendatahub.io/connection-path': 'models/weights',
      }),
    );
  });

  it('should preserve the OCI model URI field', () => {
    const result = applyModelLocation(mockLLMInferenceServiceK8sResource({ modelUri: '' }), {
      type: ModelLocationType.NEW,
      connectionTypeObject: mockOciConnectionType(),
      fieldValues: {},
      additionalFields: { modelUri: 'oci://registry.example.com/model:v1' },
    });
    expect(result.spec.model?.uri).toBe('oci://registry.example.com/model:v1');
  });
});
