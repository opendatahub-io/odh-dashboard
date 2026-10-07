/* eslint-disable prefer-destructuring */
// We need to disable the prefer-destructuring rule here due to an issue with how environment variables are handled in the build process with rspack.
import { KnownLabels } from '@odh-dashboard/k8s-core';

function resolvePositivePollInterval(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : undefined;
}

function getPollIntervalFromWindow(
  key: 'POLL_INTERVAL' | 'FAST_POLL_INTERVAL',
): number | undefined {
  if (typeof window === 'undefined') {
    return undefined;
  }

  return resolvePositivePollInterval(Reflect.get(window, key));
}

const POLL_INTERVAL =
  getPollIntervalFromWindow('POLL_INTERVAL') ??
  resolvePositivePollInterval(Number(process.env.POLL_INTERVAL)) ??
  30000;

const FAST_POLL_INTERVAL =
  getPollIntervalFromWindow('FAST_POLL_INTERVAL') ??
  resolvePositivePollInterval(Number(process.env.FAST_POLL_INTERVAL)) ??
  3000;

const ODH_PRODUCT_NAME = process.env.ODH_PRODUCT_NAME ?? '';

const LABEL_SELECTOR_DASHBOARD_RESOURCE = `${KnownLabels.DASHBOARD_RESOURCE}=true`;

export { POLL_INTERVAL, FAST_POLL_INTERVAL, ODH_PRODUCT_NAME, LABEL_SELECTOR_DASHBOARD_RESOURCE };
