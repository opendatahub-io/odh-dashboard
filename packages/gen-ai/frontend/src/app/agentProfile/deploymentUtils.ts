import { AgentDeploymentSummary } from './types';

export const sortDeploymentsByMostRecent = (
  deployments: AgentDeploymentSummary[],
): AgentDeploymentSummary[] =>
  deployments.toSorted((first, second) => {
    const firstCreatedAt = Date.parse(first.createdAt);
    const secondCreatedAt = Date.parse(second.createdAt);

    if (Number.isNaN(firstCreatedAt)) {
      return Number.isNaN(secondCreatedAt) ? 0 : 1;
    }
    if (Number.isNaN(secondCreatedAt)) {
      return -1;
    }
    return secondCreatedAt - firstCreatedAt;
  });

export const buildResponseAPICurl = (routeUrl?: string): string => {
  if (!routeUrl) {
    return '';
  }

  try {
    const responseURL = new URL(routeUrl);
    if (responseURL.protocol !== 'http:' && responseURL.protocol !== 'https:') {
      return '';
    }

    responseURL.search = '';
    responseURL.hash = '';
    responseURL.pathname = `${responseURL.pathname.replace(/\/$/, '')}/v1/responses`;
    const shellSafeURL = responseURL.toString().replaceAll("'", "'\"'\"'");

    return [
      `curl -s -X POST '${shellSafeURL}' \\`,
      '  -H "Content-Type: application/json" \\',
      '  -H "Authorization: Bearer $TOKEN" \\',
      "  -d '{",
      '    "input": "Hello, what can you help me with?"',
      "  }'",
    ].join('\n');
  } catch {
    return '';
  }
};

export const responseAPIURL = (routeUrl?: string): string => {
  if (!routeUrl) {
    return '';
  }

  try {
    const url = new URL(routeUrl);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
      return '';
    }
    url.search = '';
    url.hash = '';
    url.pathname = `${url.pathname.replace(/\/$/, '')}/v1/responses`;
    return url.toString();
  } catch {
    return '';
  }
};
