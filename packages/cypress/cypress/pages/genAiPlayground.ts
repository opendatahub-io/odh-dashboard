const GEN_AI_DEV_FLAG = 'devFeatureFlags=genAiStudio=true,modelAsService=false';
const GEN_AI_CUSTOM_ENDPOINTS_FLAG =
  'devFeatureFlags=genAiStudio=true,aiAssetCustomEndpoints=true,modelAsService=false';
const GEN_AI_CUSTOM_ENDPOINTS_PROMPT_FLAG =
  'devFeatureFlags=genAiStudio=true,aiAssetCustomEndpoints=true,promptManagement=true,modelAsService=false';
const GEN_AI_GUARDRAILS_FLAG =
  'devFeatureFlags=genAiStudio=true,aiAssetCustomEndpoints=true,guardrails=true,modelAsService=false';
const GEN_AI_CUSTOM_ENDPOINTS_PROMPT_GUARDRAILS_FLAG =
  'devFeatureFlags=genAiStudio=true,aiAssetCustomEndpoints=true,promptManagement=true,guardrails=true,modelAsService=false';
const GEN_AI_ALL_FLAGS =
  'devFeatureFlags=genAiStudio=true,aiAssetCustomEndpoints=true,promptManagement=true,guardrails=true,agentConfigManagement=true,modelAsService=false';
const GEN_AI_MCP_REGISTRY_FLAG =
  'devFeatureFlags=genAiStudio=true,aiAssetCustomEndpoints=true,promptManagement=true,mcpRegistry=true,modelAsService=false';

class GenAiPlayground {
  navigate(projectName: string) {
    cy.visit(`/gen-ai-studio/playground/${projectName}?${GEN_AI_DEV_FLAG}`);
    cy.url().should('include', `/gen-ai-studio/playground/${projectName}`);
  }

  navigateToAssets(projectName: string) {
    cy.visit(`/gen-ai-studio/assets/${projectName}?${GEN_AI_DEV_FLAG}`);
    cy.url().should('include', `/gen-ai-studio/assets/${projectName}`);
  }

  navigateToAssetsWithCustomEndpoints(projectName: string) {
    cy.visit(`/gen-ai-studio/assets/${projectName}?${GEN_AI_CUSTOM_ENDPOINTS_FLAG}`);
    cy.url().should('include', `/gen-ai-studio/assets/${projectName}`);
  }

  navigateWithCustomEndpoints(projectName: string) {
    cy.visit(`/gen-ai-studio/playground/${projectName}?${GEN_AI_CUSTOM_ENDPOINTS_FLAG}`);
    cy.url().should('include', `/gen-ai-studio/playground/${projectName}`);
  }

  navigateToPlaygroundWithRetry(projectName: string) {
    const playgroundUrl = `/gen-ai-studio/playground/${projectName}?${GEN_AI_CUSTOM_ENDPOINTS_FLAG}`;
    cy.visit(playgroundUrl);
    cy.findByTestId('settings-model-selector-toggle', { timeout: 120000 }).should('be.visible');
  }

  navigateToAssetsWithPromptManagement(projectName: string) {
    cy.visit(`/gen-ai-studio/assets/${projectName}?${GEN_AI_CUSTOM_ENDPOINTS_PROMPT_FLAG}`);
    cy.url().should('include', `/gen-ai-studio/assets/${projectName}`);
  }

  navigateToAssetsWithGuardrailsAndPromptManagement(projectName: string) {
    cy.visit(
      `/gen-ai-studio/assets/${projectName}?${GEN_AI_CUSTOM_ENDPOINTS_PROMPT_GUARDRAILS_FLAG}`,
    );
    cy.url().should('include', `/gen-ai-studio/assets/${projectName}`);
  }

  navigateToPlaygroundWithPromptManagement(projectName: string) {
    cy.visit(`/gen-ai-studio/playground/${projectName}?${GEN_AI_CUSTOM_ENDPOINTS_PROMPT_FLAG}`);
    cy.url().should('include', `/gen-ai-studio/playground/${projectName}`);
  }

  navigateToPlaygroundWithPromptManagementRetry(projectName: string) {
    const playgroundUrl = `/gen-ai-studio/playground/${projectName}?${GEN_AI_CUSTOM_ENDPOINTS_PROMPT_FLAG}`;
    cy.visit(playgroundUrl);
    cy.findByTestId('chatbot-message-bar', { timeout: 120000 }).should('be.visible');
  }

