import { APIOptions } from 'mod-arch-core';
import type { ReactNode } from 'react';
import type {
  McpDeploySpec,
  McpServer,
  McpServerJson,
  McpServerJsonMeta,
  McpTool,
} from '~/app/types/mcpCatalogTypes';
import { registerMcpRegistryServer } from '~/odh/api/mcpRegistry';
import {
  CATALOG_SOURCE_ID_TAG_KEY,
  MCP_REGISTRY_BASENAME,
  MCP_SERVER_JSON_ERROR,
  REGISTER_BUTTON_TOOLTIP,
  REGISTER_NOTIFICATION,
} from '~/odh/const';
import type {
  MCPIcon,
  MCPServerVersion,
  MCPServerVersionStatus,
  MCPTagEntry,
  McpRegistryQueryParams,
  SetMCPTagRequest,
} from '~/odh/types/mcpRegistryTypes';

export const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

export const resolveIcon = (
  icons: MCPIcon[] | undefined,
  isDarkMode?: boolean,
): MCPIcon | undefined => {
  if (!icons?.length) {
    return undefined;
  }
  const preferred = isDarkMode ? 'dark' : 'light';
  const themeIcon = icons.find((icon) => icon.theme === preferred);
  const anyIcon = icons.find((icon) => !icon.theme);
  return themeIcon ?? anyIcon;
};

export const resolveIconWithFallback = (
  icons: MCPIcon[] | undefined,
  isDarkMode?: boolean,
): { icon: MCPIcon | undefined; fallbackIcon: MCPIcon | undefined } => {
  if (!icons?.length) {
    return { icon: undefined, fallbackIcon: undefined };
  }
  const preferred = isDarkMode ? 'dark' : 'light';
  const themeIcon = icons.find((icon) => icon.theme === preferred);
  const anyIcon = icons.find((icon) => !icon.theme);
  if (themeIcon) {
    return { icon: themeIcon, fallbackIcon: anyIcon };
  }
  return { icon: anyIcon, fallbackIcon: undefined };
};

export const sanitizeHref = (url: string | undefined): string | undefined => {
  if (!url) {
    return undefined;
  }
  try {
    const parsed = new URL(url);
    if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
      return url;
    }
  } catch {
    // malformed URL
  }
  return undefined;
};

export const sanitizeIconPreviewSrc = (url: string | undefined): string | undefined =>
  sanitizeHref(url);

const ICON_URL_FORMAT_ERROR = 'Enter a valid URL';

export const getIconUrlFormatError = (url: string): string | undefined =>
  sanitizeHref(url) ? undefined : ICON_URL_FORMAT_ERROR;

const toPayloadIcon = (icon: MCPIcon): MCPIcon => ({
  src: icon.src,
  ...(icon.theme && { theme: icon.theme }),
});

const isLoadedIcon = (icon: MCPIcon, failedSrcs: ReadonlySet<string>): boolean => {
  const src = icon.src.trim();
  return Boolean(src && sanitizeHref(icon.src) && !failedSrcs.has(icon.src));
};

const samePayloadIcon = (a: MCPIcon, b: MCPIcon): boolean => a.src === b.src && a.theme === b.theme;

/** Empty rows are ignored. A key without a value (or a value without a key) blocks submit. */
export const hasBlockingTag = (tags: MCPTagEntry[]): boolean =>
  tags.some((tag) => {
    const hasKey = Boolean(tag.key.trim());
    const hasValue = Boolean(tag.value.trim());
    return hasKey !== hasValue;
  });

/** Empty rows are ignored. Non-empty malformed or failed-to-load user URLs block submit. */
export const hasBlockingUserIcon = (
  icons: MCPIcon[],
  failedSrcs: ReadonlySet<string> = new Set(),
): boolean =>
  icons.some((icon) => {
    const src = icon.src.trim();
    if (!src) {
      return false;
    }
    return !sanitizeHref(icon.src) || failedSrcs.has(icon.src);
  });

/**
 * User-added icons that loaded, plus official icons for any theme the user did
 * not cover. An any-theme user icon covers both themes. Failed / empty /
 * malformed rows are omitted; the SVG fallback is never included.
 */
