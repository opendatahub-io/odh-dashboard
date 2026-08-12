// Distribution-owned extensions: flat nav items (replacing gen-ai's nested
// section), root and /maas redirects, and a user dropdown in the masthead.
import type { Extension } from '@openshift/dynamic-plugin-sdk';
import type {
  RouteExtension,
  HrefNavItemExtension,
  MastheadToolbarItemExtension,
} from '@odh-dashboard/plugin-core/extension-points';

const ADMIN_USER = 'ADMIN_USER';

const extensions: Extension[] = [
  // Root redirect
  {
    type: 'app.route',
    properties: {
      path: '/',
      component: () => import('./RootRedirect'),
    },
  } satisfies RouteExtension,

  // /maas redirect — the package's portalExtensions.ts does not register
  // this route, so the distribution owns it directly
  {
    type: 'app.route',
    properties: {
      path: '/maas',
      component: () => import('./RootRedirect'),
    },
  } satisfies RouteExtension,

  // User dropdown (trailing = after theme toggle)
  {
    type: 'app.masthead/toolbar-item',
    properties: {
      id: 'user-dropdown',
      component: () => import('./components/UserDropdown'),
      position: 'trailing',
    },
  } satisfies MastheadToolbarItemExtension,

  // Flat nav items (no section = top level)
  {
    type: 'app.navigation/href',
    flags: {
      required: ['chatPlayground'],
    },
    properties: {
      id: 'flat-playground',
      title: 'Playground',
      href: '/gen-ai-studio/playground',
      path: '/gen-ai-studio/playground/*',
      group: '2_playground',
    },
  } satisfies HrefNavItemExtension,
  {
    type: 'app.navigation/href',
    flags: {
      required: ['plugin-gen-ai'],
    },
    properties: {
      id: 'flat-ai-assets',
      title: 'AI asset endpoints',
      href: '/gen-ai-studio/assets',
      path: '/gen-ai-studio/assets/*',
      group: '3_ai_assets',
    },
  } satisfies HrefNavItemExtension,
  {
    type: 'app.navigation/href',
    flags: {
      required: ['modelAsService'],
    },
    properties: {
      id: 'flat-api-keys',
      title: 'API keys',
      href: '/maas/keys-and-subs',
      path: '/maas/keys-and-subs/*',
      group: '1_api_keys',
    },
  } satisfies HrefNavItemExtension,
  {
    type: 'app.navigation/href',
    flags: {
      required: ['modelAsService', ADMIN_USER],
    },
    properties: {
      id: 'flat-governance',
      title: 'MaaS governance',
      href: '/maas/maas-governance',
      path: '/maas/maas-governance/*',
      group: '9_governance',
    },
  } satisfies HrefNavItemExtension,
];

export default extensions;
