import { X509Certificate } from 'crypto';
import net from 'net';
import tls, { PeerCertificate } from 'tls';

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
