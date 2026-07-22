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
