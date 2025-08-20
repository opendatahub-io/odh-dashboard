import { Extension } from '@openshift/dynamic-plugin-sdk';
import { isCodeRef } from '../core/internal/coderefs';
import { visitDeep } from '../core/internal/objects';

/**
 * Validates a code ref in the following format:
 * () => import('./MyModule')
 * () => import('./utils').then((module) => module.namedExport)
 */
const importPattern =
  /^\(\)\s*=>\s*(?:{\s*return)?\s*import\('[^']+'\)(?:\.then\(\([a-zA-Z_$][a-zA-Z0-9_$]*\)\s*=>\s*[a-zA-Z_$][a-zA-Z0-9_$]*\.[a-zA-Z_$][a-zA-Z0-9_$]*\))?/;

export const expectExtensionsToBeValid = (extensions: Extension[]): void => {
  extensions.forEach((extension) => {
    visitDeep(extension.properties, isCodeRef, (value) => {
      const fnString = value
        .toString()
        .replace(/cov_.+;/g, '')
        .replace(/\s+?\/\*.*?\*\//g, '');
      expect(fnString).toMatch(importPattern);
    });
  });
};
