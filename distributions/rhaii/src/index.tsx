import { init } from '@module-federation/runtime';

const remoteEntry = process.env.MODEL_SERVING_REMOTE_ENTRY;

// Initialize the federation runtime before evaluating bootstrap's shared imports.
if (remoteEntry) {
  init({
    name: 'host',
    remotes: [
      {
        name: 'modelServing',
        entry: remoteEntry,
      },
    ],
  });
}

import('./bootstrap').catch((error) => {
  // eslint-disable-next-line no-console
  console.error('Failed to load application:', error);
  const root = document.getElementById('root');
  if (root) {
    root.textContent = 'Failed to load application. Please refresh the page.';
    root.style.padding = '2rem';
  }
});
