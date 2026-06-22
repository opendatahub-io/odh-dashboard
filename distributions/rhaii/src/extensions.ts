import type { Extension } from '@openshift/dynamic-plugin-sdk';
import type {
  NavSectionExtension,
  HrefNavItemExtension,
  RouteExtension,
  MastheadToolbarItemExtension,
} from '@odh-dashboard/plugin-core/extension-points';

const extensions: Extension[] = [
  {
    type: 'app.navigation/section',
    properties: {
      id: 'scaffold',
      title: 'Scaffold Section',
    },
  } satisfies NavSectionExtension,
  {
    type: 'app.navigation/href',
    properties: {
      id: 'scaffold-page',
      title: 'Scaffold Page',
      href: '/scaffold',
      section: 'scaffold',
    },
  } satisfies HrefNavItemExtension,
  {
    type: 'app.route',
    properties: {
      path: '/scaffold',
      component: () => import('./ScaffoldPage'),
    },
  } satisfies RouteExtension,
  {
    type: 'app.route',
    properties: {
      path: '/',
      component: () => import('./RedirectToScaffold'),
    },
  } satisfies RouteExtension,
  {
    type: 'app.masthead/toolbar-item',
    properties: {
      id: 'auth-placeholder',
      component: () => import('./components/AuthPlaceholder'),
      position: 'trailing',
    },
  } satisfies MastheadToolbarItemExtension,
];

export default extensions;
