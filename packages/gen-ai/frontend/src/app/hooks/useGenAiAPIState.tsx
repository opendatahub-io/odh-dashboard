import React from 'react';
import { APIState, useAPIState } from 'mod-arch-core';
import { GenAiAPIs } from '~/app/types';
import {
  getLSDStatus,
  installLSD,
  deleteLSD,
  getAAModels,
  getMaaSModels,
  exportCode,
  generateMaaSToken,
  listVectorStores,
  createVectorStore,
  getLSDModels,
  listVectorStoreFiles,
  deleteVectorStoreFile,
  uploadSource,
  getMCPServerTools,
  getMCPServers,
  getMCPServerStatus,
  createResponse,
} from '~/app/services/llamaStackService';

export type GenAiAPIState = APIState<GenAiAPIs>;

const useGenAiAPIState = (
  hostPath: string | null,
  queryParameters?: Record<string, unknown>,
): [apiState: GenAiAPIState, refreshAPIState: () => void] => {
  const createAPI = React.useCallback(
    (path: string) => ({
      listVectorStores: listVectorStores(path, queryParameters),
      listVectorStoreFiles: listVectorStoreFiles(path, queryParameters),
      deleteVectorStoreFile: deleteVectorStoreFile(path, queryParameters),
      createVectorStore: createVectorStore(path, queryParameters),
      uploadSource: uploadSource(path, queryParameters),
      getLSDModels: getLSDModels(path, queryParameters),
      exportCode: exportCode(path, queryParameters),
      createResponse: createResponse(path, queryParameters),
      getLSDStatus: getLSDStatus(path, queryParameters),
      installLSD: installLSD(path, queryParameters),
      deleteLSD: deleteLSD(path, queryParameters),
      getAAModels: getAAModels(path, queryParameters),
      getMaaSModels: getMaaSModels(path, queryParameters),
      generateMaaSToken: generateMaaSToken(path, queryParameters),
      getMCPServerTools: getMCPServerTools(path, queryParameters),
      getMCPServers: getMCPServers(path, queryParameters),
      getMCPServerStatus: getMCPServerStatus(path, queryParameters),
    }),
    [queryParameters],
  );

  return useAPIState(hostPath, createAPI);
};

export default useGenAiAPIState;
