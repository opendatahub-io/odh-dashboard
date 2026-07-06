import { useClusterInfo } from '#~/redux/selectors/clusterInfo';
import { CONSOLE_LINK_DOMAIN, DEV_MODE } from '#~/utilities/const';

const consolePrefix = 'console-openshift-console';

export const getOpenShiftConsoleServerURL = (apiURL?: string): string | null => {
  const { hostname, protocol, port } = window.location;

  if (DEV_MODE && apiURL) {
    let apiURLWithoutPrefix = CONSOLE_LINK_DOMAIN || apiURL.slice('https://api.'.length);
    if (apiURLWithoutPrefix.includes(':')) {
      const [withoutPort] = apiURLWithoutPrefix.split(':');
      apiURLWithoutPrefix = withoutPort;
    }
    // Dashboard has `apps.` before the content when on route, not in localhost
    apiURLWithoutPrefix = `apps.${apiURLWithoutPrefix}`;
    return `${protocol}//${consolePrefix}.${apiURLWithoutPrefix}`;
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
