import {
  mockProjectK8sResource,
  mockProjectsK8sList,
} from '@odh-dashboard/internal/__mocks__/mockProjectK8sResource';
import { mockK8sResourceList } from '@odh-dashboard/internal/__mocks__/mockK8sResourceList';
import type { ProjectKind } from '@odh-dashboard/internal/k8sTypes';
import { incrementResourceVersion } from '@odh-dashboard/internal/__mocks__/mockUtils';
import { mock200Status } from '@odh-dashboard/internal/__mocks__/mockK8sStatus';
import { mockDscStatus, mockNotebookK8sResource } from '@odh-dashboard/internal/__mocks__';
import { mockPodK8sResource } from '@odh-dashboard/internal/__mocks__/mockPodK8sResource';
import { mockSelfSubjectAccessReview } from '@odh-dashboard/internal/__mocks__/mockSelfSubjectAccessReview';
import { DataScienceStackComponent } from '@odh-dashboard/internal/concepts/areas/types';
import { asProjectAdminUser } from '../../../utils/mockUsers';
import { notebookConfirmModal } from '../../../pages/workbench';
import { testPagination } from '../../../utils/pagination';
import {
  NotebookModel,
  PodModel,
  ProjectModel,
  ProjectRequestModel,
  SelfSubjectAccessReviewModel,
} from '../../../utils/models';
import { deleteModal } from '../../../pages/components/DeleteModal';
import { createProjectModal, projectListPage } from '../../../pages/projects';

const mockProject = mockProjectK8sResource({ description: 'Mock description' });
const initIntercepts = () => {
  cy.interceptK8sList(ProjectModel, mockK8sResourceList([mockProject]));
};

