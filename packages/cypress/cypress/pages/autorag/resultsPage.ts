class AutoragResultsPage {
  findStopRunButton() {
    return cy.findByTestId('stop-run-button');
  }

  findRetryRunButton() {
    return cy.findByTestId('retry-run-button');
  }

  findRunDetailsButton() {
    return cy.findByTestId('run-details-button');
  }

  findRunInProgressMessage(timeout?: number) {
    return cy.findByTestId('autorag-run-in-progress', timeout ? { timeout } : undefined);
  }

  findRunStatusLabel(timeout?: number) {
    return cy.findByTestId('run-status-label', timeout ? { timeout } : undefined);
  }

  // Leaderboard
  findLeaderboardTable() {
    return cy.findByTestId('leaderboard-table');
  }

  findLeaderboardLoading() {
    return cy.findByTestId('leaderboard-loading');
  }

  findLeaderboardEmpty() {
    return cy.findByTestId('leaderboard-empty');
  }

  findManageColumnsButton() {
    return cy.findByTestId('manage-columns-button');
  }

  findManageColumnsModal() {
    return cy.findByRole('dialog');
  }

  findManageColumnsCancelButton() {
    return cy.get('[data-ouia-component-id="ColumnManagementModal-cancel-button"]');
  }

  findManageColumnsSaveButton() {
    return cy.get('[data-ouia-component-id="ColumnManagementModal-save-button"]');
  }

  findTopRankLabel() {
    return cy.findByTestId('top-rank-label');
  }

  findLeaderboardRow(rank: number) {
    return cy.findByTestId(`leaderboard-row-${rank}`);
  }

  findPatternLink(rank: number) {
    return cy.findByTestId(`pattern-link-${rank}`);
  }

  // Run details drawer
  findRunDetailsDrawerPanel() {
    return cy.findByTestId('run-details-drawer-panel');
  }

  findRunDetailsDrawerClose() {
    return cy.findByTestId('run-details-drawer-close');
  }

  // Stop run modal
  findStopRunModal() {
    return cy.findByTestId('stop-run-modal');
  }

  findConfirmStopRunButton() {
    return cy.findByTestId('confirm-stop-run-button');
  }

  // Pattern details modal
  findPatternDetailsModal() {
    return cy.findByTestId('pattern-details-modal');
  }

  findPatternDetailsModalCloseButton() {
    return this.findPatternDetailsModal().findByRole('button', { name: 'Close' });
  }

  findPatternSelectorDropdown() {
    return cy.findByTestId('pattern-selector-dropdown');
  }

  findPatternDetailsDownload() {
    return cy.findByTestId('pattern-details-download');
  }

  findSaveNotebookToggle() {
    return cy.findByTestId('pattern-details-save-notebook-toggle');
  }

  findSaveIndexingNotebook() {
    return cy.findByTestId('pattern-details-save-indexing-notebook');
  }

  findSaveInferenceNotebook() {
    return cy.findByTestId('pattern-details-save-inference-notebook');
  }

  // Pattern details tabs
  findPatternDetailsTab(tabKey: string) {
    return cy.findByTestId(`tab-${tabKey}`);
  }

  // Runs table (experiments page)
  findRunsTable() {
    return cy.findByTestId('autorag-runs-table');
  }

  findRunLink(runId: string) {
    return cy.findByTestId(`run-name-${runId}`);
  }

  findStopRunAction() {
    return cy.findByTestId('stop-run-action');
  }

  findRetryRunAction() {
    return cy.findByTestId('retry-run-action');
  }

  findReconfigureButton() {
    return cy.findByTestId('reconfigure-run-button');
  }

  // Score type radios (inside pattern details overview tab)
  findScoreTypeRadio(type: 'mean' | 'ci_high' | 'ci_low') {
    return cy.findByTestId(`score-type-${type}`);
  }

  // Pattern details modal actions
  findPatternDetailsActionsToggle() {
    return cy.findByTestId('pattern-details-actions-toggle');
  }

  findTryPatternAction() {
    return cy.findByTestId('pattern-details-try-pattern');
  }

  // Leaderboard row actions
  findLeaderboardActions(rank: number) {
    return cy.findByTestId(`leaderboard-actions-${rank}`);
  }

  // Playground drawer panel
  findPlaygroundDrawerPanel() {
    return cy.findByTestId('playground-drawer-panel');
  }

  findPlaygroundDrawerClose() {
    return cy.findByTestId('playground-drawer-close');
  }

  findPlaygroundPatternSelect() {
    return cy.findByTestId('playground-pattern-select');
  }

  findPlaygroundViewCodeButton() {
    return cy.findByTestId('playground-view-code-button');
  }

  // Chatbot (embedded playground)
  findChatbotMessageBar() {
    return cy.findByTestId('chatbot-message-bar');
  }

  findChatbotSendButton() {
    return cy.findByTestId('chatbot-send-button');
  }

  findChatbotUserMessage() {
    return cy.findByTestId('chatbot-message-user');
  }

  findChatbotBotMessage(timeout?: number) {
    return cy.findByTestId('chatbot-message-bot', timeout ? { timeout } : undefined);
  }
}

export const autoragResultsPage = new AutoragResultsPage();
