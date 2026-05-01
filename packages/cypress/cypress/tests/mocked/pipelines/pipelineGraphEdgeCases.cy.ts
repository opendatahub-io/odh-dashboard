/* eslint-disable camelcase */
import { mockDataSciencePipelineApplicationK8sResource } from '@odh-dashboard/internal/__mocks__/mockDataSciencePipelinesApplicationK8sResource';
import { mockDscStatus } from '@odh-dashboard/internal/__mocks__/mockDscStatus';
import { mockK8sResourceList } from '@odh-dashboard/internal/__mocks__/mockK8sResourceList';
import {
  buildMockPipelineVersion,
  buildMockPipelineVersions,
} from '@odh-dashboard/internal/__mocks__/mockPipelineVersionsProxy';
import { mockProjectK8sResource } from '@odh-dashboard/internal/__mocks__/mockProjectK8sResource';
import { mockRouteK8sResource } from '@odh-dashboard/internal/__mocks__/mockRouteK8sResource';
import { mockSecretK8sResource } from '@odh-dashboard/internal/__mocks__/mockSecretK8sResource';
import { buildMockPipeline } from '@odh-dashboard/internal/__mocks__';
import { ArtifactType } from '@odh-dashboard/internal/concepts/pipelines/kfTypes';
import { DataScienceStackComponent } from '@odh-dashboard/internal/concepts/areas/types';
import { initMlmdIntercepts } from './mlmdUtils';
import { pipelineDetails } from '../../../pages/pipelines';
import {
  DataSciencePipelineApplicationModel,
  ProjectModel,
  RouteModel,
  SecretModel,
} from '../../../utils/models';

const projectId = 'test-project';
const mockPipeline = buildMockPipeline({
  pipeline_id: 'test-pipeline',
  display_name: 'test-pipeline',
});

const initIntercepts = () => {
  cy.interceptOdh(
    'GET /api/dsc/status',
    mockDscStatus({
      components: {
        [DataScienceStackComponent.DS_PIPELINES]: { managementState: 'Managed' },
      },
    }),
  );
  cy.interceptK8sList(
    ProjectModel,
    mockK8sResourceList([mockProjectK8sResource({ k8sName: projectId })]),
  );
  cy.interceptK8s(
    DataSciencePipelineApplicationModel,
    mockDataSciencePipelineApplicationK8sResource({
      namespace: projectId,
      name: 'pipelines-definition',
    }),
  );

  cy.interceptK8sList(
    DataSciencePipelineApplicationModel,
    mockK8sResourceList([mockDataSciencePipelineApplicationK8sResource({ namespace: projectId })]),
  );

  cy.interceptK8s(
    DataSciencePipelineApplicationModel,
    mockDataSciencePipelineApplicationK8sResource({ namespace: projectId }),
  );
  cy.interceptK8s(
    SecretModel,
    mockSecretK8sResource({ namespace: projectId, name: 'ds-pipeline-config' }),
  );
  cy.interceptK8s(
    SecretModel,
    mockSecretK8sResource({ namespace: projectId, name: 'aws-connection-testdb' }),
  );
  cy.interceptK8s(
    RouteModel,
    mockRouteK8sResource({
      notebookName: 'ds-pipeline-dspa',
      namespace: projectId,
    }),
  );
  cy.interceptOdh(
    'GET /api/service/pipelines/:namespace/:serviceName/apis/v2beta1/pipelines/:pipelineId',
    {
      path: { namespace: projectId, serviceName: 'dspa', pipelineId: mockPipeline.pipeline_id },
    },
    mockPipeline,
  );
};

