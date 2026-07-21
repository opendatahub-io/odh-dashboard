import {
  APIOptions,
  handleRestFailures,
  isModArchResponse,
  restCREATE,
  restDELETE,
  restGET,
} from 'mod-arch-core';
import { BFF_API_VERSION, URL_PREFIX } from '~/app/utilities/const';
import type { CreateGatewayRequest, Gateway, GatewayList } from '~/app/types/gateway';

const gatewaysBasePath = `${URL_PREFIX}/api/${BFF_API_VERSION}/gateways`;

export const listGateways =
  (hostPath: string) =>
  (opts: APIOptions): Promise<Gateway[]> =>
    handleRestFailures(restGET(hostPath, gatewaysBasePath, {}, opts)).then((response) => {
      if (isModArchResponse<GatewayList>(response)) {
        return response.data.gateways;
      }
      throw new Error('Invalid response format');
    });

export const getGateway =
  (hostPath: string, gwName: string) =>
  (opts: APIOptions): Promise<Gateway> =>
    handleRestFailures(
      restGET(
        hostPath,
        `${gatewaysBasePath}/${encodeURIComponent(gwName)}`,
        {},
        opts,
      ),
    ).then((response) => {
      if (isModArchResponse<Gateway>(response)) {
        return response.data;
      }
      throw new Error('Invalid response format');
    });

export const createGateway =
  (hostPath = '') =>
  (opts: APIOptions, request: CreateGatewayRequest): Promise<Gateway> =>
    handleRestFailures(
      restCREATE(hostPath, gatewaysBasePath, request, {}, opts),
    ).then((response) => {
      if (isModArchResponse<Gateway>(response)) {
        return response.data;
      }
      throw new Error('Invalid response format');
    });

export const deleteGateway =
  (hostPath = '') =>
  (opts: APIOptions, gwName: string): Promise<void> =>
    handleRestFailures(
      restDELETE(
        hostPath,
        `${gatewaysBasePath}/${encodeURIComponent(gwName)}`,
        {},
        {},
        { ...opts, parseJSON: false },
      ),
    ).then(() => undefined);
