import { mockProjectK8sResource } from '@odh-dashboard/k8s-core/__mocks__/mockProjectK8sResource';
import { mockK8sResourceList } from '@odh-dashboard/k8s-core/__mocks__/mockK8sResourceList';
import { mock403Error } from '@odh-dashboard/k8s-core/__mocks__/mockK8sStatus';
import { mockSelfSubjectAccessReview } from '@odh-dashboard/internal/__mocks__/mockSelfSubjectAccessReview';
import { createProjectModal, editProjectModal, projectListPage } from '../../../pages/projects';
import { deleteModal } from '../../../pages/components/DeleteModal';
import {
  ProjectModel,
  ProjectRequestModel,
  SelfSubjectAccessReviewModel,
} from '../../../utils/models';
import { captureTracking, expectSafeTracking } from '../../../utils/analytics';

describe('Project failure tracking', () => {
  const message = 'Forbidden: private-project-diagnostic-95482';

  beforeEach(() => {
    cy.interceptK8sList(ProjectModel, mockK8sResourceList([mockProjectK8sResource({})]));
    cy.interceptK8s(
      'POST',
      SelfSubjectAccessReviewModel,
      mockSelfSubjectAccessReview({ allowed: true }),
    );
  });

  it('should keep create errors in the UI and track only the category', () => {
    cy.interceptK8s('POST', ProjectRequestModel, {
      statusCode: 403,
      body: mock403Error({ message }),
    }).as('create');
    projectListPage.visit();
    projectListPage.findCreateProjectButton().click();
    createProjectModal.k8sNameDescription.findDisplayNameInput().type('Another project');
    captureTracking();
    createProjectModal.findSubmitButton().click();
    cy.wait('@create');
    createProjectModal.find().should('contain.text', message);
    expectSafeTracking('NewProject Created', { success: false, error: 'k8s_403' }, message);
  });

  it('should keep edit errors in the UI and track only the category', () => {
    cy.interceptK8s(
      'PUT',
      { model: ProjectModel, name: 'test-project' },
      { statusCode: 403, body: mock403Error({ message }) },
    ).as('edit');
    projectListPage.visit();
    projectListPage.getProjectRow('Test Project').findKebabAction('Edit project').click();
    editProjectModal.findEditDescriptionName().type('Updated description');
    captureTracking();
    editProjectModal.findSubmitButton().click();
    cy.wait('@edit');
    editProjectModal.find().should('contain.text', message);
    expectSafeTracking('Project Edited', { success: false, error: 'k8s_403' }, message);
  });

  it('should keep delete errors in the UI without tracking the caught object', () => {
    cy.interceptK8s(
      'DELETE',
      { model: ProjectModel, name: 'test-project' },
      { statusCode: 403, body: mock403Error({ message }) },
    ).as('delete');
    projectListPage.visit();
    projectListPage.getProjectRow('Test Project').findKebabAction('Delete project').click();
    deleteModal.findInput().type('Test Project');
    captureTracking();
    deleteModal.findSubmitButton().click();
    cy.wait('@delete');
    deleteModal.find().should('contain.text', message);
    expectSafeTracking('Project Deleted', { success: false, error: 'k8s_403' }, message);
  });
});
