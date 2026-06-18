import type { InferenceServiceKind } from '@odh-dashboard/internal/k8sTypes';
import { mockInferenceServiceK8sResource } from '@odh-dashboard/internal/__mocks__/mockInferenceServiceK8sResource';
import type { ConnectionTypeConfigMapObj } from '@odh-dashboard/internal/concepts/connectionTypes/types';
import {
  isModelServingCompatible,
  ModelServingCompatibleTypes,
} from '@odh-dashboard/internal/concepts/connectionTypes/utils';
import type { ModelLocationData } from '@odh-dashboard/model-serving/types/form-data';
import type { CreateConnectionData } from '@odh-dashboard/model-serving/components/deploymentWizard/fields/CreateConnectionInputFields';
import { applyConnectionData } from '../deployUtils';

jest.mock('@odh-dashboard/internal/concepts/connectionTypes/utils', () => ({
  ...jest.requireActual('@odh-dashboard/internal/concepts/connectionTypes/utils'),
  isModelServingCompatible: jest.fn(),
}));

const mockIsModelServingCompatible = jest.mocked(isModelServingCompatible);

const mockNameDesc = (name: string): CreateConnectionData['nameDesc'] => ({
  name,
  k8sName: {
    value: name,
    state: {
      immutable: false,
      invalidLength: false,
      invalidCharacters: false,
      maxLength: 253,
      safePrefix: undefined,
      touched: true,
    },
  },
  description: '',
});

