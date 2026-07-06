/* eslint-disable prefer-destructuring */
// We need to disable the prefer-destructuring rule here due to an issue with how environment variables are handled in the build process with webpack.
import { KnownLabels } from '@odh-dashboard/k8s-core';

const FAST_POLL_INTERVAL = process.env.FAST_POLL_INTERVAL
  ? parseInt(process.env.FAST_POLL_INTERVAL)
  : 3000;

const ODH_PRODUCT_NAME = process.env.ODH_PRODUCT_NAME ?? '';

const LABEL_SELECTOR_DASHBOARD_RESOURCE = `${KnownLabels.DASHBOARD_RESOURCE}=true`;

export { FAST_POLL_INTERVAL, ODH_PRODUCT_NAME, LABEL_SELECTOR_DASHBOARD_RESOURCE };
