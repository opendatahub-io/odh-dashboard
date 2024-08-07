import {
  ObjectStorageFields,
  objectStorageFieldsToUri,
  uriToObjectStorageFields,
} from '~/concepts/modelRegistry/utils';

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

describe('uriToObjectStorageFields', () => {
  it('converts URI to fields with all params present', () => {
    const fields = uriToObjectStorageFields(
      's3://test-bucket/demo-models/flan-t5-small-caikit?endpoint=http%3A%2F%2Fs3.amazonaws.com%2F&defaultRegion=us-east-1',
    );
    expect(fields).toEqual({
      endpoint: 'http://s3.amazonaws.com/',
      bucket: 'test-bucket',
      region: 'us-east-1',
      path: 'demo-models/flan-t5-small-caikit',
    } satisfies ObjectStorageFields);
  });

  it('converts URI to fields with region missing', () => {
    const fields = uriToObjectStorageFields(
      's3://test-bucket/demo-models/flan-t5-small-caikit?endpoint=http%3A%2F%2Fs3.amazonaws.com%2F',
    );
    expect(fields).toEqual({
      endpoint: 'http://s3.amazonaws.com/',
      bucket: 'test-bucket',
      path: 'demo-models/flan-t5-small-caikit',
      region: undefined,
    } satisfies ObjectStorageFields);
  });

  it('falls back to null if endpoint is missing', () => {
    const fields = uriToObjectStorageFields('s3://test-bucket/demo-models/flan-t5-small-caikit');
    expect(fields).toBeNull();
  });

  it('falls back to null if path is missing', () => {
    const fields = uriToObjectStorageFields(
      's3://test-bucket/?endpoint=http%3A%2F%2Fs3.amazonaws.com%2F&defaultRegion=us-east-1',
    );
    expect(fields).toBeNull();
  });

  it('falls back to null if bucket is missing', () => {
    const fields = uriToObjectStorageFields(
      's3://?endpoint=http%3A%2F%2Fs3.amazonaws.com%2F&defaultRegion=us-east-1',
    );
    expect(fields).toBeNull();
  });

  it('falls back to null if the URI is malformed', () => {
    const fields = uriToObjectStorageFields('test-bucket/demo-models/flan-t5-small-caikit');
    expect(fields).toBeNull();
  });
});