describe('applyConnectionData', () => {
  let baseInferenceService: InferenceServiceKind;
  const s3ConnectionTypeObject = [] as unknown as ConnectionTypeConfigMapObj;
  const ociConnectionTypeObject = [] as unknown as ConnectionTypeConfigMapObj;

  beforeEach(() => {
    jest.clearAllMocks();
    baseInferenceService = mockInferenceServiceK8sResource({
      name: 'test-model',
      namespace: 'test-ns',
      runtimeName: 'test-runtime',
    });
  });

  describe('S3 connection', () => {
    const s3ModelLocationData: ModelLocationData = {
      type: 'new' as ModelLocationData['type'],
      connectionTypeObject: s3ConnectionTypeObject,
      additionalFields: {
        modelPath: 'models/my-model',
      },
      fieldValues: {},
    };

    beforeEach(() => {
      mockIsModelServingCompatible.mockImplementation(
        (_input, type) => type === ModelServingCompatibleTypes.S3ObjectStorage,
      );
    });

    it('should set storage.key and storage.path and clear storageUri for S3 connection', () => {
      const createConnectionData: CreateConnectionData = {
        nameDesc: mockNameDesc('my-s3-connection'),
      };

      const result = applyConnectionData(
        baseInferenceService,
        createConnectionData,
        s3ModelLocationData,
        false,
        undefined,
      );

      const { model } = result.spec.predictor;
      // Should set storage with key and path
      expect(model?.storage).toEqual({
        key: 'my-s3-connection',
        path: 'models/my-model',
      });
      // Should clear storageUri
      expect(model?.storageUri).toBeUndefined();
      // Should set connection path annotation
      expect(result.metadata.annotations?.['opendatahub.io/connection-path']).toBe(
        'models/my-model',
      );
    });

    it('should use secretName for storage.key when provided', () => {
      const createConnectionData: CreateConnectionData = {};

      const result = applyConnectionData(
        baseInferenceService,
        createConnectionData,
        s3ModelLocationData,
        false,
        'existing-secret',
      );

      const { model } = result.spec.predictor;
      expect(model?.storage).toEqual({
        key: 'existing-secret',
        path: 'models/my-model',
      });
      expect(model?.storageUri).toBeUndefined();
    });

    it('should fall back to nameDesc.name when secretName is empty string', () => {
      const createConnectionData: CreateConnectionData = {
        nameDesc: mockNameDesc('fallback-name'),
      };

      const result = applyConnectionData(
        baseInferenceService,
        createConnectionData,
        s3ModelLocationData,
        false,
        '',
      );

      const { model } = result.spec.predictor;
      expect(model?.storage).toEqual({
        key: 'fallback-name',
        path: 'models/my-model',
      });
    });

    it('should reject model paths containing path traversal segments', () => {
      const createConnectionData: CreateConnectionData = {
        nameDesc: mockNameDesc('my-s3-connection'),
      };

      const traversalModelLocationData: ModelLocationData = {
        type: 'new' as ModelLocationData['type'],
        connectionTypeObject: s3ConnectionTypeObject,
        additionalFields: {
          modelPath: '../sensitive-data',
        },
        fieldValues: {},
      };

      expect(() =>
        applyConnectionData(
          baseInferenceService,
          createConnectionData,
          traversalModelLocationData,
          false,
          undefined,
        ),
      ).toThrow('Invalid model path: path traversal segments are not allowed');
    });

    it('should reject model paths with embedded path traversal segments', () => {
      const createConnectionData: CreateConnectionData = {
        nameDesc: mockNameDesc('my-s3-connection'),
      };

      const traversalModelLocationData: ModelLocationData = {
        type: 'new' as ModelLocationData['type'],
        connectionTypeObject: s3ConnectionTypeObject,
        additionalFields: {
          modelPath: 'models/../../other-bucket/data',
        },
        fieldValues: {},
      };

      expect(() =>
        applyConnectionData(
          baseInferenceService,
          createConnectionData,
          traversalModelLocationData,
          false,
          undefined,
        ),
      ).toThrow('Invalid model path: path traversal segments are not allowed');
    });

    it('should reject model paths containing path traversal segments in dryRun mode', () => {
      const createConnectionData: CreateConnectionData = {
        nameDesc: mockNameDesc('my-s3-connection'),
      };

      const traversalModelLocationData: ModelLocationData = {
        type: 'new' as ModelLocationData['type'],
        connectionTypeObject: s3ConnectionTypeObject,
        additionalFields: {
          modelPath: '../sensitive-data',
        },
        fieldValues: {},
      };

      expect(() =>
        applyConnectionData(
          baseInferenceService,
          createConnectionData,
          traversalModelLocationData,
          true,
          undefined,
        ),
      ).toThrow('Invalid model path: path traversal segments are not allowed');
    });

    it('should NOT set storage when dryRun is true', () => {
      const createConnectionData: CreateConnectionData = {
        nameDesc: mockNameDesc('my-s3-connection'),
      };

      const result = applyConnectionData(
        baseInferenceService,
        createConnectionData,
        s3ModelLocationData,
        true,
        undefined,
      );

      const { model } = result.spec.predictor;
      const { model: baseModel } = baseInferenceService.spec.predictor;
      // Storage should not be modified in dryRun mode
      expect(model?.storage).toEqual(baseModel?.storage);
      // connection-path annotation should still be set (not gated by dryRun)
      expect(result.metadata.annotations?.['opendatahub.io/connection-path']).toBe(
        'models/my-model',
      );
    });
  });

  describe('OCI connection', () => {
    const ociModelLocationData: ModelLocationData = {
      type: 'new' as ModelLocationData['type'],
      connectionTypeObject: ociConnectionTypeObject,
      additionalFields: {
        modelUri: 'oci://registry.example.com/my-model:latest',
      },
      fieldValues: {},
    };

    beforeEach(() => {
      mockIsModelServingCompatible.mockImplementation(
        (_input, type) => type === ModelServingCompatibleTypes.OCI,
      );
    });

    it('should set storageUri for OCI connection', () => {
      const createConnectionData: CreateConnectionData = {
        nameDesc: mockNameDesc('my-oci-connection'),
      };

      const result = applyConnectionData(
        baseInferenceService,
        createConnectionData,
        ociModelLocationData,
        false,
        undefined,
      );

      expect(result.spec.predictor.model?.storageUri).toBe(
        'oci://registry.example.com/my-model:latest',
      );
    });

    it('should NOT set storage.key or storage.path for OCI connection', () => {
      const createConnectionData: CreateConnectionData = {
        nameDesc: mockNameDesc('my-oci-connection'),
      };

      // Use a base IS without pre-existing storage
      const isWithoutStorage = structuredClone(baseInferenceService);
      if (isWithoutStorage.spec.predictor.model) {
        delete isWithoutStorage.spec.predictor.model.storage;
      }

      const result = applyConnectionData(
        isWithoutStorage,
        createConnectionData,
        ociModelLocationData,
        false,
        undefined,
      );

      const { model } = result.spec.predictor;
      // OCI should not set storage
      expect(model?.storage).toBeUndefined();
      // OCI should set storageUri
      expect(model?.storageUri).toBe('oci://registry.example.com/my-model:latest');
    });
  });

  describe('no matching connection type', () => {
    it('should delete connection-path annotation when connection type is not S3', () => {
      mockIsModelServingCompatible.mockReturnValue(false);

      const modelLocationData: ModelLocationData = {
        type: 'new' as ModelLocationData['type'],
        additionalFields: {
          modelPath: 'some/path',
        },
        fieldValues: {},
      };

      const createConnectionData: CreateConnectionData = {
        nameDesc: mockNameDesc('my-connection'),
      };

      const result = applyConnectionData(
        baseInferenceService,
        createConnectionData,
        modelLocationData,
        false,
        undefined,
      );

      expect(result.metadata.annotations?.['opendatahub.io/connection-path']).toBeUndefined();
    });
  });

  describe('input not mutated', () => {
    it('should not mutate the original inference service', () => {
      mockIsModelServingCompatible.mockImplementation(
        (_input, type) => type === ModelServingCompatibleTypes.S3ObjectStorage,
      );

      const original = structuredClone(baseInferenceService);
      const modelLocationData: ModelLocationData = {
        type: 'new' as ModelLocationData['type'],
        connectionTypeObject: s3ConnectionTypeObject,
        additionalFields: {
          modelPath: 'models/my-model',
        },
        fieldValues: {},
      };

      applyConnectionData(
        baseInferenceService,
        { nameDesc: mockNameDesc('conn') },
        modelLocationData,
        false,
        undefined,
      );

      expect(baseInferenceService).toEqual(original);
    });
  });
});
