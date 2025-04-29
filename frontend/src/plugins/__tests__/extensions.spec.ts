import { Extension } from '@openshift/dynamic-plugin-sdk';
import extensionDeclarations from '~/plugins/extensions';
import { isCodeRef } from '~/plugins/internal/coderefs';
import { visitDeep } from '~/plugins/internal/objects';

describe('extensions', () => {
  it('should be valid', () => {
    expect(validateExtensions(extensionDeclarations)).toBe(true);
  });
});

// Tests the test function
describe('validateExtensions', () => {
  it('should validate a valid code ref', () => {
    expect(
      validateExtensions([
        {
          type: 'test',
          properties: {
            firstLevel: {
              props: {
                // This is an invalid import used for testing purposes.
                // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                // @ts-ignore
                content: () => import('./MyModule'),
              },
            },
            bool: true,
          },
        },
      ]),
    ).toBe(true);
  });

  it('should validate a valid code ref with a named export', () => {
    expect(
      validateExtensions([
        {
          type: 'test',
          properties: {
            firstLevel: {
              props: {
                // This is an invalid import used for testing purposes.
                // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                // @ts-ignore
                content: () => import('./MyModule').then((module) => module.namedExport),
              },
            },
            bool: true,
          },
        },
      ]),
    ).toBe(true);
  });

  it('should validate an invalid code ref', () => {
    expect(
      validateExtensions([
        {
          type: 'test',
          properties: {
            firstLevel: {
              count: 1,
              prop: {
                notAnImport: () => 'unknown',
              },
            },
          },
        },
      ]),
    ).toBe(false);
  });
});

/**
 * Validates a code ref in the following format:
 * () => import('./MyModule')
 * () => import('./utils').then((module) => module.namedExport)
 */
const importPattern =
  /^\(\)\s*=>\s*import\('[^']+'\)(?:\.then\(\([a-zA-Z_$][a-zA-Z0-9_$]*\)\s*=>\s*[a-zA-Z_$][a-zA-Z0-9_$]*\.[a-zA-Z_$][a-zA-Z0-9_$]*\))?/;

const validateExtensions = (extensions: Extension[]): boolean => {
  let valid = true;
  extensions.forEach((extension) => {
    visitDeep(extension.properties, isCodeRef, (value) => {
      const fnString = value.toString();
      const match = fnString.match(importPattern);
      if (!match) {
        valid = false;
      }
    });
  });
  return valid;
};
