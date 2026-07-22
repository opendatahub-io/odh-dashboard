import { extractRunIdFromUri } from '#~/pages/pipelines/global/experiments/artifacts/utils';

describe('extractRunIdFromUri', () => {
  const validRunId = 'a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d';

  it('should extract run ID from standard KFP artifact URI', () => {
    const uri = `s3://bucket/my-pipeline/${validRunId}/task-name/artifact.txt`;
    expect(extractRunIdFromUri(uri)).toBe(validRunId);
  });

  it('should extract run ID when pipeline name contains UUID', () => {
    const pipelineUuid = '11111111-2222-3333-4444-555555555555';
    const runUuid = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';
    const uri = `s3://bucket/pipeline-${pipelineUuid}/${runUuid}/task/artifact`;

    // Should extract from segment 2 (run position), not segment 1 (pipeline name)
    expect(extractRunIdFromUri(uri)).toBe(runUuid);
  });

  it('should return undefined for empty URI', () => {
    expect(extractRunIdFromUri('')).toBeUndefined();
  });

  it('should return undefined for URI without protocol', () => {
    expect(extractRunIdFromUri('bucket/pipeline/run/task')).toBeUndefined();
  });

  it('should return undefined for malformed protocol (no path after ://)', () => {
    expect(extractRunIdFromUri('s3://')).toBeUndefined();
  });

  it('should return undefined for URI with too few segments', () => {
    const uri = 's3://bucket/pipeline';
    expect(extractRunIdFromUri(uri)).toBeUndefined();
  });

  it('should return undefined when run ID segment is not a valid UUID', () => {
    const uri = 's3://bucket/pipeline/not-a-uuid/task/artifact';
    expect(extractRunIdFromUri(uri)).toBeUndefined();
  });

  it('should handle URIs with trailing slashes', () => {
    const uri = `s3://bucket/pipeline/${validRunId}/task/artifact/`;
    expect(extractRunIdFromUri(uri)).toBe(validRunId);
  });

  it('should handle different protocols', () => {
    const uri = `gs://bucket/pipeline/${validRunId}/task/artifact`;
    expect(extractRunIdFromUri(uri)).toBe(validRunId);
  });

  it('should validate UUID format (lowercase)', () => {
    const lowercaseUuid = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';
    const uri = `s3://bucket/pipeline/${lowercaseUuid}/task/artifact`;
    expect(extractRunIdFromUri(uri)).toBe(lowercaseUuid);
  });

  it('should validate UUID format (uppercase)', () => {
    const uppercaseUuid = 'AAAAAAAA-BBBB-CCCC-DDDD-EEEEEEEEEEEE';
    const uri = `s3://bucket/pipeline/${uppercaseUuid}/task/artifact`;
    expect(extractRunIdFromUri(uri)).toBe(uppercaseUuid);
  });

  it('should return undefined for malformed UUID (wrong segment count)', () => {
    const malformedUuid = 'a1b2c3d4-e5f6-4a5b-8c9d'; // Missing last segment
    const uri = `s3://bucket/pipeline/${malformedUuid}/task/artifact`;
    expect(extractRunIdFromUri(uri)).toBeUndefined();
  });

  it('should return undefined for malformed UUID (wrong character count)', () => {
    const malformedUuid = 'a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5'; // Last segment too short
    const uri = `s3://bucket/pipeline/${malformedUuid}/task/artifact`;
    expect(extractRunIdFromUri(uri)).toBeUndefined();
  });
});
