import type { Extension } from '@openshift/dynamic-plugin-sdk';

const scaffoldExtensions: Extension[] = [
  {
    type: 'app.navigation/section',
    properties: {
      id: 'scaffold',
      title: 'Scaffold Section',
    },
  },
  {
    type: 'app.navigation/href',
    properties: {
      id: 'scaffold-page',
      title: 'Scaffold Page',
      href: '/scaffold',
      section: 'scaffold',
    },
  },
  {
    type: 'app.route',
    properties: {
      path: '/scaffold',
      component: () => import('../ScaffoldPage'),
    },
  },
];

const pluginExtensions: Record<string, Extension[]> = {
  scaffold: scaffoldExtensions,
};

export const useAppExtensions = (): [Record<string, Extension[]>, boolean] => [
  pluginExtensions,
  true,
];
