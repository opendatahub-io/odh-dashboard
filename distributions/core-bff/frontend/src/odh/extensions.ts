import type {
  NavExtension,
  RouteExtension,
  AreaExtension,
} from '@odh-dashboard/plugin-core/extension-points';

const CORE_BFF = 'core-bff-module';

const extensions: (NavExtension | RouteExtension | AreaExtension)[] = [
  {
    type: 'app.area',
    properties: {
      id: CORE_BFF,
      devFlags: [CORE_BFF],
    },
  },
  {
    type: 'app.navigation/section',
    flags: {
      required: [CORE_BFF],
    },
    properties: {
      id: 'core-bff',
      title: 'Core Bff',
      group: '7_core_bff_studio',
      iconRef: () => import('./CoreBffNavIcon'),
    },
  },
  {
    type: 'app.navigation/href',
    flags: {
      required: [CORE_BFF],
    },
    properties: {
      id: 'core-bff-view',
      title: 'Core Bff',
      href: '/core-bff/main-view',
      section: 'core-bff',
      path: '/core-bff/main-view/*',
      label: 'Tech Preview',
    },
  },
  {
    type: 'app.route',
    flags: {
      required: [],
    },
    properties: {
      path: '/core-bff/main-view/*',
      component: () => import('./CoreBffWrapper'),
    },
  },
];

export default extensions;
