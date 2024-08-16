/* eslint-disable camelcase */
import { mockModelVersion } from '~/__mocks__/mockModelVersion';
import { mockRegisteredModel } from '~/__mocks__/mockRegisteredModel';
import {
  ModelRegistryCustomProperties,
  ModelRegistryStringCustomProperties,
  ModelRegistryMetadataType,
  RegisteredModel,
  ModelVersion,
  ModelState,
} from '~/concepts/modelRegistry/types';
import {
  filterModelVersions,
  getLabels,
  getProperties,
  mergeUpdatedProperty,
  mergeUpdatedLabels,
  getPatchBody,
  filterArchiveVersions,
  filterLiveVersions,
  filterArchiveModels,
  filterLiveModels,
  filterRegisteredModels,
} from '~/pages/modelRegistry/screens/utils';
import { SearchType } from '~/concepts/dashboard/DashboardSearchField';

describe('getLabels', () => {
  it('should return an empty array when customProperties is empty', () => {
    const customProperties: ModelRegistryCustomProperties = {};
    const result = getLabels(customProperties);
    expect(result).toEqual([]);
  });

  it('should return an array of keys with empty string values in customProperties', () => {
    const customProperties: ModelRegistryCustomProperties = {
      label1: { metadataType: ModelRegistryMetadataType.STRING, string_value: '' },
      label2: { metadataType: ModelRegistryMetadataType.STRING, string_value: 'non-empty' },
      label3: { metadataType: ModelRegistryMetadataType.STRING, string_value: '' },
    };
    const result = getLabels(customProperties);
    expect(result).toEqual(['label1', 'label3']);
  });

  it('should return an empty array when all values in customProperties are non-empty strings', () => {
    const customProperties: ModelRegistryCustomProperties = {
      label1: { metadataType: ModelRegistryMetadataType.STRING, string_value: 'non-empty' },
      label2: { metadataType: ModelRegistryMetadataType.STRING, string_value: 'another-non-empty' },
    };
    const result = getLabels(customProperties);
    expect(result).toEqual([]);
  });
});

