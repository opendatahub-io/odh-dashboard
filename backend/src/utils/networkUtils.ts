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

const HEX_DIGITS = '0123456789abcdef';

/** Convert a 16-bit value to a 4-digit lowercase hex string without relying on `Number.toString`. */
const toHextet = (value: number): string =>
  HEX_DIGITS[(value >> 12) & 0xf] +
  HEX_DIGITS[(value >> 8) & 0xf] +
  HEX_DIGITS[(value >> 4) & 0xf] +
  HEX_DIGITS[value & 0xf];

/**
 * Expand an IPv6 address to its fully-canonical form: eight lowercase, zero-padded 4-digit hextets
 * (e.g. `fc00:30::1` -> `fc00:0030:0000:0000:0000:0000:0000:0001`). Embedded IPv4 suffixes
 * (`::ffff:1.2.3.4`) are converted to their hextet equivalents. Returns `null` for anything that is
 * not a valid IPv6 literal.
 *
 * This lets us compare two IPv6 addresses for equality regardless of how they are written
 * (compressed vs. expanded, upper vs. lower case).
 */
export const normalizeIPv6 = (address: string): string | null => {
  if (!net.isIPv6(address)) {
    return null;
  }

  let addr = address.toLowerCase();

  // Convert an embedded IPv4 suffix (e.g. `::ffff:192.168.0.1`) into two hex hextets.
  const v4Match = addr.match(/^(.*:)((?:\d{1,3}\.){3}\d{1,3})$/);
  if (v4Match) {
    const octets = v4Match[2].split('.').map(Number);
    if (octets.some((o) => o > 255)) {
      return null;
    }
    const hextet1 = toHextet((octets[0] << 8) | octets[1]);
    const hextet2 = toHextet((octets[2] << 8) | octets[3]);
    addr = `${v4Match[1]}${hextet1}:${hextet2}`;
  }

  // Expand the `::` shorthand to the full set of eight hextets.
  let hextets: string[];
  const halves = addr.split('::');
  if (halves.length === 2) {
    const left = halves[0] ? halves[0].split(':') : [];
    const right = halves[1] ? halves[1].split(':') : [];
    const missing = 8 - left.length - right.length;
    if (missing < 0) {
      return null;
    }
    hextets = [...left, ...Array(missing).fill('0'), ...right];
  } else {
    hextets = addr.split(':');
  }

  if (hextets.length !== 8) {
    return null;
  }

  return hextets.map((hextet) => hextet.padStart(4, '0')).join(':');
};

/**
 * TLS certificate identity check that is tolerant of IPv6 canonicalization differences.
 *
 * Node's default `checkServerIdentity` can reject a connection to an IPv6 literal even when the
 * server certificate's SAN list contains a matching address, because the connected host (compressed,
 * e.g. `fc00:30::1`) and the SAN entry (often fully expanded, e.g. `FC00:30:0:0:0:0:0:1`, and
 * sometimes listed as a `DNS:` entry rather than `IP Address:`) are not byte-for-byte identical.
 *
 * This wrapper first defers to the default check. Only if that fails AND the connected host is an
 * IPv6 literal does it fall back to comparing the normalized host against every normalized IPv6 SAN
 * entry (both `IP Address:` and `DNS:` forms). For all non-IPv6 hosts the default result is returned
 * unchanged, so standard hostname/IPv4 validation is unaffected.
 */
export const ipv6AwareCheckServerIdentity = (
  hostname: string,
  cert: PeerCertificate,
): Error | undefined => {
  const defaultError = tls.checkServerIdentity(hostname, cert);
  if (!defaultError) {
    return undefined;
  }

  const normalizedHost = normalizeIPv6(hostname);
  if (!normalizedHost || !cert.subjectaltname) {
    return defaultError;
  }

  // SAN entries look like: "DNS:example.com, IP Address:FC00:30:0:0:0:0:0:1".
  const sanEntries = cert.subjectaltname.split(',').map((entry) => entry.trim());
  for (const entry of sanEntries) {
    let value: string | undefined;
    if (entry.startsWith('IP Address:')) {
      value = entry.slice('IP Address:'.length);
    } else if (entry.startsWith('DNS:')) {
      value = entry.slice('DNS:'.length);
    }
    if (value && normalizeIPv6(value) === normalizedHost) {
      return undefined;
    }
  }

  return defaultError;
};
