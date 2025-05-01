import type { Extension } from '@openshift/dynamic-plugin-sdk';

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

const extensions: Extension[] = [];

export default extensions;
