import { buildQueryArgumentUrl, setQueryArgument, removeQueryArgument } from '#~/utilities/router';

// Mock the NavigateFunction
const navigate = jest.fn();
const originalLocation = window;

beforeEach(() => {
  jest.clearAllMocks();
});

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

describe('buildQueryArgumentUrl', () => {
  it('should set and preserve hash in generated URL', () => {
    Object.defineProperty(globalThis, 'window', {
      value: {
        location: {
          ...window.location,
          href: 'https://example.com/path?foo=bar#hash',
          search: '?foo=bar',
        },
      },
      writable: true,
    });

    expect(buildQueryArgumentUrl('project', 'demo')).toBe('/path?foo=bar&project=demo#hash');
  });

  it('should remove a parameter when value is undefined and preserve hash', () => {
    Object.defineProperty(globalThis, 'window', {
      value: {
        location: {
          ...window.location,
          href: 'https://example.com/path?foo=bar&project=demo#hash',
          search: '?foo=bar&project=demo',
        },
      },
      writable: true,
    });

    expect(buildQueryArgumentUrl('project', undefined)).toBe('/path?foo=bar#hash');
  });

  it('should update an existing parameter and preserve hash', () => {
    Object.defineProperty(globalThis, 'window', {
      value: {
        location: {
          ...window.location,
          href: 'https://example.com/path?foo=old#hash',
          search: '?foo=old',
        },
      },
      writable: true,
    });

    expect(buildQueryArgumentUrl('foo', 'new')).toBe('/path?foo=new#hash');
  });

  it('should add a parameter when search is empty and preserve hash', () => {
    Object.defineProperty(globalThis, 'window', {
      value: {
        location: {
          ...window.location,
          href: 'https://example.com/path#hash',
          search: '',
        },
      },
      writable: true,
    });

    expect(buildQueryArgumentUrl('project', 'demo')).toBe('/path?project=demo#hash');
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
    expect(navigate).toHaveBeenCalledWith('/', { replace: true });
  });

  it('should not navigate if query argument does not exist', () => {
    const key = 'nonexistent';
    // Call removeQueryArgument to remove the non-existing query parameter
    removeQueryArgument(navigate, key);
    // Check if navigate is not called
    expect(navigate).not.toHaveBeenCalled();
  });
});
