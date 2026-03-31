import * as React from 'react';
import { useFetchState, FetchState, useQueryParamNamespaces } from 'mod-arch-core';
import { McpDeploymentList } from '~/app/mcpDeploymentTypes';
import { BFF_API_VERSION, URL_PREFIX } from '~/app/utilities/const';
import { getListMcpDeployments } from '~/app/api/mcpDeploymentService';

const useMcpDeployments = (): FetchState<McpDeploymentList> => {
  const hostPath = `${URL_PREFIX}/api/${BFF_API_VERSION}`;
  const queryParams = useQueryParamNamespaces();
  const callback = React.useMemo(
    () => getListMcpDeployments(hostPath, queryParams),
    [hostPath, queryParams],
  );

  return useFetchState(
    callback,
    { items: [], size: 0, pageSize: 0 },
    { initialPromisePurity: true },
  );
};

export default useMcpDeployments;
