/* eslint-disable camelcase */
import type { KueueAvailability } from '~/app/types';

type MockKueueAvailabilityOptions = Partial<KueueAvailability>;

export const mockKueueAvailability = (
  options: MockKueueAvailabilityOptions = {},
): KueueAvailability => ({
  enabled: false,
  scheduling_ready: false,
  cluster_enabled: false,
  namespace_managed: false,
  local_queues_available: false,
  local_queue_names: [],
  ...options,
});
/* eslint-enable camelcase */
