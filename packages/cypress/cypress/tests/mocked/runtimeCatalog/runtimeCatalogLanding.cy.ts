import { mockDashboardConfig } from '@odh-dashboard/k8s-core/__mocks__/mockDashboardConfig';
import { asProductAdminUser } from '../../../utils/mockUsers';
import { runtimeCatalogPage } from '../../../pages/runtimeCatalog';
import { runtimeCatalogDetailsPage } from '../../../pages/runtimeCatalogDetails';
import { pageNotfound } from '../../../pages/pageNotFound';
import { API_VERSION, setupModelCatalogIntercepts } from '../catalogHelpers';

const runtimeListPath = `/model-registry/api/${API_VERSION}/serving_runtime_catalog/serving_runtimes`;
const hardwareFilterKey = 'capabilities.supportedAccelerators';

const mockRuntimes = [
  {
    id: '1',
    name: 'vllm',
    displayName: 'vLLM',
    description: 'GPU-accelerated serving for large language models.',
    versionCount: 2,
    tags: ['llm', 'gpu'],
    capabilities: { supportedAccelerators: ['nvidia.com/gpu'] },
  },
  {
    id: '2',
    name: 'ovms',
    displayName: 'OpenVINO Model Server',
    description: 'Model serving with OpenVINO.',
    versionCount: 1,
    tags: ['predictive-ai', 'cpu'],
  },
  {
    id: '3',
    name: 'triton',
    displayName: 'NVIDIA Triton Inference Server',
    description: 'A high-performance inference serving platform.',
    versionCount: 0,
    tags: ['gpu'],
    capabilities: { supportedAccelerators: ['nvidia.com/gpu'] },
  },
  {
    id: '4',
    name: 'vllm-spyre-x86',
    displayName: 'vLLM Spyre on x86 ServingRuntime for KServe',
    description: 'vLLM for IBM Spyre accelerators.',
    versionCount: 1,
    capabilities: { supportedAccelerators: ['ibm.com/spyre_pf'] },
  },
];

const setupRuntimeCatalogIntercepts = (): void => {
  // Same key shape as the catalog's serving_runtimes/filter_options response.
  cy.intercept(
    { method: 'GET', pathname: `${runtimeListPath}_filter_options` },
    {
      body: {
        data: {
          filters: {
            [hardwareFilterKey]: {
              type: 'string',
              values: [
                'amd.com/gpu',
                'habana.ai/gaudi',
                'ibm.com/spyre_pf',
                'ibm.com/spyre_vf',
                'nvidia.com/gpu',
              ],
            },
            supportedModelFormats: { type: 'string', values: ['onnx', 'vLLM'] },
          },
        },
      },
    },
  ).as('runtimeFilterOptions');

  cy.intercept({ method: 'GET', pathname: runtimeListPath }, (req) => {
    const filterQuery = typeof req.query.filterQuery === 'string' ? req.query.filterQuery : '';
    const items = mockRuntimes.filter(
      (runtime) =>
        !filterQuery ||
        (runtime.capabilities?.supportedAccelerators ?? []).some((accelerator) =>
          filterQuery.includes(`'${accelerator}'`),
        ),
    );
    req.reply({ body: { data: { items, size: items.length, pageSize: 50, nextPageToken: '' } } });
  }).as('runtimeList');
};

const runtimeDetailsPath = `${runtimeListPath}/1`;

const setupRuntimeCatalogSourceIntercepts = (): void => {
  cy.intercept('GET', `**/model-registry/api/${API_VERSION}/model_catalog/sources*`, {
    body: {
      data: {
        items: [
          {
            id: 'redhat-runtimes',
            name: 'Runtime image library',
            enabled: true,
            status: 'available',
            labels: ['Red Hat'],
          },
        ],
        size: 1,
        pageSize: 10,
        nextPageToken: '',
      },
    },
  });

  cy.intercept('GET', `**/model-registry/api/${API_VERSION}/model_catalog/labels*`, {
    body: {
      data: {
        items: [],
        size: 0,
        pageSize: 10,
        nextPageToken: '',
      },
    },
  });
};

const initIntercepts = (): void => {
  asProductAdminUser();
  cy.interceptOdh(
    'GET /api/config',
    mockDashboardConfig({
      disableModelRegistry: false,
    }),
  );
  setupModelCatalogIntercepts();
  setupRuntimeCatalogSourceIntercepts();
  setupRuntimeCatalogIntercepts();
};

