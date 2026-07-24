/* eslint-disable camelcase */
import { initIntercepts, projectDisplayName, projectName } from './modelTrainingRayJobsTestUtils';
import { asClusterAdminUser } from '../../../utils/mockUsers';
import {
  modelTrainingGlobal,
  trainingJobTable,
  trainingJobDetailsDrawer,
  rayJobDetailsDrawer,
} from '../../../pages/modelTraining';
import { tablePagination } from '../../../pages/components/Pagination';
import { deleteModal } from '../../../pages/components/DeleteModal';

describe('RayJobs in Jobs Table', () => {
  beforeEach(() => {
    asClusterAdminUser();
    initIntercepts();
  });

  it('should display correct data in RayJob table rows', () => {
    modelTrainingGlobal.visit(projectName);
    trainingJobTable.findTable().should('be.visible');

    const rayRow = trainingJobTable.getTableRow('ray-data-processing');
    rayRow.findTrainingJobName().should('contain', 'ray-data-processing');
    rayRow.findProject().should('contain', projectDisplayName);
    rayRow.findNodes().should('contain', '2');
    rayRow.findType().should('contain', 'RayJob');
    rayRow.findRayCluster().should('not.be.empty');
  });

  it('should show delete option in RayJob kebab menu', () => {
    modelTrainingGlobal.visit(projectName);
    trainingJobTable.findTable().should('be.visible');

    const rayRow = trainingJobTable.getTableRow('ray-data-processing');
    rayRow.findKebabButton().click();

    rayRow.findKebabMenuItem('Delete job').should('exist');
  });

  it('should open delete modal with job name in title and correct body text', () => {
    modelTrainingGlobal.visit(projectName);
    trainingJobTable.filterByName('ray-data-processing');

    const rayRow = trainingJobTable.getTableRow('ray-data-processing');
    rayRow.findKebabButton().click();
    rayRow.findKebabMenuItem('Delete job').click();

    deleteModal.shouldBeOpen();
    deleteModal.find().should('contain', 'Delete ray-data-processing job?');
    deleteModal
      .find()
      .should('contain', 'ray-data-processing')
      .and('contain', 'all of its resources will be deleted');
  });

  it('should filter RayJobs by name', () => {
    modelTrainingGlobal.visit(projectName);
    trainingJobTable.findTable().should('be.visible');

    trainingJobTable.filterByName('ray-data');
    trainingJobTable.getTableRow('ray-data-processing').find().should('exist');
    trainingJobTable.findTable().find('tbody tr').should('have.length', 1);

    trainingJobTable.filterByName('train-job-one');
    trainingJobTable.getTableRow('train-job-one').find().should('exist');

    trainingJobTable.filterByName('ray-data-processing');
    trainingJobTable.getTableRow('ray-data-processing').find().should('exist');
  });
});

describe('Type filter in Jobs Table', () => {
  beforeEach(() => {
    asClusterAdminUser();
    initIntercepts();
  });

  it('should filter to show only TrainJobs when TrainJob type is selected', () => {
    modelTrainingGlobal.visit(projectName);
    trainingJobTable.findTable().should('be.visible');

    trainingJobTable.selectJobTypeFilter('TrainJob');

    const trainRow = trainingJobTable.getTableRow('train-job-one');

    trainingJobTable.findTypeFilterChip().should('contain', 'TrainJob');
    trainRow.findType().should('contain', 'TrainJob');
    trainingJobTable.findTypeColumn().should('not.contain', 'RayJob');
    trainingJobTable.findRows().should('have.length', 1);
  });

  it('should filter to show only RayJobs when RayJob type is selected', () => {
    modelTrainingGlobal.visit(projectName);
    trainingJobTable.findTable().should('be.visible');
    tablePagination.top.selectToggleOption('20 per page');

    trainingJobTable.selectJobTypeFilter('RayJob');

    const rayRow = trainingJobTable.getTableRow('ray-data-processing');

    trainingJobTable.findTypeFilterChip().should('contain', 'RayJob');
    rayRow.findTrainingJobName().should('contain', 'ray-data-processing');
    trainingJobTable.findTypeColumn().should('not.contain', 'TrainJob');
  });

  it('should show all jobs after selecting All in type filter', () => {
    modelTrainingGlobal.visit(projectName);
    trainingJobTable.findTable().should('be.visible');
    tablePagination.top.selectToggleOption('20 per page');

    trainingJobTable.selectJobTypeFilter('TrainJob');
    trainingJobTable.findRows().should('have.length', 1);

    trainingJobTable.findTypeFilterSelectToggle().click();
    cy.findByRole('option', { name: 'All' }).click();

    const trainRow = trainingJobTable.getTableRow('train-job-one');
    const rayRow = trainingJobTable.getTableRow('ray-data-processing');

    trainingJobTable.findTypeFilterChip().should('not.exist');
    trainRow.findTrainingJobName().should('contain', 'train-job-one');
    rayRow.findTrainingJobName().should('contain', 'ray-data-processing');
  });
});

