import { chatbotPage } from '~/__tests__/cypress/cypress/pages/chatbotPage';
import {
  interceptNewAgentProfile,
  interceptExistingAgentProfile,
  makeCreateProfileResponse,
  makeProfileResponse,
} from '~/__tests__/cypress/cypress/support/helpers/agentProfiles/agentProfilePlaygroundHelpers';
import {
  mockAgentProfiles,
  mockMCPRegistryStatusAutoConnect,
  mockMCPRegistryToolsAutoConnect,
  mockMCPServer,
  mockMCPServersWithRegistry,
} from '~/__tests__/cypress/cypress/__mocks__';
import { mcpToolsModal } from '~/__tests__/cypress/cypress/pages/playgroundPage/mcpModals';
import {
  clearMCPRegistryServersFlag,
  visitWithMCPRegistryServersFlag,
} from '~/__tests__/cypress/cypress/support/helpers/mcpServers/mcpServersTestHelpers';
import type { AgentProfileSpec } from '~/app/agentProfile/types';

// Use mock-test-namespace-2 which has LSD configured and ready in the BFF
const TEST_NAMESPACE = 'mock-test-namespace-2';
const NEW_PROFILE_ID = 'new-profile-uuid-1';
const EXISTING_PROFILE_ID = 'existing-profile-uuid-1';
const AGENT_NAME = 'My Coding Agent';
const REGISTRY_MCP_SERVER = mockMCPServer({
  name: 'com.example/jira',
  url: 'https://registry.example.com/jira',
  transport: 'streamable-http',
  source: 'registry',
  version: '3',
});
const SELECTABLE_REGISTRY_SERVER = mockMCPServer({
  name: 'com.example/kubernetes',
  url: 'https://registry.example.com/kubernetes',
  transport: 'streamable-http',
  source: 'registry',
  version: '1.0.0',
});

const interceptRegistryMcpServer = (): void => {
  cy.intercept(
    'GET',
    '**/gen-ai/api/v1/aaa/mcps*',
    mockMCPServersWithRegistry([REGISTRY_MCP_SERVER], []),
  );
  mockMCPRegistryStatusAutoConnect(REGISTRY_MCP_SERVER.name, REGISTRY_MCP_SERVER.url);
};

