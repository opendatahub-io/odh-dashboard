import {
  verifyOpenShiftProjectExists,
  deleteOpenShiftProject,
  createOpenShiftProject,
} from '#~/__tests__/cypress/cypress/utils/oc_commands/project';

export const createAndVerifyProject = (projectName: string): void => {
  createOpenShiftProject(projectName).then((result) => {
    expect(result.code).to.equal(0);
  });

  verifyOpenShiftProjectExists(projectName).then((exists) => {
    if (!exists) {
      throw new Error(`Expected project ${projectName} to exist, but it does not.`);
    }
  });
};

export const createCleanProject = (projectName: string): void => {
  verifyOpenShiftProjectExists(projectName).then((exists) => {
    if (exists) {
      cy.log(`Project ${projectName} already exists. Deleting it.`);
      deleteOpenShiftProject(projectName, { wait: true }).then(() => {
        cy.log(`Waiting for project ${projectName} to be fully deleted...`);
        const checkDeleted = (): Cypress.Chainable<boolean> => {
          return verifyOpenShiftProjectExists(projectName).then(
            (stillExists): Cypress.Chainable<boolean> => {
              if (stillExists) {
                cy.log(`Project ${projectName} still exists, waiting...`);
                // eslint-disable-next-line cypress/no-unnecessary-waiting
                cy.wait(1000);
                return checkDeleted();
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
