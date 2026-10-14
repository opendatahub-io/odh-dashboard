import {
  projectName,
  mockActiveRuns,
  mockArchivedRuns,
  initIntercepts,
} from './pipelineRunsTestUtils';
import {
  activeRunsTable,
  archivedRunsTable,
  archiveRunModal,
  pipelineRunsGlobal,
  restoreRunModal,
} from '../../../../pages/pipelines';
import { captureTracking, expectSafeTracking } from '../../../../utils/analytics';

describe('Pipeline lifecycle failure tracking', () => {
  beforeEach(() => {
    initIntercepts();
  });

  it('keeps an archive failure diagnostic out of analytics', () => {
    const [runToArchive] = mockActiveRuns;
    const message = 'Private archive diagnostic';
    activeRunsTable.mockGetActiveRuns(mockActiveRuns, projectName);
    pipelineRunsGlobal.visit(projectName, 'active');
    cy.intercept(
      'POST',
      `**/api/service/pipelines/${projectName}/dspa/apis/v2beta1/runs/${runToArchive.run_id}*`,
      { forceNetworkError: true },
    );
    activeRunsTable.getRowByName(runToArchive.display_name).findKebabAction('Archive').click();
    archiveRunModal.findConfirmInput().type(runToArchive.display_name);
    captureTracking();
    archiveRunModal.findSubmitButton().click();
    expectSafeTracking(
      'Pipeline Runs Archived',
      { success: false, error: 'unknown_error' },
      message,
    );
  });

  it('keeps a restore failure diagnostic out of analytics', () => {
    const [runToRestore] = mockArchivedRuns;
    const message = 'Failed to unarchive a run: FailedPreconditionError';
    archivedRunsTable.mockGetArchivedRuns(mockArchivedRuns, projectName);
    pipelineRunsGlobal.visit(projectName, 'archived');
    archivedRunsTable.mockRestoreRunFails(runToRestore.run_id, projectName);
    captureTracking();
    archivedRunsTable.getRowByName(runToRestore.display_name).findCheckbox().click();
    pipelineRunsGlobal.findRestoreRunButton().click();
    restoreRunModal.findSubmitButton().click();
    expectSafeTracking(
      'Archived Pipeline Run Restored',
      { success: false, error: 'unknown_error' },
      message,
    );
  });
});