describe('Pipeline Graph Edge Cases', () => {
  describe('Complex Dependencies', () => {
    const mockComplexPipeline = buildMockPipelineVersion({
      pipeline_id: mockPipeline.pipeline_id,
      pipeline_version_id: 'complex-dependencies-version',
      display_name: 'Complex Dependencies Pipeline',
    });

    // Override pipeline_spec with complex parallel branches
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const pipelineSpec = mockComplexPipeline.pipeline_spec.pipeline_spec!;
    pipelineSpec.root.dag = {
      tasks: {
        'task-a': {
          componentRef: { name: 'comp-task-a' },
          taskInfo: { name: 'task-a' },
          cachingOptions: { enableCache: true },
        },
        'task-b1': {
          componentRef: { name: 'comp-task-b1' },
          taskInfo: { name: 'task-b1' },
          dependentTasks: ['task-a'],
          cachingOptions: { enableCache: true },
        },
        'task-b2': {
          componentRef: { name: 'comp-task-b2' },
          taskInfo: { name: 'task-b2' },
          dependentTasks: ['task-a'],
          cachingOptions: { enableCache: true },
        },
        'task-b3': {
          componentRef: { name: 'comp-task-b3' },
          taskInfo: { name: 'task-b3' },
          dependentTasks: ['task-a'],
          cachingOptions: { enableCache: true },
        },
        'task-c': {
          componentRef: { name: 'comp-task-c' },
          taskInfo: { name: 'task-c' },
          dependentTasks: ['task-b1', 'task-b2', 'task-b3'],
          cachingOptions: { enableCache: true },
        },
      },
    };

    beforeEach(() => {
      initIntercepts();
      cy.interceptOdh(
        'GET /api/service/pipelines/:namespace/:serviceName/apis/v2beta1/pipelines/:pipelineId/versions',
        {
          path: { namespace: projectId, serviceName: 'dspa', pipelineId: mockPipeline.pipeline_id },
        },
        buildMockPipelineVersions([mockComplexPipeline]),
      );
      cy.interceptOdh(
        'GET /api/service/pipelines/:namespace/:serviceName/apis/v2beta1/pipelines/:pipelineId/versions/:pipelineVersionId',
        {
          path: {
            namespace: projectId,
            serviceName: 'dspa',
            pipelineId: mockPipeline.pipeline_id,
            pipelineVersionId: mockComplexPipeline.pipeline_version_id,
          },
        },
        mockComplexPipeline,
      );
    });

    it('should render fan-out/fan-in pipeline and allow task interaction', () => {
      pipelineDetails.visit(
        projectId,
        mockPipeline.pipeline_id,
        mockComplexPipeline.pipeline_version_id,
      );

      pipelineDetails.findTaskNode('task-a').should('exist');
      pipelineDetails.findTaskNode('task-b1').should('exist');
      pipelineDetails.findTaskNode('task-b2').should('exist');
      pipelineDetails.findTaskNode('task-b3').should('exist');
      pipelineDetails.findTaskNode('task-c').should('exist');

      // PF Topology renders 2 DOM elements per edge (one in ElementWrapper, one in the TOP_LAYER via LayerContainer)
      pipelineDetails.findEdges().should('have.length', 12);

      pipelineDetails.findTaskNode('task-c').click();
      const taskDrawer = pipelineDetails.getTaskDrawer();
      taskDrawer.shouldHaveTaskName('task-c');
    });
  });

  describe('Large Graphs', () => {
    const mockLargePipeline = buildMockPipelineVersion({
      pipeline_id: mockPipeline.pipeline_id,
      pipeline_version_id: 'large-graph-version',
      display_name: 'Large Graph Pipeline (20+ tasks)',
    });

    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const largePipelineSpec = mockLargePipeline.pipeline_spec.pipeline_spec!;
    const largeDag: Record<string, (typeof largePipelineSpec.root.dag.tasks)[string]> = {};
    const largeComponents: typeof largePipelineSpec.components = {};

    for (let i = 0; i < 25; i++) {
      const taskName = `task-${i}`;
      const componentName = `comp-${taskName}`;

      largeComponents[componentName] = {
        executorLabel: `exec-${taskName}`,
        outputDefinitions: {
          artifacts: {
            output: {
              artifactType: {
                schemaTitle: ArtifactType.DATASET,
                schemaVersion: '0.0.1',
              },
            },
          },
        },
      };

      largeDag[taskName] = {
        componentRef: { name: componentName },
        taskInfo: { name: taskName },
        cachingOptions: { enableCache: true },
        ...(i > 0 && {
          dependentTasks: [`task-${i - 1}`],
        }),
      };
    }

    largePipelineSpec.components = largeComponents;
    largePipelineSpec.root.dag = { tasks: largeDag };

    beforeEach(() => {
      initIntercepts();
      cy.interceptOdh(
        'GET /api/service/pipelines/:namespace/:serviceName/apis/v2beta1/pipelines/:pipelineId/versions',
        {
          path: { namespace: projectId, serviceName: 'dspa', pipelineId: mockPipeline.pipeline_id },
        },
        buildMockPipelineVersions([mockLargePipeline]),
      );
      cy.interceptOdh(
        'GET /api/service/pipelines/:namespace/:serviceName/apis/v2beta1/pipelines/:pipelineId/versions/:pipelineVersionId',
        {
          path: {
            namespace: projectId,
            serviceName: 'dspa',
            pipelineId: mockPipeline.pipeline_id,
            pipelineVersionId: mockLargePipeline.pipeline_version_id,
          },
        },
        mockLargePipeline,
      );
    });

    it('should render pipeline with 20+ tasks', () => {
      pipelineDetails.visit(
        projectId,
        mockPipeline.pipeline_id,
        mockLargePipeline.pipeline_version_id,
      );

      pipelineDetails.findTaskNodes().should('have.length', 25);
    });
  });

  describe('Error Cases', () => {
    it('should handle incomplete and empty pipeline specs gracefully', () => {
      // Incomplete: task references a non-existent component
      const mockIncompletePipeline = buildMockPipelineVersion({
        pipeline_id: mockPipeline.pipeline_id,
        pipeline_version_id: 'incomplete-version',
        display_name: 'Incomplete Pipeline',
      });

      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const incompletePipelineSpec = mockIncompletePipeline.pipeline_spec.pipeline_spec!;
      incompletePipelineSpec.components = {};
      incompletePipelineSpec.root.dag = {
        tasks: {
          'missing-component-task': {
            componentRef: { name: 'non-existent-component' },
            taskInfo: { name: 'missing-component-task' },
            cachingOptions: { enableCache: true },
          },
        },
      };

      initIntercepts();
      cy.interceptOdh(
        'GET /api/service/pipelines/:namespace/:serviceName/apis/v2beta1/pipelines/:pipelineId/versions',
        {
          path: { namespace: projectId, serviceName: 'dspa', pipelineId: mockPipeline.pipeline_id },
        },
        buildMockPipelineVersions([mockIncompletePipeline]),
      );
      cy.interceptOdh(
        'GET /api/service/pipelines/:namespace/:serviceName/apis/v2beta1/pipelines/:pipelineId/versions/:pipelineVersionId',
        {
          path: {
            namespace: projectId,
            serviceName: 'dspa',
            pipelineId: mockPipeline.pipeline_id,
            pipelineVersionId: mockIncompletePipeline.pipeline_version_id,
          },
        },
        mockIncompletePipeline,
      );

      pipelineDetails.visit(
        projectId,
        mockPipeline.pipeline_id,
        mockIncompletePipeline.pipeline_version_id,
      );

      pipelineDetails.findPageTitle().should('exist');
      pipelineDetails.findVisualizationSurface().should('be.visible');
      pipelineDetails.findTaskNodes().should('have.length', 1);

      // Empty: no tasks at all
      const mockEmptyPipeline = buildMockPipelineVersion({
        pipeline_id: mockPipeline.pipeline_id,
        pipeline_version_id: 'empty-version',
        display_name: 'Empty Pipeline',
      });

      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const emptyPipelineSpec = mockEmptyPipeline.pipeline_spec.pipeline_spec!;
      emptyPipelineSpec.root.dag = { tasks: {} };
      emptyPipelineSpec.components = {};

      initIntercepts();
      cy.interceptOdh(
        'GET /api/service/pipelines/:namespace/:serviceName/apis/v2beta1/pipelines/:pipelineId/versions',
        {
          path: { namespace: projectId, serviceName: 'dspa', pipelineId: mockPipeline.pipeline_id },
        },
        buildMockPipelineVersions([mockEmptyPipeline]),
      );
      cy.interceptOdh(
        'GET /api/service/pipelines/:namespace/:serviceName/apis/v2beta1/pipelines/:pipelineId/versions/:pipelineVersionId',
        {
          path: {
            namespace: projectId,
            serviceName: 'dspa',
            pipelineId: mockPipeline.pipeline_id,
            pipelineVersionId: mockEmptyPipeline.pipeline_version_id,
          },
        },
        mockEmptyPipeline,
      );

      pipelineDetails.visit(
        projectId,
        mockPipeline.pipeline_id,
        mockEmptyPipeline.pipeline_version_id,
      );

      pipelineDetails.findPageTitle().should('exist');
    });
  });

  describe('Task Selection and Drawer', () => {
    const mockDrawerVersion = buildMockPipelineVersion({
      pipeline_id: mockPipeline.pipeline_id,
      pipeline_version_id: 'drawer-test-version',
      display_name: 'Drawer Test Pipeline',
    });

    beforeEach(() => {
      initIntercepts();
      cy.interceptOdh(
        'GET /api/service/pipelines/:namespace/:serviceName/apis/v2beta1/pipelines/:pipelineId/versions',
        {
          path: { namespace: projectId, serviceName: 'dspa', pipelineId: mockPipeline.pipeline_id },
        },
        buildMockPipelineVersions([mockDrawerVersion]),
      );
      cy.interceptOdh(
        'GET /api/service/pipelines/:namespace/:serviceName/apis/v2beta1/pipelines/:pipelineId/versions/:pipelineVersionId',
        {
          path: {
            namespace: projectId,
            serviceName: 'dspa',
            pipelineId: mockPipeline.pipeline_id,
            pipelineVersionId: mockDrawerVersion.pipeline_version_id,
          },
        },
        mockDrawerVersion,
      );
    });

    it('should open, close, and switch task drawer between nodes', () => {
      pipelineDetails.visit(
        projectId,
        mockPipeline.pipeline_id,
        mockDrawerVersion.pipeline_version_id,
      );

      pipelineDetails.findTaskNode('create-dataset').click();
      const taskDrawer = pipelineDetails.getTaskDrawer();
      taskDrawer.shouldHaveTaskName('create-dataset');
      taskDrawer.find().should('be.visible');

      pipelineDetails.findTaskNode('normalize-dataset').click();
      taskDrawer.shouldHaveTaskName('normalize-dataset');

      taskDrawer.findCloseDrawerButton().click();
      taskDrawer.find().should('not.exist');
    });
  });

  describe('Sequential Dependencies', () => {
    const mockSequentialPipeline = buildMockPipelineVersion({
      pipeline_id: mockPipeline.pipeline_id,
      pipeline_version_id: 'sequential-version',
      display_name: 'Sequential Pipeline',
    });

    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const sequentialPipelineSpec = mockSequentialPipeline.pipeline_spec.pipeline_spec!;
    sequentialPipelineSpec.root.dag = {
      tasks: {
        'step-1': {
          componentRef: { name: 'comp-step-1' },
          taskInfo: { name: 'step-1' },
          cachingOptions: { enableCache: true },
        },
        'step-2': {
          componentRef: { name: 'comp-step-2' },
          taskInfo: { name: 'step-2' },
          dependentTasks: ['step-1'],
          cachingOptions: { enableCache: true },
        },
        'step-3': {
          componentRef: { name: 'comp-step-3' },
          taskInfo: { name: 'step-3' },
          dependentTasks: ['step-2'],
          cachingOptions: { enableCache: true },
        },
        'step-4': {
          componentRef: { name: 'comp-step-4' },
          taskInfo: { name: 'step-4' },
          dependentTasks: ['step-3'],
          cachingOptions: { enableCache: true },
        },
      },
    };

    beforeEach(() => {
      initIntercepts();
      cy.interceptOdh(
        'GET /api/service/pipelines/:namespace/:serviceName/apis/v2beta1/pipelines/:pipelineId/versions',
        {
          path: { namespace: projectId, serviceName: 'dspa', pipelineId: mockPipeline.pipeline_id },
        },
        buildMockPipelineVersions([mockSequentialPipeline]),
      );
      cy.interceptOdh(
        'GET /api/service/pipelines/:namespace/:serviceName/apis/v2beta1/pipelines/:pipelineId/versions/:pipelineVersionId',
        {
          path: {
            namespace: projectId,
            serviceName: 'dspa',
            pipelineId: mockPipeline.pipeline_id,
            pipelineVersionId: mockSequentialPipeline.pipeline_version_id,
          },
        },
        mockSequentialPipeline,
      );
    });

    it('should render pipeline with sequential dependencies', () => {
      pipelineDetails.visit(
        projectId,
        mockPipeline.pipeline_id,
        mockSequentialPipeline.pipeline_version_id,
      );

      pipelineDetails.findTaskNode('step-1').should('exist');
      pipelineDetails.findTaskNode('step-2').should('exist');
      pipelineDetails.findTaskNode('step-3').should('exist');
      pipelineDetails.findTaskNode('step-4').should('exist');

      // PF Topology renders 2 DOM elements per edge (one in ElementWrapper, one in the TOP_LAYER via LayerContainer)
      pipelineDetails.findEdges().should('have.length', 6);
    });
  });

  describe('Toolbar Collapse/Expand Actions', () => {
    const mockToolbarVersion = buildMockPipelineVersion({
      pipeline_id: mockPipeline.pipeline_id,
      pipeline_version_id: 'toolbar-test-version',
      display_name: 'Toolbar Test Pipeline',
    });

    beforeEach(() => {
      initIntercepts();
      initMlmdIntercepts(projectId);
      cy.interceptOdh(
        'GET /api/service/pipelines/:namespace/:serviceName/apis/v2beta1/pipelines/:pipelineId/versions',
        {
          path: {
            namespace: projectId,
            serviceName: 'dspa',
            pipelineId: mockPipeline.pipeline_id,
          },
        },
        buildMockPipelineVersions([mockToolbarVersion]),
      );
      cy.interceptOdh(
        'GET /api/service/pipelines/:namespace/:serviceName/apis/v2beta1/pipelines/:pipelineId/versions/:pipelineVersionId',
        {
          path: {
            namespace: projectId,
            serviceName: 'dspa',
            pipelineId: mockPipeline.pipeline_id,
            pipelineVersionId: mockToolbarVersion.pipeline_version_id,
          },
        },
        mockToolbarVersion,
      );
      pipelineDetails.visit(
        projectId,
        mockPipeline.pipeline_id,
        mockToolbarVersion.pipeline_version_id,
      );
    });

    it('should toggle collapse/expand, preserve selection, and allow node interactions', () => {
      pipelineDetails.findZoomInButton().should('be.visible');
      pipelineDetails.findZoomOutButton().should('be.visible');
      pipelineDetails.findFitToScreenButton().should('be.visible');
      pipelineDetails.findResetViewButton().should('be.visible');
      pipelineDetails.findCollapseAllButton().should('be.visible').and('not.be.disabled');
      pipelineDetails.findExpandAllButton().should('be.visible').and('not.be.disabled');

      pipelineDetails.findCollapseAllButton().click();
      pipelineDetails.findVisualizationSurface().should('be.visible');
      pipelineDetails.findTaskNodes().should('be.visible');
      pipelineDetails.findEdges().should('have.length.greaterThan', 0);
      pipelineDetails.findNodes().should('have.length.greaterThan', 0);
      pipelineDetails.findCollapseAllButton().should('not.be.disabled');
      pipelineDetails.findExpandAllButton().should('not.be.disabled');

      pipelineDetails.findFitToScreenButton().click();
      pipelineDetails.findVisualizationSurface().should('be.visible');

      pipelineDetails.findExpandAllButton().click();
      pipelineDetails.findVisualizationSurface().should('be.visible');
      pipelineDetails.findNodes().should('have.length.greaterThan', 0);
      pipelineDetails.findCollapseAllButton().should('not.be.disabled');
      pipelineDetails.findExpandAllButton().should('not.be.disabled');

      pipelineDetails.findFitToScreenButton().click();
      pipelineDetails.findVisualizationSurface().should('be.visible');

      // Second cycle to verify repeated collapse/expand
      pipelineDetails.findCollapseAllButton().click();
      pipelineDetails.findVisualizationSurface().should('be.visible');
      pipelineDetails.findNodes().should('have.length.greaterThan', 0);

      pipelineDetails.findExpandAllButton().click();

      // Verify node selection persists across collapse/expand
      pipelineDetails.findTaskNode('create-dataset').click();
      const taskDrawer = pipelineDetails.getTaskDrawer();
      taskDrawer.shouldHaveTaskName('create-dataset');

      pipelineDetails.findCollapseAllButton().click();
      taskDrawer.find().should('exist');

      pipelineDetails.findExpandAllButton().click();
      taskDrawer.find().should('exist');
      taskDrawer.shouldHaveTaskName('create-dataset');
      taskDrawer.findCloseDrawerButton().click();

      // After collapse, interact with different nodes
      pipelineDetails.findCollapseAllButton().click();
      pipelineDetails.findTaskNode('create-dataset').click();
      taskDrawer.shouldHaveTaskName('create-dataset');
      taskDrawer.findCloseDrawerButton().click();

      pipelineDetails.findExpandAllButton().click();
      pipelineDetails.findTaskNode('normalize-dataset').click();
      taskDrawer.shouldHaveTaskName('normalize-dataset');
    });
  });
});
