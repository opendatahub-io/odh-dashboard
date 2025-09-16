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
        featureFlags: ['disableFeatureStore'],
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
        href: '/develop-train/feature-store/overview',
        section: 'feature-store',
        path: '/develop-train/feature-store/overview/*',
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
        href: '/develop-train/feature-store/entities',
        section: 'feature-store',
        path: '/develop-train/feature-store/entities/*',
      },
    },
    {
      type: 'app.navigation/href',
      flags: {
        required: [PLUGIN_FEATURE_STORE],
      },
      properties: {
        id: 'featureStore-datasets',
        title: 'Datasets',
        href: '/develop-train/feature-store/datasets',
        section: 'feature-store',
        path: '/develop-train/feature-store/datasets/*',
      },
    },
    {
      type: 'app.navigation/href',
      flags: {
        required: [PLUGIN_FEATURE_STORE],
      },
      properties: {
        id: 'featureStore-data-sources',
        title: 'Data sources',
        href: '/develop-train/feature-store/data-sources',
        section: 'feature-store',
        path: '/develop-train/feature-store/data-sources/*',
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
        href: '/develop-train/feature-store/features',
        section: 'feature-store',
        path: '/develop-train/feature-store/features/*',
      },
    },
    {
      type: 'app.navigation/href',
      flags: {
        required: [PLUGIN_FEATURE_STORE],
      },
      properties: {
        id: 'featureStore-feature-views',
        title: 'Feature views',
        href: '/develop-train/feature-store/feature-views',
        section: 'feature-store',
        path: '/develop-train/feature-store/feature-views/*',
      },
    },
    {
      type: 'app.navigation/href',
      flags: {
        required: [PLUGIN_FEATURE_STORE],
      },
      properties: {
        id: 'featureStore-feature-services',
        title: 'Feature services',
        href: '/develop-train/feature-store/feature-services',
        section: 'feature-store',
        path: '/develop-train/feature-store/feature-services/*',
      },
    },
    {
      type: 'app.route',
      flags: {
        required: [PLUGIN_FEATURE_STORE],
      },
      properties: {
        path: '/develop-train/feature-store/*',
        component: () => import('./src/FeatureStoreRoutes'),
      },
    },
  ];

export default extensions;
