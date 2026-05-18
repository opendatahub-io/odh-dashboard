import { normalizeVersion, getImageRepository } from '../utils';

describe('normalizeVersion', () => {
  it('should pad single number to three parts', () => {
    expect(normalizeVersion('1')).toBe('1.0.0');
  });

  it('should pad two-part version to three parts', () => {
    expect(normalizeVersion('1.2')).toBe('1.2.0');
  });

  it('should leave three-part version unchanged', () => {
    expect(normalizeVersion('1.2.3')).toBe('1.2.3');
  });

  it('should leave versions with more than three parts unchanged', () => {
    expect(normalizeVersion('1.2.3.4')).toBe('1.2.3.4');
  });

  it('should return non-numeric tags unchanged', () => {
    expect(normalizeVersion('latest')).toBe('latest');
  });

  it('should return tags with mixed content unchanged', () => {
    expect(normalizeVersion('v1.0.0')).toBe('v1.0.0');
  });
});

describe('getImageRepository', () => {
  it('should construct repository from namespace and model name', () => {
    expect(getImageRepository('nim/test', 'my-model')).toBe('nvcr.io/nim/test/my-model');
  });
});
