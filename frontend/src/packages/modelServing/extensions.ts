import type { ProjectDetailsTab } from '~/plugins/extension-points';

/**
 * This file is used to declare the extensions that are available in the application.
 * It must not import any other files to prevent loading code on startup.
 *
 * Stick to `type` imports only.
 */

// eg. Remove once we have a real extensions
// const extensions: (TabExtension | PageExtension)[] = [
//   {
//     type: 'tab',
//     properties: {
//       label: 'Test tab',
//       content: () => import('./TabComponent'),
//     },
//   },
// ];

// TODO: Support app extensions
const extensions: ProjectDetailsTab[] = [
  {
    type: 'app.project-details/tab',
    properties: {
      label: 'Models',
      tabId: 'model-serving',
      content: () => import('./src/ModelServingProjectTab'),
    },
  },
];

export default extensions;
