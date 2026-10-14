import {
  HARDWARE_PROFILE_BINDING_CONFIG,
  HardwareProfileBindingState,
} from '@odh-dashboard/hardware-profiles/shared/const';

describe('HARDWARE_PROFILE_BINDING_CONFIG', () => {
  it('should say resource claim template changes are not applied to a workload using a DRA profile', () => {
    const { getBodyText } = HARDWARE_PROFILE_BINDING_CONFIG[HardwareProfileBindingState.UPDATED];

    const bodyText = getBodyText({
      name: 'DRA only',
      resourceType: 'workbench',
      isRunning: false,
      isDRA: true,
    });

    expect(bodyText).toContain(
      "Changes to the profile's resource claim template are not applied to this workbench.",
    );
    expect(bodyText).not.toContain('If you restart or redeploy');
  });
});