describe('mergeUpdatedLabels', () => {
  it('should return an empty object when customProperties and updatedLabels are empty', () => {
    const customProperties: ModelRegistryCustomProperties = {};
    const result = mergeUpdatedLabels(customProperties, []);
    expect(result).toEqual({});
  });

  it('should return an unmodified object if updatedLabels match existing labels', () => {
    const customProperties: ModelRegistryCustomProperties = {
      someUnrelatedProp: { string_value: 'foo', metadataType: ModelRegistryMetadataType.STRING },
      label1: { string_value: '', metadataType: ModelRegistryMetadataType.STRING },
    };
    const result = mergeUpdatedLabels(customProperties, ['label1']);
    expect(result).toEqual(customProperties);
  });

  it('should return an object with labels added', () => {
    const customProperties: ModelRegistryCustomProperties = {};
    const result = mergeUpdatedLabels(customProperties, ['label1', 'label2']);
    expect(result).toEqual({
      label1: { string_value: '', metadataType: ModelRegistryMetadataType.STRING },
      label2: { string_value: '', metadataType: ModelRegistryMetadataType.STRING },
    } satisfies ModelRegistryCustomProperties);
  });

  it('should return an object with labels removed', () => {
    const customProperties: ModelRegistryCustomProperties = {
      label1: { string_value: '', metadataType: ModelRegistryMetadataType.STRING },
      label2: { string_value: '', metadataType: ModelRegistryMetadataType.STRING },
      label3: { string_value: '', metadataType: ModelRegistryMetadataType.STRING },
      label4: { string_value: '', metadataType: ModelRegistryMetadataType.STRING },
    };
    const result = mergeUpdatedLabels(customProperties, ['label2', 'label4']);
    expect(result).toEqual({
      label2: { string_value: '', metadataType: ModelRegistryMetadataType.STRING },
      label4: { string_value: '', metadataType: ModelRegistryMetadataType.STRING },
    } satisfies ModelRegistryCustomProperties);
  });

  it('should return an object with labels both added and removed', () => {
    const customProperties: ModelRegistryCustomProperties = {
      label1: { string_value: '', metadataType: ModelRegistryMetadataType.STRING },
      label2: { string_value: '', metadataType: ModelRegistryMetadataType.STRING },
      label3: { string_value: '', metadataType: ModelRegistryMetadataType.STRING },
    };
    const result = mergeUpdatedLabels(customProperties, ['label1', 'label3', 'label4']);
    expect(result).toEqual({
      label1: { string_value: '', metadataType: ModelRegistryMetadataType.STRING },
      label3: { string_value: '', metadataType: ModelRegistryMetadataType.STRING },
      label4: { string_value: '', metadataType: ModelRegistryMetadataType.STRING },
    } satisfies ModelRegistryCustomProperties);
  });

  it('should not affect non-label properties on the object', () => {
    const customProperties: ModelRegistryCustomProperties = {
      someUnrelatedStrProp: { string_value: 'foo', metadataType: ModelRegistryMetadataType.STRING },
      someUnrelatedIntProp: { int_value: '3', metadataType: ModelRegistryMetadataType.INT },
      label1: { string_value: '', metadataType: ModelRegistryMetadataType.STRING },
      label2: { string_value: '', metadataType: ModelRegistryMetadataType.STRING },
    };
    const result = mergeUpdatedLabels(customProperties, ['label2', 'label3']);
    expect(result).toEqual({
      someUnrelatedStrProp: { string_value: 'foo', metadataType: ModelRegistryMetadataType.STRING },
      someUnrelatedIntProp: { int_value: '3', metadataType: ModelRegistryMetadataType.INT },
      label2: { string_value: '', metadataType: ModelRegistryMetadataType.STRING },
      label3: { string_value: '', metadataType: ModelRegistryMetadataType.STRING },
    } satisfies ModelRegistryCustomProperties);
  });
});

describe('getProperties', () => {
  it('should return an empty object when customProperties is empty', () => {
    const customProperties: ModelRegistryCustomProperties = {};
    const result = getProperties(customProperties);
    expect(result).toEqual({});
  });

  it('should return a filtered object including only string properties with a non-empty value', () => {
    const customProperties: ModelRegistryCustomProperties = {
      property1: { metadataType: ModelRegistryMetadataType.STRING, string_value: 'non-empty' },
      property2: {
        metadataType: ModelRegistryMetadataType.STRING,
        string_value: 'another-non-empty',
      },
      label1: { metadataType: ModelRegistryMetadataType.STRING, string_value: '' },
      label2: { metadataType: ModelRegistryMetadataType.STRING, string_value: '' },
      int1: { metadataType: ModelRegistryMetadataType.INT, int_value: '1' },
      int2: { metadataType: ModelRegistryMetadataType.INT, int_value: '2' },
    };
    const result = getProperties(customProperties);
    expect(result).toEqual({
      property1: { metadataType: ModelRegistryMetadataType.STRING, string_value: 'non-empty' },
      property2: {
        metadataType: ModelRegistryMetadataType.STRING,
        string_value: 'another-non-empty',
      },
    } satisfies ModelRegistryStringCustomProperties);
  });

  it('should return an empty object when all values in customProperties are empty strings or non-string values', () => {
    const customProperties: ModelRegistryCustomProperties = {
      label1: { metadataType: ModelRegistryMetadataType.STRING, string_value: '' },
      label2: { metadataType: ModelRegistryMetadataType.STRING, string_value: '' },
      int1: { metadataType: ModelRegistryMetadataType.INT, int_value: '1' },
      int2: { metadataType: ModelRegistryMetadataType.INT, int_value: '2' },
    };
    const result = getProperties(customProperties);
    expect(result).toEqual({});
  });
});

