import { mockLLMInferenceServiceK8sResource } from '@odh-dashboard/internal/__mocks__/mockLLMInferenceServiceK8sResource';
import {
  mockDashboardConfig,
  mockDscStatus,
  mockK8sResourceList,
  mockProjectK8sResource,
  mockSecretK8sResource,
} from '@odh-dashboard/internal/__mocks__';
import { mockGlobalScopedHardwareProfiles } from '@odh-dashboard/internal/__mocks__/mockHardwareProfile';
import { mockStandardModelServingTemplateK8sResources } from '@odh-dashboard/internal/__mocks__/mockServingRuntimeTemplateK8sResource';
import { mockConnectionTypeConfigMap } from '@odh-dashboard/internal/__mocks__/mockConnectionType';
import { DataScienceStackComponent } from '@odh-dashboard/internal/concepts/areas/types';
import {
  ModelLocationSelectOption,
  ModelTypeLabel,
} from '@odh-dashboard/model-serving/components/deploymentWizard/types';
import { asProductAdminUser } from '../../../utils/mockUsers';
import {
  createTierPage,
  deleteTierModal,
  maasWizardField,
  tierDetailsPage,
  tiersPage,
} from '../../../pages/modelsAsAService';
import { modelServingGlobal, modelServingWizard } from '../../../pages/modelServing';
import { mockTier, mockTiers } from '../../../utils/maasUtils';
import {
  HardwareProfileModel,
  InferenceServiceModel,
  LLMInferenceServiceModel,
  ProjectModel,
  SecretModel,
  ServingRuntimeModel,
  TemplateModel,
} from '../../../utils/models';

