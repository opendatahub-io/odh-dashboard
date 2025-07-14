import { setQueryArgument, removeQueryArgument } from '#~/utilities/router';

// Mock the NavigateFunction
const navigate = jest.fn();
const originalLocation = window;

afterEach(() => {
  Object.defineProperty(globalThis, 'window', {
    value: originalLocation,
  });
});

describe('setQueryArgument', () => {
  it('should set a query argument and navigate', () => {
    const key = 'param';
    const value = 'example';

    Object.defineProperty(globalThis, 'window', {
      value: originalLocation,
      writable: true,
    });

    setQueryArgument(navigate, key, value);

    // Check if navigate is called with the expected URL
    expect(navigate).toHaveBeenCalledWith('/?param=example', { replace: true });
  });
  it('should not navigate if query argument is already set to the same value', () => {
    const key = 'param';
    const value = 'example';

    Object.defineProperty(globalThis, 'window', {
      value: {
        location: {
          ...window.location,
          search: `?${key}=${value}`,
        },
      },
      writable: true,
    });

    setQueryArgument(navigate, key, value);

    // Check if navigate is not called
    expect(navigate).not.toHaveBeenCalled();
  });
});

describe('removeQueryArgument', () => {
  it('should remove a query argument and navigate', () => {
    const key = 'param';

    Object.defineProperty(globalThis, 'window', {
      value: {
        location: {
          ...window.location,
          search: '?param=example',
        },
      },
      writable: true,
    });

    // Call removeQueryArgument to remove the query parameter
    removeQueryArgument(navigate, key);

    // Check if navigate is called with the expected URL
    expect(navigate).toHaveBeenCalledWith('/?', { replace: true });
  });

  it('should not navigate if query argument does not exist', () => {
    const key = 'nonexistent';
    // Call removeQueryArgument to remove the non-existing query parameter
    removeQueryArgument(navigate, key);
    // Check if navigate is not called
    expect(navigate).not.toHaveBeenCalled();
  });
});
