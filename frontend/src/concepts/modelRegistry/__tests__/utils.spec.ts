import { mockModelVersion } from '#~/__mocks__/mockModelVersion';
import { mockRegisteredModel } from '#~/__mocks__/mockRegisteredModel';
import {
  filterArchiveModels,
  filterArchiveVersions,
  filterLiveModels,
  filterLiveVersions,
  getLastCreatedItem,
  objectStorageFieldsToUri,
  uriToConnectionTypeName,
  uriToModelLocation,
  modelSourcePropertiesToCatalogParams,
  catalogParamsToModelSourceProperties,
  modelSourcePropertiesToPipelineRunRef,
} from '#~/concepts/modelRegistry/utils';
import {
  RegisteredModel,
  ModelState,
  ModelVersion,
  ModelSourceKind,
} from '#~/concepts/modelRegistry/types';

describe('objectStorageFieldsToUri', () => {
  it('converts fields to URI with all fields present', () => {
    const uri = objectStorageFieldsToUri({
      endpoint: 'http://s3.amazonaws.com/',
      bucket: 'test-bucket',
      region: 'us-east-1',
      path: 'demo-models/flan-t5-small-caikit',
    });
    expect(uri).toEqual(
      's3://test-bucket/demo-models/flan-t5-small-caikit?endpoint=http%3A%2F%2Fs3.amazonaws.com%2F&defaultRegion=us-east-1',
    );
  });

  it('converts fields to URI with region missing', () => {
    const uri = objectStorageFieldsToUri({
      endpoint: 'http://s3.amazonaws.com/',
      bucket: 'test-bucket',
      path: 'demo-models/flan-t5-small-caikit',
    });
    expect(uri).toEqual(
      's3://test-bucket/demo-models/flan-t5-small-caikit?endpoint=http%3A%2F%2Fs3.amazonaws.com%2F',
    );
  });

  it('converts fields to URI with region empty', () => {
    const uri = objectStorageFieldsToUri({
      endpoint: 'http://s3.amazonaws.com/',
      bucket: 'test-bucket',
      region: '',
      path: 'demo-models/flan-t5-small-caikit',
    });
    expect(uri).toEqual(
      's3://test-bucket/demo-models/flan-t5-small-caikit?endpoint=http%3A%2F%2Fs3.amazonaws.com%2F',
    );
  });

  it('falls back to null if endpoint is empty', () => {
    const uri = objectStorageFieldsToUri({
      endpoint: '',
      bucket: 'test-bucket',
      region: 'us-east-1',
      path: 'demo-models/flan-t5-small-caikit',
    });
    expect(uri).toEqual(null);
  });

  it('falls back to null if bucket is empty', () => {
    const uri = objectStorageFieldsToUri({
      endpoint: 'http://s3.amazonaws.com/',
      bucket: '',
      region: 'us-east-1',
      path: 'demo-models/flan-t5-small-caikit',
    });
    expect(uri).toEqual(null);
  });

  it('falls back to null if path is empty', () => {
    const uri = objectStorageFieldsToUri({
      endpoint: 'http://s3.amazonaws.com/',
      bucket: 'test-bucket',
      region: 'us-east-1',
      path: '',
    });
    expect(uri).toEqual(null);
  });
});

describe('uriToModelLocation', () => {
  it('converts URI to fields with all params present', () => {
    const fields = uriToModelLocation(
      's3://test-bucket/demo-models/flan-t5-small-caikit?endpoint=http%3A%2F%2Fs3.amazonaws.com%2F&defaultRegion=us-east-1',
    );
    expect(fields).toEqual({
      s3Fields: {
        endpoint: 'http://s3.amazonaws.com/',
        bucket: 'test-bucket',
        region: 'us-east-1',
        path: 'demo-models/flan-t5-small-caikit',
      },
      uri: null,
      ociUri: null,
    });
  });

  it('converts URI to fields with region missing', () => {
    const fields = uriToModelLocation(
      's3://test-bucket/demo-models/flan-t5-small-caikit?endpoint=http%3A%2F%2Fs3.amazonaws.com%2F',
    );
    expect(fields).toEqual({
      s3Fields: {
        endpoint: 'http://s3.amazonaws.com/',
        bucket: 'test-bucket',
        path: 'demo-models/flan-t5-small-caikit',
        region: undefined,
      },
      uri: null,
      ociUri: null,
    });
  });

  it('falls back to null if endpoint is missing', () => {
    const fields = uriToModelLocation('s3://test-bucket/demo-models/flan-t5-small-caikit');
    expect(fields).toBeNull();
  });

  it('falls back to null if path is missing', () => {
    const fields = uriToModelLocation(
      's3://test-bucket/?endpoint=http%3A%2F%2Fs3.amazonaws.com%2F&defaultRegion=us-east-1',
    );
    expect(fields).toBeNull();
  });

  it('falls back to null if bucket is missing', () => {
    const fields = uriToModelLocation(
      's3://?endpoint=http%3A%2F%2Fs3.amazonaws.com%2F&defaultRegion=us-east-1',
    );
    expect(fields).toBeNull();
  });

  it('falls back to null if the URI is malformed', () => {
    const fields = uriToModelLocation('test-bucket/demo-models/flan-t5-small-caikit');
    expect(fields).toBeNull();
  });
  it('returns the same URI', () => {
    const fields = uriToModelLocation('https://model-repository/folder.zip');
    expect(fields).toEqual({
      s3Fields: null,
      uri: 'https://model-repository/folder.zip',
      ociUri: null,
    });
  });
  it('returns ociUri in case URI is OCI', () => {
    const fields = uriToModelLocation('oci://quay.io/test');
    expect(fields).toEqual({
      s3Fields: null,
      uri: null,
      ociUri: 'oci://quay.io/test',
    });
  });
});

