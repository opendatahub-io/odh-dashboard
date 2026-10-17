import type { Extension } from '@openshift/dynamic-plugin-sdk';
import type {
  HrefNavItemExtension,
  RouteExtension,
} from '@odh-dashboard/plugin-core/extension-points';
import extensions, { GRID } from './extensions';

// Only the MaaS Portal imports this entry point. Do not export these registrations
// from ./extensions: that is also consumed by the RHOAI dashboard.
const maasPortalExtensions: Extension[] = [
  ...extensions,
  {
    type: 'app.navigation/href',
    flags: { required: [GRID] },
    properties: {
      id: 'maas-models',
      title: 'Models',
      href: '/maas/models',
      path: '/maas/models',
      group: '0_models',
    },
  } satisfies HrefNavItemExtension,
  {
    type: 'app.route',
    flags: { required: [GRID] },
    properties: {
      path: '/maas/models',
      component: () => import('../app/pages/MaaSModelsPage'),
    },
  } satisfies RouteExtension,
];

export default maasPortalExtensions;