  navigateToPlaygroundWithMCPRegistry(projectName: string) {
    const playgroundUrl = `/gen-ai-studio/playground/${projectName}?${GEN_AI_MCP_REGISTRY_FLAG}`;
    cy.visit(playgroundUrl);
    cy.findByTestId('chatbot-message-bar', { timeout: 120000 }).should('be.visible');
  }

  findEmptyState() {
    return cy.findByTestId('empty-state');
  }

  findAddToPlaygroundButton() {
    return cy.findByTestId('ai-models-table').contains('button', 'Add to playground');
  }

  findGoToPlaygroundLink(options?: { timeout?: number }) {
    return cy.findByTestId('go-to-playground-link', options);
  }

  findConfigurationTable() {
    return cy.findByTestId('chatbot-configuration-table');
  }

  findCreateButtonInDialog() {
    return cy.findByTestId('modal-submit-button');
  }

  findModelToggleButton() {
    return cy.findByTestId('settings-model-selector-toggle');
  }

  findMessageInput() {
    return cy.findByTestId('chatbot-message-bar');
  }

  findUserMessage() {
    return cy.findByTestId('chatbot-message-user');
  }

  findAllUserMessages() {
    return cy.findAllByTestId('chatbot-message-user');
  }

  findAssistantMessage(options?: { timeout?: number }) {
    return cy.findByTestId('chatbot-message-bot', options);
  }

  findAllAssistantMessages(options?: { timeout?: number }) {
    return cy.findAllByTestId('chatbot-message-bot', options);
  }

  sendMessage(message: string) {
    this.findMessageInput().should('be.visible').and('be.enabled').clear().type(message);
    this.findMessageInput().type('{enter}');
    this.findMessageInput().should('have.value', '');
  }

  waitForStreamingComplete(options?: { timeout?: number }) {
    const timeout = options?.timeout ?? 60000;
    cy.findByTestId('chatbot-stop-button', { timeout }).should('exist');
    cy.findByTestId('chatbot-stop-button', { timeout }).should('not.exist');
  }

  ensureModelCheckboxIsChecked(modelName: string) {
    const sanitizedModelName = modelName.replace(/[^a-zA-Z0-9-]/g, '');
    cy.findByTestId(`${sanitizedModelName}-checkbox`)
      .find('input[type="checkbox"]')
      .then(($checkbox) => {
        if (!$checkbox.is(':checked')) {
          cy.wrap($checkbox).click();
        }
      });
    cy.findByTestId(`${sanitizedModelName}-checkbox`)
      .find('input[type="checkbox"]')
      .should('be.checked');
  }

  selectModelFromDropdown(modelName: string) {
    this.findModelToggleButton().click();
    cy.get('[role="menuitem"]').contains(modelName).click();
  }

  verifyModelIsSelected(modelName: string) {
    this.findModelToggleButton().should('contain', modelName);
  }

  // Custom endpoint methods
  findCreateEndpointButton() {
    return cy.findByTestId('create-endpoint-button');
  }

  findEmptyStateCreateEndpointButton(options?: { timeout?: number }) {
    return cy.findByTestId('empty-state-secondary-action-button', options);
  }

  findCreateExternalModelModal() {
    return cy.findByTestId('create-external-model-modal');
  }

  findModelIdInput() {
    return cy.findByTestId('create-external-model-id-input');
  }

  findDisplayNameInput() {
    return cy.findByTestId('create-external-model-display-name-input');
  }

  findEndpointUrlInput() {
    return cy.findByTestId('create-external-model-url-input');
  }

  findTokenInput() {
    return cy.findByTestId('create-external-model-token-input');
  }

  findVerifyModelButton() {
    return cy.findByTestId('create-external-model-verify-button');
  }

  findVerifySuccessAlert(options?: { timeout?: number }) {
    return cy.findByTestId('create-external-model-verify-success-alert', options);
  }

  findCreateEndpointSubmitButton() {
    return cy.findByTestId('create-external-model-submit-button');
  }

  findAiModelsTable(options?: { timeout?: number }) {
    return cy.findByTestId('ai-models-table', options);
  }

  findModelActionsKebab(modelName: string) {
    return this.findAiModelsTable()
      .find('tr')
      .contains(modelName)
      .parents('tr')
      .findByTestId('model-actions-kebab');
  }

  findRemoveAssetAction() {
    return cy.findByTestId('remove-asset-action');
  }

  findDeleteModelModal() {
    return cy.findByTestId('delete-model-modal');
  }

  findDeleteModelConfirmButton() {
    return cy.findByTestId('delete-model-modal').findByRole('button', { name: /^delete$/i });
  }

