import * as React from 'react';
import { useFetchState, FetchState, useQueryParamNamespaces } from 'mod-arch-core';
import { McpDeploymentList } from '~/app/mcpDeploymentTypes';
import { BFF_HOST_PATH } from '~/app/utilities/const';
import { getListMcpDeployments } from '~/app/api/mcpDeploymentService';

const useMcpDeployments = (): FetchState<McpDeploymentList> => {
  const queryParams = useQueryParamNamespaces();
  const callback = React.useMemo(
    () => getListMcpDeployments(BFF_HOST_PATH, queryParams),
    [queryParams],
  );

  return useFetchState(
    callback,
    { items: [], size: 0, pageSize: 0 },
    { initialPromisePurity: true },
  );
};

export default useMcpDeployments;
