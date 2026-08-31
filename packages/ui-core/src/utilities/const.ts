/* eslint-disable prefer-destructuring */
// We need to disable the prefer-destructuring rule here due to an issue with how environment variables are handled in the build process with webpack.
import { KnownLabels } from '@odh-dashboard/k8s-core';

function resolvePositivePollInterval(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : undefined;
}

function getFastPollIntervalFromWindow(): number | undefined {
  if (typeof window === 'undefined') {
    return undefined;
  }

  return resolvePositivePollInterval(Reflect.get(window, 'FAST_POLL_INTERVAL'));
}

const FAST_POLL_INTERVAL =
  getFastPollIntervalFromWindow() ??
  resolvePositivePollInterval(Number(process.env.FAST_POLL_INTERVAL)) ??
  3000;

const ODH_PRODUCT_NAME = process.env.ODH_PRODUCT_NAME ?? '';

const LABEL_SELECTOR_DASHBOARD_RESOURCE = `${KnownLabels.DASHBOARD_RESOURCE}=true`;

export { FAST_POLL_INTERVAL, ODH_PRODUCT_NAME, LABEL_SELECTOR_DASHBOARD_RESOURCE };
