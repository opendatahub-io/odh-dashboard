import { MODEL_CATALOG_API_VERSION } from '~/__tests__/cypress/cypress/support/commands/api';

type ServingRuntimeMock = {
  items: Record<string, unknown>[];
  size: number;
  pageSize: number;
  nextPageToken: string;
};

export const mockServingRuntimeList = (
  overrides?: Partial<ServingRuntimeMock>,
): ServingRuntimeMock => ({
  items: [
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
      description:
        'A high-performance inference serving platform that supports multiple machine learning frameworks.',
      versionCount: 0,
      tags: ['gpu'],
      capabilities: { supportedAccelerators: ['nvidia.com/gpu'] },
    },
  ],
  size: 3,
  pageSize: 50,
  nextPageToken: '',
  ...overrides,
});

type FilterOptionsMock = {
  filters: Record<string, { type: string; values: string[] }>;
};

export const mockServingRuntimeFilterOptions = (): FilterOptionsMock => ({
  filters: {
    hardware: {
      type: 'string',
      values: ['cpu', 'cpu-or-gpu', 'nvidia.com/gpu', 'amd.com/gpu'],
    },
  },
});

export const initRuntimeCatalogIntercepts = (): void => {
  cy.interceptApi(
    `GET /api/:apiVersion/serving_runtime_catalog/serving_runtimes_filter_options`,
    { path: { apiVersion: MODEL_CATALOG_API_VERSION } },
    mockServingRuntimeFilterOptions(),
  );

  cy.interceptApi(
    `GET /api/:apiVersion/serving_runtime_catalog/serving_runtimes`,
    { path: { apiVersion: MODEL_CATALOG_API_VERSION } },
    mockServingRuntimeList(),
  );
};
