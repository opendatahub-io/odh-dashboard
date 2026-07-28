import {
  mockDashboardConfig,
  mockDscStatus,
  mockNotebookK8sResource,
} from '@odh-dashboard/internal/__mocks__';
import { DataScienceStackComponent } from '@odh-dashboard/plugin-core/areas';
import { initIntercepts } from './workbenchTestUtils';
import { NotebookModel } from '../../../../utils/models';
import { createSpawnerPage, editSpawnerPage, workbenchPage } from '../../../../pages/workbench';
import {
  FEATURE_STORE_SPAWNER_PROJECTS,
  initFeatureStoreSpawnerIntercepts,
  mockEmptyWorkbenchIntegrationResponse,
  mockNotebookWithFeastConfig,
  mockWorkbenchIntegrationResponse,
} from '../../../../utils/featureStoreSpawnerMocks';

describe('Workbench page — Feature Store', () => {
  it('Expanded row hides feature store section when area is unavailable', () => {
    initIntercepts({});
    workbenchPage.visit('test-project');
    const notebookRow = workbenchPage.getNotebookRow('Test Notebook');
    notebookRow.findExpansionButton().click();
    notebookRow.findExpansion().findByTestId('notebook-feature-store-title').should('not.exist');
  });

  describe('Expanded row feature stores (area enabled)', () => {
    const enableFeatureStoreArea = () => {
      cy.interceptOdh(
        'GET /api/dsc/status',
        mockDscStatus({
          components: {
            [DataScienceStackComponent.WORKBENCHES]: { managementState: 'Managed' },
            [DataScienceStackComponent.FEAST_OPERATOR]: { managementState: 'Managed' },
          },
        }),
      );
      cy.interceptOdh(
        'GET /api/config',
        mockDashboardConfig({ disableFeatureStore: false, disableProjectScoped: true }),
      );
    };

    it('shows "None" when feast-config annotation is absent', () => {
      initIntercepts({});
      enableFeatureStoreArea();
      workbenchPage.visit('test-project');
      const notebookRow = workbenchPage.getNotebookRow('Test Notebook');
      notebookRow.findExpansionButton().click();
      notebookRow.shouldHaveFeatureStoreTitle();
      notebookRow.shouldHaveFeatureStoreNone();
    });

    it('shows feature store names when 5 or fewer', () => {
      initIntercepts({
        notebooks: [
          mockNotebookK8sResource({
            lastImageSelection: 'test-imagestream:1.2',
            opts: {
              metadata: {
                name: 'test-notebook',
                labels: { 'opendatahub.io/notebook-image': 'true' },
                annotations: {
                  'opendatahub.io/image-display-name': 'Test image',
                  'opendatahub.io/feast-config': 'project-a,project-b,project-c',
                },
              },
            },
          }),
        ],
      });
      enableFeatureStoreArea();
      workbenchPage.visit('test-project');
      const notebookRow = workbenchPage.getNotebookRow('Test Notebook');
      notebookRow.findExpansionButton().click();
      notebookRow.shouldHaveFeatureStoreTitle();
      notebookRow.shouldHaveFeatureStoreItems(['project-a', 'project-b', 'project-c']);
      notebookRow.findFeatureStoreShowAll().should('not.exist');
    });

    it('shows expand/collapse for more than 5 feature stores', () => {
      initIntercepts({
        notebooks: [
          mockNotebookK8sResource({
            lastImageSelection: 'test-imagestream:1.2',
            opts: {
              metadata: {
                name: 'test-notebook',
                labels: { 'opendatahub.io/notebook-image': 'true' },
                annotations: {
                  'opendatahub.io/image-display-name': 'Test image',
                  'opendatahub.io/feast-config':
                    'store-1,store-2,store-3,store-4,store-5,store-6,store-7',
                },
              },
            },
          }),
        ],
      });
      enableFeatureStoreArea();
      workbenchPage.visit('test-project');
      const notebookRow = workbenchPage.getNotebookRow('Test Notebook');
      notebookRow.findExpansionButton().click();
      notebookRow.shouldHaveFeatureStoreTitle();

      notebookRow.findFeatureStoreList().find('li').should('have.length', 5);
      notebookRow.findFeatureStoreShowAll().should('exist');
      notebookRow.findFeatureStoreShowAll().should('contain.text', 'Show all');
      notebookRow.findFeatureStoreShowAll().should('contain.text', '2 more');

      notebookRow.findFeatureStoreShowAll().find('button').click();
      notebookRow.findFeatureStoreList().find('li').should('have.length', 7);
      notebookRow.findFeatureStoreShowAll().should('contain.text', 'Show less');

      notebookRow.findFeatureStoreShowAll().find('button').click();
      notebookRow.findFeatureStoreList().find('li').should('have.length', 5);
      notebookRow.findFeatureStoreShowAll().should('contain.text', 'Show all');
    });

    it('renders available store names as links when workbench integration is loaded', () => {
      initIntercepts({
        notebooks: [
          mockNotebookK8sResource({
            lastImageSelection: 'test-imagestream:1.2',
            opts: {
              metadata: {
                name: 'test-notebook',
                labels: { 'opendatahub.io/notebook-image': 'true' },
                annotations: {
                  'opendatahub.io/image-display-name': 'Test image',
                  'opendatahub.io/feast-config': `${FEATURE_STORE_SPAWNER_PROJECTS.creditScoring.projectName},${FEATURE_STORE_SPAWNER_PROJECTS.banking.projectName}`,
                },
              },
            },
          }),
        ],
      });
      enableFeatureStoreArea();
      cy.interceptOdh(
        'GET /api/featurestores/workbench-integration',
        mockWorkbenchIntegrationResponse,
      );
      workbenchPage.visit('test-project');
      const notebookRow = workbenchPage.getNotebookRow('Test Notebook');
      notebookRow.findExpansionButton().click();
      notebookRow.shouldHaveFeatureStoreLinks([
        {
          name: FEATURE_STORE_SPAWNER_PROJECTS.creditScoring.projectName,
          href: `/develop-train/feature-store/overview/${FEATURE_STORE_SPAWNER_PROJECTS.creditScoring.projectName}`,
        },
        {
          name: FEATURE_STORE_SPAWNER_PROJECTS.banking.projectName,
          href: `/develop-train/feature-store/overview/${FEATURE_STORE_SPAWNER_PROJECTS.banking.projectName}`,
        },
      ]);
    });
  });

  describe('Feature Store Integration', () => {
    const visitCreateSpawner = () => {
      workbenchPage.visit('test-project');
      workbenchPage.findCreateButton().click();
    };

    describe('create mode', () => {
      it('should display feature store section when Feast operator is available', () => {
        initIntercepts({ isEmpty: true });
        initFeatureStoreSpawnerIntercepts();

        visitCreateSpawner();

        createSpawnerPage.findFeatureStoreSection().should('exist');
        createSpawnerPage.findFeatureStoreSectionTitle().should('exist');
        createSpawnerPage.findSelectFeatureStoreButton().should('exist');
        createSpawnerPage.findFeatureStoreEmptyState().should('exist');
      });

      it('should not display feature store section when Feast operator is not available', () => {
        initIntercepts({ isEmpty: true });
        initFeatureStoreSpawnerIntercepts({ feastOperatorState: 'Removed' });

        visitCreateSpawner();

        createSpawnerPage.findFeatureStoreSection().should('not.exist');
      });

      it('should load and display feature store options in the selection modal', () => {
        initIntercepts({ isEmpty: true });
        initFeatureStoreSpawnerIntercepts();

        visitCreateSpawner();
        createSpawnerPage.openSelectFeatureStoresModal();
        createSpawnerPage.shouldHaveFeatureStoreOptionsInModal([
          FEATURE_STORE_SPAWNER_PROJECTS.creditScoring,
          FEATURE_STORE_SPAWNER_PROJECTS.banking,
          FEATURE_STORE_SPAWNER_PROJECTS.fraudDetect,
        ]);
      });

      it('should allow selecting multiple feature stores', () => {
        initIntercepts({ isEmpty: true });
        initFeatureStoreSpawnerIntercepts();

        visitCreateSpawner();
        createSpawnerPage.selectFeatureStores([
          FEATURE_STORE_SPAWNER_PROJECTS.creditScoring,
          FEATURE_STORE_SPAWNER_PROJECTS.banking,
        ]);

        createSpawnerPage.shouldHaveFeatureStoreSelected(
          FEATURE_STORE_SPAWNER_PROJECTS.creditScoring.projectName,
        );
        createSpawnerPage.shouldHaveFeatureStoreSelected(
          FEATURE_STORE_SPAWNER_PROJECTS.banking.projectName,
        );
      });

      it('should render the selected store as a link and show the code block', () => {
        initIntercepts({ isEmpty: true });
        initFeatureStoreSpawnerIntercepts();

        visitCreateSpawner();
        createSpawnerPage.selectFeatureStore(
          FEATURE_STORE_SPAWNER_PROJECTS.creditScoring.namespace,
          FEATURE_STORE_SPAWNER_PROJECTS.creditScoring.projectName,
        );

        createSpawnerPage.shouldHaveFeatureStoreLink(
          FEATURE_STORE_SPAWNER_PROJECTS.creditScoring.projectName,
          `/develop-train/feature-store/overview/${FEATURE_STORE_SPAWNER_PROJECTS.creditScoring.projectName}`,
        );
        createSpawnerPage.shouldHaveFeatureStoreCodeBlock();
        createSpawnerPage.findFeatureStoreCodeBlockInstructionText().should('exist');
      });

      it('should keep the select button enabled when all available feature stores are connected', () => {
        initIntercepts({ isEmpty: true });
        initFeatureStoreSpawnerIntercepts({
          workbenchIntegration: {
            namespaces: [
              {
                namespace: FEATURE_STORE_SPAWNER_PROJECTS.creditScoring.namespace,
                clientConfigs: [
                  {
                    configName: 'credit-scoring-local',
                    projectName: FEATURE_STORE_SPAWNER_PROJECTS.creditScoring.projectName,
                    hasAccessToFeatureStore: true,
                    permissionLevel: ['Read', 'Write'],
                  },
                ],
              },
            ],
          },
        });

        visitCreateSpawner();
        createSpawnerPage.selectFeatureStore(
          FEATURE_STORE_SPAWNER_PROJECTS.creditScoring.namespace,
          FEATURE_STORE_SPAWNER_PROJECTS.creditScoring.projectName,
        );
        createSpawnerPage
          .findSelectFeatureStoreButton()
          .should('not.have.attr', 'aria-disabled', 'true');
        createSpawnerPage.openSelectFeatureStoresModal();
        createSpawnerPage.shouldHaveFeatureStoreConnectedInModal(
          FEATURE_STORE_SPAWNER_PROJECTS.creditScoring.namespace,
          FEATURE_STORE_SPAWNER_PROJECTS.creditScoring.projectName,
        );
      });

      it('should allow disconnecting feature stores from the selection modal', () => {
        initIntercepts({ isEmpty: true });
        initFeatureStoreSpawnerIntercepts({
          workbenchIntegration: {
            namespaces: [
              {
                namespace: FEATURE_STORE_SPAWNER_PROJECTS.creditScoring.namespace,
                clientConfigs: [
                  {
                    configName: 'credit-scoring-local',
                    projectName: FEATURE_STORE_SPAWNER_PROJECTS.creditScoring.projectName,
                    hasAccessToFeatureStore: true,
                    permissionLevel: ['Read', 'Write'],
                  },
                ],
              },
            ],
          },
        });

        visitCreateSpawner();
        createSpawnerPage.selectFeatureStore(
          FEATURE_STORE_SPAWNER_PROJECTS.creditScoring.namespace,
          FEATURE_STORE_SPAWNER_PROJECTS.creditScoring.projectName,
        );
        createSpawnerPage.openSelectFeatureStoresModal();
        createSpawnerPage.toggleFeatureStoreInModal(
          FEATURE_STORE_SPAWNER_PROJECTS.creditScoring.namespace,
          FEATURE_STORE_SPAWNER_PROJECTS.creditScoring.projectName,
        );
        createSpawnerPage.shouldHaveSelectFeatureStoresModalButtonEnabled();
        createSpawnerPage.connectFeatureStoresInModal();
        createSpawnerPage.findFeatureStoreEmptyState().should('exist');
        createSpawnerPage.shouldNotHaveFeatureStoreCodeBlock();
      });

      it('should show disabled state with tooltip when no feature stores are available', () => {
        initIntercepts({ isEmpty: true });
        initFeatureStoreSpawnerIntercepts({
          workbenchIntegration: mockEmptyWorkbenchIntegrationResponse,
        });

        visitCreateSpawner();

        createSpawnerPage.findFeatureStoreSection().should('exist');
        createSpawnerPage.shouldHaveSelectFeatureStoreButtonDisabled();
        createSpawnerPage.findSelectFeatureStoreButton().trigger('mouseenter');
        createSpawnerPage.findFeatureStoreTooltip().should('be.visible');
        createSpawnerPage.findFeatureStoreTooltipText().should('exist');
      });

      it('should display error state when workbench integration fails to load', () => {
        initIntercepts({ isEmpty: true });
        initFeatureStoreSpawnerIntercepts({ workbenchIntegrationLoadError: true });

        visitCreateSpawner();

        createSpawnerPage.findFeatureStoreSection().should('exist');
        createSpawnerPage.shouldHaveFeatureStoreLoadError();
      });
    });

    describe('edit mode', () => {
      it('should populate feature stores from notebook annotations', () => {
        const notebookWithFeatureStores = mockNotebookWithFeastConfig([
          FEATURE_STORE_SPAWNER_PROJECTS.creditScoring.projectName,
          FEATURE_STORE_SPAWNER_PROJECTS.banking.projectName,
        ]);

        initIntercepts({
          isEmpty: false,
          notebooks: [notebookWithFeatureStores],
        });
        initFeatureStoreSpawnerIntercepts();
        cy.interceptK8s(NotebookModel, notebookWithFeatureStores);

        editSpawnerPage.visit('test-notebook');

        editSpawnerPage.shouldHaveFeatureStoreSelected(
          FEATURE_STORE_SPAWNER_PROJECTS.creditScoring.projectName,
        );
        editSpawnerPage.shouldHaveFeatureStoreSelected(
          FEATURE_STORE_SPAWNER_PROJECTS.banking.projectName,
        );
        editSpawnerPage.shouldHaveFeatureStoreCodeBlock();
      });

      it('should show already connected stores as checked in the selection modal', () => {
        const notebookWithFeatureStores = mockNotebookWithFeastConfig([
          FEATURE_STORE_SPAWNER_PROJECTS.creditScoring.projectName,
        ]);

        initIntercepts({
          isEmpty: false,
          notebooks: [notebookWithFeatureStores],
        });
        initFeatureStoreSpawnerIntercepts();
        cy.interceptK8s(NotebookModel, notebookWithFeatureStores);

        editSpawnerPage.visit('test-notebook');
        editSpawnerPage.openSelectFeatureStoresModal();
        editSpawnerPage.shouldHaveFeatureStoreConnectedInModal(
          FEATURE_STORE_SPAWNER_PROJECTS.creditScoring.namespace,
          FEATURE_STORE_SPAWNER_PROJECTS.creditScoring.projectName,
        );
        editSpawnerPage.shouldHaveSelectFeatureStoresModalButtonDisabled();
        editSpawnerPage.shouldHaveFeatureStoreOptionsInModal([
          FEATURE_STORE_SPAWNER_PROJECTS.banking,
          FEATURE_STORE_SPAWNER_PROJECTS.fraudDetect,
        ]);
        editSpawnerPage.toggleFeatureStoreInModal(
          FEATURE_STORE_SPAWNER_PROJECTS.banking.namespace,
          FEATURE_STORE_SPAWNER_PROJECTS.banking.projectName,
        );
        editSpawnerPage.shouldHaveSelectFeatureStoresModalButtonEnabled();
      });

      it('should allow removing all feature stores', () => {
        const notebookWithFeatureStores = mockNotebookWithFeastConfig([
          FEATURE_STORE_SPAWNER_PROJECTS.creditScoring.projectName,
        ]);

        initIntercepts({
          isEmpty: false,
          notebooks: [notebookWithFeatureStores],
        });
        initFeatureStoreSpawnerIntercepts();
        cy.interceptK8s(NotebookModel, notebookWithFeatureStores);

        editSpawnerPage.visit('test-notebook');

        editSpawnerPage.removeFeatureStore(
          FEATURE_STORE_SPAWNER_PROJECTS.creditScoring.namespace,
          FEATURE_STORE_SPAWNER_PROJECTS.creditScoring.projectName,
        );
        editSpawnerPage.findFeatureStoreEmptyState().should('exist');
        editSpawnerPage.shouldNotHaveFeatureStoreCodeBlock();
      });
    });
  });
});
