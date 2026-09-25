/* eslint-disable camelcase */
import type { HardwareProfile, HardwareProfileResource } from '~/app/types';
import {
  formatHardwareProfileDetails,
  formatHardwareProfileResourceDetails,
  formatHardwareProfileResourceSummary,
  formatHardwareProfileResourceValue,
} from '~/app/utilities/hardwareProfileUtils';

describe('formatHardwareProfileResourceValue', () => {
  it('should format singular and plural CPU values', () => {
    const resource: HardwareProfileResource = {
      identifier: 'cpu',
      display_name: 'CPU',
    };

    expect(formatHardwareProfileResourceValue('1', resource)).toBe('1 Core');
    expect(formatHardwareProfileResourceValue('4', resource)).toBe('4 Cores');
    expect(formatHardwareProfileResourceValue('1.5', resource)).toBe('1.5 Cores');
  });

  it('should normalize memory values to GiB', () => {
    const resource: HardwareProfileResource = {
      identifier: 'memory',
      display_name: 'Memory',
    };

    expect(formatHardwareProfileResourceValue('16Gi', resource)).toBe('16 GiB');
    expect(formatHardwareProfileResourceValue('32 GiB', resource)).toBe('32 GiB');
  });

  it('should preserve values that do not match a resource-specific format', () => {
    const resource: HardwareProfileResource = {
      identifier: 'nvidia.com/gpu',
      display_name: 'GPU',
    };

    expect(formatHardwareProfileResourceValue('1', resource)).toBe('1');
    expect(formatHardwareProfileResourceValue('100m', resource)).toBe('100m');
  });
});

describe('formatHardwareProfileResourceSummary', () => {
  it('should include the resource name and configured limits', () => {
    expect(
      formatHardwareProfileResourceSummary({
        identifier: 'cpu',
        display_name: 'CPU',
        default: '4',
        minimum: '2',
        maximum: '8',
      }),
    ).toBe('CPU: Default = 4, Minimum = 2, Maximum = 8');
  });

  it('should fall back to the identifier and omit missing limits', () => {
    expect(
      formatHardwareProfileResourceSummary({
        identifier: 'memory',
        default: '16Gi',
      }),
    ).toBe('memory: Default = 16Gi');
  });
});

describe('formatHardwareProfileResourceDetails', () => {
  it('should normalize values and use compact limit labels', () => {
    expect(
      formatHardwareProfileResourceDetails({
        identifier: 'cpu',
        display_name: 'CPU',
        default: '4',
        minimum: '2',
        maximum: '8',
      }),
    ).toBe('Default = 4 Cores, Min = 2 Cores, Max = 8 Cores');

    expect(
      formatHardwareProfileResourceDetails({
        identifier: 'memory',
        display_name: 'Memory',
        default: '16Gi',
        maximum: '32GiB',
      }),
    ).toBe('Default = 16 GiB, Max = 32 GiB');
  });
});

describe('formatHardwareProfileDetails', () => {
  it('should include configured resources and the LocalQueue', () => {
    const profile: HardwareProfile = {
      name: 'gpu-profile',
      display_name: 'GPU Profile',
      enabled: true,
      local_queue_name: 'gpu-default',
      resources: [
        { identifier: 'cpu', display_name: 'CPU', default: '4' },
        { identifier: 'memory', display_name: 'Memory' },
      ],
    };

    expect(formatHardwareProfileDetails(profile)).toBe('CPU: Default = 4; LocalQueue: gpu-default');
  });

  it('should return an empty string when no resources or queue are configured', () => {
    const profile: HardwareProfile = {
      name: 'empty-profile',
      display_name: 'Empty Profile',
      enabled: true,
    };

    expect(formatHardwareProfileDetails(profile)).toBe('');
  });
});
