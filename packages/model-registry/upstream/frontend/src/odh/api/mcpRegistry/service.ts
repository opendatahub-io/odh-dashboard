import {
  APIOptions,
  handleRestFailures,
  isModArchResponse,
  mergeRequestInit,
  restCREATE,
  restPATCH,
} from 'mod-arch-core';
import type {
  CreateMCPServerVersionRequest,
  MCPServer,
  MCPServerVersion,
  SetMCPTagRequest,
  UpdateMCPServerRequest,
} from '~/odh/types/mcpRegistryTypes';
import { isRecord } from '~/odh/utils/registerUtils';

const MLFLOW_BFF_URL_PREFIX = '/_bff/mlflow/api/v1/mcp-registry';

/**
 * Renders a (possibly `/`-namespaced) MCP server name for use as a literal
 * REST path segment -- mirrors the BFF's `mcpServerNamePathSegment`. Each
 * `/`-separated part is escaped independently so the separating `/` itself
 * is preserved rather than becoming `%2F` (which would break the BFF's
 * catch-all route matching).
 */
const mcpServerNamePathSegment = (name: string): string =>
  name.split('/').map(encodeURIComponent).join('/');

/** Extracts `error.message` from a BFF `HTTPError` JSON body without unsafe assertions. */
const getBffErrorMessage = (body: unknown): string | undefined => {
  if (!isRecord(body) || !isRecord(body.error)) {
    return undefined;
  }
  const { message } = body.error;
  return typeof message === 'string' ? message : undefined;
};

const toQueryString = (queryParams: Record<string, unknown>): string => {
  const sanitized = Object.entries(queryParams).reduce<Record<string, string>>(
    (acc, [key, value]) => {
      if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
        return { ...acc, [key]: String(value) };
      }
      return acc;
    },
    {},
  );
  const search = new URLSearchParams(sanitized).toString();
  return search ? `?${search}` : '';
};

export const createMcpRegistryServerVersion =
  (hostPath: string, queryParams: Record<string, unknown> = {}) =>
  (
    opts: APIOptions,
    serverName: string,
    data: CreateMCPServerVersionRequest,
  ): Promise<MCPServerVersion> =>
    handleRestFailures(
      restCREATE(
        hostPath,
        `${MLFLOW_BFF_URL_PREFIX}/servers/${mcpServerNamePathSegment(serverName)}/versions`,
        data,
        queryParams,
        opts,
      ),
    ).then((response) => {
      if (isModArchResponse<MCPServerVersion>(response)) {
        return response.data;
      }
      throw new Error('Invalid response format');
    });

export const updateMcpRegistryServer =
  (hostPath: string, queryParams: Record<string, unknown> = {}) =>
  (opts: APIOptions, serverName: string, data: UpdateMCPServerRequest): Promise<MCPServer> =>
    handleRestFailures(
      restPATCH(
        hostPath,
        `${MLFLOW_BFF_URL_PREFIX}/servers/${mcpServerNamePathSegment(serverName)}`,
        data,
        queryParams,
        opts,
      ),
    ).then((response) => {
      if (isModArchResponse<MCPServer>(response)) {
        return response.data;
      }
      throw new Error('Invalid response format');
    });

export const setMcpRegistryServerTag =
  (hostPath: string, queryParams: Record<string, unknown> = {}) =>
  async (opts: APIOptions, serverName: string, data: SetMCPTagRequest): Promise<void> => {
    const response = await fetch(
      `${hostPath}${MLFLOW_BFF_URL_PREFIX}/servers/${mcpServerNamePathSegment(serverName)}/tags${toQueryString(queryParams)}`,
      {
        ...mergeRequestInit(opts, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json;charset=UTF-8' },
        }),
        body: JSON.stringify(data),
      },
    );
    if (response.ok) {
      return;
    }
    let message: string | undefined;
    try {
      message = getBffErrorMessage(JSON.parse(await response.text()));
    } catch {
      // Not JSON (e.g. an HTML error page) -- fall back to the generic message below.
    }
    throw new Error(
      message || `Failed to set tag "${data.key}" on ${serverName} (HTTP ${response.status})`,
    );
  };
