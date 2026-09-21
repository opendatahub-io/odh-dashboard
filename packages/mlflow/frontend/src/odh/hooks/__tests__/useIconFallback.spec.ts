import { act } from 'react';
import { testHook } from '~/__tests__/unit/testUtils/hooks';
import { useIconFallback } from '~/odh/hooks/useIconFallback';

describe('useIconFallback', () => {
  it('should return the primary src when only a primary src is provided', () => {
    const renderResult = testHook(useIconFallback)('https://example.com/a.svg', undefined);

    expect(renderResult).hookToStrictEqual({
      activeSrc: 'https://example.com/a.svg',
      onError: expect.any(Function),
    });
    expect(renderResult).hookToHaveUpdateCount(1);
  });

  it('should return undefined when neither src is provided', () => {
    const renderResult = testHook(useIconFallback)(undefined, undefined);

    expect(renderResult).hookToStrictEqual({
      activeSrc: undefined,
      onError: expect.any(Function),
    });
    expect(renderResult).hookToHaveUpdateCount(1);
  });

  it('should fall back to the fallback src after the primary src errors', () => {
    const renderResult = testHook(useIconFallback)(
      'https://example.com/a.svg',
      'https://example.com/b.svg',
    );
    expect(renderResult.result.current.activeSrc).toBe('https://example.com/a.svg');
    expect(renderResult).hookToHaveUpdateCount(1);

    act(() => {
      renderResult.result.current.onError();
    });

    expect(renderResult.result.current.activeSrc).toBe('https://example.com/b.svg');
    expect(renderResult).hookToHaveUpdateCount(2);
  });

  it('should return undefined once both the primary and fallback src have errored', () => {
    const renderResult = testHook(useIconFallback)(
      'https://example.com/a.svg',
      'https://example.com/b.svg',
    );

    act(() => {
      renderResult.result.current.onError();
    });
    act(() => {
      renderResult.result.current.onError();
    });

    expect(renderResult.result.current.activeSrc).toBeUndefined();
    expect(renderResult).hookToHaveUpdateCount(3);
  });

  it('should not use the fallback src when it is identical to the primary src', () => {
    const renderResult = testHook(useIconFallback)(
      'https://example.com/a.svg',
      'https://example.com/a.svg',
    );

    act(() => {
      renderResult.result.current.onError();
    });

    expect(renderResult.result.current.activeSrc).toBeUndefined();
    expect(renderResult).hookToHaveUpdateCount(2);
  });

  it('should reset the primary-failed state when the primary src changes', () => {
    const renderResult = testHook(useIconFallback)(
      'https://example.com/a.svg',
      'https://example.com/b.svg',
    );

    act(() => {
      renderResult.result.current.onError();
    });
    expect(renderResult.result.current.activeSrc).toBe('https://example.com/b.svg');
    expect(renderResult).hookToHaveUpdateCount(2);

    renderResult.rerender('https://example.com/new.svg', 'https://example.com/b.svg');
    expect(renderResult.result.current.activeSrc).toBe('https://example.com/new.svg');
    expect(renderResult).hookToHaveUpdateCount(4);
  });
});
