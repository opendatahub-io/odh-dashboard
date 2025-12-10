/* eslint-disable camelcase */
import {
  BackendResponseData,
  SimplifiedResponseData,
  CreateResponseRequest,
  FileUploadResult,
  CodeExportRequest,
  CodeExportData,
  MCPServersResponse,
  MCPConnectionStatus,
  MCPToolsStatus,
  MCPServerInfo,
} from '~/app/types';

// Test namespace constant
export const TEST_NAMESPACE = 'test-namespace';

// CreateResponse fixtures
export const mockCreateResponseRequest: CreateResponseRequest = {
  input: 'Test input',
  model: 'test-model',
  vector_store_ids: ['vector-store-1'],
  temperature: 0.7,
  stream: false,
};

export const mockBackendResponse: BackendResponseData = {
  id: 'response-123',
  model: 'test-model',
  status: 'completed',
  created_at: 1755721063,
  output: [
    {
      id: 'output-1',
      type: 'completion_message',
      content: [
        {
          type: 'output_text',
          text: 'This is a test response',
        },
      ],
    },
  ],
  usage: {
    input_tokens: 10,
    output_tokens: 20,
    total_tokens: 30,
  },
};

export const expectedSimplifiedResponse: SimplifiedResponseData = {
  id: 'response-123',
  model: 'test-model',
  status: 'completed',
  created_at: 1755721063,
  content: 'This is a test response',
  usage: {
    input_tokens: 10,
    output_tokens: 20,
    total_tokens: 30,
  },
};

export const mockStreamingRequest: CreateResponseRequest = {
  ...mockCreateResponseRequest,
  stream: true,
};

// File upload fixtures
export const mockUploadResult: FileUploadResult = {
  file_id: 'test-file-id',
  vector_store_file: {
    id: 'test-file-id',
    object: 'vector_store.file',
    created_at: 1755721063,
    vector_store_id: 'test-vector-store',
    status: 'pending',
    usage_bytes: 1024,
    chunking_strategy: {
      type: 'static',
      static: {
        max_chunk_size_tokens: 1000,
        chunk_overlap_tokens: 100,
      },
    },
    attributes: {
      description: 'Test file',
    },
  },
};

// Code export fixtures
export const mockCodeExportRequest: CodeExportRequest = {
  input: 'Create a simple function',
  model: 'test-model',
  instructions: 'Generate Python code',
  temperature: 0.5,
};

export const mockCodeExportResponseData: CodeExportData = {
  code: 'def simple_function():\n    return "Hello World"',
};

// Install LSD fixtures
export const mockInstallModels = [
  { model_name: 'model-1', is_maas_model: false },
  { model_name: 'model-2', is_maas_model: false },
  { model_name: 'model-3', is_maas_model: true },
];

export const mockMaaSModelsForInstall = [
  { model_name: 'maas-model-1', is_maas_model: true },
  { model_name: 'regular-model', is_maas_model: false },
];

// MaaS Models fixtures
export const mockMaaSModels = [
  {
    id: 'granite-7b-lab',
    object: 'model',
    created: 1672531200,
    owned_by: 'model-namespace',
    ready: true,
    url: 'http://granite-7b-lab.openshift-ai-inference-tier-premium.svc.cluster.local',
  },
  {
    id: 'llama-2-7b-chat',
    object: 'model',
    created: 1672531200,
    owned_by: 'model-namespace',
    ready: true,
    url: 'http://llama-2-7b-chat.openshift-ai-inference-tier-premium.svc.cluster.local',
  },
];

// AA Models fixtures
export const mockAAModels = [
  {
    model_name: 'granite-7b-code',
    model_id: 'granite-7b-code',
    serving_runtime: 'OpenVINO Model Server',
    api_protocol: 'v2',
    version: 'v2025.1',
    description: 'IBM Granite 7B model specialized for code generation tasks',
    usecase: 'Code generation',
    endpoints: [
      'internal: http://granite-7b-code.test-namespace.svc.cluster.local:8080',
      'external: https://granite-7b-code-test-namespace.example.com',
    ],
    status: 'Running',
    display_name: 'Granite 7B code',
    sa_token: {
      name: 'granite-7b-code-sa',
      token_name: 'granite-7b-code-sa-token-abcde',
      token: 'token-value',
    },
  },
];

// MCP Server fixtures
export const mockMCPServerInfo: MCPServerInfo = {
  name: 'test-server',
  version: '1.0.0',
  protocol_version: '1.0',
};

export const mockMCPServers = (namespace: string): MCPServersResponse => ({
  servers: [
    {
      name: 'test-server-1',
      url: 'http://test-server-1.example.com',
      transport: 'sse',
      description: 'Test server 1',
      logo: null,
      status: 'healthy',
    },
    {
      name: 'test-server-2',
      url: 'http://test-server-2.example.com',
      transport: 'streamable-http',
      description: 'Test server 2',
      logo: null,
      status: 'healthy',
    },
  ],
  total_count: 2,
  config_map_info: {
    name: 'mcp-servers',
    namespace,
    last_updated: '2024-01-01T00:00:00Z',
  },
});

export const mockEmptyMCPServers = (namespace: string): MCPServersResponse => ({
  servers: [],
  total_count: 0,
  config_map_info: {
    name: 'mcp-servers',
    namespace,
    last_updated: '2024-01-01T00:00:00Z',
  },
});

export const MOCK_MCP_SERVER_URL = 'http://test-server.example.com';

export const mockMCPConnectionStatus: MCPConnectionStatus = {
  status: 'connected',
  server_url: MOCK_MCP_SERVER_URL,
  message: 'Successfully connected',
  last_checked: Date.now(),
  server_info: mockMCPServerInfo,
  ping_response_time_ms: 100,
};

export const mockMCPConnectionErrorStatus: MCPConnectionStatus = {
  status: 'error',
  server_url: MOCK_MCP_SERVER_URL,
  message: 'Failed to connect',
  last_checked: Date.now(),
  server_info: mockMCPServerInfo,
  error_details: {
    code: 'CONNECTION_FAILED',
    status_code: 500,
    raw_error: 'Connection timeout',
  },
};

export const mockMCPTools: MCPToolsStatus = {
  server_url: 'http://test-server.example.com',
  status: 'success',
  message: 'Tools fetched successfully',
  last_checked: Date.now(),
  server_info: mockMCPServerInfo,
  tools_count: 2,
  tools: [
    {
      name: 'tool1',
      description: 'Test tool 1',
      input_schema: { type: 'object', properties: {} },
    },
    {
      name: 'tool2',
      description: 'Test tool 2',
      input_schema: { type: 'object', properties: {} },
    },
  ],
};
