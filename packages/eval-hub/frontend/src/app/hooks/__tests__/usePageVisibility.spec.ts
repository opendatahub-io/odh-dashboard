import { act } from '@testing-library/react';
import { renderHook } from '~/__tests__/unit/testUtils/hooks';
import usePageVisibility from '~/app/hooks/usePageVisibility';

describe('usePageVisibility', () => {
  const originalHidden = Object.getOwnPropertyDescriptor(document, 'hidden');

  const setDocumentHidden = (hidden: boolean): void => {
    Object.defineProperty(document, 'hidden', { value: hidden, configurable: true });
  };

  afterEach(() => {
    if (originalHidden) {
      Object.defineProperty(document, 'hidden', originalHidden);
    } else {
      Reflect.deleteProperty(document, 'hidden');
    }
  });

  it('should return true when document is visible', () => {
    setDocumentHidden(false);
    const renderResult = renderHook(() => usePageVisibility());
    expect(renderResult.result.current).toBe(true);
  });

  it('should return false when document is hidden', () => {
    setDocumentHidden(true);
    const renderResult = renderHook(() => usePageVisibility());
    expect(renderResult.result.current).toBe(false);
  });

  it('should update when visibility changes', () => {
    setDocumentHidden(false);
    const renderResult = renderHook(() => usePageVisibility());
    expect(renderResult.result.current).toBe(true);

    act(() => {
      setDocumentHidden(true);
      document.dispatchEvent(new Event('visibilitychange'));
    });
    expect(renderResult.result.current).toBe(false);

    act(() => {
      setDocumentHidden(false);
      document.dispatchEvent(new Event('visibilitychange'));
    });
    expect(renderResult.result.current).toBe(true);
  });
});
