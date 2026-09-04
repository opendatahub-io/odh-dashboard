import { safeExecute, isValidUrl, isValidHttpUrl } from '#~/utilities/utils';

describe('safeExecute', () => {
  it('should return function result when successful', () => {
    const result = safeExecute('test', 'test-link', () => 'success', 'default');
    expect(result).toBe('success');
  });

  it('should return default value when function throws', () => {
    const result = safeExecute(
      'test',
      'test-link',
      () => {
        throw new Error('test error');
      },
      'default',
    );
    expect(result).toBe('default');
  });

  it('should log error when function throws', () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

    safeExecute(
      'test explanation',
      'test-link',
      () => {
        throw new Error('test error');
      },
      'default',
    );

    expect(consoleSpy).toHaveBeenCalledWith(
      'Development safety wrapper used: test explanation tracking removal in test-link',
      expect.any(Error),
    );

    consoleSpy.mockRestore();
  });
});

describe('isValidUrl', () => {
  it('should return true for a valid http URL', () => {
    expect(isValidUrl('http://example.com')).toBe(true);
  });

  it('should return true for a valid https URL', () => {
    expect(isValidUrl('https://example.com/path?query=1')).toBe(true);
  });

  it('should return true for a valid non-http protocol URL', () => {
    expect(isValidUrl('ftp://example.com/file.txt')).toBe(true);
  });

  it('should return true for an empty string', () => {
    expect(isValidUrl('')).toBe(true);
  });

  it('should return true for undefined', () => {
    expect(isValidUrl(undefined)).toBe(true);
  });

  it('should return false for a malformed URL', () => {
    expect(isValidUrl('not-a-url')).toBe(false);
  });

  it('should return false for a URL missing a scheme', () => {
    expect(isValidUrl('example.com/pipeline.yaml')).toBe(false);
  });
});

describe('isValidHttpUrl', () => {
  it('should return true for a valid http URL', () => {
    expect(isValidHttpUrl('http://example.com')).toBe(true);
  });

  it('should return true for a valid https URL', () => {
    expect(isValidHttpUrl('https://example.com/path?query=1')).toBe(true);
  });

  it('should return false for a non-http(s) protocol', () => {
    expect(isValidHttpUrl('ftp://example.com/file.txt')).toBe(false);
  });

  it('should return true for an empty string', () => {
    expect(isValidHttpUrl('')).toBe(true);
  });

  it('should return true for undefined', () => {
    expect(isValidHttpUrl(undefined)).toBe(true);
  });

  it('should return false for a malformed URL', () => {
    expect(isValidHttpUrl('not-a-url')).toBe(false);
  });

  it('should return false for a URL missing a scheme', () => {
    expect(isValidHttpUrl('example.com/pipeline.yaml')).toBe(false);
  });
});
