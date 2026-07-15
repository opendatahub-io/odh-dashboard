import {
  verifyOpenShiftProjectExists,
  deleteOpenShiftProject,
  createOpenShiftProject,
  clearStuckProjectInferenceServices,
  waitForProjectDeletion,
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

const deleteProjectAndWait = (projectName: string): void => {
  clearStuckProjectInferenceServices(projectName).then(() => {
    // --wait=false avoids cy.exec 60s timeout when deletion is blocked by finalizers
    deleteOpenShiftProject(projectName, { wait: false, ignoreNotFound: true }).then(() => {
      cy.log(`Waiting for project ${projectName} to be fully deleted...`);
      waitForProjectDeletion(projectName).then(() => {
        cy.log(`Creating project ${projectName}`);
        createAndVerifyProject(projectName);
      });
    });
  });
};

export const createCleanProject = (projectName: string): void => {
  verifyOpenShiftProjectExists(projectName).then((exists) => {
    if (exists) {
      cy.log(`Project ${projectName} already exists. Deleting it.`);
      deleteProjectAndWait(projectName);
    } else {
      cy.log(`Creating project ${projectName}`);
      createAndVerifyProject(projectName);
    }
  });
};
