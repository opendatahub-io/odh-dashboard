import type { MCPIcon } from '~/odh/types/mcpRegistryTypes';

export const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

export const resolveIcon = (
  icons: MCPIcon[] | undefined,
  isDarkMode?: boolean,
): MCPIcon | undefined => {
  if (!icons?.length) {
    return undefined;
  }
  const preferred = isDarkMode ? 'dark' : 'light';
  return icons.find((icon) => icon.theme === preferred) ?? icons.find((icon) => !icon.theme);
};

export const sanitizeHref = (url: string | undefined): string | undefined => {
  if (!url) {
    return undefined;
  }
  try {
    const parsed = new URL(url);
    if (parsed.protocol === 'https:') {
      return url;
    }
  } catch {
    // malformed URL
  }
  return undefined;
};

const isTheme = (value: unknown): value is 'light' | 'dark' =>
  value === 'light' || value === 'dark';

const MCP_SERVER_NAMESPACE_REGEX = /^[a-zA-Z0-9][a-zA-Z0-9.-]*[a-zA-Z0-9]$/;
const MCP_SERVER_SLUG_REGEX = /^[a-zA-Z0-9][a-zA-Z0-9._-]*[a-zA-Z0-9]$/;
const MCP_SERVER_RESERVED_SLUGS = new Set(['aliases', 'endpoints', 'tags', 'versions']);

export const isValidMcpServerName = (name: string): boolean => {
  const segments = name.split('/');
  if (segments.length !== 2) {
    return false;
  }
  const [namespace, slug] = segments;
  return (
    MCP_SERVER_NAMESPACE_REGEX.test(namespace) &&
    MCP_SERVER_SLUG_REGEX.test(slug) &&
    !MCP_SERVER_RESERVED_SLUGS.has(slug)
  );
};

export const parseServerJsonIcons = (
  serverJson: Record<string, unknown> | undefined,
): MCPIcon[] => {
  const raw = serverJson?.icons;
  if (!Array.isArray(raw)) {
    return [];
  }
  return raw.flatMap((entry) => {
    if (typeof entry !== 'object' || entry === null) {
      return [];
    }
    const src = 'src' in entry ? entry.src : undefined;
    if (typeof src !== 'string' || !src.trim()) {
      return [];
    }
    const theme = 'theme' in entry ? entry.theme : undefined;
    return [{ src: src.trim(), ...(isTheme(theme) ? { theme } : {}) }];
  });
};

export type ActionButtonState = { enabled: boolean; loading: boolean; tooltip?: string };

export const resolveActionButtonState = (
  checks: { when: boolean; loading: boolean; tooltip?: string }[],
): ActionButtonState => {
  const blocking = checks.find((check) => check.when);
  return blocking
    ? { enabled: false, loading: blocking.loading, tooltip: blocking.tooltip }
    : { enabled: true, loading: false };
};
