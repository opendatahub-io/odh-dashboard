import { buildS3DatasetUrl, parseS3DatasetUrl } from '~/app/utils/s3DatasetUrl';

describe('parseS3DatasetUrl', () => {
  it('should parse a well-formed s3 url into bucket and key', () => {
    expect(parseS3DatasetUrl('s3://bucket-name/path/to/data.jsonl')).toEqual({
      bucket: 'bucket-name',
      key: 'path/to/data.jsonl',
    });
  });

  it('should trim surrounding whitespace', () => {
    expect(parseS3DatasetUrl('  s3://bucket/data.jsonl  ')).toEqual({
      bucket: 'bucket',
      key: 'data.jsonl',
    });
  });

  it('should return undefined for an empty url', () => {
    expect(parseS3DatasetUrl('')).toBeUndefined();
    expect(parseS3DatasetUrl('   ')).toBeUndefined();
  });

  it('should return undefined for a non-s3 url', () => {
    expect(parseS3DatasetUrl('https://example.com/data.jsonl')).toBeUndefined();
    expect(parseS3DatasetUrl('gs://bucket/data.jsonl')).toBeUndefined();
  });

  it('should return undefined when the bucket or key is missing', () => {
    expect(parseS3DatasetUrl('s3://bucket-only')).toBeUndefined();
    expect(parseS3DatasetUrl('s3://bucket-only/')).toBeUndefined();
    expect(parseS3DatasetUrl('s3:///data.jsonl')).toBeUndefined();
  });

  it('should return undefined when the key is absolute', () => {
    expect(parseS3DatasetUrl('s3://bucket//data.jsonl')).toBeUndefined();
    expect(parseS3DatasetUrl('s3://bucket/ /data.jsonl')).toBeUndefined();
  });

  it('should return undefined when the key contains ".." path segments', () => {
    expect(parseS3DatasetUrl('s3://bucket/a/../data.jsonl')).toBeUndefined();
    expect(parseS3DatasetUrl('s3://bucket/path/..')).toBeUndefined();
    expect(parseS3DatasetUrl('s3://bucket/path\\..\\data.jsonl')).toBeUndefined();
  });

  it('should parse keys containing ".." as part of a larger segment', () => {
    expect(parseS3DatasetUrl('s3://bucket/a/..b/data.jsonl')).toEqual({
      bucket: 'bucket',
      key: 'a/..b/data.jsonl',
    });
  });
});

describe('buildS3DatasetUrl', () => {
  it('should build an s3 url from bucket and key', () => {
    expect(buildS3DatasetUrl('bucket', 'path/to/data.jsonl')).toBe(
      's3://bucket/path/to/data.jsonl',
    );
  });

  it('should strip leading slashes from the key', () => {
    expect(buildS3DatasetUrl('bucket', '/leading/slash')).toBe('s3://bucket/leading/slash');
  });

  it('should round-trip with parseS3DatasetUrl', () => {
    const location = { bucket: 'bucket-name', key: 'path/to/data.jsonl' };
    expect(parseS3DatasetUrl(buildS3DatasetUrl(location.bucket, location.key))).toEqual(location);
  });
});