describe('Agent Profile - Playground (Mocked)', () => {
  afterEach(() => {
    clearMCPRegistryServersFlag();
  });

  it(
    'should save a new profile and verify the same profile is active',
    { tags: ['@GenAI', '@AgentProfile', '@Chatbot'] },
    () => {
      interceptNewAgentProfile(NEW_PROFILE_ID, AGENT_NAME, TEST_NAMESPACE);

      cy.step('Visit playground (no agentProfileId — no modal)');
      chatbotPage.visit(TEST_NAMESPACE);

      cy.step('Open Save As modal via kebab menu — no profile loaded yet, name is empty');
      chatbotPage.openKebabAndClickItem('save-as-agent-profile-button');
      cy.findByTestId('save-agent-profile-modal').should('be.visible');
      cy.findByTestId('save-agent-profile-name-input').should('have.value', '');

      cy.step('Fill name and submit');
      cy.findByTestId('save-agent-profile-name-input').type(AGENT_NAME);
      cy.findByTestId('save-agent-profile-submit-button').click();
      cy.wait('@createAgentProfile').then((interception) => {
        expect(interception.request.body.spec.displayName).to.equal(AGENT_NAME);
      });

      cy.step('Profile is now active — Save button available, URL has profileId');
      cy.findByTestId('save-agent-profile-modal').should('not.exist');
      cy.location('search').should('include', `agentProfileId=${NEW_PROFILE_ID}`);

      cy.step('Open Save modal via kebab — name matches the profile that was just saved');
      chatbotPage.openKebabAndClickItem('save-agent-profile-button');
      cy.findByTestId('save-agent-profile-name-input').should('have.value', AGENT_NAME);
      cy.findByRole('button', { name: 'Cancel' }).click();
    },
  );

  it(
    'should update an existing profile via PUT and include resourceVersion',
    { tags: ['@GenAI', '@AgentProfile', '@Chatbot'] },
    () => {
      interceptRegistryMcpServer();
      interceptExistingAgentProfile(EXISTING_PROFILE_ID, AGENT_NAME, TEST_NAMESPACE, {
        mcpServers: [
          {
            name: REGISTRY_MCP_SERVER.name,
            source: 'mlflow',
            version: REGISTRY_MCP_SERVER.version,
            allowedTools: ['search_issues'],
          },
        ],
      });

      cy.step('Visit playground with an existing agentProfileId in the URL');
      chatbotPage.visit(TEST_NAMESPACE, { agentProfileId: EXISTING_PROFILE_ID });

      cy.step('Wait for profile to load');
      cy.wait('@getAgentProfile');

      cy.step('Open Save modal via kebab — name is pre-filled from loaded profile');
      chatbotPage.openKebabAndClickItem('save-agent-profile-button');
      cy.findByTestId('save-agent-profile-modal').should('be.visible');
      cy.findByTestId('save-agent-profile-name-input').should('have.value', AGENT_NAME);

      cy.step('Submit and verify PUT request includes resourceVersion');
      cy.findByTestId('save-agent-profile-submit-button').click();
      cy.wait('@updateAgentProfile').then((interception) => {
        expect(interception.request.body.spec.displayName).to.equal(AGENT_NAME);
        expect(interception.request.body.resourceVersion).to.equal('rv-1');
        expect(interception.request.body.spec.mcpServers).to.deep.equal([
          {
            name: REGISTRY_MCP_SERVER.name,
            source: 'mlflow',
            version: REGISTRY_MCP_SERVER.version,
            allowedTools: ['search_issues'],
          },
        ]);
      });

      cy.findByTestId('save-agent-profile-modal').should('not.exist');
    },
  );

  it(
    'should create a profile from a reloaded registry MCP selection',
    { tags: ['@GenAI', '@AgentProfile', '@Chatbot'] },
    () => {
      interceptRegistryMcpServer();
      interceptExistingAgentProfile(EXISTING_PROFILE_ID, AGENT_NAME, TEST_NAMESPACE, {
        mcpServers: [
          {
            name: REGISTRY_MCP_SERVER.name,
            source: 'mlflow',
            version: REGISTRY_MCP_SERVER.version,
            allowedTools: ['search_issues'],
          },
        ],
      });
      cy.interceptGenAi(
        'POST /api/v1/agent-profiles',
        makeCreateProfileResponse('registry-profile-id', 'Registry profile', TEST_NAMESPACE),
      ).as('createRegistryProfile');

      chatbotPage.visit(TEST_NAMESPACE, { agentProfileId: EXISTING_PROFILE_ID });
      cy.wait('@getAgentProfile');

      chatbotPage.openKebabAndClickItem('save-as-agent-profile-button');
      cy.findByTestId('save-agent-profile-name-input').clear();
      cy.findByTestId('save-agent-profile-name-input').type('Registry profile');
      cy.findByTestId('save-agent-profile-submit-button').click();

      cy.wait('@createRegistryProfile').then((interception) => {
        expect(interception.request.body.spec.mcpServers).to.deep.equal([
          {
            name: REGISTRY_MCP_SERVER.name,
            source: 'mlflow',
            version: REGISTRY_MCP_SERVER.version,
            allowedTools: ['search_issues'],
          },
        ]);
      });
    },
  );

  it(
    'should retain a selected registry server and its tools across save, reload, and edit',
    { tags: ['@GenAI', '@AgentProfile', '@Chatbot', '@Registry'] },
    () => {
      const profileId = 'selected-registry-profile-uuid';
      const profileName = 'Kubernetes registry agent';
      let persistedSpec: AgentProfileSpec | undefined;
      const profileResponse = makeProfileResponse(profileId, profileName);

      cy.intercept(
        'GET',
        '**/gen-ai/api/v1/aaa/mcps*',
        mockMCPServersWithRegistry([SELECTABLE_REGISTRY_SERVER], []),
      ).as('registryList');
      mockMCPRegistryStatusAutoConnect(
        SELECTABLE_REGISTRY_SERVER.name,
        SELECTABLE_REGISTRY_SERVER.url,
      );
      mockMCPRegistryToolsAutoConnect(
        SELECTABLE_REGISTRY_SERVER.name,
        SELECTABLE_REGISTRY_SERVER.url,
      );
      cy.intercept('POST', '**/gen-ai/api/v1/agent-profiles*', (request) => {
        persistedSpec = request.body.spec as AgentProfileSpec;
        request.reply({
          statusCode: 201,
          body: makeCreateProfileResponse(profileId, profileName, TEST_NAMESPACE),
        });
      }).as('createSelectedRegistryProfile');
      cy.intercept('GET', '**/gen-ai/api/v1/agent-profiles/*', (request) => {
        request.reply({
          statusCode: 200,
          body: {
            ...profileResponse,
            data: { ...(profileResponse.data as object), spec: persistedSpec },
          },
        });
      }).as('getSavedRegistryProfile');
      cy.intercept('PUT', '**/gen-ai/api/v1/agent-profiles/*', (request) => {
        persistedSpec = request.body.spec as AgentProfileSpec;
        request.reply({
          statusCode: 200,
          body: {
            data: {
              ...makeCreateProfileResponse(profileId, profileName, TEST_NAMESPACE).data,
              resourceVersion: 'rv-2',
            },
          },
        });
      }).as('updateSelectedRegistryProfile');

      visitWithMCPRegistryServersFlag(true);
      chatbotPage.visit(TEST_NAMESPACE);
      cy.wait('@registryList');
      chatbotPage.mcpTab.openMCPTab();
      const registryRow = chatbotPage.mcpTab.getRegisteredServerRow(
        SELECTABLE_REGISTRY_SERVER.name,
        SELECTABLE_REGISTRY_SERVER.url,
      );
      registryRow.findCheckbox().check();
      cy.wait('@registryToolsRequestAutoConnect');
      chatbotPage.mcpTab.findSuccessModal().should('be.visible');
      chatbotPage.mcpTab.closeSuccessModal();

      registryRow.findToolsButton().should('not.have.attr', 'aria-disabled');
      registryRow.findToolsButton().click();
      mcpToolsModal.find().should('be.visible');
      mcpToolsModal.findToolRows().first().should('contain.text', 'list_pods');
      mcpToolsModal.findSelectAllCheckbox().uncheck();
      mcpToolsModal.findToolCheckbox(0).click();
      mcpToolsModal.findToolCountText().should('contain.text', '1 out of 10 selected');
      mcpToolsModal.findSaveButton().click();

      chatbotPage.openKebabAndClickItem('save-as-agent-profile-button');
      chatbotPage.findSaveProfileNameInput().type(profileName);
      chatbotPage.findSaveProfileSubmitButton().click();
      cy.wait('@createSelectedRegistryProfile').then((interception) => {
        expect(interception.request.body.spec.mcpServers).to.deep.equal([
          {
            name: SELECTABLE_REGISTRY_SERVER.name,
            source: 'mlflow',
            version: SELECTABLE_REGISTRY_SERVER.version,
            allowedTools: ['list_pods'],
          },
        ]);
      });

      cy.location('search').should('include', `agentProfileId=${profileId}`);
      cy.reload();
      cy.wait('@getSavedRegistryProfile');
      chatbotPage.mcpTab.openMCPTab();
      const reloadedRow = chatbotPage.mcpTab.getRegisteredServerRow(
        SELECTABLE_REGISTRY_SERVER.name,
        SELECTABLE_REGISTRY_SERVER.url,
      );
      reloadedRow.findCheckbox().should('be.checked');
      reloadedRow.findToolsButton().should('contain.text', '1 active').click();
      mcpToolsModal.findToolCountText().should('contain.text', '1 out of 10 selected');
      mcpToolsModal.findToolCheckbox(0).should('be.checked');
      mcpToolsModal.findToolCheckbox(1).should('not.be.checked').click();
      mcpToolsModal.findSaveButton().click();

      chatbotPage.openKebabAndClickItem('save-agent-profile-button');
      chatbotPage.findSaveProfileSubmitButton().click();
      cy.wait('@updateSelectedRegistryProfile').then((interception) => {
        expect(interception.request.body.resourceVersion).to.equal('rv-1');
        expect(interception.request.body.spec.mcpServers).to.deep.equal([
          {
            name: SELECTABLE_REGISTRY_SERVER.name,
            source: 'mlflow',
            version: SELECTABLE_REGISTRY_SERVER.version,
            allowedTools: ['list_pods', 'get_pod'],
          },
        ]);
      });

      reloadedRow.findToolsButton().should('contain.text', '2 active').click();
      mcpToolsModal.findSelectAllCheckbox().check();
      mcpToolsModal.findSelectAllCheckbox().uncheck();
      mcpToolsModal.findToolCountText().should('contain.text', '0 out of 10 selected');
      mcpToolsModal.findSaveButton().click();
      chatbotPage.openKebabAndClickItem('save-agent-profile-button');
      chatbotPage.findSaveProfileSubmitButton().click();
      cy.wait('@updateSelectedRegistryProfile').then((interception) => {
        expect(interception.request.body.spec.mcpServers).to.deep.equal([
          {
            name: SELECTABLE_REGISTRY_SERVER.name,
            source: 'mlflow',
            version: SELECTABLE_REGISTRY_SERVER.version,
            allowedTools: [],
          },
        ]);
      });

      cy.reload();
      cy.wait('@getSavedRegistryProfile');
      chatbotPage.mcpTab.openMCPTab();
      const emptyToolsRow = chatbotPage.mcpTab.getRegisteredServerRow(
        SELECTABLE_REGISTRY_SERVER.name,
        SELECTABLE_REGISTRY_SERVER.url,
      );
      emptyToolsRow.findCheckbox().should('be.checked');
      emptyToolsRow.findToolsButton().should('contain.text', '0 active').click();
      mcpToolsModal.findToolCountText().should('contain.text', '0 out of 10 selected');
    },
  );

  it(
    'should warn when a saved registry MCP server is no longer listed',
    { tags: ['@GenAI', '@AgentProfile', '@Chatbot', '@Registry'] },
    () => {
      cy.intercept('GET', '**/gen-ai/api/v1/aaa/mcps*', mockMCPServersWithRegistry([], []));
      interceptExistingAgentProfile(EXISTING_PROFILE_ID, AGENT_NAME, TEST_NAMESPACE, {
        mcpServers: [{ name: REGISTRY_MCP_SERVER.name, source: 'mlflow' }],
      });

      visitWithMCPRegistryServersFlag(true);
      chatbotPage.visit(TEST_NAMESPACE, { agentProfileId: EXISTING_PROFILE_ID });
      cy.wait('@getAgentProfile');
      chatbotPage
        .findProfileLoadWarning()
        .should('contain.text', `MCP server "${REGISTRY_MCP_SERVER.name}" is no longer available.`);
    },
  );

  it(
    'should warn and retain a saved registry MCP server when it is unreachable',
    { tags: ['@GenAI', '@AgentProfile', '@Chatbot', '@Registry'] },
    () => {
      cy.intercept(
        'GET',
        '**/gen-ai/api/v1/aaa/mcps*',
        mockMCPServersWithRegistry([REGISTRY_MCP_SERVER], []),
      );
      cy.intercept(
        'GET',
        `**/mcp/status*server_name=${encodeURIComponent(REGISTRY_MCP_SERVER.name)}*`,
        {
          statusCode: 503,
          body: { error: { code: 'unavailable', message: 'Server unreachable' } },
        },
      ).as('unreachableRegistryStatus');
      interceptExistingAgentProfile(EXISTING_PROFILE_ID, AGENT_NAME, TEST_NAMESPACE, {
        mcpServers: [
          {
            name: REGISTRY_MCP_SERVER.name,
            source: 'mlflow',
            version: REGISTRY_MCP_SERVER.version,
            allowedTools: ['search_issues'],
          },
        ],
      });

      visitWithMCPRegistryServersFlag(true);
      chatbotPage.visit(TEST_NAMESPACE, { agentProfileId: EXISTING_PROFILE_ID });
      cy.wait('@unreachableRegistryStatus');
      cy.wait('@getAgentProfile');
      chatbotPage
        .findProfileLoadWarning()
        .should('contain.text', `MCP server "${REGISTRY_MCP_SERVER.name}" is no longer available.`);

      chatbotPage.mcpTab.openMCPTab();
      chatbotPage.mcpTab.findRegisteredSection().should('not.exist');

      chatbotPage.openKebabAndClickItem('save-agent-profile-button');
      chatbotPage.findSaveProfileSubmitButton().click();
      cy.wait('@updateAgentProfile').then((interception) => {
        expect(interception.request.body.spec.mcpServers).to.deep.equal([
          {
            name: REGISTRY_MCP_SERVER.name,
            source: 'mlflow',
            version: REGISTRY_MCP_SERVER.version,
            allowedTools: ['search_issues'],
          },
        ]);
      });
    },
  );

  describe('Load Agent Profile Modal', () => {
    // Derive values from fixture so tests stay in sync with mock data automatically
    const profileList = mockAgentProfiles();
    const firstProfile = profileList.data.profiles[0];

    beforeEach(() => {
      cy.interceptGenAi('GET /api/v1/agent-profiles', profileList).as('listAgentProfiles');
      interceptExistingAgentProfile(
        firstProfile.profileId,
        firstProfile.displayName,
        TEST_NAMESPACE,
      );
      chatbotPage.visit(TEST_NAMESPACE);
    });

    it(
      'should open the load modal and show the profile list when Load is clicked',
      { tags: ['@GenAI', '@AgentProfile', '@Chatbot'] },
      () => {
        cy.step('Click Load via kebab menu');
        chatbotPage.openKebabAndClickItem('load-agent-profile-button');

        cy.step('Modal is visible and profiles are listed');
        cy.findByTestId('load-agent-profile-modal').should('be.visible');
        cy.wait('@listAgentProfiles');
        cy.findByTestId('load-agent-profile-modal').should('contain.text', 'Coding assistant');
        cy.findByTestId('load-agent-profile-modal').should(
          'contain.text',
          'Expense report assistant',
        );
      },
    );

    it(
      'should set agentProfileId in the URL and show open-agent modal when a profile row is clicked',
      { tags: ['@GenAI', '@AgentProfile', '@Chatbot'] },
      () => {
        cy.step('Open load modal via kebab');
        chatbotPage.openKebabAndClickItem('load-agent-profile-button');
        cy.wait('@listAgentProfiles');

        cy.step('Click Load agent button for the first profile');
        cy.findByTestId(`load-agent-profile-button-${firstProfile.profileId}`).click();

        cy.step('Load modal closes and agentProfileId appears in URL');
        cy.findByTestId('load-agent-profile-modal').should('not.exist');
        cy.location('search').should('include', `agentProfileId=${firstProfile.profileId}`);

        cy.step('Profile is fetched and applied');
        cy.wait('@getAgentProfile');
      },
    );

    it(
      'should filter profiles by name in the load modal',
      { tags: ['@GenAI', '@AgentProfile', '@Chatbot'] },
      () => {
        cy.step('Open load modal via kebab');
        chatbotPage.openKebabAndClickItem('load-agent-profile-button');
        cy.wait('@listAgentProfiles');

        cy.step('Type in search box to filter');
        cy.findByTestId('load-agent-profile-search').type('Coding');
        cy.findByTestId('load-agent-profile-modal').should('contain.text', 'Coding assistant');
        cy.findByTestId('load-agent-profile-modal').should(
          'not.contain.text',
          'Expense report assistant',
        );
      },
    );

    it(
      'should close the load modal when Cancel is clicked',
      { tags: ['@GenAI', '@AgentProfile', '@Chatbot'] },
      () => {
        cy.step('Open and then cancel the modal via kebab');
        chatbotPage.openKebabAndClickItem('load-agent-profile-button');
        cy.findByTestId('load-agent-profile-modal').should('be.visible');
        cy.findByRole('button', { name: 'Cancel' }).click();
        cy.findByTestId('load-agent-profile-modal').should('not.exist');
      },
    );
  });
});
