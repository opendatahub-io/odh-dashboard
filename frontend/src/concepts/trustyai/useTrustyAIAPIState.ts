import React from 'react';
import { APIState } from '#~/concepts/proxy/types';
import { ExplainabilityAPI } from '#~/concepts/trustyai/types';
import useAPIState from '#~/concepts/proxy/useAPIState';
import {
  createDirRequest,
  createSpdRequest,
  deleteDirRequest,
  deleteSpdRequest,
  getAllBiasRequests,
  getDirRequests,
  getSpdRequests,
} from '#~/api';

export type TrustyAPIState = APIState<ExplainabilityAPI>;

const useTrustyAIAPIState = (
  hostPath: string | null,
): [apiState: TrustyAPIState, refreshAPIState: () => void] => {
  const createAPI = React.useCallback(
    (path: string) => ({
      createDirRequest: createDirRequest(path),
      createSpdRequest: createSpdRequest(path),
      deleteDirRequest: deleteDirRequest(path),
      deleteSpdRequest: deleteSpdRequest(path),
      listDirRequests: getDirRequests(path),
      listRequests: getAllBiasRequests(path),
      listSpdRequests: getSpdRequests(path),
    }),
    [],
  );

  return useAPIState<ExplainabilityAPI>(hostPath, createAPI);
};

export default useTrustyAIAPIState;
