import type { Extension } from '@openshift/dynamic-plugin-sdk';
import type {
  NavSectionExtension,
  RouteExtension,
  TabRoutePageExtension,
  MastheadToolbarItemExtension,
} from '@odh-dashboard/plugin-core/extension-points';

const extensions: Extension[] = [
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
      component: () => import('./RedirectToModels'),
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
