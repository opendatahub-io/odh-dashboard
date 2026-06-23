/* eslint-disable prefer-destructuring */
const FAST_POLL_INTERVAL = process.env.FAST_POLL_INTERVAL
  ? parseInt(process.env.FAST_POLL_INTERVAL)
  : 3000;

const ODH_PRODUCT_NAME = process.env.ODH_PRODUCT_NAME ?? '';

const LABEL_SELECTOR_DASHBOARD_RESOURCE = 'opendatahub.io/dashboard=true';

export { FAST_POLL_INTERVAL, ODH_PRODUCT_NAME, LABEL_SELECTOR_DASHBOARD_RESOURCE };
