import { parsePipelineVersion, isVersionAtLeast } from '~/app/utilities/version';

describe('parsePipelineVersion', () => {
  it('should extract semver from pipeline version name', () => {
    expect(parsePipelineVersion('autorag-3.5.0-ea.1')).toBe('3.5.0-ea.1');
  });

  it('should extract GA version without pre-release', () => {
    expect(parsePipelineVersion('autorag-3.5.0')).toBe('3.5.0');
  });

  it('should handle version with ea.2 suffix', () => {
    expect(parsePipelineVersion('autorag-3.6.0-ea.2')).toBe('3.6.0-ea.2');
  });

  it('should return undefined for undefined input', () => {
    expect(parsePipelineVersion(undefined)).toBeUndefined();
  });

  it('should return undefined for empty string', () => {
    expect(parsePipelineVersion('')).toBeUndefined();
  });

  it('should return undefined for non-semver string', () => {
    expect(parsePipelineVersion('not-a-version')).toBeUndefined();
  });

  it('should handle version name with multiple dashes in prefix', () => {
    expect(parsePipelineVersion('my-pipeline-name-1.2.3-ea.1')).toBe('1.2.3-ea.1');
  });
});

describe('isVersionAtLeast', () => {
  it('should return true when version equals minimum', () => {
    expect(isVersionAtLeast('3.5.0', '3.5.0')).toBe(true);
  });

  it('should return true when version exceeds minimum', () => {
    expect(isVersionAtLeast('3.6.0', '3.5.0')).toBe(true);
  });

  it('should return false when version is below minimum', () => {
    expect(isVersionAtLeast('3.4.0', '3.5.0')).toBe(false);
  });

  it('should return false for pre-release below GA minimum (semver spec)', () => {
    expect(isVersionAtLeast('3.5.0-ea.1', '3.5.0')).toBe(false);
  });

  it('should return true for pre-release above prior GA', () => {
    expect(isVersionAtLeast('3.6.0-ea.1', '3.5.0')).toBe(true);
  });

  it('should compare pre-release versions correctly', () => {
    expect(isVersionAtLeast('3.5.0-ea.2', '3.5.0-ea.1')).toBe(true);
    expect(isVersionAtLeast('3.5.0-ea.1', '3.5.0-ea.2')).toBe(false);
  });

  it('should return false for undefined version', () => {
    expect(isVersionAtLeast(undefined, '3.5.0')).toBe(false);
  });
});
