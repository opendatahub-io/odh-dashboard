import { afterEach, beforeEach, describe, expect, it } from '@jest/globals';
import { generateTestUUID } from '../uuidGenerator';

type CypressTestGlobal = {
  spec: { relative: string };
  env: (name: string) => string | undefined;
};

describe('generateTestUUID', () => {
  const originalCypress = Object.getOwnPropertyDescriptor(globalThis, 'Cypress');
  let relativeSpec = 'cypress/tests/e2e/automl/testAutoml.cy.ts';
  let environment: Record<string, string>;

  beforeEach(() => {
    relativeSpec = 'cypress/tests/e2e/automl/testAutoml.cy.ts';
    environment = { JOB_NAME: '3.6/automl-ui-tests', BUILD_NUMBER: '22' };
    Object.defineProperty(globalThis, 'Cypress', {
      configurable: true,
      value: {
        get spec() {
          return { relative: relativeSpec };
        },
        env: (name: string) => environment[name],
      } satisfies CypressTestGlobal,
    });
  });

  afterEach(() => {
    if (originalCypress) {
      Object.defineProperty(globalThis, 'Cypress', originalCypress);
    } else {
      Reflect.deleteProperty(globalThis, 'Cypress');
    }
  });

  it('returns a stable seven-character identifier for the same spec and build', () => {
    const first = generateTestUUID();
    expect(generateTestUUID()).toBe(first);
    expect(first).toMatch(/^[0-9a-z]{7}$/);
  });

  it('changes for a different spec, job, or build', () => {
    const original = generateTestUUID();
    relativeSpec = 'cypress/tests/e2e/automl/testOther.cy.ts';
    expect(generateTestUUID()).not.toBe(original);

    relativeSpec = 'cypress/tests/e2e/automl/testAutoml.cy.ts';
    environment.JOB_NAME = '3.6/other-job';
    expect(generateTestUUID()).not.toBe(original);

    environment.JOB_NAME = '3.6/automl-ui-tests';
    environment.BUILD_NUMBER = '23';
    expect(generateTestUUID()).not.toBe(original);
  });
});