  findTryInPlaygroundButton() {
    return cy.findByTestId('try-playground-button');
  }

  // Settings panel methods
  findSettingsButton() {
    return cy.findByTestId('settings-button');
  }

  findSettingsPanelHeader(options?: { timeout?: number }) {
    return cy.findByTestId('chatbot-settings-panel-header', options);
  }

  ensureSettingsPanelOpen() {
    cy.get('body').then(($body) => {
      if ($body.find('[data-testid="chatbot-settings-panel-header"]').length === 0) {
        this.findSettingsButton().should('be.visible').click();
      }
    });
    this.findSettingsPanelHeader({ timeout: 10000 }).should('be.visible');
  }

  findSettingsPromptTab() {
    return cy.findByTestId('chatbot-settings-page-tab-prompt');
  }

  // Prompt management methods (within the playground settings panel)
  findSystemInstructionsInput() {
    return cy.findByTestId('system-instructions-input');
  }

  findPromptSaveToRegistryButton() {
    return cy.findByTestId('prompt-save-to-registry-button');
  }

  findPromptNameInput() {
    return cy.findByTestId('prompt-name-input');
  }

  findPromptTemplateInput() {
    return cy.findByTestId('prompt-template-input');
  }

  findPromptCommitMessageInput() {
    return cy.findByTestId('prompt-commit-message-input');
  }

  findPromptSaveButton() {
    return cy.findByTestId('prompt-save-button');
  }

  findPromptCreateModal() {
    return cy.findByTestId('prompt-create-modal');
  }

  findPromptManagementModal() {
    return cy.findByTestId('prompt-management-modal');
  }

  findLoadPromptButton() {
    return cy.findByTestId('load-prompt-button');
  }

  findPromptTableRow(promptName: string) {
    return cy.findByTestId(`prompt-table-row-${promptName}`);
  }

  findPromptLoadConfirmButton() {
    return cy.findByTestId('prompt-load-button');
  }

  findPromptNameTitle() {
    return cy.findByTestId('prompt-name-title');
  }

  // RAG / Knowledge upload methods
  findKnowledgeTab() {
    return cy.findByTestId('chatbot-settings-page-tab-knowledge');
  }

  findDocumentFileInput() {
    return cy.findByTestId('document-file-input');
  }

  uploadDocumentViaAttachMenu(fixturePath: string) {
    this.findDocumentFileInput().selectFile(fixturePath, { force: true });
  }

  findSourceSettingsModal() {
    return cy.findByTestId('source-settings-modal');
  }

  findSourceSettingsUploadButton() {
    return cy.findByTestId('source-settings-upload-button');
  }

  findSourceUploadSuccessAlert(options?: { timeout?: number }) {
    return cy.findByTestId('source-upload-success-alert', options);
  }

  findRagToggle() {
    return cy.findByTestId('rag-toggle-switch');
  }

  findUploadedFilesCard(options?: { timeout?: number }) {
    return cy.findByTestId('uploaded-files-card', options);
  }

  findUploadedFileName(fileName: string, options?: { timeout?: number }) {
    return cy.findByTestId(`uploaded-file-name-${fileName}`, options);
  }

  findFileSearchResults(options?: { timeout?: number }) {
    return cy.findByTestId('file-search-results', options);
  }

  findFileSearchResultsToggle() {
    return cy.findByTestId('file-search-results-toggle');
  }

  // Guardrails methods
  navigateToPlaygroundWithGuardrails(projectName: string) {
    const playgroundUrl = `/gen-ai-studio/playground/${projectName}?${GEN_AI_GUARDRAILS_FLAG}`;
    cy.visit(playgroundUrl);
    cy.findByTestId('chatbot-message-bar', { timeout: 120000 }).should('be.visible');
  }

  findGuardrailsTab() {
    return cy.findByTestId('chatbot-settings-page-tab-guardrails');
  }

  findGuardrailsSection() {
    return cy.findByTestId('guardrails-section-title').parent();
  }

  findGuardrailModelToggle() {
    return cy.findByTestId('guardrail-model-toggle');
  }

  selectGuardrailModel(displayName: string) {
    this.findGuardrailModelToggle().click();
    cy.get('[role="menuitem"]').contains(displayName).click();
  }

  findUserInputGuardrailsSwitch() {
    return cy.findByTestId('user-input-guardrails-switch');
  }

  findModelOutputGuardrailsSwitch() {
    return cy.findByTestId('model-output-guardrails-switch');
  }