export const resolveIconsForSubmit = (
  userIcons: MCPIcon[],
  officialIcons: MCPIcon[] = [],
  failedSrcs: ReadonlySet<string> = new Set(),
): MCPIcon[] => {
  const loadedUser = userIcons.filter((icon) => isLoadedIcon(icon, failedSrcs)).map(toPayloadIcon);
  const coversLight = loadedUser.some((icon) => icon.theme !== 'dark');
  const coversDark = loadedUser.some((icon) => icon.theme !== 'light');
  if (coversLight && coversDark) {
    return loadedUser;
  }

  const loadedOfficial = officialIcons.filter((icon) => isLoadedIcon(icon, failedSrcs));
  const extras: MCPIcon[] = [];
  const alreadyIncluded = (icon: MCPIcon): boolean =>
    loadedUser.some((existing) => samePayloadIcon(existing, icon)) ||
    extras.some((existing) => samePayloadIcon(existing, icon));

  if (!coversLight) {
    const official = resolveIcon(loadedOfficial, false);
    if (official) {
      const payload = toPayloadIcon(official);
      if (!alreadyIncluded(payload)) {
        extras.push(payload);
      }
    }
  }
  if (!coversDark) {
    const official = resolveIcon(loadedOfficial, true);
    if (official) {
      const payload = toPayloadIcon(official);
      if (!alreadyIncluded(payload)) {
        extras.push(payload);
      }
    }
  }

  return [...loadedUser, ...extras];
};

export type ActionButtonState = { enabled: boolean; loading: boolean; tooltip?: string };

type ActionButtonCheck = { loading?: boolean; tooltip?: string };

/** First truthy check wins; otherwise the button is enabled. */
export const resolveActionButtonState = (
  checks: Array<ActionButtonCheck | false | undefined>,
): ActionButtonState => {
  const blocking = checks.find((check): check is ActionButtonCheck => Boolean(check));
  return blocking
    ? { enabled: false, loading: blocking.loading ?? false, tooltip: blocking.tooltip }
    : { enabled: true, loading: false };
};

const loading = (tooltip: string): ActionButtonCheck => ({ loading: true, tooltip });
const blocked = (tooltip: string): ActionButtonCheck => ({ tooltip });

type RegisterButtonStateArgs = {
  serverSettled: boolean;
  hasServerData: boolean;
  dscSettled: boolean;
  registriesNamespace: string;
  mlflowLoaded: boolean;
  mlflowUnreachable: boolean;
  mlflowConfigured: boolean;
  converterSettled: boolean;
};

export const getRegisterButtonState = ({
  serverSettled,
  hasServerData,
  dscSettled,
  registriesNamespace,
  mlflowLoaded,
  mlflowUnreachable,
  mlflowConfigured,
  converterSettled,
}: RegisterButtonStateArgs): ActionButtonState =>
  resolveActionButtonState([
    !serverSettled && loading(REGISTER_BUTTON_TOOLTIP.LOADING_SERVER),
    !hasServerData && blocked(REGISTER_BUTTON_TOOLTIP.UNABLE_TO_LOAD_SERVER),
    !dscSettled && loading(REGISTER_BUTTON_TOOLTIP.LOADING_CATALOG),
    !registriesNamespace && blocked(REGISTER_BUTTON_TOOLTIP.NAMESPACE_NOT_CONFIGURED),
    !mlflowLoaded && loading(REGISTER_BUTTON_TOOLTIP.CHECKING_MLFLOW),
    mlflowUnreachable && blocked(REGISTER_BUTTON_TOOLTIP.MLFLOW_UNREACHABLE),
    !mlflowConfigured && blocked(REGISTER_BUTTON_TOOLTIP.MLFLOW_UNAVAILABLE),
    !converterSettled && loading(REGISTER_BUTTON_TOOLTIP.LOADING_DEPLOY_CONFIG),
  ]);

/** Reverse-DNS namespaced `_meta` key used to snapshot deploy-relevant data on a registered version. */
export const RHAI_DEPLOY_SPEC_META_KEY = 'com.redhat/deploy-spec';

