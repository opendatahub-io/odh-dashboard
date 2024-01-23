/* eslint-disable camelcase */
import { RelationshipKF, ResourceTypeKF } from '~/concepts/pipelines/kfTypes';
import { mockDashboardConfig } from '~/__mocks__/mockDashboardConfig';
import { mockDataSciencePipelineApplicationK8sResource } from '~/__mocks__/mockDataSciencePipelinesApplicationK8sResource';
import { mockK8sResourceList } from '~/__mocks__/mockK8sResourceList';
import { buildMockPipeline, buildMockPipelines } from '~/__mocks__/mockPipelinesProxy';
import {
  buildMockPipelineVersion,
  buildMockPipelineVersions,
} from '~/__mocks__/mockPipelineVersionsProxy';
import { mockProjectK8sResource } from '~/__mocks__/mockProjectK8sResource';
import { mockRouteK8sResource } from '~/__mocks__/mockRouteK8sResource';
import { mockStatus } from '~/__mocks__/mockStatus';
import { pipelinesCoreAppPage, pipelinesTable } from '~/__tests__/cypress/cypress/pages/pipelines';

const projectName = 'test-project-name';

describe('PipelinesList', () => {
  beforeEach(() => {
    initIntercepts();
    pipelinesCoreAppPage.visit(projectName);
  });

  it('renders the page with pipelines table data', () => {
    pipelinesTable.find();
  });

  it('selects a different project', () => {
    cy.url().should('include', 'test-project-name');

    pipelinesCoreAppPage.selectProjectByName('Test Project 2');
    cy.url().should('include', 'test-project-name-2');
  });
});

const initIntercepts = () => {
  cy.intercept('/api/status', mockStatus());
  cy.intercept('/api/config', mockDashboardConfig({}));
  cy.intercept(
    {
      pathname: `/api/k8s/apis/datasciencepipelinesapplications.opendatahub.io/v1alpha1/namespaces/${projectName}/datasciencepipelinesapplications/pipelines-definition`,
    },
    mockDataSciencePipelineApplicationK8sResource({ namespace: projectName }),
  );
  cy.intercept(
    {
      pathname: `/api/k8s/apis/route.openshift.io/v1/namespaces/${projectName}/routes/ds-pipeline-pipelines-definition`,
    },
    mockRouteK8sResource({
      notebookName: 'ds-pipeline-pipelines-definition',
      namespace: projectName,
    }),
  );
  cy.intercept(
    {
      pathname: '/api/k8s/apis/project.openshift.io/v1/projects',
    },
    mockK8sResourceList([
      mockProjectK8sResource({ k8sName: projectName }),
      mockProjectK8sResource({ k8sName: `${projectName}-2`, displayName: 'Test Project 2' }),
    ]),
  );

  const mockPipeline = buildMockPipeline({ name: 'Test pipeline' });
  cy.intercept(
    {
      pathname: '/api/proxy/apis/v1beta1/pipelines',
    },
    buildMockPipelines([mockPipeline]),
  );

  cy.intercept(
    {
      method: 'POST',
      pathname: '/api/proxy/apis/v1beta1/pipeline_versions',
    },
    (req) => {
      req.body = {
        path: '/apis/v1beta1/pipeline_versions',
        method: 'GET',
        host: `https://ds-pipeline-pipelines-definition-${projectName}.apps.user.com`,
        queryParams: {
          sort_by: 'created_at desc',
          page_size: 10,
          'resource_key.id': mockPipeline.id,
          'resource_key.type': 'PIPELINE',
        },
      };

      req.reply(
        buildMockPipelineVersions([
          buildMockPipelineVersion({
            id: mockPipeline.default_version?.id,
            name: mockPipeline.default_version?.name,
            resource_references: [
              {
                key: { type: ResourceTypeKF.PIPELINE, id: mockPipeline.id },
                relationship: RelationshipKF.OWNER,
              },
            ],
          }),
        ]),
      );
    },
  );
};
