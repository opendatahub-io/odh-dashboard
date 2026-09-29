import { isIP } from 'net';
import { HttpsProxyAgent } from 'https-proxy-agent';

type ProxyEnvironment = Partial<
  Record<'HTTPS_PROXY' | 'https_proxy' | 'NO_PROXY' | 'no_proxy', string>
>;

const proxyAgents = new Map<string, HttpsProxyAgent<string>>();

const escapeRegExp = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const normalizeHostname = (hostname: string): string =>
  hostname
    .replace(/^\[|\]$/g, '')
    .replace(/\.$/, '')
    .toLowerCase();

const parsePort = (
  entry: string,
): {
  host: string;
  port?: string;
} => {
  if (entry.startsWith('[')) {
    const closingBracket = entry.indexOf(']');
    if (closingBracket === -1) {
      return { host: '' };
    }
    const remainder = entry.slice(closingBracket + 1);
    if (remainder && !/^:\d+$/.test(remainder)) {
      return { host: '' };
    }
    return {
      host: entry.slice(1, closingBracket),
      port: remainder ? remainder.slice(1) : undefined,
    };
  }

  const portSeparator = entry.lastIndexOf(':');
  if (portSeparator !== -1 && entry.indexOf(':') === portSeparator) {
    const possiblePort = entry.slice(portSeparator + 1);
    if (/^\d+$/.test(possiblePort)) {
      return { host: entry.slice(0, portSeparator), port: possiblePort };
    }
  }

  return { host: entry };
};

const parseIpv4 = (address: string): number | undefined => {
  const octets = address.split('.');
  if (octets.length !== 4) {
    return undefined;
  }

  let result = 0;
  for (const octet of octets) {
    if (!/^\d+$/.test(octet)) {
      return undefined;
    }
    const value = Number(octet);
    if (value > 255) {
      return undefined;
    }
    result = (result << 8) | value;
  }
  return result >>> 0;
};

const matchesIpv4Cidr = (hostname: string, cidr: string): boolean => {
  if (isIP(hostname) !== 4) {
    return false;
  }

  const cidrParts = cidr.split('/');
  if (cidrParts.length !== 2) {
    return false;
  }
  const [networkAddress, prefixText] = cidrParts;
  if (!/^\d+$/.test(prefixText)) {
    return false;
  }

  const address = parseIpv4(hostname);
  const network = parseIpv4(networkAddress);
  const prefix = Number(prefixText);
  if (address === undefined || network === undefined || prefix < 0 || prefix > 32) {
    return false;
  }

  const mask = prefix === 0 ? 0 : (0xffffffff << (32 - prefix)) >>> 0;
  return (address & mask) === (network & mask);
};

const getEffectivePort = (target: URL): string => {
  if (target.port) {
    return target.port;
  }
  return target.protocol === 'https:' ? '443' : '80';
};

export const shouldBypassProxy = (target: URL, noProxy: string): boolean => {
  const hostname = normalizeHostname(target.hostname);
  const targetPort = getEffectivePort(target);

  return noProxy.split(',').some((rawEntry) => {
    const entry = rawEntry.trim().toLowerCase();
    if (!entry) {
      return false;
    }
    if (entry === '*') {
      return true;
    }

    const { host: rawHost, port } = parsePort(entry);
    if (port && port !== targetPort) {
      return false;
    }

    const host = normalizeHostname(rawHost);
    if (host.includes('/')) {
      return matchesIpv4Cidr(hostname, host);
    }

    if (host.startsWith('*.') || host.startsWith('.')) {
      const suffix = host.replace(/^\*?\./, '');
      return hostname === suffix || hostname.endsWith(`.${suffix}`);
    }

    return hostname === host;
  });
};

export const redactProxyDetails = (
  message: string,
  environment: ProxyEnvironment = process.env,
): string => {
  const proxyUrls = [environment.HTTPS_PROXY, environment.https_proxy].filter(
    (proxyUrl): proxyUrl is string => Boolean(proxyUrl),
  );
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
      // The raw value is still redacted if HTTPS_PROXY is malformed.
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

export const getHttpsProxyAgent = (
  target: string,
  environment: ProxyEnvironment = process.env,
): HttpsProxyAgent<string> | undefined => {
  const targetUrl = new URL(target);
  if (targetUrl.protocol !== 'https:') {
    return undefined;
  }

  const proxyUrl = environment.HTTPS_PROXY || environment.https_proxy;
  if (!proxyUrl) {
    return undefined;
  }

  const noProxy = environment.NO_PROXY || environment.no_proxy || '';
  if (shouldBypassProxy(targetUrl, noProxy)) {
    return undefined;
  }

  let parsedProxyUrl: URL;
  try {
    parsedProxyUrl = new URL(proxyUrl);
  } catch {
    throw new Error('Invalid HTTPS_PROXY configuration');
  }
  if (!['http:', 'https:'].includes(parsedProxyUrl.protocol)) {
    throw new Error('Invalid HTTPS_PROXY configuration');
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
    throw new Error('Invalid HTTPS_PROXY configuration');
  }
};
