import {
  verifyOpenShiftProjectExists,
  deleteOpenShiftProject,
  createOpenShiftProject,
} from './oc_commands/project';
import { ensureAdminOcSession } from './oc_commands/baseCommands';

export const createAndVerifyProject = (projectName: string): void => {
  createOpenShiftProject(projectName).then((result) => {
    expect(result.exitCode).to.equal(0);
  });

  verifyOpenShiftProjectExists(projectName).then((exists) => {
    if (!exists) {
      throw new Error(`Expected project ${projectName} to exist, but it does not.`);
    }
  });
};

// Best-effort cleanup for after() hooks — failures are logged, never thrown.
export const cleanupTestProject = (projectName: string): void => {
  cy.log(`Cleaning up project ${projectName}`);
  ensureAdminOcSession().then(() => {
    cy.exec(`oc delete project ${projectName} --wait=false --ignore-not-found`, {
      failOnNonZeroExit: false,
    }).then((result) => {
      if (result.exitCode !== 0) {
        cy.log(`⚠️ Cleanup: could not delete project ${projectName} (non-fatal): ${result.stderr}`);
      }
    });
  });
};

/**
 * Find an existing project matching a name prefix that is safe to reuse.
 *
 * A plain `oc get projects` name match is not enough: another spec sharing the
 * same prefix (e.g. NonConcurrent Gen AI tests) may have just deleted it in
 * its `after()` hook, leaving the namespace in a `Terminating` state that
 * still shows up in the list but will reject further `oc apply`/`oc exec`
 * calls. Only a project whose phase is `Active` is safe to reuse.
 *
 * @param prefix Project name prefix to search for
 * @returns The reusable project name, or undefined if none is found
 */
export const findActiveProjectByPrefix = (prefix: string): Cypress.Chainable<string | undefined> =>
  cy
    .exec(`oc get projects -o jsonpath='{.items[*].metadata.name}'`, { failOnNonZeroExit: false })
    .then((result) => {
      const candidates = result.stdout.split(' ').filter((name) => name.startsWith(prefix));

      const checkNext = (index: number): Cypress.Chainable<string | undefined> => {
        if (index >= candidates.length) {
          return cy.wrap<string | undefined>(undefined);
        }
        const candidate = candidates[index];
        return cy
          .exec(`oc get project ${candidate} -o jsonpath='{.status.phase}'`, {
            failOnNonZeroExit: false,
          })
          .then((phaseResult): Cypress.Chainable<string | undefined> => {
            const phase = phaseResult.stdout.trim();
            if (phaseResult.exitCode === 0 && phase === 'Active') {
              return cy.wrap<string | undefined>(candidate);
            }
            cy.log(
              `Project '${candidate}' is not reusable (phase: ${phase || 'unknown'}), skipping`,
            );
            return checkNext(index + 1);
          });
      };

      return checkNext(0);
    });

export const createCleanProject = (projectName: string): void => {
  verifyOpenShiftProjectExists(projectName).then((exists) => {
    if (exists) {
      cy.log(`Project ${projectName} already exists. Deleting it.`);
      deleteOpenShiftProject(projectName, { wait: true }).then(() => {
        // Verify the project is actually gone before creating a new one
        // Projects can be in "Terminating" state even after delete --wait returns
        cy.log(`Waiting for project ${projectName} to be fully deleted...`);
        const checkDeleted = (): Cypress.Chainable<boolean> => {
          return verifyOpenShiftProjectExists(projectName).then(
            (stillExists): Cypress.Chainable<boolean> => {
              if (stillExists) {
                cy.log(`Project ${projectName} still exists, waiting...`);
                // eslint-disable-next-line cypress/no-unnecessary-waiting
                cy.wait(1000); // Wait 1 second
                return checkDeleted(); // Recursively check again
              }
              return cy.wrap(true);
            },
          );
        };
        checkDeleted().then(() => {
          cy.log(`Creating project ${projectName}`);
          createAndVerifyProject(projectName);
        });
      });
    } else {
      cy.log(`Creating project ${projectName}`);
      createAndVerifyProject(projectName);
    }
  });
};
