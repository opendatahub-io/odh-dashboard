import { APIOptions } from 'mod-arch-core';
import type { McpServer } from '~/app/mcpServerCatalogTypes';
import type {
  MCPIcon,
  MCPServerVersion,
  MCPServerVersionStatus,
  MCPTagEntry,
} from '~/odh/types/mcpRegistryTypes';
import { catalogToolToRegistryTool } from '~/odh/utils/catalogToRegistry';
import { sanitizeHref } from '~/odh/utils/registerUtils';
import {
  createMcpRegistryServerVersion,
  setMcpRegistryServerTag,
  updateMcpRegistryServer,
} from '~/odh/api/mcpRegistry/service';

const iconToPayload = (icon: MCPIcon): Record<string, unknown> => ({
  src: icon.src,
  ...(icon.theme && { theme: icon.theme }),
});

type RegisterMcpServerInput = {
  server: McpServer;
  registryName: string;
  serverJson: Record<string, unknown>;
  /** Server-level metadata, distinct from (and never written into) `serverJson`'s `title`. */
  displayName?: string;
  status: MCPServerVersionStatus;
  source?: string;
  icons: MCPIcon[];
  tags?: MCPTagEntry[];
};

type RegisterMcpServerContext = {
  hostPath: string;
  queryParams: Record<string, unknown>;
  opts: APIOptions;
};

export type RegisterMcpServerResult = {
  version: MCPServerVersion;
  /** Set when the version was created but the metadata (display name / icons) PATCH failed -- surface as a toast, not a hard failure. */
  metadataError?: Error;
  /** Set when the version was created but one or more tag requests failed. Surface as a toast, not a hard failure. */
  tagsError?: Error;
};

const toError = (e: unknown, fallbackMessage: string): Error =>
  e instanceof Error ? e : new Error(fallbackMessage);

export const registerMcpServer = async (
  input: RegisterMcpServerInput,
  context: RegisterMcpServerContext,
): Promise<RegisterMcpServerResult> => {
  const { server, registryName, serverJson, displayName, status, source, icons, tags = [] } = input;
  const { hostPath, queryParams, opts } = context;

  const tools = (server.tools ?? []).map(catalogToolToRegistryTool);
  const version = await createMcpRegistryServerVersion(hostPath, queryParams)(opts, registryName, {
    // eslint-disable-next-line camelcase
    server_json: serverJson,
    status,
    ...(source && { source }),
    tools,
  });

  const iconsPayload = icons.filter((icon) => sanitizeHref(icon.src)).map(iconToPayload);
  const trimmedDisplayName = displayName?.trim();
  const metadataPromise: Promise<Error | undefined> =
    iconsPayload.length > 0 || trimmedDisplayName
      ? updateMcpRegistryServer(hostPath, queryParams)(opts, registryName, {
          // eslint-disable-next-line camelcase
          ...(trimmedDisplayName && { display_name: trimmedDisplayName }),
          ...(iconsPayload.length > 0 && { icons: iconsPayload }),
        })
          .then(() => undefined)
          .catch((e: unknown) => toError(e, 'Failed to save display name and icons'))
      : Promise.resolve(undefined);

  const tagsPayload = tags.filter((tag) => tag.key.trim());
  const tagResultsPromise = Promise.allSettled(
    tagsPayload.map((tag) =>
      setMcpRegistryServerTag(hostPath, queryParams)(opts, registryName, {
        key: tag.key,
        ...(tag.value && { value: tag.value }),
      }),
    ),
  );

  const [metadataError, tagResults] = await Promise.all([metadataPromise, tagResultsPromise]);

  let tagsError: Error | undefined;
  const failedTagKeys = tagsPayload
    .filter((_tag, i) => tagResults[i].status === 'rejected')
    .map((tag) => tag.key);
  if (failedTagKeys.length > 0) {
    tagsError = new Error(
      `Failed to set tag${failedTagKeys.length > 1 ? 's' : ''}: ${failedTagKeys.join(', ')}`,
    );
  }

  return { version, metadataError, tagsError };
};