describe('Projects details', () => {
  it('should not have option to create new project', () => {
    asProjectAdminUser({ isSelfProvisioner: false });
    projectListPage.visit();
    projectListPage.shouldBeEmpty();
    projectListPage.findCreateProjectButton().should('not.exist');
  });

  it('should create project', () => {
    initCreateProjectIntercepts();

    projectListPage.visit();
    projectListPage.shouldBeEmpty();
    projectListPage.findCreateProjectButton().click();
    createProjectModal.shouldBeOpen();
    createProjectModal.findCancelButton().click();
    createProjectModal.shouldBeOpen(false);
    projectListPage.findCreateProjectButton().click();
    createProjectModal.shouldBeOpen();
    createProjectModal.findSubmitButton().should('be.disabled');

    // Standard items pass
    createProjectModal.k8sNameDescription.findDisplayNameInput().type('My Test Project');
    createProjectModal.k8sNameDescription.findDescriptionInput().type('Test project description.');
    createProjectModal.findSubmitButton().should('be.enabled');
    // Really long display names pass
    createProjectModal.k8sNameDescription
      .findDisplayNameInput()
      .clear()
      .type(
        'This is a really long display name that will cause the Kubernetes name to exceed its max length and auto trim',
      );
    createProjectModal.findSubmitButton().should('be.enabled');
    createProjectModal.k8sNameDescription.findResourceEditLink().click();
    createProjectModal.k8sNameDescription
      .findResourceNameInput()
      .should('have.attr', 'aria-invalid', 'false');
    createProjectModal.k8sNameDescription
      .findResourceNameInput()
      .should('have.value', 'this-is-a-really-long-display');
    // Invalid character k8s names fail
    createProjectModal.k8sNameDescription.findResourceNameInput().clear().type('InVaLiD vAlUe!');
    createProjectModal.k8sNameDescription
      .findResourceNameInput()
      .should('have.attr', 'aria-invalid', 'true');
    createProjectModal.findSubmitButton().should('be.disabled');
    // Invalid length k8s names fail
    createProjectModal.k8sNameDescription
      .findResourceNameInput()
      .clear()
      .type('this-is-a-valid-character-string-but-it-is-too-long');
    createProjectModal.k8sNameDescription
      .findResourceNameInput()
      .should('have.attr', 'aria-invalid', 'true');
    createProjectModal.findSubmitButton().should('be.disabled');
    // Valid k8s names succeed
    createProjectModal.k8sNameDescription.findResourceNameInput().clear().type('test-project');
    createProjectModal.findSubmitButton().click();
    cy.wsK8s('ADDED', ProjectModel, mockProjectK8sResource({}));

    cy.url().should('include', '/projects/test-project');
  });

  it('should list the new project', () => {
    initIntercepts();
    projectListPage.visit();
    projectListPage.shouldHaveProjects();
    const projectRow = projectListPage.getProjectRow('Test Project');
    projectRow.find().should('exist');
    projectRow.findDescription().should('contain.text', 'Mock description');
  });

  it('should delete project', () => {
    initIntercepts();
    projectListPage.visit();
    cy.interceptK8s(
      'POST',
      SelfSubjectAccessReviewModel,
      mockSelfSubjectAccessReview({ allowed: true }),
    ).as('selfSubjectAccessReviewsCall');
    const deleteProject = projectListPage
      .getProjectRow('Test Project')
      .findKebabAction('Delete project');
    cy.wait('@selfSubjectAccessReviewsCall');
    deleteProject.click();
    deleteModal.shouldBeOpen();
    deleteModal.findSubmitButton().should('be.disabled');
    deleteModal.findCancelButton().should('be.enabled').click();
    projectListPage.getProjectRow('Test Project').findKebabAction('Delete project').click();
    deleteModal.findInput().type('Test Project');

    cy.interceptK8s(
      'DELETE',
      {
        model: ProjectModel,
        name: 'test-project',
      },
      mock200Status({}),
    ).as('deleteProject');

    deleteModal.findSubmitButton().should('be.enabled').click();
    cy.wait('@deleteProject');

    cy.wsK8s('MODIFIED', ProjectModel, deletedMockProjectResource(mockProject));
    projectListPage.shouldBeEmpty();
  });

  it('validate pagination', () => {
    const totalItems = 50;
    const mockProjects: ProjectKind[] = Array.from({ length: totalItems }, (_, i) =>
      mockProjectK8sResource({
        k8sName: `ds-project-${i}`,
        displayName: `DS Project ${i}`,
        isDSProject: true,
      }),
    );
    mockProjectK8sResource({});
    cy.interceptK8sList(ProjectModel, mockK8sResourceList(mockProjects));
    projectListPage.visit();

    // top pagination
    testPagination({ totalItems, firstElement: 'DS Project 0', paginationVariant: 'top' });

    // bottom pagination
    testPagination({
      totalItems,
      firstElement: 'DS Project 0',
      paginationVariant: 'bottom',
    });
  });

  it('should react to updates through web sockets', () => {
    const projectsMock = mockProjectsK8sList();
    const projects = projectsMock.items;
    projectsMock.items = [projects[0]];
    const renamed = incrementResourceVersion(projects[1]);
    renamed.metadata.annotations = {
      ...projects[1].metadata.annotations,
      'openshift.io/display-name': 'renamed',
    };

    cy.interceptK8sList(ProjectModel, projectsMock);
    projectListPage.visit();

    projectListPage.shouldHaveProjects();
    projectListPage.findProjectLink('DS Project 1').should('exist');

    cy.wsK8s('ADDED', ProjectModel, projects[1]);
    projectListPage.findProjectLink('DS Project 2').should('exist');

    cy.wsK8s('MODIFIED', ProjectModel, renamed);
    projectListPage.findProjectLink('renamed').should('exist');
    projectListPage.findProjectLink('DS Project 2').should('not.exist');

    cy.wsK8s('DELETED', ProjectModel, renamed);
    projectListPage.findProjectLink('DS Project 1').should('exist');
    projectListPage.findProjectLink('DS Project 2').should('not.exist');
    projectListPage.findProjectLink('renamed').should('not.exist');
  });

  it('should disable kebab actions with insufficient permissions', () => {
    initIntercepts();
    projectListPage.visit();
    cy.interceptK8s(
      'POST',
      SelfSubjectAccessReviewModel,
      mockSelfSubjectAccessReview({ allowed: false }),
    ).as('selfSubjectAccessReviewsCall');

    const editProject = projectListPage
      .getProjectRow('Test Project')
      .findKebabAction('Edit project');
    const editPermission = projectListPage
      .getProjectRow('Test Project')
      .findKebabAction('Edit permissions');
    const deleteProject = projectListPage
      .getProjectRow('Test Project')
      .findKebabAction('Delete project');
    cy.wait('@selfSubjectAccessReviewsCall');

    editProject.should('have.attr', 'aria-disabled', 'true');
    editPermission.should('have.attr', 'aria-disabled', 'true');
    deleteProject.should('have.attr', 'aria-disabled', 'true');
  });

  it('should filter by name', () => {
    initIntercepts();
    projectListPage.visit();

    // Type in the name filter
    const projectListToolbar = projectListPage.getTableToolbar();
    projectListToolbar.findNameFilter().type('Test Project');
    // Verify only rows with the typed run name exist
    projectListPage.getProjectRow('Test Project').find().should('exist');
  });

  it('should filter by user', () => {
    initIntercepts();
    projectListPage.visit();

    // Type in the user filter
    const projectListToolbar = projectListPage.getTableToolbar();
    projectListToolbar.findFilterMenuOption('filter-toolbar-dropdown', 'User').click();

    projectListToolbar.findUserFilter().type('test-user');
    // Verify only rows with the typed run user exist
    projectListPage.getProjectRow('Test Project').find().should('exist');
  });

  it('should filter by AI projects', () => {
    const mockProjects: ProjectKind[] = [
      mockProjectK8sResource({
        k8sName: 'ai-project-1',
        displayName: 'AI Project 1',
        isDSProject: true,
      }),
      mockProjectK8sResource({
        k8sName: 'ai-project-2',
        displayName: 'AI Project 2',
        isDSProject: true,
      }),
      mockProjectK8sResource({
        k8sName: 'non-ai-project',
        displayName: 'Non-AI Project',
        isDSProject: false,
      }),
    ];
    cy.interceptK8sList(ProjectModel, mockK8sResourceList(mockProjects));
    projectListPage.visit();

    // By default, A.I. projects filter is selected, verify only AI projects are shown
    projectListPage.getProjectRow('AI Project 1').find().should('exist');
    projectListPage.getProjectRow('AI Project 2').find().should('exist');
    projectListPage.findProjectLink('Non-AI Project').should('not.exist');
  });

  it('should filter by AI projects and name', () => {
    const mockProjects: ProjectKind[] = [
      mockProjectK8sResource({
        k8sName: 'ai-project-alpha',
        displayName: 'AI Project Alpha',
        isDSProject: true,
      }),
      mockProjectK8sResource({
        k8sName: 'ai-project-beta',
        displayName: 'AI Project Beta',
        isDSProject: true,
      }),
      mockProjectK8sResource({
        k8sName: 'ai-project-gamma',
        displayName: 'AI Project Gamma',
        isDSProject: true,
      }),
      mockProjectK8sResource({
        k8sName: 'non-ai-project',
        displayName: 'Non-AI Project Alpha',
        isDSProject: false,
      }),
    ];
    cy.interceptK8sList(ProjectModel, mockK8sResourceList(mockProjects));
    projectListPage.visit();

    // By default, A.I. projects filter is already selected
    // Filter by name
    const projectListToolbar = projectListPage.getTableToolbar();
    projectListToolbar.findNameFilter().type('Alpha');

    // Verify only AI Project Alpha is shown (not Non-AI Project Alpha)
    projectListPage.getProjectRow('AI Project Alpha').find().should('exist');
    projectListPage.findProjectLink('AI Project Beta').should('not.exist');
    projectListPage.findProjectLink('AI Project Gamma').should('not.exist');
    projectListPage.findProjectLink('Non-AI Project Alpha').should('not.exist');
  });

  it('should toggle between AI projects and All projects filters', () => {
    // TODO: Re-enable this test when project type filtering is re-implemented
    // The project type dropdown has been removed in the toolbar refactor
    const mockProjects: ProjectKind[] = [
      mockProjectK8sResource({
        k8sName: 'ai-project-1',
        displayName: 'AI Project 1',
        isDSProject: true,
      }),
      mockProjectK8sResource({
        k8sName: 'non-ai-project',
        displayName: 'Non-AI Project',
        isDSProject: false,
      }),
    ];
    cy.interceptK8sList(ProjectModel, mockK8sResourceList(mockProjects));
    projectListPage.visit();

    const projectListToolbar = projectListPage.getTableToolbar();

    // By default, A.I. projects filter is selected
    projectListPage.getProjectRow('AI Project 1').find().should('exist');
    projectListPage.findProjectLink('Non-AI Project').should('not.exist');

    // Switch to "All projects"
    projectListToolbar.selectProjectType('All projects');
    projectListPage.getProjectRow('AI Project 1').find().should('exist');
    projectListPage.getProjectRow('Non-AI Project').find().should('exist');

    // Switch back to "A.I. projects"
    projectListToolbar.selectProjectType('A.I. projects');
    projectListPage.getProjectRow('AI Project 1').find().should('exist');
    projectListPage.findProjectLink('Non-AI Project').should('not.exist');
  });

  it('should clear filters and reset to show all projects', () => {
    const mockProjects: ProjectKind[] = [
      mockProjectK8sResource({
        k8sName: 'ai-project-1',
        displayName: 'AI Project 1',
        isDSProject: true,
      }),
      mockProjectK8sResource({
        k8sName: 'ai-project-2',
        displayName: 'AI Project 2',
        isDSProject: true,
      }),
      mockProjectK8sResource({
        k8sName: 'non-ai-project-1',
        displayName: 'Non-AI Project 1',
        isDSProject: false,
      }),
      mockProjectK8sResource({
        k8sName: 'non-ai-project-2',
        displayName: 'Non-AI Project 2',
        isDSProject: false,
      }),
    ];
    cy.interceptK8sList(ProjectModel, mockK8sResourceList(mockProjects));
    projectListPage.visit();

    const projectListToolbar = projectListPage.getTableToolbar();

    // Step 1: Initially only AI projects should show (default filter)
    // Verify only AI projects are visible
    projectListPage.getProjectRow('AI Project 1').find().should('exist');
    projectListPage.getProjectRow('AI Project 2').find().should('exist');

    projectListPage.findProjectLink('Non-AI Project 1').should('not.exist');
    projectListPage.findProjectLink('Non-AI Project 2').should('not.exist');

    // also; that the ai projects don't have the label:

    projectListPage.getProjectRow('AI Project 1').findAILabel().should('not.exist');
    projectListPage.getProjectRow('AI Project 2').findAILabel().should('not.exist');

    // Verify only 2 projects are showing (the AI ones)
    cy.findAllByRole('link', { name: /AI Project / }).should('have.length', 2);

    // Step 2: Enter text to search that doesn't match anything
    projectListToolbar.findNameFilter().type('NonExistentProject');

    // Verify no results are shown
    projectListPage.findEmptyResults().should('exist');
    cy.findByTestId('Name-filter-chip').should('contain.text', 'NonExistentProject');

    // Step 3: Click the 'clear filters' button
    projectListPage.findClearFiltersButton().click();

    // Step 4: Verify thet still only ai  projects are now shown
    projectListPage.getProjectRow('AI Project 1').find().should('exist');
    projectListPage.getProjectRow('AI Project 2').find().should('exist');
    projectListPage.findProjectLink('Non-AI Project 1').should('not.exist');
    projectListPage.findProjectLink('Non-AI Project 2').should('not.exist');

    // Step 4a: Verify filters are reset (text)
    // Note: Project type dropdown no longer exists in refactored UI

    // TODO: Update this test when project type filtering is re-implemented
    // For now, verify that projects are still filtered as expected
    // and other filters should be empty

    // Verify name filter is cleared
    projectListToolbar.findNameFilter().should('have.value', '');

    projectListToolbar.findFilterMenuOption('filter-toolbar-dropdown', 'User').click();
    projectListToolbar.findFilterInput('provider').should('have.value', '');

    // now type another value in that should not be there:

    projectListToolbar.findUserFilter().type('non-existant-user');
    // Verify no results are shown
    projectListPage.findEmptyResults().should('exist');
    cy.findAllByRole('button', { name: 'Clear all filters' }).first().click();

    // still only ai project should show now
    projectListPage.getProjectRow('AI Project 1').find().should('exist');
    projectListPage.getProjectRow('AI Project 2').find().should('exist');
    projectListPage.findProjectLink('Non-AI Project 1').should('not.exist');
    projectListPage.findProjectLink('Non-AI Project 2').should('not.exist');
    // projectListPage.getProjectRow('Non-AI Project 1').find().should('exist');
    // projectListPage.getProjectRow('Non-AI Project 2').find().should('exist');

    // now type another value in that should not be there:
    projectListToolbar.findFilterMenuOption('filter-toolbar-dropdown', 'Name').click();
    projectListToolbar.findNameFilter().type('NonExistentProject-not-there');
    // Verify no results are shown
    projectListPage.findEmptyResults().should('exist');
    cy.findByTestId('Name-filter-chip').closest('.pf-v6-c-label').find('button').should('exist');
    cy.findByTestId('Name-filter-chip').closest('.pf-v6-c-label').find('button').click();
    cy.findByTestId('Name-filter-chip').should('not.exist');

    // switch to all projects:
    projectListToolbar.selectProjectType('All projects');

    // everything should show now:
    projectListPage.getProjectRow('AI Project 1').find().should('exist');
    projectListPage.getProjectRow('AI Project 2').find().should('exist');
    projectListPage.getProjectRow('Non-AI Project 1').find().should('exist');
    projectListPage.getProjectRow('Non-AI Project 2').find().should('exist');
  });

  it('should show list of workbenches when the column is expanded', () => {
    cy.interceptK8sList(ProjectModel, mockK8sResourceList([mockProjectK8sResource({})]));
    cy.interceptK8sList(
      { model: NotebookModel },
      mockK8sResourceList([
        mockNotebookK8sResource({
          opts: {
            spec: {
              template: {
                spec: {
                  containers: [
                    {
                      name: 'test-notebook',
                      image: 'test-image:latest',
                    },
                  ],
                },
              },
            },
            metadata: {
              name: 'test-notebook',
              namespace: 'test-project',
              labels: {
                'opendatahub.io/notebook-image': 'true',
              },
              annotations: {
                'opendatahub.io/image-display-name': 'Test image',
              },
            },
          },
        }),
      ]),
    );
    projectListPage.visit();
    const projectTableRow = projectListPage.getProjectRow('Test Project');
    projectTableRow.findNotebookColumnExpander().click();
    const notebookRows = projectTableRow.getNotebookRows();
    notebookRows.should('have.length', 1);
  });

  it('should open the modal to stop workbench when user stops the workbench', () => {
    cy.interceptK8sList(ProjectModel, mockK8sResourceList([mockProjectK8sResource({})]));
    cy.interceptK8s('PATCH', NotebookModel, mockNotebookK8sResource({})).as('stopWorkbench');
    cy.interceptK8sList(PodModel, mockK8sResourceList([mockPodK8sResource({})]));
    cy.interceptK8sList(
      NotebookModel,
      mockK8sResourceList([
        mockNotebookK8sResource({
          opts: {
            spec: {
              template: {
                spec: {
                  containers: [
                    {
                      name: 'test-notebook',
                      image: 'test-image:latest',
                    },
                  ],
                },
              },
            },
            metadata: {
              name: 'test-notebook',
              namespace: 'test-project',
              labels: {
                'opendatahub.io/notebook-image': 'true',
              },
              annotations: {
                'openshift.io/display-name': 'Test Notebook',
                'opendatahub.io/image-display-name': 'Test image',
              },
            },
          },
        }),
      ]),
    );
    projectListPage.visit();
    const projectTableRow = projectListPage.getProjectRow('Test Project');
    projectTableRow.findNotebookColumnExpander().click();
    const notebookRows = projectTableRow.getNotebookRows();
    notebookRows.should('have.length', 1);

    const notebookRow = projectTableRow.getNotebookRow('Test Notebook');
    notebookRow.findNotebookRouteLink().should('not.have.attr', 'aria-disabled');

    notebookRow.findNotebookStop().click();

    //stop workbench
    notebookConfirmModal.findStopWorkbenchButton().should('be.enabled');
    cy.interceptK8s(
      NotebookModel,
      mockNotebookK8sResource({
        opts: {
          metadata: {
            labels: {
              'opendatahub.io/notebook-image': 'true',
            },
            annotations: {
              'kubeflow-resource-stopped': '2023-02-14T21:45:14Z',
              'openshift.io/display-name': 'Test Notebook',
              'opendatahub.io/image-display-name': 'Test image',
            },
          },
        },
      }),
    );
    cy.interceptK8sList(PodModel, mockK8sResourceList([mockPodK8sResource({ isRunning: false })]));

    notebookConfirmModal.findStopWorkbenchButton().click();
    cy.wait('@stopWorkbench').then((interception) => {
      expect(interception.request.body).to.containSubset([
        {
          op: 'add',
          path: '/metadata/annotations/kubeflow-resource-stopped',
        },
      ]);
    });
    notebookRow.findNotebookStatusText().should('have.text', 'Stopped');
    notebookRow.findNotebookRouteLink().should('have.attr', 'aria-disabled', 'true');
  });

  describe('Workbench disabled', () => {
    beforeEach(() => {
      cy.interceptOdh(
        'GET /api/dsc/status',
        mockDscStatus({
          components: {
            [DataScienceStackComponent.WORKBENCHES]: { managementState: 'Removed' },
            [DataScienceStackComponent.DS_PIPELINES]: { managementState: 'Managed' },
            [DataScienceStackComponent.K_SERVE]: { managementState: 'Managed' },
            [DataScienceStackComponent.MODEL_REGISTRY]: { managementState: 'Managed' },
          },
        }),
      );
      initIntercepts();
    });

    it('should hide workbench column when workbenches are disabled', () => {
      projectListPage.visit();

      // Verify workbench column is not present
      cy.get('th').contains('Workbenches').should('not.exist');

      // Verify workbench status indicators are not shown
      const projectTableRow = projectListPage.getProjectRow('Test Project');
      projectTableRow.findNotebookColumn().should('not.exist');
    });
  });
});

const deletedMockProjectResource = (resource: ProjectKind): ProjectKind =>
  incrementResourceVersion({
    ...resource,
    metadata: {
      ...resource.metadata,
      deletionTimestamp: '2023-02-15T21:43:59Z',
    },
    status: {
      phase: 'Terminating',
    },
  });

const initCreateProjectIntercepts = () => {
  cy.interceptK8sList(ProjectModel, mockK8sResourceList([]));

  cy.interceptK8s('POST', ProjectRequestModel, mockProjectK8sResource({})).as(
    'createProjectRequest',
  );

  cy.interceptOdh(
    'GET /api/namespaces/:namespace/:context',
    { path: { namespace: 'test-project', context: '0' } },
    { applied: true },
  );
};
