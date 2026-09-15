import {
  APIOptions,
  handleRestFailures,
  isModArchResponse,
  restENDPOINT,
  restDELETE,
  restGET,
} from 'mod-arch-core';
import { BFF_API_VERSION, URL_PREFIX } from '~/app/utilities/const';
import { Connection, ConnectionType } from '~/app/types';

export const getConnections =
  (hostPath: string) =>
  (opts: APIOptions, namespace: string): Promise<Connection[]> =>
    handleRestFailures(
      restGET(hostPath, `${URL_PREFIX}/api/${BFF_API_VERSION}/connections`, { namespace }, opts),
    ).then((response) => {
      if (isModArchResponse<Connection[]>(response)) {
        return response.data;
      }
      throw new Error('Invalid response format');
    });

export const getConnectionTypes =
  (hostPath: string) =>
  (opts: APIOptions, namespace: string): Promise<ConnectionType[]> =>
    handleRestFailures(
      restGET(
        hostPath,
        `${URL_PREFIX}/api/${BFF_API_VERSION}/connection-types`,
        { namespace },
        opts,
      ),
    ).then((response) => {
      if (isModArchResponse<ConnectionType[]>(response)) {
        return response.data;
      }
      throw new Error('Invalid response format');
    });

export const verifyConnection =
  (hostPath: string) =>
  (opts: APIOptions, namespace: string, connectionId: string): Promise<void> =>
    handleRestFailures(
      restENDPOINT(
        hostPath,
        `${URL_PREFIX}/api/${BFF_API_VERSION}/connections/${encodeURIComponent(connectionId)}/readiness`,
        { namespace },
        { ...opts, parseJSON: false },
      ),
    ).then(() => undefined);

export const deleteConnection =
  (hostPath: string) =>
  (opts: APIOptions, namespace: string, connectionId: string): Promise<void> =>
    handleRestFailures(
      restDELETE(
        hostPath,
        `${URL_PREFIX}/api/${BFF_API_VERSION}/connections/${encodeURIComponent(connectionId)}`,
        {},
        { namespace },
        { ...opts, parseJSON: false },
      ),
    ).then(() => undefined);
