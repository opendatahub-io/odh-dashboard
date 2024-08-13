import {
  extractS3UriComponents,
  getArtifactUrlFromUri,
} from '~/concepts/pipelines/content/artifacts/utils';

describe('getArtifactUrlFromUri', () => {
  it('should return the uri as is if it starts with http://', () => {
    const uri = 'http://example.com/artifact';
    const namespace = 'test-namespace';
    expect(getArtifactUrlFromUri(uri, namespace)).toBe(uri);
  });

  it('should return the uri as is if it starts with https://', () => {
    const uri = 'https://example.com/artifact';
    const namespace = 'test-namespace';
    expect(getArtifactUrlFromUri(uri, namespace)).toBe(uri);
  });

  it('should return undefined if the uri is not supported', () => {
    const uri = 'ftp://example.com/artifact';
    const namespace = 'test-namespace';
    expect(getArtifactUrlFromUri(uri, namespace)).toBeUndefined();
  });

  it('should return the backend URL for S3 uri', () => {
    const uri = 's3://my-bucket/my-artifact';
    const namespace = 'test-namespace';
    const expectedUrl = '/api/storage/test-namespace?key=my-artifact';
    expect(getArtifactUrlFromUri(uri, namespace)).toBe(expectedUrl);
  });
});

describe('extractS3UriComponents', () => {
  it('should return undefined for non-S3 URIs', () => {
    const uri = 'https://example.com';
    expect(extractS3UriComponents(uri)).toBeUndefined();
  });

  it('should return undefined for URIs without the S3 prefix', () => {
    const uri = 'my-bucket/my-object';
    expect(extractS3UriComponents(uri)).toBeUndefined();
  });

  it('should return the bucket and path components for valid S3 URIs', () => {
    const uri = 's3://my-bucket/my-object';
    const expectedComponents = { bucket: 'my-bucket', path: 'my-object' };
    expect(extractS3UriComponents(uri)).toEqual(expectedComponents);
  });

  it('should handle URIs with special characters in the path', () => {
    const uri = 's3://my-bucket/my%20object';
    const expectedComponents = { bucket: 'my-bucket', path: 'my%20object' };
    expect(extractS3UriComponents(uri)).toEqual(expectedComponents);
  });
});
