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

const ABSOLUTE_URL_REGEX = /^(?:[a-z][a-z\d+\-.]*:|\/\/)/i;

/**
 * ConsoleLink `applicationMenu.imageURL` values may be relative to the OpenShift web console
 * (e.g. `/static/assets/public/imgs/logos/github.svg`). The console resolves them against its own
 * origin, so the dashboard must do the same instead of resolving them against its own host.
 * Absolute URLs (including `data:` URIs) and protocol-relative URLs are returned untouched.
 */
export const resolveConsoleLinkImageURL = (
  imageURL?: string,
  consoleURL?: string | null,
): string | undefined => {
  if (!imageURL || !consoleURL || ABSOLUTE_URL_REGEX.test(imageURL)) {
    return imageURL;
  }
  try {
    return new URL(imageURL, `${consoleURL}/`).href;
  } catch {
    return imageURL;
  }
};

export const useOpenShiftURL = (): string | null => {
  const { serverURL } = useClusterInfo();
  return getOpenShiftConsoleServerURL(serverURL);
};
