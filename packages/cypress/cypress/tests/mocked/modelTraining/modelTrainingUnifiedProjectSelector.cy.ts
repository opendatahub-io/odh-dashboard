/* eslint-disable camelcase */
import {
  initIntercepts,
  mockRayJobs,
  mockTrainJobs,
  projectDisplayName,
  projectName,
} from './modelTrainingTestUtils';
import { asClusterAdminUser, asProjectEditUser } from '../../../utils/mockUsers';
import { modelTrainingGlobal } from '../../../pages/modelTraining';

describe('Model Training unified project selector', () => {
  beforeEach(() => {
    asClusterAdminUser();
  });

  it('should allow an admin to view all training jobs when the flag is enabled', () => {
    initIntercepts({ allProjects: true });
    modelTrainingGlobal.visit(projectName, false, ['unifiedProjectSelector=true']);

    modelTrainingGlobal.findViewAcrossAllProjectsLink().should('be.visible').click();
    cy.location('pathname').should('eq', '/develop-train/training-jobs');

    modelTrainingGlobal
      .findAllProjectsBanner()
      .should('be.visible')
      .and('contain.text', "You're viewing jobs across every project you have access to.");
    modelTrainingGlobal.findTrainingJobTable().should('be.visible');
    modelTrainingGlobal
      .findTrainingJobTable()
      .should('contain.text', mockTrainJobs[0].metadata.name);
    modelTrainingGlobal.findTrainingJobTable().should('contain.text', mockRayJobs[0].metadata.name);
    modelTrainingGlobal.findExitAllProjectsLink().should('be.visible').click();
    cy.location('pathname').should('match', /\/develop-train\/training-jobs\/[^/]+$/);
  });

  it('should preserve the legacy project selector when the flag is disabled', () => {
    initIntercepts();
    modelTrainingGlobal.visit(projectName);

    modelTrainingGlobal.findProjectSelectorToggle().should('be.visible');
    modelTrainingGlobal.findViewAcrossAllProjectsLink().should('not.exist');
    modelTrainingGlobal.findAllProjectsBanner().should('not.exist');
  });

  it('should fall back to the normal selector when the unified selector flag is disabled', () => {
    initIntercepts();
    modelTrainingGlobal.visit(projectName, false, ['unifiedProjectSelector=false']);

    modelTrainingGlobal.findProjectSelectorToggle().should('be.visible').click();
    modelTrainingGlobal.findProjectMenuItem(projectDisplayName).should('be.visible');
    modelTrainingGlobal.findViewAcrossAllProjectsLink().should('not.exist');
    modelTrainingGlobal.findAllProjectsBanner().should('not.exist');
  });

  it('should keep a non-admin on the selected project when the flag is enabled', () => {
    asProjectEditUser({ projects: [projectName] });
    initIntercepts({ allProjects: true });

    modelTrainingGlobal.visit(projectName, false, ['unifiedProjectSelector=true']);

    modelTrainingGlobal.findProjectSelectorToggle().should('not.exist');
    modelTrainingGlobal.findViewAcrossAllProjectsLink().should('not.exist');
    modelTrainingGlobal.findAllProjectsBanner().should('not.exist');
    cy.location('pathname').should('eq', `/develop-train/training-jobs/${projectName}`);
  });
});
