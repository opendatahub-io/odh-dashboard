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
      listVectorStoreFiles: jest.fn().mockResolvedValue([]),
      deleteVectorStoreFile: jest.fn().mockResolvedValue({ data: null }),
      createVectorStore: jest.fn().mockResolvedValue({ data: null }),
      uploadSource: jest.fn().mockResolvedValue({ data: null }),
    },
  },
  refreshAPIState: jest.fn(),
};
