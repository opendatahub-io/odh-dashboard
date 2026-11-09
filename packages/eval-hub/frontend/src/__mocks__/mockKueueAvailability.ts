/* eslint-disable camelcase -- BFF API contract field name */
import type { KueueAvailability } from '~/app/types';

type MockKueueAvailabilityOptions = Partial<KueueAvailability>;

export const mockKueueAvailability = (
  options: MockKueueAvailabilityOptions = {},
): KueueAvailability => ({
  enabled: false,
  scheduling_ready: false,
  ...options,
});
