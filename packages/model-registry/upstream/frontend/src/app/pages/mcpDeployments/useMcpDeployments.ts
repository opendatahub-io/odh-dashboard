import * as React from 'react';
import { useFetchState, FetchState, useQueryParamNamespaces, POLL_INTERVAL } from 'mod-arch-core';
import { McpDeploymentList } from '~/app/mcpDeploymentTypes';
import { BFF_HOST_PATH } from '~/app/utilities/const';
import { getListMcpDeployments } from '~/app/api/mcpDeploymentService';

const EMPTY_LIST: McpDeploymentList = { items: [], size: 0 };

const useMcpDeployments = (): FetchState<McpDeploymentList> => {
  const queryParams = useQueryParamNamespaces();
  const hasNamespace = !!queryParams.namespace;

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