/**
 * RayJobStatus component rendering tests have been converted to Jest unit tests.
 * See: packages/model-training/src/global/trainingJobList/components/__tests__/RayJobStatus.spec.tsx
 *
 * Converted tests (7):
 * - Running, Complete, Failed, Paused, Pending, Queued, Deleting status rendering
 *
 * The tests below focus on integration scenarios (Kueue workload states, table interactions)
 * that require the full page context and should remain in Cypress.
 */
describe('RayJob status column', () => {
  beforeEach(() => {
    asClusterAdminUser();
    initIntercepts();
    modelTrainingGlobal.visit(projectName);
    trainingJobTable.findTable().should('be.visible');
  });

  it('should show status label component (not raw icon+text) for RayJob rows', () => {
    trainingJobTable
      .getTableRow('ray-data-processing')
      .find()
      .find('[data-label="Status"]')
      .findByTestId('ray-job-status')
      .should('exist');
  });
  it('should show Inadmissible status when Kueue rejects the workload', () => {
    trainingJobTable
      .getTableRow('ray-inadmissible-kueue')
      .findStatus()
      .should('contain', 'Inadmissible');
  });

  it('should show Preempted status when Kueue evicts the workload', () => {
    trainingJobTable.getTableRow('ray-preempted-kueue').findStatus().should('contain', 'Preempted');
  });

  it('should show Queued status when Kueue workload is waiting for quota', () => {
    trainingJobTable.filterByName('ray-queued-kueue');
    trainingJobTable.getTableRow('ray-queued-kueue').findStatus().should('contain', 'Queued');
  });

  it('should show Pending status when Kueue quota is reserved but pods not yet scheduled', () => {
    trainingJobTable.getTableRow('ray-pending-kueue').findStatus().should('contain', 'Pending');
  });
});

describe('RayJob Details Drawer', () => {
  beforeEach(() => {
    asClusterAdminUser();
    initIntercepts();
  });

  it('should open RayJob drawer when clicking on a RayJob name', () => {
    modelTrainingGlobal.visit(projectName);

    rayJobDetailsDrawer.shouldBeClosed();

    const row = trainingJobTable.getTableRow('ray-data-processing');
    row.findNameLink().click();

    rayJobDetailsDrawer.shouldBeOpen();
    rayJobDetailsDrawer.findTitle().should('contain', 'ray-data-processing');
  });

  it('should have all four tabs', () => {
    modelTrainingGlobal.visit(projectName);

    const row = trainingJobTable.getTableRow('ray-data-processing');
    row.findNameLink().click();

    rayJobDetailsDrawer.shouldBeOpen();
    rayJobDetailsDrawer.findTab('Details').should('exist');
    rayJobDetailsDrawer.findTab('Resources').should('exist');
    rayJobDetailsDrawer.findTab('Pods').should('exist');
    rayJobDetailsDrawer.findTab('Logs').should('exist');
  });

  it('should have delete action in kebab menu', () => {
    modelTrainingGlobal.visit(projectName);

    const row = trainingJobTable.getTableRow('ray-data-processing');
    row.findNameLink().click();

    rayJobDetailsDrawer.shouldBeOpen();
    rayJobDetailsDrawer.clickKebabMenu();
    rayJobDetailsDrawer.findKebabMenuItem('Delete job').should('exist');
  });

  it('should close drawer when clicking close button', () => {
    modelTrainingGlobal.visit(projectName);

    const row = trainingJobTable.getTableRow('ray-data-processing');
    row.findNameLink().click();

    rayJobDetailsDrawer.shouldBeOpen();
    rayJobDetailsDrawer.close();
    rayJobDetailsDrawer.shouldBeClosed();
  });

  it('should open TrainJob drawer when clicking a TrainJob after closing RayJob drawer', () => {
    modelTrainingGlobal.visit(projectName);

    const rayRow = trainingJobTable.getTableRow('ray-data-processing');
    rayRow.findNameLink().click();
    rayJobDetailsDrawer.shouldBeOpen();

    rayJobDetailsDrawer.close();
    rayJobDetailsDrawer.shouldBeClosed();

    trainingJobTable.filterByName('train-job-one');
    const trainRow = trainingJobTable.getTableRow('train-job-one');
    trainRow.findNameLink().click();
    trainingJobDetailsDrawer.shouldBeOpen();
  });
});
