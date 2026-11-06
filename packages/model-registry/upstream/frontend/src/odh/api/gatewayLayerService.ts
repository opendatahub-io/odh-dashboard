import {
  APIOptions,
  assembleModArchBody,
  handleRestFailures,
  isModArchResponse,
  restCREATE,
  restGET,
} from 'mod-arch-core';
import { GatewayLayerStatus, GatewayLayerUsability } from '~/odh/types/gatewayLayerTypes';

export const getGatewayLayerStatus =
  (hostPath: string, queryParams: Record<string, unknown> = {}) =>
  (opts: APIOptions): Promise<GatewayLayerStatus> =>
    handleRestFailures(restGET(hostPath, '/gateway_layer_status', queryParams, opts)).then(
      (response) => {
        if (isModArchResponse<GatewayLayerStatus>(response)) {
          return response.data;
        }
        throw new Error('Invalid Gateway layer status response format');
      },
    );

export const runGatewayLayerUsability =
  (hostPath: string, queryParams: Record<string, unknown> = {}) =>
  (opts: APIOptions): Promise<GatewayLayerUsability> =>
    handleRestFailures(
      restCREATE(hostPath, '/gateway_layer_usability', assembleModArchBody({}), queryParams, opts),
    ).then((response) => {
      if (isModArchResponse<GatewayLayerUsability>(response)) {
        return response.data;
      }
      throw new Error('Invalid Gateway layer usability response format');
    });