export const mcpServerDetailRoute = (serverName: string, namespace?: string): string => {
  const encodedName = encodeURIComponent(serverName).replace(/\./g, '%252E');
  const base = `${MCP_REGISTRY_BASENAME}/${encodedName}`;
  return namespace ? `${base}?workspace=${encodeURIComponent(namespace)}` : base;
};

/** Model-registry BFF logo path (browser-reachable; no inter-BFF needed). */
const MODEL_REGISTRY_BFF_API = '/model-registry/api/v1';

export const isMcpServerJson = (value: unknown): value is McpServerJson => isRecord(value);

export const isMcpServerJsonMeta = (value: unknown): value is McpServerJsonMeta => isRecord(value);

const MCP_SERVER_NAMESPACE_REGEX = /^[a-zA-Z0-9][a-zA-Z0-9.-]*[a-zA-Z0-9]$/;
const MCP_SERVER_SLUG_REGEX = /^[a-zA-Z0-9][a-zA-Z0-9._-]*[a-zA-Z0-9]$/;
const MCP_SERVER_RESERVED_SLUGS = new Set(['aliases', 'endpoints', 'tags', 'versions']);

/** Matches BFF validateMCPServerName: `<namespace>/<slug>` with reserved slugs rejected. */
export const isValidMcpRegistryName = (name: string): boolean => {
  const parts = name.split('/');
  if (parts.length !== 2 || !parts[0] || !parts[1]) {
    return false;
  }
  const [namespace, slug] = parts;
  return (
    MCP_SERVER_NAMESPACE_REGEX.test(namespace) &&
    MCP_SERVER_SLUG_REGEX.test(slug) &&
    !MCP_SERVER_RESERVED_SLUGS.has(slug)
  );
};

export const getMcpServerJsonSubmitError = (content: string): string | undefined => {
  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch {
    return MCP_SERVER_JSON_ERROR.INVALID_JSON;
  }
  if (!isMcpServerJson(parsed)) {
    return MCP_SERVER_JSON_ERROR.INVALID_JSON;
  }
  if (typeof parsed.name !== 'string' || !parsed.name) {
    return MCP_SERVER_JSON_ERROR.MISSING_NAME;
  }
  if (!isValidMcpRegistryName(parsed.name)) {
    return MCP_SERVER_JSON_ERROR.INVALID_NAME;
  }
  if (typeof parsed.version !== 'string' || parsed.version === '') {
    return MCP_SERVER_JSON_ERROR.MISSING_VERSION;
  }
  return undefined;
};

export const canSubmitMcpServerJson = (
  serverJson: McpServerJson | undefined,
): serverJson is McpServerJson & { name: string; version: string } =>
  !!serverJson &&
  typeof serverJson.name === 'string' &&
  isValidMcpRegistryName(serverJson.name) &&
  typeof serverJson.version === 'string' &&
  serverJson.version !== '';

export const withDeploySpecMeta = (
  server: McpServer,
  deploySpec?: McpDeploySpec,
): McpServerJson => {
  const serverJson: McpServerJson = isMcpServerJson(server.serverJson)
    ? { ...server.serverJson }
    : {};
  if (!deploySpec) {
    return serverJson;
  }
  const existingMeta: McpServerJsonMeta = isMcpServerJsonMeta(serverJson._meta)
    ? { ...serverJson._meta }
    : {};
  return {
    ...serverJson,
    _meta: {
      ...existingMeta,
      [RHAI_DEPLOY_SPEC_META_KEY]: deploySpec,
    },
  };
};

export const getMcpServerLogoEndpoint = (serverId: string, namespace: string): string => {
  const path = `${MODEL_REGISTRY_BFF_API}/mcp_catalog/mcp_servers/${encodeURIComponent(serverId)}/logo?namespace=${encodeURIComponent(namespace)}`;
  if (typeof window !== 'undefined' && window.location.origin) {
    return `${window.location.origin}${path}`;
  }
  return path;
};

export const catalogToRegistryIcons = (server: McpServer, namespace: string): MCPIcon[] => {
  if (!server.logo) {
    return [];
  }
  if (server.logo.startsWith('data:')) {
    return [{ src: getMcpServerLogoEndpoint(server.id, namespace) }];
  }
  return [{ src: server.logo }];
};

