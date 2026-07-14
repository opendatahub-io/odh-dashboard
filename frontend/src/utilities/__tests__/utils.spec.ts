import { safeExecute } from '#~/utilities/utils';

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
