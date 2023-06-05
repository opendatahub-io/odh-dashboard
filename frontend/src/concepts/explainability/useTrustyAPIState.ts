import React from 'react';
import { APIState } from '~/concepts/proxy/types';
import { ExplainabilityAPI } from '~/concepts/explainability/types';
import useAPIState from '~/concepts/proxy/useAPIState';
import {
  createDirRequest,
  createSpdRequest,
  deleteDirRequest,
  getAllRequests,
  getDirRequests,
  getInfo,
  getSpdRequests,
} from '~/api';
import BiasTab from '~/pages/modelServing/screens/metrics/bias/BiasTab';

export type TrustyAPIState = APIState<ExplainabilityAPI>;

const useTrustyAPIState = (
  hostPath: string | null,
): [apiState: TrustyAPIState, refreshAPIState: () => void] => {
  const createAPI = React.useCallback(
    (path) => ({
      createDirRequest: createDirRequest(path),
      createSpdRequest: createSpdRequest(path),
      deleteDirRequest: deleteDirRequest(path),
      deleteSpdRequest: deleteDirRequest(path),
      getInfo: getInfo(path),
      listDirRequests: getDirRequests(path),
      listRequests: getAllRequests(path),
      listSpdRequests: getSpdRequests(path),
    }),
    [],
  );

  return useAPIState<ExplainabilityAPI>(hostPath, createAPI);
};

export default useTrustyAPIState;