/** Prefill `catalog.source.id` from the catalog server when a source id is present. */
export const catalogToRegistryTags = (server: McpServer): MCPTagEntry[] => {
  const sourceId = server.source_id?.trim();
  if (!sourceId) {
    return [];
  }
  return [{ key: CATALOG_SOURCE_ID_TAG_KEY, value: sourceId }];
};

/**
 * Collapse UI tag rows into API tag requests: trim keys/values, drop empty keys
 * or values, and keep the last value when the same key appears more than once.
 */
const toSetTagRequests = (tags: MCPTagEntry[]): SetMCPTagRequest[] => {
  const byKey = new Map<string, string>();
  for (const { key, value } of tags) {
    const trimmedKey = key.trim();
    const trimmedValue = value.trim();
    if (trimmedKey && trimmedValue) {
      byKey.set(trimmedKey, trimmedValue);
    }
  }
  return Array.from(byKey, ([key, value]): SetMCPTagRequest => ({ key, value }));
};

type RegisterMcpServerInput = {
  tools: McpTool[];
  registryName: string;
  serverJson: McpServerJson;
  // Server-level metadata
  displayName?: string;
  status: MCPServerVersionStatus;
  source?: string;
  icons: MCPIcon[];
  tags?: MCPTagEntry[];
};

type RegisterMcpServerContext = {
  queryParams: McpRegistryQueryParams;
  opts: APIOptions;
};

export type RegisterMcpServerResult = {
  version: MCPServerVersion;
  /** Set when the version was created but the metadata (display name / icons) PATCH failed -- surface as a toast, not a hard failure. */
  metadataError?: Error;
  /** Set when the version was created but one or more tag requests failed. Surface as a toast, not a hard failure. */
  tagsError?: Error;
};

type RegisterNotification = {
  success: (title: string, message?: ReactNode) => void;
  warning: (title: string, message?: ReactNode) => void;
};

/** Success + soft-failure toasts after a register call that created a version. */
export const notifyRegisterMcpServerResult = (
  notification: RegisterNotification,
  registryName: string,
  { version, metadataError, tagsError }: RegisterMcpServerResult,
): void => {
  notification.success(REGISTER_NOTIFICATION.success(registryName, version.version));
  if (metadataError) {
    notification.warning(REGISTER_NOTIFICATION.METADATA_NOT_SAVED, metadataError.message);
  }
  if (tagsError) {
    notification.warning(REGISTER_NOTIFICATION.TAGS_NOT_SAVED, tagsError.message);
  }
};

/* eslint-disable camelcase -- MLflow/BFF wire keys: server_json, display_name;
   metadata_error / failed_tag_keys are BFF-only response fields (snake today). */
export const registerMcpServer = async (
  input: RegisterMcpServerInput,
  context: RegisterMcpServerContext,
): Promise<RegisterMcpServerResult> => {
  const { tools, registryName, serverJson, displayName, status, source, icons, tags = [] } = input;
  const { queryParams, opts } = context;

  const iconsPayload = icons.filter((icon) => sanitizeHref(icon.src)).map(toPayloadIcon);
  const trimmedDisplayName = displayName?.trim();
  const tagsPayload = toSetTagRequests(tags);

  const result = await registerMcpRegistryServer(queryParams)(opts, {
    name: registryName,
    server_json: serverJson,
    status,
    ...(source && { source }),
    tools,
    ...(trimmedDisplayName && { display_name: trimmedDisplayName }),
    ...(iconsPayload.length > 0 && { icons: iconsPayload }),
    ...(tagsPayload.length > 0 && { tags: tagsPayload }),
  });
  const metadataError = result.metadata_error ? new Error(result.metadata_error) : undefined;
  let tagsError: Error | undefined;
  if (result.failed_tag_keys?.length) {
    tagsError = new Error(
      `Failed to set tag${result.failed_tag_keys.length > 1 ? 's' : ''}: ${result.failed_tag_keys.join(', ')}`,
    );
  }

  return { version: result.version, metadataError, tagsError };
};
/* eslint-enable camelcase */
