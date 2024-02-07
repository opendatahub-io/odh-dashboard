// TODO bring back this test during runs v2 work
// /* eslint-disable camelcase */
// import { mockStatus } from '~/__mocks__/mockStatus';
// import { mockDashboardConfig } from '~/__mocks__/mockDashboardConfig';
// import { mockDataSciencePipelineApplicationK8sResource } from '~/__mocks__/mockDataSciencePipelinesApplicationK8sResource';
// import { mockRouteK8sResource } from '~/__mocks__/mockRouteK8sResource';
// import { mockK8sResourceList } from '~/__mocks__/mockK8sResourceList';
// import { mockProjectK8sResource } from '~/__mocks__/mockProjectK8sResource';
// import {
//   createRunPage,
//   cloneRunPage,
//   pipelineRunJobTable,
//   pipelineRunsGlobal,
//   pipelineRunTable,
// } from '~/__tests__/cypress/cypress/pages/pipelines';
// import { buildMockJobKF } from '~/__mocks__/mockJobKF';
// import { buildMockRunKF, getMockRunResource } from '~/__mocks__/mockRunKF';
// import { buildMockPipeline } from '~/__mocks__/mockPipelinesProxy';
// import { buildMockPipelineVersion } from '~/__mocks__/mockPipelineVersionsProxy';
// import { RelationshipKF, ResourceTypeKF } from '~/concepts/pipelines/kfTypes';
//
// const projectName = 'test-project-name';
// const mockPipeline = buildMockPipeline();
// const mockPipelineVersion = buildMockPipelineVersion({
//   id: mockPipeline.default_version?.id,
//   name: mockPipeline.default_version?.name,
//   resource_references: [
//     {
//       key: { type: ResourceTypeKF.PIPELINE, id: mockPipeline.id },
//       relationship: RelationshipKF.OWNER,
//     },
//   ],
// });
// const runPipelineVersionRef = {
//   key: { id: mockPipelineVersion.id, type: ResourceTypeKF.PIPELINE_VERSION },
//   name: mockPipelineVersion.name,
//   relationship: RelationshipKF.CREATOR,
// };
// const initialRuns = [
//   buildMockRunKF({
//     resource_references: [runPipelineVersionRef],
//     status: 'Completed',
//   }),
// ];
// const initialJobs = [
//   buildMockJobKF({
//     resource_references: [runPipelineVersionRef],
//   }),
// ];
//
// describe('Pipeline create runs', () => {
//   beforeEach(() => {
//     initIntercepts();
//     pipelineRunsGlobal.visit(projectName);
//   });
//
//   it('renders the page with scheduled and triggered runs table data', () => {
//     pipelineRunJobTable.findRowByName('Test job');
//     pipelineRunsGlobal.findTriggeredTab().click();
//     pipelineRunTable.findRowByName('Test run');
//   });
//
//   it('creates a triggered run', () => {
//     const createRunParams = {
//       name: 'New run',
//       description: 'New run description',
//       id: 'new-run-id',
//     };
//
//     // Mock pipelines & versions for form select dropdowns
//     createRunPage.mockGetPipelines([mockPipeline]).as('getPipelines');
//     createRunPage.mockGetPipelineVersions([mockPipelineVersion]).as('getPipelinesVersions');
//
//     // Navigate to the 'Create run' page
//     pipelineRunsGlobal.findCreateRunButton().click();
//     cy.url().should('include', '/pipelineRun/create');
//     createRunPage.find();
//
//     // Fill out the form without a schedule and submit
//     createRunPage.fillName('New run');
//     createRunPage.fillDescription('New run description');
//     createRunPage.findPipelineSelect().should('not.be.disabled');
//     createRunPage.selectPipelineByName('Test pipeline');
//     createRunPage.findPipelineVersionSelect().should('not.be.disabled');
//     createRunPage.findTriggeredRunTypeRadioInput().click();
//     createRunPage.mockCreateRun(mockPipelineVersion, createRunParams).as('createRun');
//     createRunPage.submit();
//
//     // Should be redirected to the run details page
//     cy.url().should('include', '/pipelineRun/view/new-run-id');
//   });
//
//   it('creates a scheduled run', () => {
//     const createJobParams = {
//       name: 'New job',
//       description: 'New job description',
//       id: 'new-job-id',
//     };
//
//     // Mock pipelines & versions for form select dropdowns
//     createRunPage.mockGetPipelines([mockPipeline]).as('getPipelines');
//     createRunPage.mockGetPipelineVersions([mockPipelineVersion]).as('getPipelinesVersions');
//
//     // Mock jobs list with newly created job
//     pipelineRunJobTable
//       .mockGetJobs([...initialJobs, buildMockJobKF(createJobParams)])
//       .as('refreshRunJobs');
//
//     // Navigate to the 'Create run' page
//     pipelineRunsGlobal.findCreateRunButton().click();
//     cy.url().should('include', '/pipelineRun/create');
//     createRunPage.find();
//
//     // Fill out the form with a schedule and submit
//     createRunPage.fillName('New job');
//     createRunPage.fillDescription('New job description');
//     createRunPage.findPipelineSelect().should('not.be.disabled');
//     createRunPage.selectPipelineByName('Test pipeline');
//     createRunPage.findPipelineVersionSelect().should('not.be.disabled');
//     createRunPage.findScheduledRunTypeRadioInput().click();
//     createRunPage.mockCreateJob(mockPipelineVersion, createJobParams).as('createJob');
//     createRunPage.submit();
//
//     // Should show newly created scheduled job in the table
//     cy.wait('@refreshRunJobs');
//     pipelineRunJobTable.findRowByName('New job');
//   });
//
//   it('duplicates a scheduled run', () => {
//     const [mockJob] = initialJobs;
//     const duplicateJobParams = {
//       name: 'Duplicate job',
//       description: 'Duplicate job description',
//       id: 'duplicate-job-id',
//     };
//
//     // Mock pipelines & versions for form select dropdowns
//     cloneRunPage.mockGetPipelines([mockPipeline]).as('getPipelines');
//     cloneRunPage.mockGetPipelineVersions([mockPipelineVersion]).as('getPipelinesVersions');
//     cloneRunPage.mockGetJob(mockJob);
//     cloneRunPage.mockGetPipelineVersion(mockPipelineVersion);
//     cloneRunPage.mockGetPipeline(mockPipeline);
//
//     // Mock jobs list with newly cloned job
//     pipelineRunJobTable
//       .mockGetJobs([...initialJobs, buildMockJobKF(duplicateJobParams)])
//       .as('refreshRunJobs');
//
//     // Navigate to clone run page for a given scheduled job
//     pipelineRunJobTable.selectRowActionByName(mockJob.name, 'Duplicate');
//     cy.url().should('include', `/pipelineRun/cloneJob/${mockJob.id}`);
//
//     // Verify pipeline & pipeline version are pre-populated & submit
//     cloneRunPage.findPipelineSelect().should('have.text', mockPipeline.name);
//     cloneRunPage.findPipelineVersionSelect().should('have.text', mockPipelineVersion.name);
//     cloneRunPage.mockCreateJob(mockPipelineVersion, duplicateJobParams).as('cloneJob');
//     cloneRunPage.submit();
//
//     // Should show newly cloned scheduled job in the table
//     cy.wait('@refreshRunJobs');
//     pipelineRunJobTable.findRowByName('Duplicate job');
//   });
//
//   it('duplicates a triggered run', () => {
//     const mockRunResource = getMockRunResource(initialRuns[0]);
//
//     const duplicateRunParams = {
//       name: 'Duplicate run',
//       description: 'Duplicate run description',
//       id: 'duplicate-run-id',
//     };
//
//     // Mock pipelines & versions for form select dropdowns
//     cloneRunPage.mockGetPipelines([mockPipeline]).as('getPipelines');
//     cloneRunPage.mockGetPipelineVersions([mockPipelineVersion]).as('getPipelinesVersions');
//     cloneRunPage.mockGetRunResource(mockRunResource);
//     cloneRunPage.mockGetPipelineVersion(mockPipelineVersion);
//     cloneRunPage.mockGetPipeline(mockPipeline);
//
//     // Mock runs list with newly cloned run
//     pipelineRunTable
//       .mockGetRuns([...initialRuns, buildMockRunKF(duplicateRunParams)])
//       .as('refreshRuns');
//
//     // Navigate to clone run page for a given triggered run
//     pipelineRunsGlobal.findTriggeredTab().click();
//     pipelineRunTable.selectRowActionByName(mockRunResource.run.name, 'Duplicate');
//     cy.url().should('include', `/pipelineRun/clone/${mockRunResource.run.id}`);
//
//     // Verify pipeline & pipeline version are pre-populated & submit
//     cloneRunPage.findPipelineSelect().should('have.text', mockPipeline.name);
//     cloneRunPage.findPipelineVersionSelect().should('have.text', mockPipelineVersion.name);
//     cloneRunPage.mockCreateRun(mockPipelineVersion, duplicateRunParams).as('cloneRun');
//     cloneRunPage.submit();
//
//     // Should redirect to the details of the newly cloned triggered run
//     cy.url().should('include', `/pipelineRun/view/${duplicateRunParams.id}`);
//   });
// });
//
// const initIntercepts = () => {
//   cy.intercept('/api/status', mockStatus());
//   cy.intercept('/api/config', mockDashboardConfig({}));
//   cy.intercept(
//     {
//       pathname: `/api/k8s/apis/datasciencepipelinesapplications.opendatahub.io/v1alpha1/namespaces/${projectName}/datasciencepipelinesapplications/pipelines-definition`,
//     },
//     mockDataSciencePipelineApplicationK8sResource({ namespace: projectName }),
//   );
//   cy.intercept(
//     {
//       pathname: `/api/k8s/apis/route.openshift.io/v1/namespaces/${projectName}/routes/ds-pipeline-pipelines-definition`,
//     },
//     mockRouteK8sResource({
//       notebookName: 'ds-pipeline-pipelines-definition',
//       namespace: projectName,
//     }),
//   );
//   cy.intercept(
//     {
//       pathname: '/api/k8s/apis/project.openshift.io/v1/projects',
//     },
//     mockK8sResourceList([
//       mockProjectK8sResource({ k8sName: projectName }),
//       mockProjectK8sResource({ k8sName: `${projectName}-2`, displayName: 'Test Project 2' }),
//     ]),
//   );
//   cy.intercept(
//     {
//       method: 'POST',
//       pathname: '/api/proxy/apis/v1beta1/jobs',
//     },
//     { jobs: initialJobs, total_size: initialJobs.length },
//   );
//   cy.intercept(
//     {
//       method: 'POST',
//       pathname: '/api/proxy/apis/v1beta1/runs',
//     },
//     { runs: initialRuns, total_size: initialRuns.length },
//   );
// };
