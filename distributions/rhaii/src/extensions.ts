import type { Extension } from '@openshift/dynamic-plugin-sdk';
import type {
  NavSectionExtension,
  HrefNavItemExtension,
  RouteExtension,
  TabRoutePageExtension,
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
    type: 'app.navigation/section',
    properties: {
      id: 'ai-hub',
      title: 'AI hub',
      group: '3_ai_hub',
    },
  } satisfies NavSectionExtension,
  {
    type: 'app.tab-route/page',
    properties: {
      id: 'models-tab-page',
      title: 'Models',
      href: '/ai-hub/models',
      path: '/ai-hub/models/*',
      group: '1_models',
      section: 'ai-hub',
    },
  } satisfies TabRoutePageExtension,
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
