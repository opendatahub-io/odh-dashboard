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

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const isConnection = (value: unknown): value is Connection => {
  if (
    !isRecord(value) ||
    !isRecord(value.metadata) ||
    !isRecord(value.resource) ||
    !isRecord(value.status)
  ) {
    return false;
  }
  return (
    typeof value.metadata.id === 'string' &&
    value.metadata.id.length > 0 &&
    (value.metadata.tenant_id === undefined || typeof value.metadata.tenant_id === 'string') &&
    typeof value.resource.name === 'string' &&
    typeof value.resource.data_connection_type_id === 'string' &&
    (value.resource.format === 'tabular' || value.resource.format === 'binary') &&
    (value.status.state === 'ready' ||
      value.status.state === 'ingestion_not_ready' ||
      value.status.state === 'not_ready') &&
    (value.status.message === undefined || typeof value.status.message === 'string') &&
    (value.status.updated_at === undefined || typeof value.status.updated_at === 'string')
  );
};

const isConnectionType = (value: unknown): value is ConnectionType =>
  isRecord(value) &&
  isRecord(value.metadata) &&
  isRecord(value.resource) &&
  typeof value.metadata.id === 'string' &&
  (value.metadata.tenant_id === undefined || typeof value.metadata.tenant_id === 'string') &&
  typeof value.resource.name === 'string' &&
  typeof value.resource.provider === 'string' &&
  (value.resource.description === undefined || typeof value.resource.description === 'string') &&
  (value.status === undefined ||
    (isRecord(value.status) &&
      isRecord(value.status.capabilities) &&
      typeof value.status.capabilities.flight === 'boolean' &&
      typeof value.status.capabilities.rest === 'boolean'));

export const getConnections =
  (hostPath: string) =>
  (opts: APIOptions, namespace: string): Promise<Connection[]> =>
    handleRestFailures(
      restGET(hostPath, `${URL_PREFIX}/api/${BFF_API_VERSION}/connections`, { namespace }, opts),
    ).then((response) => {
      if (
        isModArchResponse<unknown>(response) &&
        Array.isArray(response.data) &&
        response.data.every(isConnection)
      ) {
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
      if (
        isModArchResponse<unknown>(response) &&
        Array.isArray(response.data) &&
        response.data.every(isConnectionType)
      ) {
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
        `${URL_PREFIX}/api/${BFF_API_VERSION}/connections/${encodeURIComponent(
          connectionId,
        )}/readiness`,
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