describe('mergeUpdatedProperty', () => {
  it('should handle the create operation', () => {
    const customProperties: ModelRegistryCustomProperties = {
      label1: { string_value: '', metadataType: ModelRegistryMetadataType.STRING },
      prop1: { string_value: 'val1', metadataType: ModelRegistryMetadataType.STRING },
    };
    const result = mergeUpdatedProperty({
      customProperties,
      op: 'create',
      newPair: { key: 'prop2', value: 'val2' },
    });
    expect(result).toEqual({
      label1: { string_value: '', metadataType: ModelRegistryMetadataType.STRING },
      prop1: { string_value: 'val1', metadataType: ModelRegistryMetadataType.STRING },
      prop2: { string_value: 'val2', metadataType: ModelRegistryMetadataType.STRING },
    } satisfies ModelRegistryCustomProperties);
  });

  it('should handle the update operation without a key change', () => {
    const customProperties: ModelRegistryCustomProperties = {
      label1: { string_value: '', metadataType: ModelRegistryMetadataType.STRING },
      prop1: { string_value: 'val1', metadataType: ModelRegistryMetadataType.STRING },
    };
    const result = mergeUpdatedProperty({
      customProperties,
      op: 'update',
      oldKey: 'prop1',
      newPair: { key: 'prop1', value: 'updatedVal1' },
    });
    expect(result).toEqual({
      label1: { string_value: '', metadataType: ModelRegistryMetadataType.STRING },
      prop1: { string_value: 'updatedVal1', metadataType: ModelRegistryMetadataType.STRING },
    } satisfies ModelRegistryCustomProperties);
  });

  it('should handle the update operation with a key change', () => {
    const customProperties: ModelRegistryCustomProperties = {
      label1: { string_value: '', metadataType: ModelRegistryMetadataType.STRING },
      prop1: { string_value: 'val1', metadataType: ModelRegistryMetadataType.STRING },
    };
    const result = mergeUpdatedProperty({
      customProperties,
      op: 'update',
      oldKey: 'prop1',
      newPair: { key: 'prop2', value: 'val2' },
    });
    expect(result).toEqual({
      label1: { string_value: '', metadataType: ModelRegistryMetadataType.STRING },
      prop2: { string_value: 'val2', metadataType: ModelRegistryMetadataType.STRING },
    } satisfies ModelRegistryCustomProperties);
  });

  it('should perform a create if using the update operation with an invalid oldKey', () => {
    const customProperties: ModelRegistryCustomProperties = {
      label1: { string_value: '', metadataType: ModelRegistryMetadataType.STRING },
      prop1: { string_value: 'val1', metadataType: ModelRegistryMetadataType.STRING },
    };
    const result = mergeUpdatedProperty({
      customProperties,
      op: 'update',
      oldKey: 'prop2',
      newPair: { key: 'prop3', value: 'val3' },
    });
    expect(result).toEqual({
      label1: { string_value: '', metadataType: ModelRegistryMetadataType.STRING },
      prop1: { string_value: 'val1', metadataType: ModelRegistryMetadataType.STRING },
      prop3: { string_value: 'val3', metadataType: ModelRegistryMetadataType.STRING },
    } satisfies ModelRegistryCustomProperties);
  });

  it('should handle the delete operation', () => {
    const customProperties: ModelRegistryCustomProperties = {
      label1: { string_value: '', metadataType: ModelRegistryMetadataType.STRING },
      prop1: { string_value: 'val1', metadataType: ModelRegistryMetadataType.STRING },
      prop2: { string_value: 'val2', metadataType: ModelRegistryMetadataType.STRING },
    };
    const result = mergeUpdatedProperty({
      customProperties,
      op: 'delete',
      oldKey: 'prop2',
    });
    expect(result).toEqual({
      label1: { string_value: '', metadataType: ModelRegistryMetadataType.STRING },
      prop1: { string_value: 'val1', metadataType: ModelRegistryMetadataType.STRING },
    } satisfies ModelRegistryCustomProperties);
  });

  it('should do nothing if using the delete operation with an invalid oldKey', () => {
    const customProperties: ModelRegistryCustomProperties = {
      label1: { string_value: '', metadataType: ModelRegistryMetadataType.STRING },
      prop1: { string_value: 'val1', metadataType: ModelRegistryMetadataType.STRING },
    };
    const result = mergeUpdatedProperty({
      customProperties,
      op: 'delete',
      oldKey: 'prop2',
    });
    expect(result).toEqual({
      label1: { string_value: '', metadataType: ModelRegistryMetadataType.STRING },
      prop1: { string_value: 'val1', metadataType: ModelRegistryMetadataType.STRING },
    } satisfies ModelRegistryCustomProperties);
  });
});