describe('Tiers Page', () => {
  beforeEach(() => {
    asProductAdminUser();
    cy.interceptOdh(
      'GET /api/config',
      mockDashboardConfig({
        modelAsService: true,
        genAiStudio: true,
      }),
    );

    cy.interceptOdh(
      'GET /api/dsc/status',
      mockDscStatus({
        components: {
          [DataScienceStackComponent.LLAMA_STACK_OPERATOR]: { managementState: 'Managed' },
        },
      }),
    );
    cy.intercept('GET', '/api/tiers', mockTiers);

    cy.interceptOdh('GET /maas/api/v1/tiers', {
      data: mockTiers(),
    });

    tiersPage.visit();
  });

  it('should display the tiers page', () => {
    tiersPage.findTitle().should('contain.text', 'Tiers');
    tiersPage
      .findDescription()
      .should(
        'contain.text',
        'Tiers control which AI asset model endpoints users can access based on their group membership.',
      );

    tiersPage.findTable().should('exist');
    tiersPage.findRows().should('have.length', 3);

    const freeTierRow = tiersPage.getRow('Free Tier');
    freeTierRow.findName().should('contain.text', 'Free Tier');
    freeTierRow.findLevel().should('contain.text', '1');
    freeTierRow.findGroups().should('contain.text', '1 Group');
    freeTierRow.findLimits().should('contain.text', '10,000 tokens/1 hour');
    freeTierRow.findLimits().should('contain.text', '100 requests/1 minute');

    // filter by tier name
    tiersPage.findFilterInput().type('Premium');
    tiersPage.findRows().should('have.length', 1);
    tiersPage.getRow('Premium Tier').findName().should('contain.text', 'Premium Tier');

    tiersPage.findFilterResetButton().click();
    tiersPage.findRows().should('have.length', 3);

    // filter by tier description
    tiersPage.findFilterInput().type('enterprise');
    tiersPage.findRows().should('have.length', 1);
    tiersPage.getRow('Enterprise Tier').findName().should('contain.text', 'Enterprise Tier');
    tiersPage.findFilterResetButton().click();

    // show empty state when filter has no matches
    tiersPage.findFilterInput().type('nonexistent-tier');
    tiersPage.findEmptyState().should('exist');

    // clear filter
    tiersPage.findFilterResetButton().click();
    tiersPage.findRows().should('have.length', 3);
  });

  it('should create a new tier', () => {
    cy.interceptOdh('POST /maas/api/v1/tier', {
      data: mockTier({
        name: 'test-tier',
        displayName: 'Test Tier',
        description: 'Test tier description',
        level: 5,
        groups: ['premium-users'],
        limits: {
          tokensPerUnit: [{ count: 500, time: 5, unit: 'hour' }],
          requestsPerUnit: [{ count: 200, time: 3, unit: 'second' }],
        },
      }),
    }).as('createTier');

    tiersPage.findCreateTierButton().click();
    createTierPage.findTitle().should('contain.text', 'Create tier');
    createTierPage
      .findPageDescription()
      .should(
        'contain.text',
        'Create a new tier to control which models users can access based on their group membership.',
      );

    createTierPage.findCreateButton().should('exist').should('be.disabled');

    // check the level and names are unique
    createTierPage.findNameInput().type('free');
    createTierPage.findNameTakenError().should('exist');
    createTierPage.findLevelInput().should('have.value', '0');
    createTierPage.findLevelInput().clear().type('1');
    createTierPage.findLevelTakenError().should('exist');

    createTierPage.findNameInput().clear().type('Test Tier');
    createTierPage.findNameTakenError().should('not.exist');
    createTierPage.findDescriptionInput().type('Test tier description');
    createTierPage.findLevelInput().clear().type('5');
    createTierPage.findLevelTakenError().should('not.exist');
    createTierPage.selectGroupsOption('premium-users');
    createTierPage.findTokenRateLimitCheckbox().click();
    createTierPage.findTokenRateLimitCountInput(0).clear().type('500');
    createTierPage.findTokenRateLimitTimeInput(0).clear().type('5');
    createTierPage.selectTokenRateLimitUnit(0, 'hour');
    createTierPage.findRequestRateLimitCheckbox().click();
    createTierPage.findRequestRateLimitCountInput(0).clear().type('200');
    createTierPage.findRequestRateLimitTimeInput(0).clear().type('3');
    createTierPage.selectRequestRateLimitUnit(0, 'second');
    createTierPage.findCreateButton().should('exist').should('be.enabled').click();

    cy.wait('@createTier').then((interception) => {
      expect(interception.request.body.data).to.deep.include({
        name: 'test-tier',
        displayName: 'Test Tier',
        description: 'Test tier description',
        level: 5,
        groups: ['premium-users'],
      });
      expect(interception.request.body.data.limits.tokensPerUnit).to.deep.equal([
        { count: 500, time: 5, unit: 'hour' },
      ]);
      expect(interception.request.body.data.limits.requestsPerUnit).to.deep.equal([
        { count: 200, time: 3, unit: 'second' },
      ]);
    });
    cy.interceptOdh('GET /maas/api/v1/tiers', {
      data: mockTiers().concat(
        mockTier({
          name: 'test-tier',
          displayName: 'Test Tier',
          description: 'Test tier description',
          level: 5,
          groups: ['premium-users'],
          limits: {
            tokensPerUnit: [{ count: 500, time: 5, unit: 'hour' }],
            requestsPerUnit: [{ count: 200, time: 3, unit: 'second' }],
          },
        }),
      ),
    });

    tiersPage.findTable().should('exist');
    tiersPage.findRows().should('have.length', 4);
    tiersPage.getRow('Test Tier').findName().should('contain.text', 'Test Tier');
  });

  it('should delete a tier', () => {
    cy.interceptOdh(
      'DELETE /maas/api/v1/tier/:name',
      { path: { name: 'free' } },
      { data: null },
    ).as('deleteTier');

    tiersPage.getRow('Free Tier').findDeleteButton().click();
    deleteTierModal.findInput().type('Free Tier');

    // Add this intercept before the next tiers call happens after deletion
    cy.interceptOdh('GET /maas/api/v1/tiers', {
      data: mockTiers().filter((tier) => tier.name !== 'free'),
    }).as('getTiers');

    deleteTierModal.findSubmitButton().click();

    cy.wait('@deleteTier').then(() => {
      cy.wait('@getTiers').then((interception) => {
        expect(interception.response?.body.data).to.deep.equal(
          mockTiers().filter((tier) => tier.name !== 'free'),
        );
      });
    });

    tiersPage.findTable().should('exist');
    tiersPage.findRows().should('have.length', 2);
    tiersPage.getRow('Premium Tier').findName().should('contain.text', 'Premium Tier');
    tiersPage.getRow('Enterprise Tier').findName().should('contain.text', 'Enterprise Tier');
    tiersPage.findTable().should('not.contain', 'Free Tier');
  });

  it('should display the tier details page', () => {
    tiersPage.findKebab('Free Tier').click();
    tiersPage.findViewDetailsButton().click();

    tiersPage.findTitle().should('contain.text', 'Free Tier');
    tierDetailsPage.findLevel().should('contain.text', '1');
    tierDetailsPage.findGroups().should('contain.text', 'all-users');
    tierDetailsPage.findLimits('10,000 tokens per 1 hour').should('exist');
    tierDetailsPage.findLimits('100 requests per 1 minute').should('exist');

    tierDetailsPage.findActionsButton().click();
  });

  it('should edit a tier', () => {
    cy.interceptOdh(
      'PUT /maas/api/v1/tier/:name',
      { path: { name: 'enterprise' } },
      {
        data: mockTier({
          name: 'enterprise',
          displayName: 'Enterprise Tier',
          description: 'Unlimited enterprise access',
          level: 5,
          groups: ['enterprise-users'],
          limits: {
            tokensPerUnit: [{ count: 1000000, time: 1, unit: 'hour' }],
            requestsPerUnit: [{ count: 10000, time: 1, unit: 'minute' }],
          },
        }),
      },
    ).as('updateTier');
    tiersPage.getRow('Enterprise Tier').findKebabAction('Edit tier').click();
    createTierPage.findTitle().should('contain.text', 'Edit tier');
    createTierPage
      .findPageDescription()
      .should(
        'contain.text',
        'Edit a tier to control which models users can access based on their group membership.',
      );

    createTierPage.findNameInput().should('have.value', 'Enterprise Tier');
    createTierPage.findNameInput().clear().type('Enterprise Tier Edited');
    createTierPage.findDescriptionInput().should('have.value', 'Unlimited enterprise access');
    createTierPage.findDescriptionInput().clear().type('Unlimited enterprise access edited');
    createTierPage.findLevelInput().should('have.value', '3');
    createTierPage.findLevelInput().clear().type('5');
    createTierPage.findGroupsSelectButton().click();
    createTierPage
      .findGroupsOption('enterprise-users')
      .should('have.attr', 'aria-selected', 'true');
    createTierPage.findGroupsSelectButton().click();

    createTierPage.selectGroupsOption('all-users');
    createTierPage.findTokenRateLimitCheckbox().should('be.checked');
    createTierPage.findTokenRateLimitCountInput(0).should('have.value', '1000000');
    createTierPage.findTokenRateLimitCountInput(0).clear().type('2000000');
    createTierPage.findTokenRateLimitTimeInput(0).should('have.value', '1');
    createTierPage.findTokenRateLimitTimeInput(0).clear().type('2');
    createTierPage.selectTokenRateLimitUnit(0, 'minute');
    createTierPage.findTokenRateLimitUnitSelect(0).should('contain.text', 'minute');
    createTierPage.findRequestRateLimitCheckbox().should('be.checked');
    createTierPage.findRequestRateLimitCountInput(0).should('have.value', '10000');
    createTierPage.findRequestRateLimitCountInput(0).clear().type('20000');
    createTierPage.findRequestRateLimitTimeInput(0).should('have.value', '1');
    createTierPage.findRequestRateLimitTimeInput(0).clear().type('2');
    createTierPage.findRequestRateLimitUnitSelect(0).should('contain.text', 'minute');
    createTierPage.selectRequestRateLimitUnit(0, 'hour');

    //disable token rate limit to ensure it gets disabled
    createTierPage.findTokenRateLimitCheckbox().click();
    createTierPage.findTokenRateLimitCheckbox().should('not.be.checked');

    createTierPage.findUpdateButton().should('exist').should('be.enabled').click();

    cy.wait('@updateTier').then((interception) => {
      expect(interception.request.body.data).to.deep.include({
        name: 'enterprise',
        displayName: 'Enterprise Tier Edited',
        description: 'Unlimited enterprise access edited',
        level: 5,
        groups: ['all-users', 'enterprise-users'],
        limits: {
          tokensPerUnit: [],
          requestsPerUnit: [{ count: 20000, time: 2, unit: 'hour' }],
        },
      });
    });
    tiersPage.findTable().should('exist');
  });
});

