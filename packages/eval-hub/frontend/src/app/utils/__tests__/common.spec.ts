import { parseS3Url } from '~/app/utils/common';

describe('parseS3Url', () => {
  it('should parse a standard s3:// URL into bucket and key', () => {
    expect(parseS3Url('s3://my-bucket/path/to/file.jsonl')).toEqual({
      bucket: 'my-bucket',
      key: 'path/to/file.jsonl',
    });
  });

  it('should parse a URL with a single-segment key', () => {
    expect(parseS3Url('s3://bucket/file.jsonl')).toEqual({
      bucket: 'bucket',
      key: 'file.jsonl',
    });
  });

  it('should parse a URL with deeply nested key', () => {
    expect(parseS3Url('s3://bucket/a/b/c/d/file.jsonl')).toEqual({
      bucket: 'bucket',
      key: 'a/b/c/d/file.jsonl',
    });
  });

  it('should return null for a non-s3 URL', () => {
    expect(parseS3Url('https://example.com/data.jsonl')).toBeNull();
  });

  it('should return null for an empty string', () => {
    expect(parseS3Url('')).toBeNull();
  });

  it('should return null for s3:// with bucket but no key', () => {
    expect(parseS3Url('s3://bucket/')).toBeNull();
  });

  it('should return null for s3:// with only bucket (no trailing slash)', () => {
    expect(parseS3Url('s3://bucket')).toBeNull();
  });

  it('should return null for malformed s3 URL without double slash', () => {
    expect(parseS3Url('s3:bucket/key')).toBeNull();
  });

  it('should handle bucket names with dots and hyphens', () => {
    expect(parseS3Url('s3://my-bucket.name.com/data/file.jsonl')).toEqual({
      bucket: 'my-bucket.name.com',
      key: 'data/file.jsonl',
    });
  });
});
