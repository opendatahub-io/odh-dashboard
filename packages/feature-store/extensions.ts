import type {
  HrefNavItemExtension,
  AreaExtension,
  RouteExtension,
  NavSectionExtension,
} from '@odh-dashboard/plugin-core/extension-points';
// Allow this import as it consists of types and enums only.
// eslint-disable-next-line no-restricted-syntax
import { SupportedArea } from '@odh-dashboard/internal/concepts/areas/types';

const PLUGIN_FEATURE_STORE = 'plugin-feature-store';

const extensions: (AreaExtension | HrefNavItemExtension | RouteExtension | NavSectionExtension)[] =
  [
    {
      type: 'app.area',
      properties: {
        id: PLUGIN_FEATURE_STORE,
        reliantAreas: [SupportedArea.FEATURE_STORE],
        devFlags: ['Feature store plugin'],
      },
    },
    {
      type: 'app.navigation/section',
      flags: {
        required: [PLUGIN_FEATURE_STORE],
      },
      properties: {
        id: 'feature-store',
        title: 'Feature store',
        group: '1_feature_store',
        section: 'develop-and-train',
      },
    },
    {
      type: 'app.navigation/href',
      flags: {
        required: [PLUGIN_FEATURE_STORE],
      },
      properties: {
        id: 'featureStore-overview',
        title: 'Overview',
        href: '/featureStore/overview',
        section: 'feature-store',
        path: '/featureStore/overview/*',
      },
    },
    {
      type: 'app.navigation/href',
      flags: {
        required: [PLUGIN_FEATURE_STORE],
      },
      properties: {
        id: 'featureStore-entities',
        title: 'Entities',
        href: '/featureStore/entities',
        section: 'feature-store',
        path: '/featureStore/entities/*',
      },
    },
    {
      type: 'app.navigation/href',
      flags: {
        required: [PLUGIN_FEATURE_STORE],
      },
      properties: {
        id: 'featureStore-dataSets',
        title: 'Data sets',
        href: '/featureStore/dataSets',
        section: 'feature-store',
        path: '/featureStore/dataSets/*',
      },
    },
    {
      type: 'app.navigation/href',
      flags: {
        required: [PLUGIN_FEATURE_STORE],
      },
      properties: {
        id: 'featureStore-features',
        title: 'Features',
        href: '/featureStore/features',
        section: 'feature-store',
        path: '/featureStore/features/*',
      },
    },
    {
      type: 'app.navigation/href',
      flags: {
        required: [PLUGIN_FEATURE_STORE],
      },
      properties: {
        id: 'featureStore-featureViews',
        title: 'Feature views',
        href: '/featureStore/featureViews',
        section: 'feature-store',
        path: '/featureStore/featureViews/*',
      },
    },
    {
      type: 'app.navigation/href',
      flags: {
        required: [PLUGIN_FEATURE_STORE],
      },
      properties: {
        id: 'featureStore-featureServices',
        title: 'Feature services',
        href: '/featureStore/featureServices',
        section: 'feature-store',
        path: '/featureStore/featureServices/*',
      },
    },
    {
      type: 'app.route',
      flags: {
        required: [PLUGIN_FEATURE_STORE],
      },
      properties: {
        path: '/featureStore/*',
        component: () => import('./src/FeatureStoreRoutes'),
      },
    },
  ];

export default extensions;
