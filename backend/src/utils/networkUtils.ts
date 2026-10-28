import { X509Certificate } from 'crypto';
import https from 'https';
import net from 'net';
import tls, { PeerCertificate } from 'tls';
import type { KubeConfig } from '@kubernetes/client-node';

/**
 * Wrap a raw IPv6 literal in square brackets so it can be safely concatenated into a
 * `host:port` URL (e.g. `fc00:30::1` -> `[fc00:30::1]`). Without the brackets, the first colon of
 * the address is parsed as the host/port separator and the host is truncated to the first hextet
 * (`fc00`), which is the root cause of the "truncated host" IPv6 failures.
 *
 * Hostnames, IPv4 literals, and already-bracketed / host:port values are returned unchanged
 * (`net.isIPv6` only matches a bare IPv6 literal), so this is safe to call on any host value.
 */
export const bracketHostIfIPv6 = (host: string): string => (net.isIPv6(host) ? `[${host}]` : host);

/**
 * Return true when the host portion of `url` is an IPv6 literal. `URL.hostname` keeps the surrounding
 * brackets for an IPv6 host (e.g. `[fc00:30::1]`), which are stripped before the `net.isIPv6` check.
 * Invalid URLs return false. Used to scope IPv6-specific TLS handling to only IPv6 destinations.
 */
export const isIPv6Url = (url: string): boolean => {
  try {
    return net.isIPv6(new URL(url).hostname.replace(/^\[|\]$/g, ''));
  } catch {
    return false;
  }
};

/**
 * TLS certificate identity check that is tolerant of IPv6 canonicalization differences.
 *
 * Node's default `checkServerIdentity` can reject a connection to an IPv6 literal even when the
 * server certificate's `iPAddress` SAN list contains a matching address, because the connected host
 * (compressed, e.g. `fc00:30::1`) and the SAN entry (often fully expanded, e.g.
 * `FC00:30:0:0:0:0:0:1`) are not byte-for-byte identical.
 *
 * This wrapper first defers to the default check. Only if that fails AND the connected host is an
 * IPv6 literal does it re-validate using the parsed certificate's structured `checkIP`, which
 * compares the host against the real `iPAddress` SAN entries with proper IPv6 canonicalization
 * (verified: `checkIP('fc00:30::1')` matches an `IP Address:FC00:30:0:0:0:0:0:1` SAN). This is
 * fail-closed: it never parses the SAN string by hand, only ever accepts a genuine IP-address SAN
 * match (never a DNS SAN for an IP host), and returns the original error on any mismatch or if the
 * raw certificate is unavailable. For all non-IPv6 hosts the default result is returned unchanged,
 * so standard hostname / IPv4 validation is completely unaffected.
 */
export const ipv6AwareCheckServerIdentity = (
  hostname: string,
  cert: PeerCertificate,
): Error | undefined => {
  const defaultError = tls.checkServerIdentity(hostname, cert);
  if (!defaultError) {
    return undefined;
  }

  // Only IPv6 hosts are eligible for the structured re-check; everything else keeps Node's result.
  if (!net.isIPv6(hostname) || !cert.raw) {
    return defaultError;
  }

  try {
    // `checkIP` only considers `iPAddress` SAN entries and canonicalizes both sides, so a compressed
    // host matches an expanded SAN without any hand-rolled string parsing or DNS-SAN fallback.
    if (new X509Certificate(cert.raw).checkIP(hostname)) {
      return undefined;
    }
  } catch {
    // Fall through to the default error if the raw certificate cannot be parsed.
  }

  return defaultError;
};

/**
 * Make a `@kubernetes/client-node` KubeConfig apply the IPv6-aware TLS identity check to the typed
 * API clients created from it (`makeApiClient(...)`), which otherwise bypass the fix wired into
 * `proxyCall`.
 *
 * Those clients make requests through the `request` library, which on affected Node releases (see
 * nodejs/node#64144 — 22.23.1/.2 mis-normalize IPv6 literals) fail IPv6 API-server calls with
 * `ERR_TLS_CERT_ALTNAME_INVALID`. `request` drops a bare `checkServerIdentity` option and pools
 * agents by a key that ignores it, so the only reliable injection point is a pre-built `agent`. We
 * wrap `applyToRequest` to attach an `https.Agent` carrying the KubeConfig's own TLS material plus
 * `ipv6AwareCheckServerIdentity`. The agent is built once (TLS material is stable for a KubeConfig)
 * and reused for connection pooling.
 *
 * No-op when the current cluster is not HTTPS: attaching an `https.Agent` to an `http://` API server
 * (e.g. `loadFromDefault()`'s `http://localhost:8080` fallback) would make Node reject requests with
 * `ERR_INVALID_PROTOCOL`, and the IPv6 TLS identity check is irrelevant without TLS.
 */
export const applyIpv6AwareIdentityCheck = (kubeConfig: KubeConfig): void => {
  if (!kubeConfig.getCurrentCluster()?.server?.startsWith('https:')) {
    return;
  }
  const applyToRequest = kubeConfig.applyToRequest.bind(kubeConfig);
  let agent: https.Agent | undefined;
  kubeConfig.applyToRequest = async (opts) => {
    await applyToRequest(opts);
    if (!agent) {
      agent = new https.Agent({
        ca: opts.ca,
        cert: opts.cert,
        key: opts.key,
        ...(typeof opts.rejectUnauthorized === 'boolean'
          ? { rejectUnauthorized: opts.rejectUnauthorized }
          : {}),
        checkServerIdentity: ipv6AwareCheckServerIdentity,
      });
    }
    opts.agent = agent;
  };
};