describe('Runtime library landing', () => {
  beforeEach(() => {
    initIntercepts();
  });

  it('shows search input and sidebar filters', () => {
    runtimeCatalogPage.visit();
    runtimeCatalogPage.findSearchInput().should('exist');
    runtimeCatalogPage.findSidebar().should('exist');
  });

  it('renders runtime cards', () => {
    runtimeCatalogPage.visit();
    runtimeCatalogPage.findCards().should('have.length.greaterThan', 0);
    runtimeCatalogPage.findCard('vllm').should('exist');
    runtimeCatalogPage.findCard('ovms').should('exist');
    runtimeCatalogPage.findCard('triton').should('exist');
  });

  it('shows the reviewed page description even when catalog labels have one', () => {
    cy.intercept('GET', `**/model-registry/api/${API_VERSION}/model_catalog/labels*`, {
      body: {
        data: {
          items: [{ name: 'Red Hat', description: 'Label description from the catalog API' }],
          size: 1,
          pageSize: 10,
          nextPageToken: '',
        },
      },
    });
    runtimeCatalogPage.visit();
    runtimeCatalogPage
      .findPageDescription()
      .should(
        'have.text',
        'Browse runtimes you can add to this cluster for model serving or LLM inference.',
      );
  });

  it('shows card name, icon and description', () => {
    runtimeCatalogPage.visit();
    runtimeCatalogPage.findCardName('vllm').should('contain.text', 'vLLM');
    runtimeCatalogPage.findCardIcon('vllm').find('svg').should('exist');
    runtimeCatalogPage.findCardDescription('vllm').should('contain.text', 'GPU-accelerated');
  });

  it('shows Latest badge when versionCount > 0 and hides when 0', () => {
    runtimeCatalogPage.visit();
    runtimeCatalogPage.findCardLatestBadge('vllm').should('exist');
    runtimeCatalogPage.findCardLatestBadge('ovms').should('exist');
    runtimeCatalogPage.findCardLatestBadge('triton').should('not.exist');
  });

  it('shows hardware label in card footer', () => {
    runtimeCatalogPage.visit();
    runtimeCatalogPage.findCardHardware('vllm').should('contain.text', 'NVIDIA GPU');
    runtimeCatalogPage.findCardHardware('ovms').should('contain.text', 'CPU');
  });

  it('shows the hardware filter from the catalog accelerator options', () => {
    runtimeCatalogPage.visit();
    cy.wait('@runtimeFilterOptions');
    runtimeCatalogPage.findHardwareFilter().should('contain.text', 'Hardware');
    [
      ['amd.com/gpu', 'AMD GPU'],
      ['habana.ai/gaudi', 'Intel Gaudi'],
      ['ibm.com/spyre_pf', 'IBM Spyre (PF)'],
      ['ibm.com/spyre_vf', 'IBM Spyre (VF)'],
      ['nvidia.com/gpu', 'NVIDIA GPU'],
    ].forEach(([value, label]) => {
      runtimeCatalogPage.findHardwareFilterCheckbox(value).should('exist');
      runtimeCatalogPage.findHardwareFilter().should('contain.text', label);
    });
    cy.testA11y();
  });

  it('narrows the runtime list by the selected accelerators', () => {
    const spyFilteredList = (filterQuery: string, alias: string) =>
      cy.intercept({ method: 'GET', pathname: runtimeListPath, query: { filterQuery } }).as(alias);
    spyFilteredList("capabilities.supportedAccelerators='ibm.com/spyre_pf'", 'spyreList');
    spyFilteredList(
      "capabilities.supportedAccelerators IN ('ibm.com/spyre_pf','nvidia.com/gpu')",
      'spyreOrNvidiaList',
    );

    runtimeCatalogPage.visit();
    runtimeCatalogPage.findCard('ovms').should('exist');

    runtimeCatalogPage.findHardwareFilterCheckbox('ibm.com/spyre_pf').click();
    cy.wait('@spyreList');
    runtimeCatalogPage.findCard('vllm-spyre-x86').should('exist');
    runtimeCatalogPage.findCard('vllm').should('not.exist');
    runtimeCatalogPage.findCard('ovms').should('not.exist');
    runtimeCatalogPage
      .findActiveFilterChip('ibm.com/spyre_pf')
      .should('have.text', 'IBM Spyre (PF)');

    runtimeCatalogPage.findHardwareFilterCheckbox('nvidia.com/gpu').click();
    cy.wait('@spyreOrNvidiaList');
    runtimeCatalogPage.findCard('vllm').should('exist');
    runtimeCatalogPage.findCard('triton').should('exist');
    runtimeCatalogPage.findCard('vllm-spyre-x86').should('exist');
    runtimeCatalogPage.findCard('ovms').should('not.exist');
  });

  it('opens runtime details using the BFF ID instead of the runtime name', () => {
    cy.intercept(
      { method: 'GET', pathname: runtimeDetailsPath },
      {
        body: { data: { id: '1', name: 'vllm', displayName: 'vLLM', versionCount: 1 } },
      },
    ).as('runtimeDetails');
    cy.intercept(
      { method: 'GET', pathname: `${runtimeDetailsPath}/versions` },
      {
        body: {
          data: {
            items: [{ id: '102', name: 'vllm-0.6.0', version: '0.6.0' }],
            size: 1,
            pageSize: 1,
            nextPageToken: '',
          },
        },
      },
    );

    runtimeCatalogPage.visit();
    runtimeCatalogPage.findCardDetailLink('vllm').should('be.visible');
    runtimeCatalogPage.findCardLatestBadge('vllm').should('have.text', 'Latest');
    cy.testA11y();
    runtimeCatalogPage.openCardDetails('vllm');

    cy.location('pathname').should(
      'eq',
      '/settings/model-resources-operations/model-deployment-settings/serving-runtime-catalog/1',
    );
    cy.wait('@runtimeDetails');
    runtimeCatalogDetailsPage.findHeading('vLLM').should('be.visible');
    runtimeCatalogDetailsPage.findLatestBadge().should('have.text', 'Latest');
    runtimeCatalogDetailsPage.openLatestPopover();
    runtimeCatalogDetailsPage
      .findLatestPopover()
      .should(
        'contain.text',
        'This is the newest version of this runtime image available in the library.',
      );
    cy.testA11y();
  });

  it('does not show Latest in details when the card has no versions', () => {
    const tritonDetailsPath = `${runtimeListPath}/3`;
    cy.intercept(
      { method: 'GET', pathname: tritonDetailsPath },
      {
        body: {
          data: {
            id: '3',
            name: 'triton',
            displayName: 'NVIDIA Triton Inference Server',
            versionCount: 0,
          },
        },
      },
    ).as('tritonDetails');
    cy.intercept(
      { method: 'GET', pathname: `${tritonDetailsPath}/versions` },
      { body: { data: { items: [], size: 0, pageSize: 1, nextPageToken: '' } } },
    );

    runtimeCatalogPage.visit();
    runtimeCatalogPage.findCardLatestBadge('triton').should('not.exist');
    runtimeCatalogPage.openCardDetails('triton');

    cy.location('pathname').should(
      'eq',
      '/settings/model-resources-operations/model-deployment-settings/serving-runtime-catalog/3',
    );
    cy.wait('@tritonDetails');
    runtimeCatalogDetailsPage.findHeading('NVIDIA Triton Inference Server').should('be.visible');
    runtimeCatalogDetailsPage.findLatestBadge().should('not.exist');
    cy.testA11y();
  });

  it('does not offer navigation for a runtime without a BFF ID', () => {
    cy.intercept(
      { method: 'GET', pathname: runtimeListPath },
      {
        body: {
          data: {
            items: [{ name: 'idless', displayName: 'Runtime without ID' }],
            size: 1,
            pageSize: 50,
            nextPageToken: '',
          },
        },
      },
    );

    runtimeCatalogPage.visit();
    runtimeCatalogPage.findCardDetailLink('idless').should('be.disabled');
    cy.testA11y();
  });
});

describe('Runtime image library landing gating', () => {
  it('does not expose the library when model serving is disabled', () => {
    asProductAdminUser();
    cy.interceptOdh(
      'GET /api/config',
      mockDashboardConfig({ disableModelRegistry: false, disableModelServing: true }),
    );
    runtimeCatalogPage.visit(false);
    pageNotfound.findPage().should('exist');
    runtimeCatalogPage.findPage().should('not.exist');
    cy.testA11y();
  });
});
