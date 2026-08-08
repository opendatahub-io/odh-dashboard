import { testHook } from '~/__tests__/unit/testUtils/hooks';
import { useIconFallback } from '~/odh/hooks/useIconFallback';

describe('useIconFallback', () => {
  it('should return the primary src when only a primary src is provided', () => {
    const renderResult = testHook(useIconFallback)('https://example.com/a.svg', undefined);
    expect(renderResult.result.current.activeSrc).toBe('https://example.com/a.svg');
  });

  it('should return undefined when neither src is provided', () => {
    const renderResult = testHook(useIconFallback)(undefined, undefined);
    expect(renderResult.result.current.activeSrc).toBeUndefined();
  });

  it('should fall back to the fallback src after the primary src errors', () => {
    const renderResult = testHook(useIconFallback)(
      'https://example.com/a.svg',
      'https://example.com/b.svg',
    );
    expect(renderResult.result.current.activeSrc).toBe('https://example.com/a.svg');

    renderResult.result.current.onError();
    renderResult.rerender('https://example.com/a.svg', 'https://example.com/b.svg');

    expect(renderResult.result.current.activeSrc).toBe('https://example.com/b.svg');
  });

  it('should return undefined once both the primary and fallback src have errored', () => {
    const renderResult = testHook(useIconFallback)(
      'https://example.com/a.svg',
      'https://example.com/b.svg',
    );

    renderResult.result.current.onError();
    renderResult.rerender('https://example.com/a.svg', 'https://example.com/b.svg');
    renderResult.result.current.onError();
    renderResult.rerender('https://example.com/a.svg', 'https://example.com/b.svg');

    expect(renderResult.result.current.activeSrc).toBeUndefined();
  });

  it('should not use the fallback src when it is identical to the primary src', () => {
    const renderResult = testHook(useIconFallback)(
      'https://example.com/a.svg',
      'https://example.com/a.svg',
    );

    renderResult.result.current.onError();
    renderResult.rerender('https://example.com/a.svg', 'https://example.com/a.svg');

    expect(renderResult.result.current.activeSrc).toBeUndefined();
  });

  it('should reset the primary-failed state when the primary src changes', () => {
    const renderResult = testHook(useIconFallback)(
      'https://example.com/a.svg',
      'https://example.com/b.svg',
    );

    renderResult.result.current.onError();
    renderResult.rerender('https://example.com/a.svg', 'https://example.com/b.svg');
    expect(renderResult.result.current.activeSrc).toBe('https://example.com/b.svg');

    renderResult.rerender('https://example.com/new.svg', 'https://example.com/b.svg');
    expect(renderResult.result.current.activeSrc).toBe('https://example.com/new.svg');
  });
});
