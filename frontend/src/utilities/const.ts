import { FetchStateObject } from '@odh-dashboard/ui-core/hooks/useFetch';
import { CustomWatchK8sResult, ListWithNonDashboardPresence, OdhDocumentType } from '#~/types';

// Safe accessor: when dotenv-webpack is configured it replaces `process.env.X`
// at build time so this function is never called at runtime. In environments
// without a process polyfill (e.g. RHAII, federated plugins) this prevents a
// ReferenceError: process is not defined.
// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- process may not exist in non-webpack environments (RHAII, federated plugins)
const env = (key: string): string | undefined =>
  typeof process !== 'undefined' ? process.env[key] : undefined;

const WS_HOSTNAME = window.WS_HOSTNAME ?? env('WS_HOSTNAME') ?? location.host;
const DEV_MODE = env('APP_ENV') === 'development';
const POLL_INTERVAL = window.POLL_INTERVAL || Number(env('POLL_INTERVAL')) || 30000;
const FAST_POLL_INTERVAL = window.FAST_POLL_INTERVAL || Number(env('FAST_POLL_INTERVAL')) || 3000;
const SERVER_TIMEOUT = Number(env('SERVER_TIMEOUT')) || 300000;
const DOC_LINK = env('DOC_LINK');
const COMMUNITY_LINK = env('COMMUNITY_LINK');
const SUPPORT_LINK = env('SUPPORT_LINK');
const ODH_LOGO = env('ODH_LOGO') || 'odh-logo-light-theme.svg';
const ODH_LOGO_DARK = env('ODH_LOGO_DARK') || 'odh-logo-dark-theme.svg';
const ODH_PRODUCT_NAME = env('ODH_PRODUCT_NAME') ?? '';
const DASHBOARD_CONFIG = env('DASHBOARD_CONFIG') || 'odh-dashboard-config';
const EXT_CLUSTER = env('EXT_CLUSTER');
const INTERNAL_DASHBOARD_VERSION = env('INTERNAL_DASHBOARD_VERSION') || '';
const CONSOLE_LINK_DOMAIN = env('CONSOLE_LINK_DOMAIN');
const MF_REMOTES = env('MF_REMOTES') || document.getElementById('mf-remotes-json')?.textContent;
const OOTB_IMAGE_PROVIDER = 'Red Hat';

export {
  DEV_MODE,
  POLL_INTERVAL,
  FAST_POLL_INTERVAL,
  SERVER_TIMEOUT,
  DOC_LINK,
  COMMUNITY_LINK,
  SUPPORT_LINK,
  ODH_LOGO,
  ODH_LOGO_DARK,
  ODH_PRODUCT_NAME,
  DASHBOARD_CONFIG,
  WS_HOSTNAME,
  EXT_CLUSTER,
  INTERNAL_DASHBOARD_VERSION,
  CONSOLE_LINK_DOMAIN,
  MF_REMOTES,
  OOTB_IMAGE_PROVIDER,
};

export const DOC_TYPE_TOOLTIPS = {
  [OdhDocumentType.Documentation]: 'Technical information for using the service',
  [OdhDocumentType.Tutorial]: 'End-to-end guides for solving business problems in data science',
  [OdhDocumentType.QuickStart]: 'Step-by-step instructions and tasks',
  [OdhDocumentType.HowTo]: 'Instructions and code for everyday procedures',
};

export const CATEGORY_ANNOTATION = 'opendatahub.io/categories';

export const DEFAULT_LIST_WATCH_RESULT: CustomWatchK8sResult<never | never[]> = [
  [],
  false,
  undefined,
];

export const DEFAULT_LIST_FETCH_STATE: FetchStateObject<never[]> = {
  data: [],
  loaded: false,
  refresh: () => Promise.resolve(undefined),
};

export const DEFAULT_VALUE_FETCH_STATE: FetchStateObject<never | undefined> = {
  data: undefined,
  loaded: false,
  refresh: () => Promise.resolve(undefined),
};

export const DEFAULT_LIST_WITH_NON_DASHBOARD_PRESENCE: ListWithNonDashboardPresence<never> = {
  items: [],
  hasNonDashboardItems: false,
};

export const DEFAULT_LIST_WITH_NON_DASHBOARD_PRESENCE_FETCH_STATE: FetchStateObject<
  ListWithNonDashboardPresence<never>
> = {
  ...DEFAULT_VALUE_FETCH_STATE,
  data: DEFAULT_LIST_WITH_NON_DASHBOARD_PRESENCE,
  refresh: () => Promise.resolve(undefined),
};

export const DASHBOARD_MAIN_CONTAINER_ID = 'dashboard-page-main';

// Quick starts drawer creates a new scroll container within its DrawerContentBody.
// Not an ideal selector but components such as JumpLinks require the use of a selector instead of a direct node reference.
export const DASHBOARD_SCROLL_CONTAINER_SELECTOR = `#${DASHBOARD_MAIN_CONTAINER_ID} > .pf-v6-c-drawer > .pf-v6-c-drawer__main > .pf-v6-c-drawer__content`;
