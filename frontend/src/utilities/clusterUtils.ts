import { useClusterInfo } from '~/redux/selectors/clusterInfo';

const consolePrefix = 'console-openshift-console';

export const getOpenShiftConsoleServerURL = (apiURL?: string): string | null => {
  const { hostname, protocol, port } = window.location;

  if (apiURL) {
    let prefixPort = `:${port}`;
    let apiURLWithoutPrefix = apiURL.slice('https://api.'.length);
    if (apiURLWithoutPrefix.includes(':')) {
      const [withoutPort] = apiURLWithoutPrefix.split(':');
      apiURLWithoutPrefix = withoutPort;
    }
    if (hostname === 'localhost') {
      // Port here does not matter, it's a localhost port
      prefixPort = '';
      // Dashboard has `apps.` before the content when on route, not in localhost
      apiURLWithoutPrefix = `apps.${apiURLWithoutPrefix}`;
    }
    return `${protocol}//${consolePrefix}.${apiURLWithoutPrefix}${prefixPort}`;
  }

  const hostParts = hostname.split('.').slice(1);
  if (hostParts.length < 2) {
    return null;
  }
  return `${protocol}//${consolePrefix}.${hostParts.join('.')}:${port}`;
};

export const useOpenShiftURL = (): string | null => {
  const { serverURL } = useClusterInfo();
  return getOpenShiftConsoleServerURL(serverURL);
};
