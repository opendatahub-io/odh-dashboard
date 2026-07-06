import * as React from 'react';
import { useFetchState, FetchState, POLL_INTERVAL } from 'mod-arch-core';
import { McpDeploymentList } from '~/odh/types/mcpDeploymentTypes';
import { BFF_HOST_PATH } from '~/app/utilities/const';
import { getListMcpDeployments } from '~/odh/api/mcpDeploymentService';

const EMPTY_LIST: McpDeploymentList = { items: [], size: 0 };

const useMcpDeployments = (namespace: string | undefined): FetchState<McpDeploymentList> => {
  const hasNamespace = !!namespace;
  const queryParams = React.useMemo(() => ({ namespace: namespace ?? '' }), [namespace]);

  const callback = React.useMemo(
    () =>
      hasNamespace
        ? getListMcpDeployments(BFF_HOST_PATH, queryParams)
        : () => Promise.resolve(EMPTY_LIST),
    [hasNamespace, queryParams],
  );

  return useFetchState(callback, EMPTY_LIST, {
    initialPromisePurity: true,
    refreshRate: hasNamespace ? POLL_INTERVAL : 0,
  });
};

export default useMcpDeployments;
