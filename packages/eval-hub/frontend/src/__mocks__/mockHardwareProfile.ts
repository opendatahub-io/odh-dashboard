/* eslint-disable camelcase */
import type { HardwareProfile } from '~/app/types';

type MockHardwareProfileOptions = Partial<HardwareProfile>;

export const mockHardwareProfile = (options: MockHardwareProfileOptions = {}): HardwareProfile => ({
  name: 'gpu-default',
  display_name: 'GPU default',
  enabled: true,
  scheduling_type: 'Queue',
  local_queue_name: 'gpu-default',
  resources: [
    {
      identifier: 'cpu',
      display_name: 'CPU',
      default: '4',
    },
  ],
  ...options,
});
/* eslint-enable camelcase */
