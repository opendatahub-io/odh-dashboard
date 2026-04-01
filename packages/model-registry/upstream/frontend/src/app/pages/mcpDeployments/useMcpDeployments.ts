import * as React from 'react';
import { useFetchState, FetchState, useQueryParamNamespaces, POLL_INTERVAL } from 'mod-arch-core';
import { McpDeploymentList } from '~/app/mcpDeploymentTypes';
import { BFF_HOST_PATH } from '~/app/utilities/const';
import { getListMcpDeployments } from '~/app/api/mcpDeploymentService';

const useMcpDeployments = (): FetchState<McpDeploymentList> => {
  const queryParams = useQueryParamNamespaces();
  const callback = React.useMemo(
    () => getListMcpDeployments(BFF_HOST_PATH, queryParams),
    [queryParams],
  );

  return useFetchState(callback, { items: [], size: 0 }, {
    initialPromisePurity: true,
    refreshRate: POLL_INTERVAL,
  });
};

export default useMcpDeployments;
