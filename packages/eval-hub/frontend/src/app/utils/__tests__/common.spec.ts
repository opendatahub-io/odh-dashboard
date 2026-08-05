import { parseS3Url } from '~/app/utils/common';

describe('parseS3Url', () => {
  it('should parse a standard s3 URL into bucket and key', () => {
    expect(parseS3Url('s3://my-bucket/data.jsonl')).toEqual({
      bucket: 'my-bucket',
      key: 'data.jsonl',
    });
  });

  it('should handle nested paths', () => {
    expect(parseS3Url('s3://my-bucket/path/to/data.jsonl')).toEqual({
      bucket: 'my-bucket',
      key: 'path/to/data.jsonl',
    });
  });

  it('should return empty bucket for non-s3 URLs', () => {
    expect(parseS3Url('https://example.com/data.jsonl')).toEqual({
      bucket: '',
      key: 'https://example.com/data.jsonl',
    });
  });

  it('should return empty bucket for plain strings', () => {
    expect(parseS3Url('some-random-string')).toEqual({
      bucket: '',
      key: 'some-random-string',
    });
  });

  it('should return empty bucket when s3 URL has no key path', () => {
    expect(parseS3Url('s3://my-bucket')).toEqual({
      bucket: '',
      key: 's3://my-bucket',
    });
  });

  it('should return empty bucket for s3 URL with trailing slash only', () => {
    expect(parseS3Url('s3://my-bucket/')).toEqual({
      bucket: '',
      key: 's3://my-bucket/',
    });
  });
});
