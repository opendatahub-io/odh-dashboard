import type { AreaExtension } from '@odh-dashboard/plugin-core/extension-points';
// eslint-disable-next-line no-restricted-syntax -- customCondition is a runtime function, not a CodeRef
import { isMonitoringStackAvailable } from '../src/utils/monitoringStackStatus';

export const PLUGIN_OBSERVABILITY = 'plugin-observability';

const observabilityArea: AreaExtension = {
  type: 'app.area',
  properties: {
    id: PLUGIN_OBSERVABILITY,
    featureFlags: ['observabilityDashboard'],
    customCondition: ({ dsciStatus }) => isMonitoringStackAvailable(dsciStatus),
  },
};

export default observabilityArea;
