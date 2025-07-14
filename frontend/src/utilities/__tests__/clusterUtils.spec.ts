import { useClusterInfo } from '#~/redux/selectors/clusterInfo';
import { getOpenShiftConsoleServerURL, useOpenShiftURL } from '#~/utilities/clusterUtils';
import { testHook } from '#~/__tests__/unit/testUtils/hooks';

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