describe('uriToConnectionTypeName', () => {
  it('returns the correct value for URI models', () => {
    const uri = 'https://model-repository/folder.zip';
    expect(uriToConnectionTypeName(uri)).toEqual('uri-v1');
  });

  it('returns the correct value for S3 models', () => {
    const uri =
      's3://test-bucket/demo-models/flan-t5-small-caikit?endpoint=http%3A%2F%2Fs3.amazonaws.com%2F&defaultRegion=us-east-1';
    expect(uriToConnectionTypeName(uri)).toEqual('s3');
  });

  it('returns the correct value for OCI models', () => {
    const uri = 'oci://quay.io/test';
    expect(uriToConnectionTypeName(uri)).toEqual('oci-v1');
  });

  it('falls back to URI connection type if the format is unknown/malformed', () => {
    const uri = 'test-bucket/demo-models/flan-t5-small-caikit';
    expect(uriToConnectionTypeName(uri)).toEqual('uri-v1');
  });

  it('falls back to URI connection type if the input is undefined', () => {
    expect(uriToConnectionTypeName(undefined)).toEqual('uri-v1');
  });
});

describe('getLastCreatedItem', () => {
  it('returns the latest item correctly', () => {
    const items = [
      {
        foo: 'a',
        createTimeSinceEpoch: '1712234877179', // Apr 04 2024
      },
      {
        foo: 'b',
        createTimeSinceEpoch: '1723659611927', // Aug 14 2024
      },
    ];
    expect(getLastCreatedItem(items)).toBe(items[1]);
  });

  it('returns first item if items have no createTimeSinceEpoch', () => {
    const items = [
      { foo: 'a', createTimeSinceEpoch: undefined },
      { foo: 'b', createTimeSinceEpoch: undefined },
    ];
    expect(getLastCreatedItem(items)).toBe(items[0]);
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

describe('modelSourcePropertiesToCatalogParams', () => {
  it('should convert valid catalog source properties', () => {
    const properties = {
      modelSourceKind: ModelSourceKind.CATALOG,
      modelSourceClass: 'class1',
      modelSourceGroup: 'group1',
      modelSourceName: 'name1',
      modelSourceId: 'id1',
    };
    expect(modelSourcePropertiesToCatalogParams(properties)).toEqual({
      sourceName: 'class1',
      repositoryName: 'group1',
      modelName: 'name1',
      tag: 'id1',
    });
  });

  it('should return null for non-catalog source', () => {
    const properties = {
      modelSourceKind: ModelSourceKind.KFP,
      modelSourceClass: 'class1',
      modelSourceGroup: 'group1',
      modelSourceName: 'name1',
      modelSourceId: 'id1',
    };
    expect(modelSourcePropertiesToCatalogParams(properties)).toBeNull();
  });

  it('should return null if required properties are missing', () => {
    const properties = {
      modelSourceKind: ModelSourceKind.CATALOG,
      modelSourceClass: 'class1',
      // missing modelSourceGroup
      modelSourceName: 'name1',
      modelSourceId: 'id1',
    };
    expect(modelSourcePropertiesToCatalogParams(properties)).toBeNull();
  });
});

describe('catalogParamsToModelSourceProperties', () => {
  it('should convert catalog params to source properties', () => {
    const params = {
      sourceName: 'class1',
      repositoryName: 'group1',
      modelName: 'name1',
      tag: 'id1',
    };
    expect(catalogParamsToModelSourceProperties(params)).toEqual({
      modelSourceKind: ModelSourceKind.CATALOG,
      modelSourceClass: 'class1',
      modelSourceGroup: 'group1',
      modelSourceName: 'name1',
      modelSourceId: 'id1',
    });
  });
});

describe('modelSourcePropertiesToPipelineRunRef', () => {
  it('should convert valid KFP source properties', () => {
    const properties = {
      modelSourceKind: ModelSourceKind.KFP,
      modelSourceGroup: 'project1',
      modelSourceId: 'run1',
      modelSourceName: 'name1',
    };
    expect(modelSourcePropertiesToPipelineRunRef(properties)).toEqual({
      project: 'project1',
      runId: 'run1',
      runName: 'name1',
    });
  });

  it('should return null for non-KFP source', () => {
    const properties = {
      modelSourceKind: ModelSourceKind.CATALOG,
      modelSourceGroup: 'project1',
      modelSourceId: 'run1',
      modelSourceName: 'name1',
    };
    expect(modelSourcePropertiesToPipelineRunRef(properties)).toBeNull();
  });

  it('should return null if required properties are missing', () => {
    const properties = {
      modelSourceKind: ModelSourceKind.KFP,
      modelSourceGroup: 'project1',
      // missing modelSourceId
      modelSourceName: 'name1',
    };
    expect(modelSourcePropertiesToPipelineRunRef(properties)).toBeNull();
  });
});