  toggleUserInputGuardrails(enable: boolean) {
    this.findUserInputGuardrailsSwitch().then(($toggle) => {
      const isChecked = $toggle.is(':checked');
      if ((enable && !isChecked) || (!enable && isChecked)) {
        this.findUserInputGuardrailsSwitch().click({ force: true });
      }
    });
  }

  toggleModelOutputGuardrails(enable: boolean) {
    this.findModelOutputGuardrailsSwitch().then(($toggle) => {
      const isChecked = $toggle.is(':checked');
      if ((enable && !isChecked) || (!enable && isChecked)) {
        this.findModelOutputGuardrailsSwitch().click({ force: true });
      }
    });
  }

  findGuardrailViolationAlert(options?: { timeout?: number }) {
    return cy.findByTestId('guardrail-violation-alert', options);
  }

  clearChat() {
    cy.findByTestId('new-chat-button').should('be.visible').click();
    cy.findByTestId('confirm-button').should('be.visible').click();
  }

  // Agent configuration management navigation
  navigateToPlaygroundWithAgentManagement(projectName: string) {
    cy.visit(`/gen-ai-studio/playground/${projectName}?${GEN_AI_ALL_FLAGS}`);
    cy.findByTestId('chatbot-message-bar', { timeout: 120000 }).should('be.visible');
  }

  navigateToAssetsWithAgentManagement(projectName: string) {
    cy.visit(`/gen-ai-studio/assets/${projectName}?${GEN_AI_ALL_FLAGS}`);
    cy.url().should('include', `/gen-ai-studio/assets/${projectName}`);
  }

  // AI Assets — Agents tab
  findAgentsTab() {
    return cy.findByTestId('ai-assets-tab-agentprofile');
  }

  findAgentProfilesTable() {
    return cy.findByTestId('agent-profiles-table');
  }

  findAgentProfilesEmptyState() {
    return cy.findByTestId('agent-profiles-empty-state');
  }

  findAgentRowByName(agentName: string) {
    const escaped = agentName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return cy
      .contains('[data-testid^="agent-profile-row-"] td', new RegExp(`^\\s*${escaped}\\s*$`))
      .closest('[data-testid^="agent-profile-row-"]');
  }

  findAgentKebabByName(agentName: string) {
    return this.findAgentRowByName(agentName).find('[data-testid^="agent-profile-kebab-"]');
  }

  findDeleteAgentDropdownItem() {
    return cy
      .get('[data-testid^="delete-agent-profile-"]')
      .not(
        '[data-testid="delete-agent-profile-modal"],[data-testid="delete-agent-profile-confirm-button"]',
      );
  }

  findDeleteAgentModal() {
    return cy.findByTestId('delete-agent-profile-modal');
  }

  findDeleteAgentConfirmButton() {
    return cy.findByTestId('delete-agent-profile-confirm-button');
  }

  findTryInPlaygroundByName(agentName: string) {
    return this.findAgentRowByName(agentName).find('[data-testid^="try-in-playground-"]');
  }

  // Settings panel — agent save / load buttons
  findSettingsPanelSaveAsButton() {
    return cy.findByTestId('settings-panel-save-as-button');
  }

  findSettingsPanelSaveButton() {
    return cy.findByTestId('settings-panel-save-button');
  }

  findSettingsPanelLoadButton() {
    return cy.findByTestId('settings-panel-load-button');
  }

  // Save agent modal
  findSaveAgentProfileModal() {
    return cy.findByTestId('save-agent-profile-modal');
  }

  findSaveAgentNameInput() {
    return cy.findByTestId('save-agent-profile-name-input');
  }

  findSaveAgentSubmitButton() {
    return cy.findByTestId('save-agent-profile-submit-button');
  }

  // Load agent modal
  findLoadAgentProfileModal() {
    return cy.findByTestId('load-agent-profile-modal');
  }

  findLoadAgentSearchInput() {
    return cy.findByTestId('load-agent-profile-search');
  }

  findLoadAgentEmptyState() {
    return cy.findByTestId('load-agent-profile-empty-state');
  }

  loadAgentByName(agentName: string) {
    this.findSettingsPanelLoadButton().should('be.visible').click();
    this.findLoadAgentProfileModal().should('be.visible');
    this.findLoadAgentSearchInput().clear().type(agentName);
    cy.get('[data-testid^="load-agent-profile-button-"]').should('have.length', 1).first().click();
    this.findLoadAgentProfileModal().should('not.exist');
  }

  // Agent loaded indicator in playground header
  findAgentNameTitle(options?: { timeout?: number }) {
    return cy.findByTestId('agent-name-title', options);
  }