describe('MaaS Deployment Wizard', () => {
  const initMaaSDeploymentIntercepts = () => {
    cy.interceptOdh(
      'GET /api/dsc/status',
      mockDscStatus({
        components: {
          [DataScienceStackComponent.K_SERVE]: { managementState: 'Managed' },
          [DataScienceStackComponent.LLAMA_STACK_OPERATOR]: { managementState: 'Managed' },
        },
      }),
    );
    cy.interceptOdh(
      'GET /api/config',
      mockDashboardConfig({
        disableNIMModelServing: true,
        disableKServe: false,
        genAiStudio: true,
        modelAsService: true,
        disableLLMd: false,
      }),
    );
    cy.interceptOdh('GET /api/components', null, []);
    cy.interceptK8sList(
      { model: HardwareProfileModel, ns: 'opendatahub' },
      mockK8sResourceList(mockGlobalScopedHardwareProfiles),
    );
    cy.interceptK8sList(
      { model: SecretModel, ns: 'test-project' },
      mockK8sResourceList([
        mockSecretK8sResource({ name: 'test-s3-secret', displayName: 'test-s3-secret' }),
      ]),
    );
    cy.interceptOdh('GET /api/connection-types', [
      mockConnectionTypeConfigMap({
        displayName: 'URI - v1',
        name: 'uri-v1',
        category: ['existing-category'],
        fields: [
          {
            type: 'uri',
            name: 'URI',
            envVar: 'URI',
            required: true,
            properties: {},
          },
        ],
      }),
    ]).as('getConnectionTypes');
    cy.interceptK8sList(
      TemplateModel,
      mockK8sResourceList(mockStandardModelServingTemplateK8sResources(), {
        namespace: 'opendatahub',
      }),
    );
    cy.interceptK8sList(
      ProjectModel,
      mockK8sResourceList([mockProjectK8sResource({ enableKServe: true })]),
    );
    cy.interceptK8sList(LLMInferenceServiceModel, mockK8sResourceList([]));
    cy.interceptK8sList(InferenceServiceModel, mockK8sResourceList([]));
    cy.interceptK8sList(ServingRuntimeModel, mockK8sResourceList([]));
    cy.interceptK8s(
      'POST',
      {
        model: LLMInferenceServiceModel,
        ns: 'test-project',
      },
      {
        statusCode: 200,
        body: mockLLMInferenceServiceK8sResource({ name: 'test-llmd-model' }),
      },
    ).as('createLLMInferenceService');
  };

  it('should create an LLMD deployment with MaaS enabled and specific tiers selected from dropdown', () => {
    initMaaSDeploymentIntercepts();

    // Mock tiers API for admin user to see available tiers in dropdown
    cy.interceptOdh('GET /maas/api/v1/tiers', {
      data: mockTiers(),
    }).as('getTiers');

    // Navigate to wizard and set up basic deployment
    modelServingGlobal.visit('test-project');
    modelServingGlobal.findDeployModelButton().click();

    // Quick setup: Model source and deployment
    modelServingWizard.findModelLocationSelectOption(ModelLocationSelectOption.URI).click();
    modelServingWizard.findUrilocationInput().type('hf://coolmodel/coolmodel');
    modelServingWizard.findSaveConnectionCheckbox().click(); // Uncheck to simplify
    modelServingWizard.findModelTypeSelectOption(ModelTypeLabel.GENERATIVE).click();
    modelServingWizard.findNextButton().click();

    modelServingWizard.findModelDeploymentNameInput().type('test-maas-llmd-model');
    modelServingWizard.findServingRuntimeTemplateSearchSelector().click();
    modelServingWizard.findGlobalScopedTemplateOption('Distributed inference with llm-d').click();
    modelServingWizard.findNextButton().click();

    // Focus on MaaS feature testing
    // uncheck token auth to simplify test
    modelServingWizard.findTokenAuthenticationCheckbox().click();

    // Verify MaaS checkbox is unchecked by default
    maasWizardField.findSaveAsMaaSCheckbox().should('exist').should('not.be.checked');

    // Check the MaaS checkbox
    maasWizardField.findSaveAsMaaSCheckbox().click();
    maasWizardField.findSaveAsMaaSCheckbox().should('be.checked');

    // Verify default selection is "All resource tiers"
    maasWizardField.findMaaSTierDropdown().should('contain.text', 'All tiers');

    // Switch to "No resource tiers"
    maasWizardField.selectMaaSTierOption('No tiers');
    maasWizardField.findMaaSTierDropdown().should('contain.text', 'No tiers');

    // Switch to "Specific resource tiers" - Next button should be disabled until tiers are selected
    maasWizardField.selectMaaSTierOption('Specific tiers');
    maasWizardField.findMaaSTierDropdown().should('contain.text', 'Specific tiers');
    maasWizardField.findMaaSTierNamesInput().should('be.visible');
    modelServingWizard.findNextButton().should('be.disabled');

    // Select tiers from the dropdown (admin has list of available tiers)
    maasWizardField.selectMaaSTierNames(['Free Tier', 'Premium Tier']);

    // Verify selected tiers appear as chips
    maasWizardField.findMaaSTierChip('Free Tier').should('exist');
    maasWizardField.findMaaSTierChip('Premium Tier').should('exist');

    modelServingWizard.findNextButton().should('be.enabled').click();

    // Submit and verify MaaS-specific annotations and gateway refs
    modelServingWizard.findSubmitButton().click();

    cy.wait('@createLLMInferenceService').then((interception) => {
      expect(interception.request.url).to.include('?dryRun=All');

      // Verify MaaS-specific configuration with specific tiers
      // The tiers annotation is a JSON stringified array with tier names (not display names)
      expect(interception.request.body.metadata.annotations).to.containSubset({
        'alpha.maas.opendatahub.io/tiers': JSON.stringify(['free', 'premium']),
      });

      expect(interception.request.body.spec.router.gateway.refs).to.deep.equal([
        {
          name: 'maas-default-gateway',
          namespace: 'openshift-ingress',
        },
      ]);
    });

    cy.wait('@createLLMInferenceService'); // Actual request
    cy.get('@createLLMInferenceService.all').should('have.length', 2);
  });
});