describe('getPatchBody', () => {
  it('returns a given RegisteredModel with id/name/timestamps removed, customProperties updated and other values unchanged', () => {
    const registeredModel = mockRegisteredModel({
      id: '1',
      owner: 'Author 1',
      name: 'test-model',
      description: 'Description here',
      labels: [],
      state: ModelState.LIVE,
    });
    const result = getPatchBody(
      registeredModel,
      {
        customProperties: {
          label1: { string_value: '', metadataType: ModelRegistryMetadataType.STRING },
        },
      },
      [],
    );
    expect(result).toEqual({
      description: 'Description here',
      customProperties: {
        label1: { string_value: '', metadataType: ModelRegistryMetadataType.STRING },
      },
      owner: 'Author 1',
      state: ModelState.LIVE,
      externalID: '1234132asdfasdf',
    } satisfies Partial<RegisteredModel>);
  });

  it('returns a given ModelVersion with id/name/timestamps removed, description updated and other values unchanged', () => {
    const modelVersion = mockModelVersion({
      author: 'Test author',
      registeredModelId: '1',
    });
    const result = getPatchBody(modelVersion, { description: 'New description' }, []);
    expect(result).toEqual({
      author: 'Test author',
      registeredModelId: '1',
      description: 'New description',
      customProperties: {},
      state: ModelState.LIVE,
    } satisfies Partial<ModelVersion>);
  });

  it('excludes given additional properties', () => {
    const modelVersion = mockModelVersion({
      author: 'Test author',
      registeredModelId: '1',
    });
    const result = getPatchBody(modelVersion, { description: 'New description' }, [
      'registeredModelId',
    ]);
    expect(result).toEqual({
      author: 'Test author',
      description: 'New description',
      customProperties: {},
      state: ModelState.LIVE,
    } satisfies Partial<ModelVersion>);
  });
});

describe('filterModelVersions', () => {
  const modelVersions: ModelVersion[] = [
    mockModelVersion({ name: 'Test 1', state: ModelState.ARCHIVED }),
    mockModelVersion({
      name: 'Test 2',
      description: 'Description2',
    }),
    mockModelVersion({ name: 'Test 3', author: 'Author3', state: ModelState.ARCHIVED }),
    mockModelVersion({ name: 'Test 4', state: ModelState.ARCHIVED }),
    mockModelVersion({ name: 'Test 5' }),
  ];

  test('filters by name', () => {
    const filtered = filterModelVersions(modelVersions, 'Test 1', SearchType.KEYWORD);
    expect(filtered).toEqual([modelVersions[0]]);
  });

  test('filters by description', () => {
    const filtered = filterModelVersions(modelVersions, 'Description2', SearchType.KEYWORD);
    expect(filtered).toEqual([modelVersions[1]]);
  });

  test('filters by author', () => {
    const filtered = filterModelVersions(modelVersions, 'Author3', SearchType.AUTHOR);
    expect(filtered).toEqual([modelVersions[2]]);
  });

  test('does not filter when search is empty', () => {
    const filtered = filterModelVersions(modelVersions, '', SearchType.KEYWORD);
    expect(filtered).toEqual(modelVersions);
  });
});

