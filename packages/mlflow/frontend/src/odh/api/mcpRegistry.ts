import { APIOptions, handleRestFailures, isModArchResponse, restCREATE } from 'mod-arch-core';
import type {
  McpRegistryQueryParams,
  RegisterMCPServerRequest,
  RegisterMCPServerResult,
} from '~/odh/types/mcpRegistryTypes';
import { BFF_API_VERSION, URL_PREFIX } from '~/app/utilities/const';

const MLFLOW_BFF_URL_PREFIX = `${URL_PREFIX}/api/${BFF_API_VERSION}/mcp-registry`;

/** Composite register: create version + best-effort metadata/tags in one BFF call. */
export const registerMcpRegistryServer =
  (queryParams: McpRegistryQueryParams, hostPath = '') =>
  (opts: APIOptions, data: RegisterMCPServerRequest): Promise<RegisterMCPServerResult> =>
    handleRestFailures(
      restCREATE(hostPath, `${MLFLOW_BFF_URL_PREFIX}/register`, data, queryParams, opts),
    ).then((response) => {
      if (isModArchResponse<RegisterMCPServerResult>(response)) {
        return response.data;
      }
      throw new Error('Invalid response format');
    });
