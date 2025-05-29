import {
  mockDashboardConfig,
  mockDataSciencePipelineApplicationK8sResource,
  mockK8sResourceList,
  mockProjectK8sResource,
  mockRouteK8sResource,
} from '#~/__mocks__';
import {
  DataSciencePipelineApplicationModel,
  ProjectModel,
  RouteModel,
} from '#~/__tests__/cypress/cypress/utils/models';

export const configIntercept = (): void => {
  cy.interceptOdh('GET /api/config', mockDashboardConfig({}));
};

export const projectsIntercept = (
  projectResources: Parameters<typeof mockProjectK8sResource>,
): void => {
  cy.interceptK8sList(
    ProjectModel,
    mockK8sResourceList(
      projectResources.map((resource) =>
        mockProjectK8sResource({
          k8sName: resource.k8sName,
          displayName: 'Test project',
          ...resource,
        }),
      ),
    ),
  );
};

export const dspaIntercepts = (projectName = 'test-project-name'): void => {
  cy.interceptK8s(
    DataSciencePipelineApplicationModel,
    mockDataSciencePipelineApplicationK8sResource({
      namespace: projectName,
      name: 'pipelines-definition',
    }),
  );

  cy.interceptK8sList(
    DataSciencePipelineApplicationModel,
    mockK8sResourceList([
      mockDataSciencePipelineApplicationK8sResource({
        namespace: projectName,
      }),
    ]),
  );

  cy.interceptK8s(
    DataSciencePipelineApplicationModel,
    mockDataSciencePipelineApplicationK8sResource({ namespace: projectName, name: 'dspa' }),
  );

  cy.interceptK8s(
    RouteModel,
    mockRouteK8sResource({
      notebookName: 'ds-pipeline-dspa',
      namespace: projectName,
    }),
  );
};
