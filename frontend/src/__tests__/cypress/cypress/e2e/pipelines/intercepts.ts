import {
  mockDashboardConfig,
  mockDataSciencePipelineApplicationK8sResource,
  mockK8sResourceList,
  mockProjectK8sResource,
  mockRouteK8sResource,
  mockStatus,
} from '~/__mocks__';

export const statusIntercept = (): Cypress.Chainable<null> =>
  cy.intercept('/api/status', mockStatus());

export const configIntercept = (): Cypress.Chainable<null> =>
  cy.intercept('/api/config', mockDashboardConfig({ disablePipelineExperiments: false }));

export const projectsIntercept = (
  projectResources: Parameters<typeof mockProjectK8sResource>,
): Cypress.Chainable<null> =>
  cy.intercept(
    {
      pathname: '/api/k8s/apis/project.openshift.io/v1/projects',
    },
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

export const dspaIntercepts = (projectName = 'test-project-name'): void => {
  cy.intercept(
    {
      pathname: `/api/k8s/apis/datasciencepipelinesapplications.opendatahub.io/v1alpha1/namespaces/${projectName}/datasciencepipelinesapplications/pipelines-definition`,
    },
    mockDataSciencePipelineApplicationK8sResource({ namespace: projectName }),
  );

  cy.intercept(
    {
      pathname: `/api/k8s/apis/datasciencepipelinesapplications.opendatahub.io/v1alpha1/namespaces/${projectName}/datasciencepipelinesapplications`,
    },
    mockK8sResourceList([mockDataSciencePipelineApplicationK8sResource({})]),
  );

  cy.intercept(
    {
      method: 'GET',
      pathname: `/api/k8s/apis/datasciencepipelinesapplications.opendatahub.io/v1alpha1/namespaces/${projectName}/datasciencepipelinesapplications/dspa`,
    },
    mockDataSciencePipelineApplicationK8sResource({}),
  );

  cy.intercept(
    {
      pathname: `/api/k8s/apis/route.openshift.io/v1/namespaces/${projectName}/routes/ds-pipeline-dspa`,
    },
    mockRouteK8sResource({
      notebookName: 'ds-pipeline-pipelines-definition',
      namespace: projectName,
    }),
  );
};
