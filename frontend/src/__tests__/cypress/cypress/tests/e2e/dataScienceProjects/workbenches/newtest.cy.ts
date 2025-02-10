import { validateWorkbenchTolerations } from '~/__tests__/cypress/cypress/utils/oc_commands/workbench';

describe('test', () => {
  it('test', () => {
    const projectName = 'dsp-wb-tolerations-test';
    const workbenchName = 'dsp-wb-tolerations-test';
    const tolerationValue = 'workbooktoleration';

    // oc get pods -n dsp-wb-tolerations-test -o custom-columns=NAME:.metadata.name --no-headers | grep ^dsp-wb-tolerations-test
    validateWorkbenchTolerations(
      projectName, // Namespace
      workbenchName, // Workbench prefix
      tolerationValue, // No toleration expected
      true, // Expect pod NOT to be running
    ).then((resolvedPodName) => {
      cy.log(`Pod should not be running - name: ${resolvedPodName}`);
    });
  });
});
