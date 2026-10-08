import { HttpsProxyAgent } from 'https-proxy-agent';
import { getProxyForUrl } from 'proxy-from-env';

const proxyAgents = new Map<string, HttpsProxyAgent<string>>();

const escapeRegExp = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export const redactProxyDetails = (message: string): string => {
  const proxyUrls = [
    process.env.HTTPS_PROXY,
    process.env.https_proxy,
    process.env.HTTP_PROXY,
    process.env.http_proxy,
    process.env.ALL_PROXY,
    process.env.all_proxy,
  ].filter((proxyUrl): proxyUrl is string => Boolean(proxyUrl));
  const sensitiveValues = new Set<string>();

  for (const proxyUrl of proxyUrls) {
    sensitiveValues.add(proxyUrl);
    try {
      const parsedProxyUrl = new URL(proxyUrl);
      sensitiveValues.add(parsedProxyUrl.href);
      sensitiveValues.add(parsedProxyUrl.origin);
      sensitiveValues.add(parsedProxyUrl.host);
      sensitiveValues.add(parsedProxyUrl.hostname);
    } catch {
      // The raw value is still redacted if a proxy environment variable is malformed.
    }
  }

  let redactedMessage = message;
  for (const sensitiveValue of [...sensitiveValues].toSorted((a, b) => b.length - a.length)) {
    redactedMessage = redactedMessage.replace(
      new RegExp(escapeRegExp(sensitiveValue), 'gi'),
      '[redacted proxy]',
    );
  }
  return redactedMessage.replace(/(https?:\/\/)[^\s/@]+@/gi, '$1***@');
};

export const getHttpsProxyAgent = (target: string): HttpsProxyAgent<string> | undefined => {
  const targetUrl = new URL(target);
  if (targetUrl.protocol !== 'https:') {
    return undefined;
  }

  const proxyUrl = getProxyForUrl(targetUrl);
  if (!proxyUrl) {
    return undefined;
  }

  let parsedProxyUrl: URL;
  try {
    parsedProxyUrl = new URL(proxyUrl);
  } catch {
    throw new Error('Invalid proxy configuration');
  }
  if (!['http:', 'https:'].includes(parsedProxyUrl.protocol)) {
    throw new Error('Invalid proxy configuration');
  }

  const cachedAgent = proxyAgents.get(proxyUrl);
  if (cachedAgent) {
    return cachedAgent;
  }

  try {
    const agent = new HttpsProxyAgent(proxyUrl);
    proxyAgents.set(proxyUrl, agent);
    return agent;
  } catch {
    throw new Error('Invalid proxy configuration');
  }
};
