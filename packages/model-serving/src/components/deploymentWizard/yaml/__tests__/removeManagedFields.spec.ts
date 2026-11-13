import type { ModelResourceType } from '../../../../../extension-points';
import { removeManagedFields } from '../removeManagedFields';

const baseModel: ModelResourceType = {
  apiVersion: 'serving.kserve.io/v1alpha2',
  kind: 'LLMInferenceService',
  metadata: {
    name: 'test-model',
    namespace: 'test-ns',
  },
};

describe('removeManagedFields', () => {
  it('should remove managedFields and preserve other metadata', () => {
    const model: ModelResourceType = {
      ...baseModel,
      metadata: {
        ...baseModel.metadata,
        managedFields: [{ manager: 'kubectl' }],
      },
    };

    expect(removeManagedFields(model)).toStrictEqual(baseModel);
  });

  it('should remove an empty managedFields array', () => {
    const model: ModelResourceType = {
      ...baseModel,
      metadata: {
        ...baseModel.metadata,
        managedFields: [],
      },
    };

    expect(removeManagedFields(model)).toStrictEqual(baseModel);
  });

  it('should not mutate the original resource', () => {
    const model: ModelResourceType = {
      ...baseModel,
      metadata: {
        ...baseModel.metadata,
        managedFields: [{ manager: 'kubectl' }],
      },
    };

    removeManagedFields(model);

    expect(model.metadata.managedFields).toEqual([{ manager: 'kubectl' }]);
  });

  it('should return the original resource when managedFields is absent', () => {
    expect(removeManagedFields(baseModel)).toBe(baseModel);
  });

  it('should return undefined for an undefined resource', () => {
    expect(removeManagedFields(undefined)).toBeUndefined();
  });
});
