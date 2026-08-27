import { getNIMHardwareProfileFieldOverrides } from '../nimHardwareProfileOverrides';
import { NVIDIA_ACCELERATOR_PREFIX } from '../../../../constants';

describe('getNIMHardwareProfileFieldOverrides', () => {
  it('should prioritize NVIDIA accelerator hardware profiles', () => {
    expect(getNIMHardwareProfileFieldOverrides()).toEqual({
      hardwareProfile: { preferredAccelerator: NVIDIA_ACCELERATOR_PREFIX },
    });
  });
});
