import type { Extension } from '@openshift/dynamic-plugin-sdk';
import type {
  RouteExtension,
  MastheadToolbarItemExtension,
  SuppressExtension,
  PatchExtension,
  NavPatch,
} from '@odh-dashboard/plugin-core/extension-points';

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

  // Suppress the gen-ai-studio nav section (items flattened via app.patch below)
  {
    type: 'app.suppress',
    properties: {
      targetType: 'app.navigation/section',
      targetId: 'gen-ai-studio',
    },
  } satisfies SuppressExtension,

  // Patch package-owned nav items: clear section (flatten) and set top-level group order
  {
    type: 'app.patch',
    properties: {
      targetType: 'app.navigation/href',
      targetId: 'maas-tokens-subscriptions-view',
      patch: { section: null, group: '1_api_keys' },
    },
  } satisfies PatchExtension<NavPatch>,
  {
    type: 'app.patch',
    properties: {
      targetType: 'app.navigation/href',
      targetId: 'chat-playground',
      patch: { section: null, group: '2_playground', label: null },
    },
  } satisfies PatchExtension<NavPatch>,
  {
    type: 'app.patch',
    properties: {
      targetType: 'app.navigation/href',
      targetId: 'ai-assets',
      patch: { section: null, group: '3_ai_assets', label: null },
    },
  } satisfies PatchExtension<NavPatch>,
];

export default extensions;
