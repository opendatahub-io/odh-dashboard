import { ContextResourceData, OdhDocumentType } from '~/types';

const DEV_MODE = process.env.APP_ENV === 'development';
const API_PORT = process.env.BACKEND_PORT || 8080;
const POLL_INTERVAL = process.env.POLL_INTERVAL ? parseInt(process.env.POLL_INTERVAL) : 30000;
const FAST_POLL_INTERVAL = process.env.FAST_POLL_INTERVAL
  ? parseInt(process.env.FAST_POLL_INTERVAL)
  : 3000;
const SERVER_TIMEOUT = process.env.SERVER_TIMEOUT ? parseInt(process.env.SERVER_TIMEOUT) : 300000; // 5 minutes
const DOC_LINK = process.env.DOC_LINK;
const COMMUNITY_LINK = process.env.COMMUNITY_LINK;
const SUPPORT_LINK = process.env.SUPPORT_LINK;
const ODH_LOGO = process.env.ODH_LOGO || 'odh-logo.svg';
const ODH_PRODUCT_NAME = process.env.ODH_PRODUCT_NAME;
const ODH_NOTEBOOK_REPO = process.env.ODH_NOTEBOOK_REPO;
const DASHBOARD_CONFIG = process.env.DASHBOARD_CONFIG || 'odh-dashboard-config';

export {
  DEV_MODE,
  API_PORT,
  POLL_INTERVAL,
  FAST_POLL_INTERVAL,
  SERVER_TIMEOUT,
  DOC_LINK,
  COMMUNITY_LINK,
  SUPPORT_LINK,
  ODH_LOGO,
  ODH_PRODUCT_NAME,
  ODH_NOTEBOOK_REPO,
  DASHBOARD_CONFIG,
};

export const DOC_TYPE_TOOLTIPS = {
  [OdhDocumentType.Documentation]: 'Technical information for using the service',
  [OdhDocumentType.Tutorial]: 'End-to-end guides for solving business problems in data science',
  [OdhDocumentType.QuickStart]: 'Step-by-step instructions and tasks',
  [OdhDocumentType.HowTo]: 'Instructions and code for everyday procedures',
};

export const CATEGORY_ANNOTATION = 'opendatahub.io/categories';

export const DEFAULT_CONTEXT_DATA: ContextResourceData<never> = {
  data: [],
  loaded: false,
  refresh: () => undefined,
};

export const REPOSITORY_URL_REGEX =
  /^([\w.\-_]+((?::\d+|)(?=\/[a-z0-9._-]+\/[a-z0-9._-]+))|)(?:\/|)([a-z0-9.\-_]+(?:\/[a-z0-9.\-_]+|))(?::([\w.\-_]{1,127})|)/;

export const DASHBOARD_MAIN_CONTAINER_ID = 'dashboard-page-main';

// Quick starts drawer creates a new scroll container within its DrawerContentBody.
// Not an ideal selector but components such as JumpLinks require the use of a selector instead of a direct node reference.
export const DASHBOARD_SCROLL_CONTAINER_SELECTOR = `#${DASHBOARD_MAIN_CONTAINER_ID} > .pf-c-drawer > .pf-c-drawer__main > .pf-c-drawer__content`;
