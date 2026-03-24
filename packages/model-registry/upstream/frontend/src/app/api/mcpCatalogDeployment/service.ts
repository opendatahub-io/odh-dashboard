import { APIOptions, handleRestFailures, isModArchResponse, restGET } from 'mod-arch-core';
import { URL_PREFIX, BFF_API_VERSION } from '~/app/utilities/const';

export type McpServerAvailabilityResponse = {
  available: boolean;
};

export const getMcpServerAvailability =
  (hostPath: string) =>
  (opts: APIOptions): Promise<McpServerAvailabilityResponse> =>
    handleRestFailures(
      restGET(
        hostPath,
        `${URL_PREFIX}/api/${BFF_API_VERSION}/mcp_catalog/mcp_server_available`,
        {},
        opts,
      ),
    ).then((response) => {
      if (isModArchResponse<McpServerAvailabilityResponse>(response)) {
        return response.data;
      }
      throw new Error('Invalid response format');
    });