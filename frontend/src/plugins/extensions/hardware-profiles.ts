import type { StatusProviderExtension } from '@odh-dashboard/plugin-core/extension-points';

const extensions: StatusProviderExtension[] = [
  {
    type: 'app.status-provider',
    properties: {
      id: 'hardware-profiles.status',
      statusProviderHook: () =>
        import('#~/concepts/hardwareProfiles/useHardwareProfilesStatusProvider').then(
          (m) => m.useHardwareProfilesStatusProvider,
        ),
    },
  },
];

export default extensions;
