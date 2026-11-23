import { testHook } from '@odh-dashboard/jest-config/hooks';
import { useClusterInfo } from '#~/redux/selectors/clusterInfo';
import {
  getOpenShiftConsoleServerURL,
  resolveConsoleLinkImageURL,
  useOpenShiftURL,
} from '#~/utilities/clusterUtils';

const originalLocation = window.location;

const setupWindowLocation = (hostname: string, protocol: string, port: string) => {
  Object.defineProperty(window, 'location', {
    writable: true,
    value: { ...originalLocation, hostname, protocol, port },
  });
};

jest.mock('#~/utilities/const', () => ({
  get DEV_MODE() {
    return false;
  },
}));

jest.mock('#~/redux/selectors/clusterInfo', () => ({
  ...jest.requireActual('#~/redux/selectors/clusterInfo'),
  useClusterInfo: jest.fn(),
}));

const useClusterInfoMock = jest.mocked(useClusterInfo);
const devModeMock = jest.spyOn(jest.requireMock('#~/utilities/const'), 'DEV_MODE', 'get');

describe('getOpenShiftConsoleServerURL', () => {
  it('should construct URL based on window location when no apiURL is provided', () => {
    setupWindowLocation('api.example.com', 'https:', '443');

    // Act
    const result = getOpenShiftConsoleServerURL();

    // Assert the constructed URL
    expect(result).toBe('https://console-openshift-console.example.com:443');
  });

  it('should construct URL with DEV_MODE true and provided apiURL', () => {
    setupWindowLocation('localhost', 'https:', '443');
    devModeMock.mockReturnValue(true);
    const apiURL = 'https://api.example.com:8443';

    // Act
    const result = getOpenShiftConsoleServerURL(apiURL);

    // Assert the constructed URL
    expect(result).toBe('https://console-openshift-console.apps.example.com');
  });

  it('should return null when hostParts.length is less than 2', () => {
    setupWindowLocation('localhost', 'https:', '443');
    // Act
    const result = getOpenShiftConsoleServerURL();

    // Assert
    expect(result).toBeNull();
  });
});

describe('useOpenShiftURL', () => {
  it('should return the constructed URL from useClusterInfo', () => {
    setupWindowLocation('localhost', 'https:', '443');
    const serverURL = 'https://api.example.com';

    // Arrange
    useClusterInfoMock.mockReturnValue({ serverURL });

    // Act
    const result = testHook(useOpenShiftURL)();

    // Assert
    expect(useClusterInfoMock).toHaveBeenCalledTimes(1);
    expect(result).hookToBe('https://console-openshift-console.apps.example.com');
  });

  it('should return null when useClusterInfo returns null', () => {
    setupWindowLocation('localhost', 'https:', '443');
    // Arrange
    useClusterInfoMock.mockReturnValue({ serverURL: undefined });

    // Act
    const result = testHook(useOpenShiftURL)();

    // Assert
    expect(result).hookToBe(null);
  });
});

describe('resolveConsoleLinkImageURL', () => {
  const consoleURL = 'https://console-openshift-console.apps.example.com';

  it('should resolve a console-relative path against the console URL', () => {
    expect(
      resolveConsoleLinkImageURL('/static/assets/public/imgs/logos/github.svg', consoleURL),
    ).toBe(
      'https://console-openshift-console.apps.example.com/static/assets/public/imgs/logos/github.svg',
    );
  });

  it('should resolve a path without a leading slash against the console root', () => {
    expect(resolveConsoleLinkImageURL('static/logo.svg', consoleURL)).toBe(
      'https://console-openshift-console.apps.example.com/static/logo.svg',
    );
  });

  it('should keep the console port when resolving', () => {
    expect(
      resolveConsoleLinkImageURL(
        '/static/logo.svg',
        'https://console-openshift-console.apps.example.com:8443',
      ),
    ).toBe('https://console-openshift-console.apps.example.com:8443/static/logo.svg');
  });

  it('should handle a console URL with an empty port', () => {
    expect(
      resolveConsoleLinkImageURL(
        '/static/logo.svg',
        'https://console-openshift-console.apps.example.com:',
      ),
    ).toBe('https://console-openshift-console.apps.example.com/static/logo.svg');
  });

  it.each([
    'https://example.com/logo.svg',
    'http://example.com/logo.png',
    '//cdn.example.com/logo.svg',
    'data:image/svg+xml;base64,PHN2Zz48L3N2Zz4=',
  ])('should leave absolute URL %s untouched', (imageURL) => {
    expect(resolveConsoleLinkImageURL(imageURL, consoleURL)).toBe(imageURL);
  });

  it('should return the original value when the console URL is unknown', () => {
    expect(resolveConsoleLinkImageURL('/static/logo.svg', null)).toBe('/static/logo.svg');
    expect(resolveConsoleLinkImageURL('/static/logo.svg')).toBe('/static/logo.svg');
  });

  it('should return undefined when there is no image URL', () => {
    expect(resolveConsoleLinkImageURL(undefined, consoleURL)).toBeUndefined();
    expect(resolveConsoleLinkImageURL('', consoleURL)).toBe('');
  });
});
