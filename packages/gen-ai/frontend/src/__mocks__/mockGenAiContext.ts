/* eslint-disable camelcase */
import React from 'react';
import { GenAiContext } from '~/app/context/GenAiContext';

export const mockGenAiContextValue: React.ContextType<typeof GenAiContext> = {
  namespace: { name: 'test-namespace', displayName: 'Test Namespace' },
  apiState: {
    apiAvailable: true,
    api: {
      listVectorStores: jest.fn().mockResolvedValue([]),
      getLSDStatus: jest.fn().mockResolvedValue({ data: null }),
      getLSDModels: jest.fn().mockResolvedValue([]),
      exportCode: jest.fn().mockResolvedValue({ data: null }),
      createResponse: jest.fn().mockResolvedValue({ data: null }),
      generateMaaSToken: jest.fn().mockResolvedValue({ data: null }),
      getMaaSModels: jest.fn().mockResolvedValue([]),
      getMCPServerTools: jest.fn().mockResolvedValue([]),
      getMCPServers: jest.fn().mockResolvedValue([]),
      getMCPServerStatus: jest.fn().mockResolvedValue({ data: null }),
      installLSD: jest.fn().mockResolvedValue({ data: null }),
      deleteLSD: jest.fn().mockResolvedValue({ data: null }),
      getAAModels: jest.fn().mockResolvedValue([]),
      getAAVectorStores: jest.fn().mockResolvedValue([]),
      listVectorStoreFiles: jest.fn().mockResolvedValue([]),
      deleteVectorStoreFile: jest.fn().mockResolvedValue({ data: null }),
      createVectorStore: jest.fn().mockResolvedValue({ data: null }),
      uploadSource: jest.fn().mockResolvedValue({ data: null }),
      getFileUploadStatus: jest.fn().mockResolvedValue({ data: null }),
      getBFFConfig: jest.fn().mockResolvedValue({ isCustomLSD: false }),
      getGuardrailsStatus: jest.fn().mockResolvedValue({ data: null }),
      getSafetyConfig: jest.fn().mockResolvedValue({ data: null }),
      getNemoGuardrailsStatus: jest
        .fn()
        .mockResolvedValue({ name: 'nemoguardrails', phase: 'Ready', isReady: true }),
      initNemoGuardrails: jest.fn().mockResolvedValue({ name: 'nemoguardrails' }),
      listMLflowPrompts: jest.fn().mockResolvedValue([]),
      registerMLflowPrompt: jest.fn().mockResolvedValue({ data: null }),
      getMLflowPrompt: jest.fn().mockResolvedValue({ data: null }),
      listMLflowPromptVersions: jest.fn().mockResolvedValue([]),
      createExternalModel: jest.fn().mockResolvedValue({
        model_id: 'mock-model',
        model_name: 'mock-model',
        display_name: 'Mock Model',
        description: 'Mock external model',
        endpoints: [],
        serving_runtime: 'remote::vllm',
        api_protocol: 'REST',
        version: 'v1',
        usecase: 'llm',
        status: 'Running',
        sa_token: {
          name: '',
          token_name: '',
          token: '',
        },
      }),
      verifyExternalModel: jest.fn().mockResolvedValue({
        success: true,
        message: 'External model verified successfully',
        response_time_ms: 500,
      }),
      deleteExternalModel: jest.fn().mockResolvedValue('Model deleted successfully'),
    },
  },
  refreshAPIState: jest.fn(),
};