describe('Filter model version state', () => {
  const modelVersions: ModelVersion[] = [
    mockModelVersion({ name: 'Test 1', state: ModelState.ARCHIVED }),
    mockModelVersion({
      name: 'Test 2',
      state: ModelState.LIVE,
      description: 'Description2',
    }),
    mockModelVersion({ name: 'Test 3', author: 'Author3', state: ModelState.ARCHIVED }),
    mockModelVersion({ name: 'Test 4', state: ModelState.ARCHIVED }),
    mockModelVersion({ name: 'Test 5', state: ModelState.LIVE }),
  ];

  describe('filterArchiveVersions', () => {
    it('should filter out only the archived versions', () => {
      const archivedVersions = filterArchiveVersions(modelVersions);
      expect(archivedVersions).toEqual([modelVersions[0], modelVersions[2], modelVersions[3]]);
    });

    it('should return an empty array if the input array is empty', () => {
      const result = filterArchiveVersions([]);
      expect(result).toEqual([]);
    });
  });

  describe('filterLiveVersions', () => {
    it('should filter out only the live versions', () => {
      const liveVersions = filterLiveVersions(modelVersions);
      expect(liveVersions).toEqual([modelVersions[1], modelVersions[4]]);
    });

    it('should return an empty array if the input array is empty', () => {
      const result = filterLiveVersions([]);
      expect(result).toEqual([]);
    });
  });
});

describe('filterRegisteredModels', () => {
  const registeredModels: RegisteredModel[] = [
    mockRegisteredModel({ name: 'Test 1', state: ModelState.ARCHIVED }),
    mockRegisteredModel({
      name: 'Test 2',
      description: 'Description2',
    }),
    mockRegisteredModel({ name: 'Test 3', state: ModelState.ARCHIVED }),
    mockRegisteredModel({ name: 'Test 4', state: ModelState.ARCHIVED }),
    mockRegisteredModel({ name: 'Test 5' }),
  ];

  test('filters by name', () => {
    const filtered = filterRegisteredModels(registeredModels, 'Test 1', SearchType.KEYWORD);
    expect(filtered).toEqual([registeredModels[0]]);
  });

  test('filters by description', () => {
    const filtered = filterRegisteredModels(registeredModels, 'Description2', SearchType.KEYWORD);
    expect(filtered).toEqual([registeredModels[1]]);
  });

  test('does not filter when search is empty', () => {
    const filtered = filterRegisteredModels(registeredModels, '', SearchType.KEYWORD);
    expect(filtered).toEqual(registeredModels);
  });
});

describe('Filter model state', () => {
  const models: RegisteredModel[] = [
    mockRegisteredModel({ name: 'Test 1', state: ModelState.ARCHIVED }),
    mockRegisteredModel({
      name: 'Test 2',
      state: ModelState.LIVE,
      description: 'Description2',
    }),
    mockRegisteredModel({ name: 'Test 3', state: ModelState.ARCHIVED }),
    mockRegisteredModel({ name: 'Test 4', state: ModelState.ARCHIVED }),
    mockRegisteredModel({ name: 'Test 5', state: ModelState.LIVE }),
  ];

  describe('filterArchiveModels', () => {
    it('should filter out only the archived versions', () => {
      const archivedModels = filterArchiveModels(models);
      expect(archivedModels).toEqual([models[0], models[2], models[3]]);
    });

    it('should return an empty array if the input array is empty', () => {
      const result = filterArchiveModels([]);
      expect(result).toEqual([]);
    });
  });

  describe('filterLiveModels', () => {
    it('should filter out only the live models', () => {
      const liveModels = filterLiveModels(models);
      expect(liveModels).toEqual([models[1], models[4]]);
    });

    it('should return an empty array if the input array is empty', () => {
      const result = filterLiveModels([]);
      expect(result).toEqual([]);
    });
  });
});
