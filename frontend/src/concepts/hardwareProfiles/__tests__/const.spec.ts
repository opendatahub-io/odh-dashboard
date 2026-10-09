import {
  HARDWARE_PROFILE_BINDING_CONFIG,
  HardwareProfileBindingState,
} from '@odh-dashboard/hardware-profiles/shared/const';

describe('HARDWARE_PROFILE_BINDING_CONFIG', () => {
  it('should not promise that a restart applies updated settings for a profile managed outside the dashboard', () => {
    const { getBodyText } = HARDWARE_PROFILE_BINDING_CONFIG[HardwareProfileBindingState.UPDATED];

    const bodyText = getBodyText({
      name: 'DRA only',
      resourceType: 'workbench',
      isRunning: false,
      isDRA: true,
    });

    expect(bodyText).toContain('managed outside the dashboard');
    expect(bodyText).not.toContain('If you restart or redeploy');
  });
});
