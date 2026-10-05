import {
  APIOptions,
  handleRestFailures,
  isModArchResponse,
  restENDPOINT,
  restDELETE,
  restGET,
  restCREATE,
} from 'mod-arch-core';
import { BFF_API_VERSION, URL_PREFIX } from '~/app/utilities/const';
import {
  Connection,
  ConnectionType,
  CreateConnectionRequest,
  TestCredentialsRequest,
} from '~/app/types';

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const getResponseErrorMessage = (body: string, status: number): string => {
  try {
    const parsed: unknown = JSON.parse(body);
    if (isRecord(parsed)) {
      if (isRecord(parsed.error) && typeof parsed.error.message === 'string') {
        return parsed.error.message;
      }
      if (typeof parsed.message === 'string') {
        return parsed.message;
      }
    }
  } catch {
    // Fall back to the raw response for non-JSON errors.
  }
  return body || `Credential verification failed with status ${status}`;
};

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

const isConnectionTypeField = (value: unknown): boolean =>
  isRecord(value) &&
  typeof value.name === 'string' &&
  typeof value.label === 'string' &&
  typeof value.required === 'boolean' &&
  typeof value.type === 'string' &&
  (value.description === undefined || typeof value.description === 'string') &&
  (value.default_value === undefined || typeof value.default_value === 'string') &&
  (value.enum_values === undefined ||
    (Array.isArray(value.enum_values) &&
      value.enum_values.every(
        (item) =>
          isRecord(item) && typeof item.value === 'string' && typeof item.label === 'string',
      )));

const isConnectionType = (value: unknown): value is ConnectionType =>
  isRecord(value) &&
  isRecord(value.metadata) &&
  isRecord(value.resource) &&
  typeof value.metadata.id === 'string' &&
  (value.metadata.tenant_id === undefined || typeof value.metadata.tenant_id === 'string') &&
  typeof value.resource.name === 'string' &&
  typeof value.resource.provider === 'string' &&
  (value.resource.description === undefined || typeof value.resource.description === 'string') &&
  Array.isArray(value.resource.credentials_fields) &&
  value.resource.credentials_fields.every(isConnectionTypeField) &&
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

export const createConnection =
  (hostPath: string) =>
  (opts: APIOptions, namespace: string, request: CreateConnectionRequest): Promise<Connection> =>
    handleRestFailures(
      restCREATE(
        hostPath,
        `${URL_PREFIX}/api/${BFF_API_VERSION}/connections`,
        request,
        { namespace },
        opts,
      ),
    ).then((response) => {
      if (isModArchResponse<unknown>(response) && isConnection(response.data)) {
        return response.data;
      }
      throw new Error('Invalid response format');
    });

export const getConnectionType =
  (hostPath: string) =>
  (opts: APIOptions, namespace: string, connectionTypeId: string): Promise<ConnectionType> =>
    handleRestFailures(
      restGET(
        hostPath,
        `${URL_PREFIX}/api/${BFF_API_VERSION}/connection-types/${encodeURIComponent(connectionTypeId)}`,
        { namespace },
        opts,
      ),
    ).then((response) => {
      if (
        isModArchResponse<unknown>(response) &&
        response.data &&
        isConnectionType(response.data)
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

export const testCredentials =
  (hostPath: string) =>
  (opts: APIOptions, namespace: string, request: TestCredentialsRequest): Promise<void> =>
    fetch(
      `${hostPath}${URL_PREFIX}/api/${BFF_API_VERSION}/test/credentials?${new URLSearchParams({
        namespace,
      }).toString()}`,
      {
        method: 'POST',
        headers: {
          ...opts.headers,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
        signal: opts.signal,
      },
    ).then(async (response) => {
      if (response.status === 204) {
        return;
      }
      const body = await response.text();
      throw new Error(getResponseErrorMessage(body, response.status));
    });

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
