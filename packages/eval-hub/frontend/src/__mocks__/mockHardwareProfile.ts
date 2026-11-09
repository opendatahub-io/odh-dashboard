/* eslint-disable camelcase */
import type { HardwareProfileInfo } from '~/app/types';

type MockHardwareProfileOptions = Partial<HardwareProfileInfo>;

export const mockHardwareProfile = (
  options: MockHardwareProfileOptions = {},
): HardwareProfileInfo => ({
  name: 'gpu-default',
  display_name: 'GPU default',
  scheduling_type: 'queue',
  queue_name: 'gpu-default',
  identifiers: [
    {
      identifier: 'cpu',
      display_name: 'CPU',
      default_count: '4',
    },
  ],
  queue_availability: { status: 'active', reason: 'Ready' },
  ...options,
});
/* eslint-enable camelcase */
