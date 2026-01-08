import { testHook } from '@odh-dashboard/jest-config/hooks';
import { useNavigate } from 'react-router-dom';
import { act } from '@testing-library/react';
import useRelativeLinkHandler from '../useRelativeLinkHandler';

jest.mock('react-router-dom', () => ({
  useNavigate: jest.fn(),
}));

const useNavigateMock = jest.mocked(useNavigate);

describe('useRelativeLinkHandler', () => {
  let mockNavigate: jest.Mock;
  let container: HTMLDivElement;

  beforeEach(() => {
    mockNavigate = jest.fn();
    useNavigateMock.mockReturnValue(mockNavigate);

    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    document.body.removeChild(container);
    jest.clearAllMocks();
  });

  const createClickEvent = (options: Partial<MouseEventInit> = {}): MouseEvent =>
    new MouseEvent('click', {
      bubbles: true,
      cancelable: true,
      button: 0,
      ...options,
    });

  describe('hook return value', () => {
    it('should return a ref callback function', () => {
      const renderResult = testHook(useRelativeLinkHandler)();
      expect(renderResult.result.current).toBeInstanceOf(Function);
    });

    it('should return a stable ref callback across rerenders', () => {
      const renderResult = testHook(useRelativeLinkHandler)();
      const firstRef = renderResult.result.current;

      renderResult.rerender();

      expect(renderResult.result.current).toBe(firstRef);
      expect(renderResult).hookToBeStable();
    });
  });

  describe('relative link interception', () => {
    it('should intercept clicks on relative links and navigate', () => {
      const renderResult = testHook(useRelativeLinkHandler)();
      const anchor = document.createElement('a');
      anchor.href = '/dashboard/settings';
      anchor.setAttribute('href', '/dashboard/settings');
      container.appendChild(anchor);

      act(() => {
        renderResult.result.current(container);
      });

      const event = createClickEvent();
      anchor.dispatchEvent(event);

      expect(event.defaultPrevented).toBe(true);
      expect(mockNavigate).toHaveBeenCalledWith('/dashboard/settings');
    });

    it('should intercept clicks on nested elements within anchor tags', () => {
      const renderResult = testHook(useRelativeLinkHandler)();
      const anchor = document.createElement('a');
      anchor.setAttribute('href', '/nested/route');
      const span = document.createElement('span');
      span.textContent = 'Click me';
      anchor.appendChild(span);
      container.appendChild(anchor);

      act(() => {
        renderResult.result.current(container);
      });

      const event = createClickEvent();
      span.dispatchEvent(event);

      expect(event.defaultPrevented).toBe(true);
      expect(mockNavigate).toHaveBeenCalledWith('/nested/route');
    });

    it('should navigate to root path', () => {
      const renderResult = testHook(useRelativeLinkHandler)();
      const anchor = document.createElement('a');
      anchor.setAttribute('href', '/');
      container.appendChild(anchor);

      act(() => {
        renderResult.result.current(container);
      });

      const event = createClickEvent();
      anchor.dispatchEvent(event);

      expect(event.defaultPrevented).toBe(true);
      expect(mockNavigate).toHaveBeenCalledWith('/');
    });

    it('should handle paths with query parameters', () => {
      const renderResult = testHook(useRelativeLinkHandler)();
      const anchor = document.createElement('a');
      anchor.setAttribute('href', '/search?query=test&page=1');
      container.appendChild(anchor);

      act(() => {
        renderResult.result.current(container);
      });

      const event = createClickEvent();
      anchor.dispatchEvent(event);

      expect(event.defaultPrevented).toBe(true);
      expect(mockNavigate).toHaveBeenCalledWith('/search?query=test&page=1');
    });

    it('should handle paths with hash fragments', () => {
      const renderResult = testHook(useRelativeLinkHandler)();
      const anchor = document.createElement('a');
      anchor.setAttribute('href', '/docs#section-2');
      container.appendChild(anchor);

      act(() => {
        renderResult.result.current(container);
      });

      const event = createClickEvent();
      anchor.dispatchEvent(event);

      expect(event.defaultPrevented).toBe(true);
      expect(mockNavigate).toHaveBeenCalledWith('/docs#section-2');
    });
  });

  describe('non-relative links', () => {
    it('should not intercept absolute URLs with protocols', () => {
      const renderResult = testHook(useRelativeLinkHandler)();
      const anchor = document.createElement('a');
      anchor.setAttribute('href', 'https://example.com/page');
      container.appendChild(anchor);

      act(() => {
        renderResult.result.current(container);
      });

      const event = createClickEvent();
      anchor.dispatchEvent(event);

      expect(event.defaultPrevented).toBe(false);
      expect(mockNavigate).not.toHaveBeenCalled();
    });

    it('should not intercept protocol-relative URLs (//)', () => {
      const renderResult = testHook(useRelativeLinkHandler)();
      const anchor = document.createElement('a');
      anchor.setAttribute('href', '//example.com/page');
      container.appendChild(anchor);

      act(() => {
        renderResult.result.current(container);
      });

      const event = createClickEvent();
      anchor.dispatchEvent(event);

      expect(event.defaultPrevented).toBe(false);
      expect(mockNavigate).not.toHaveBeenCalled();
    });

    it('should not intercept mailto links', () => {
      const renderResult = testHook(useRelativeLinkHandler)();
      const anchor = document.createElement('a');
      anchor.setAttribute('href', 'mailto:test@example.com');
      container.appendChild(anchor);

      act(() => {
        renderResult.result.current(container);
      });

      const event = createClickEvent();
      anchor.dispatchEvent(event);

      expect(event.defaultPrevented).toBe(false);
      expect(mockNavigate).not.toHaveBeenCalled();
    });

    it('should not intercept relative paths without leading slash', () => {
      const renderResult = testHook(useRelativeLinkHandler)();
      const anchor = document.createElement('a');
      anchor.setAttribute('href', 'relative/path');
      container.appendChild(anchor);

      act(() => {
        renderResult.result.current(container);
      });

      const event = createClickEvent();
      anchor.dispatchEvent(event);

      expect(event.defaultPrevented).toBe(false);
      expect(mockNavigate).not.toHaveBeenCalled();
    });

    it('should not intercept anchors without href', () => {
      const renderResult = testHook(useRelativeLinkHandler)();
      const anchor = document.createElement('a');
      container.appendChild(anchor);

      act(() => {
        renderResult.result.current(container);
      });

      const event = createClickEvent();
      anchor.dispatchEvent(event);

      expect(event.defaultPrevented).toBe(false);
      expect(mockNavigate).not.toHaveBeenCalled();
    });

    it('should not intercept empty href', () => {
      const renderResult = testHook(useRelativeLinkHandler)();
      const anchor = document.createElement('a');
      anchor.setAttribute('href', '');
      container.appendChild(anchor);

      act(() => {
        renderResult.result.current(container);
      });

      const event = createClickEvent();
      anchor.dispatchEvent(event);

      expect(event.defaultPrevented).toBe(false);
      expect(mockNavigate).not.toHaveBeenCalled();
    });
  });

  describe('modifier keys', () => {
    it('should not intercept clicks with metaKey (Cmd on Mac)', () => {
      const renderResult = testHook(useRelativeLinkHandler)();
      const anchor = document.createElement('a');
      anchor.setAttribute('href', '/dashboard');
      container.appendChild(anchor);

      act(() => {
        renderResult.result.current(container);
      });

      const event = createClickEvent({ metaKey: true });
      anchor.dispatchEvent(event);

      expect(event.defaultPrevented).toBe(false);
      expect(mockNavigate).not.toHaveBeenCalled();
    });

    it('should not intercept clicks with ctrlKey', () => {
      const renderResult = testHook(useRelativeLinkHandler)();
      const anchor = document.createElement('a');
      anchor.setAttribute('href', '/dashboard');
      container.appendChild(anchor);

      act(() => {
        renderResult.result.current(container);
      });

      const event = createClickEvent({ ctrlKey: true });
      anchor.dispatchEvent(event);

      expect(event.defaultPrevented).toBe(false);
      expect(mockNavigate).not.toHaveBeenCalled();
    });

    it('should not intercept clicks with shiftKey', () => {
      const renderResult = testHook(useRelativeLinkHandler)();
      const anchor = document.createElement('a');
      anchor.setAttribute('href', '/dashboard');
      container.appendChild(anchor);

      act(() => {
        renderResult.result.current(container);
      });

      const event = createClickEvent({ shiftKey: true });
      anchor.dispatchEvent(event);

      expect(event.defaultPrevented).toBe(false);
      expect(mockNavigate).not.toHaveBeenCalled();
    });

    it('should not intercept clicks with altKey', () => {
      const renderResult = testHook(useRelativeLinkHandler)();
      const anchor = document.createElement('a');
      anchor.setAttribute('href', '/dashboard');
      container.appendChild(anchor);

      act(() => {
        renderResult.result.current(container);
      });

      const event = createClickEvent({ altKey: true });
      anchor.dispatchEvent(event);

      expect(event.defaultPrevented).toBe(false);
      expect(mockNavigate).not.toHaveBeenCalled();
    });
  });

  describe('mouse buttons', () => {
    it('should not intercept middle button clicks', () => {
      const renderResult = testHook(useRelativeLinkHandler)();
      const anchor = document.createElement('a');
      anchor.setAttribute('href', '/dashboard');
      container.appendChild(anchor);

      act(() => {
        renderResult.result.current(container);
      });

      const event = createClickEvent({ button: 1 });
      anchor.dispatchEvent(event);

      expect(event.defaultPrevented).toBe(false);
      expect(mockNavigate).not.toHaveBeenCalled();
    });

    it('should not intercept right button clicks', () => {
      const renderResult = testHook(useRelativeLinkHandler)();
      const anchor = document.createElement('a');
      anchor.setAttribute('href', '/dashboard');
      container.appendChild(anchor);

      act(() => {
        renderResult.result.current(container);
      });

      const event = createClickEvent({ button: 2 });
      anchor.dispatchEvent(event);

      expect(event.defaultPrevented).toBe(false);
      expect(mockNavigate).not.toHaveBeenCalled();
    });
  });

  describe('non-anchor elements', () => {
    it('should not intercept clicks on non-anchor elements', () => {
      const renderResult = testHook(useRelativeLinkHandler)();
      const button = document.createElement('button');
      container.appendChild(button);

      act(() => {
        renderResult.result.current(container);
      });

      const event = createClickEvent();
      button.dispatchEvent(event);

      expect(event.defaultPrevented).toBe(false);
      expect(mockNavigate).not.toHaveBeenCalled();
    });

    it('should not intercept clicks on divs', () => {
      const renderResult = testHook(useRelativeLinkHandler)();
      const div = document.createElement('div');
      container.appendChild(div);

      act(() => {
        renderResult.result.current(container);
      });

      const event = createClickEvent();
      div.dispatchEvent(event);

      expect(event.defaultPrevented).toBe(false);
      expect(mockNavigate).not.toHaveBeenCalled();
    });
  });

  describe('cleanup', () => {
    it('should remove event listener when ref is set to null', () => {
      const renderResult = testHook(useRelativeLinkHandler)();
      const anchor = document.createElement('a');
      anchor.setAttribute('href', '/dashboard');
      container.appendChild(anchor);

      act(() => {
        renderResult.result.current(container);
      });

      // Verify it works initially
      let event = createClickEvent();
      anchor.dispatchEvent(event);
      expect(mockNavigate).toHaveBeenCalledTimes(1);

      // Detach by setting null
      act(() => {
        renderResult.result.current(null);
      });

      // Now clicks should not trigger navigation
      mockNavigate.mockClear();
      event = createClickEvent();
      anchor.dispatchEvent(event);
      expect(mockNavigate).not.toHaveBeenCalled();
    });

    it('should remove event listener when unmounted', () => {
      const renderResult = testHook(useRelativeLinkHandler)();
      const anchor = document.createElement('a');
      anchor.setAttribute('href', '/dashboard');
      container.appendChild(anchor);

      act(() => {
        renderResult.result.current(container);
      });

      renderResult.unmount();

      // After unmount, clicks should not trigger navigation
      const event = createClickEvent();
      anchor.dispatchEvent(event);
      expect(mockNavigate).not.toHaveBeenCalled();
    });
  });

  describe('ref callback behavior', () => {
    it('should handle changing the ref to a different element', () => {
      const renderResult = testHook(useRelativeLinkHandler)();

      const container1 = document.createElement('div');
      const anchor1 = document.createElement('a');
      anchor1.setAttribute('href', '/route1');
      container1.appendChild(anchor1);
      document.body.appendChild(container1);

      const container2 = document.createElement('div');
      const anchor2 = document.createElement('a');
      anchor2.setAttribute('href', '/route2');
      container2.appendChild(anchor2);
      document.body.appendChild(container2);

      // Attach to first container
      act(() => {
        renderResult.result.current(container1);
      });

      let event = createClickEvent();
      anchor1.dispatchEvent(event);
      expect(mockNavigate).toHaveBeenCalledWith('/route1');
      mockNavigate.mockClear();

      // Switch to second container
      act(() => {
        renderResult.result.current(container2);
      });

      // First container should no longer intercept
      event = createClickEvent();
      anchor1.dispatchEvent(event);
      expect(mockNavigate).not.toHaveBeenCalled();

      // Second container should intercept
      event = createClickEvent();
      anchor2.dispatchEvent(event);
      expect(mockNavigate).toHaveBeenCalledWith('/route2');

      // Cleanup
      document.body.removeChild(container1);
      document.body.removeChild(container2);
    });
  });
});