  findAgentUnsavedIndicator() {
    return cy.findByTestId('agent-unsaved-indicator');
  }

  // MCP methods
  findMCPTab() {
    return cy.findByTestId('chatbot-settings-page-tab-mcp');
  }

  findMCPServersTable(options?: { timeout?: number }) {
    // Points to the Manual Connection section table
    return cy.findByTestId('mcp-manual-servers-table', options);
  }

  findMCPRegisteredServersTable(options?: { timeout?: number }) {
    return cy.findByTestId('mcp-registered-servers-table', options);
  }

  findMCPServerRow(serverNameOrUrl: string) {
    // If a URL is passed (starts with "http"), use the URL-based data-testid on the
    // checkbox cell — server.id === apiServer.url, so each checkbox carries the full URL.
    // This is resilient to display-name changes caused by the BFF surfacing the same server
    // via the MLflow registry (where the registry display_name may differ from the
    // configmap key).  Falls back to text-content search for short names / short display names.
    if (serverNameOrUrl.startsWith('http')) {
      return cy
        .get(`[data-testid="mcp-server-checkbox-${serverNameOrUrl}"]`, { timeout: 30000 })
        .closest('tr');
    }
    // cy.contains(selector, text) searches the entire document for elements matching
    // the selector that contain the text — works correctly across both section tables.
    return cy.contains(
      '[data-testid="mcp-registered-servers-table"] tr, [data-testid="mcp-manual-servers-table"] tr',
      serverNameOrUrl,
      { timeout: 30000 },
    );
  }

  findMCPServerCheckbox(serverNameOrUrl: string) {
    // Prefix selector is safe — scoped to a single <tr> via findMCPServerRow
    return this.findMCPServerRow(serverNameOrUrl)
      .find('[data-testid^="mcp-server-checkbox-"]')
      .find('input[type="checkbox"]');
  }

  selectMCPServer(serverNameOrUrl: string) {
    return this.findMCPServerCheckbox(serverNameOrUrl).then(($checkbox) => {
      if (!$checkbox.is(':checked')) {
        cy.wrap($checkbox).check({ force: true });
      }
    });
  }

  findMCPSuccessModal(options?: { timeout?: number }) {
    return cy.findByTestId('mcp-server-success-modal', options);
  }

  findMCPSuccessModalSaveButton() {
    return this.findMCPSuccessModal().findByTestId('modal-submit-button');
  }

  closeMCPSuccessModal() {
    this.findMCPSuccessModalSaveButton().should('be.visible').click();
    cy.findByTestId('mcp-server-success-modal').should('not.exist');
  }

  // MCP Registry section methods
  findMCPRegisteredSection() {
    return cy.findByTestId('mcp-registered-section');
  }

  findMCPRegisteredToggle() {
    return cy.findByTestId('mcp-registered-toggle');
  }

  findMCPRegisteredCountBadge() {
    return cy.findByTestId('mcp-registered-count-badge');
  }

  findMCPRegisteredKebab() {
    return cy.findByTestId('mcp-registered-kebab');
  }

  findMCPManageServersLink() {
    return cy.findByTestId('mcp-manage-servers-link');
  }

  findMCPManualSection() {
    return cy.findByTestId('mcp-manual-section');
  }

  findMCPManualToggle() {
    return cy.findByTestId('mcp-manual-toggle');
  }

  findMCPManualEmptyState() {
    return cy.findByTestId('mcp-manual-empty-state');
  }

  /** Open the settings panel (if not already open) and click the MCP tab. */
  openMCPTab() {
    this.ensureSettingsPanelOpen();
    this.findMCPTab().should('be.visible').click();
  }

  /**
   * Select an MCP server, wait for auto-connect, and close the success modal.
   * @param serverNameOrUrl — display name or full URL passed to `selectMCPServer`.
   */
  connectMCPServer(serverNameOrUrl: string) {
    this.selectMCPServer(serverNameOrUrl);
    this.findMCPSuccessModal({ timeout: 30000 }).should('be.visible');
    this.closeMCPSuccessModal();
  }

  /** Send a message, wait for streaming to finish, and assert a response exists. */
  sendAndVerifyMCPResponse(question: string) {
    this.findMessageInput().should('be.enabled').and('be.visible');
    this.sendMessage(question);
    this.waitForStreamingComplete({ timeout: 120000 });
    this.findAssistantMessage({ timeout: 30000 }).should('exist').and('not.be.empty');
  }
}

export const genAiPlayground = new GenAiPlayground();
