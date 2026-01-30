import type {
  NavExtension,
  RouteExtension,
  AreaExtension,
} from '@odh-dashboard/plugin-core/extension-points';

const MOD_ARCH = 'mod-arch-module';

const extensions: (NavExtension | RouteExtension | AreaExtension)[] = [
  {
    type: 'app.area',
    properties: {
      id: MOD_ARCH,
      requiredComponents: [],
      featureFlags: ['modArchModule'], // Todo: You need to add this feature flag.
    },
  },
  {
    type: 'app.navigation/section',
    flags: {
      required: [MOD_ARCH],
    },
    properties: {
      id: 'mod-arch',
      title: 'Modular Architecture Component',
      group: '7_mod_arch_studio',
      iconRef: () => import('./ModArchNavIcon'),
    },
  },
  {
    type: 'app.navigation/href',
    flags: {
      required: [MOD_ARCH],
    },
    properties: {
      id: 'mod-arch-view',
      title: 'Modular Architecture',
      href: '/mod-arch/main-view',
      section: 'mod-arch',
      path: '/mod-arch/main-view/*',
      label: 'Tech Preview',
    },
  },
  {
    type: 'app.route',
    flags: {
      required: [],
    },
    properties: {
      path: '/mod-arch/main-view/*',
      component: () => import('./ModArchWrapper'),
    },
  },
];

export default extensions;
