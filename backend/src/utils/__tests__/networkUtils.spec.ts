import tls, { PeerCertificate } from 'tls';
import { bracketHostIfIPv6, normalizeIPv6, ipv6AwareCheckServerIdentity } from '../networkUtils';

describe('bracketHostIfIPv6', () => {
  it('should wrap a raw IPv6 literal in brackets', () => {
    expect(bracketHostIfIPv6('fc00:30::1')).toBe('[fc00:30::1]');
  });

  it('should wrap a fully-expanded IPv6 literal in brackets', () => {
    expect(bracketHostIfIPv6('fc00:30:0:0:0:0:0:1')).toBe('[fc00:30:0:0:0:0:0:1]');
  });

  it('should leave an IPv4 literal unchanged', () => {
    expect(bracketHostIfIPv6('10.0.0.1')).toBe('10.0.0.1');
  });

  it('should leave a hostname unchanged', () => {
    expect(bracketHostIfIPv6('feast.my-ns.svc.cluster.local')).toBe(
      'feast.my-ns.svc.cluster.local',
    );
  });

  it('should not double-bracket an already-bracketed IPv6 literal', () => {
    expect(bracketHostIfIPv6('[fc00:30::1]')).toBe('[fc00:30::1]');
  });

  it('should leave a host:port string unchanged', () => {
    // A host:port string is not a valid bare IPv6 literal, so it is returned untouched.
    expect(bracketHostIfIPv6('feast.my-ns.svc.cluster.local:8443')).toBe(
      'feast.my-ns.svc.cluster.local:8443',
    );
  });
});

describe('normalizeIPv6', () => {
  it('should expand a compressed address to eight padded hextets', () => {
    expect(normalizeIPv6('fc00:30::1')).toBe('fc00:0030:0000:0000:0000:0000:0000:0001');
  });

  it('should lowercase and pad a fully-expanded address', () => {
    expect(normalizeIPv6('FC00:30:0:0:0:0:0:1')).toBe('fc00:0030:0000:0000:0000:0000:0000:0001');
  });

  it('should treat compressed and expanded forms of the same address as equal', () => {
    expect(normalizeIPv6('fc00:30::1')).toBe(normalizeIPv6('FC00:30:0:0:0:0:0:1'));
  });

  it('should normalize the loopback address', () => {
    expect(normalizeIPv6('::1')).toBe('0000:0000:0000:0000:0000:0000:0000:0001');
  });

  it('should normalize the unspecified address', () => {
    expect(normalizeIPv6('::')).toBe('0000:0000:0000:0000:0000:0000:0000:0000');
  });

  it('should convert an embedded IPv4 suffix to hextets', () => {
    expect(normalizeIPv6('::ffff:192.168.0.1')).toBe('0000:0000:0000:0000:0000:ffff:c0a8:0001');
  });

  it('should return null for an IPv4 address', () => {
    expect(normalizeIPv6('10.0.0.1')).toBeNull();
  });

  it('should return null for a hostname', () => {
    expect(normalizeIPv6('example.com')).toBeNull();
  });

  it('should return null for an empty string', () => {
    expect(normalizeIPv6('')).toBeNull();
  });
});

describe('ipv6AwareCheckServerIdentity', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  const certWithSan = (subjectaltname: string): PeerCertificate =>
    ({ subjectaltname } as PeerCertificate);

  it('should return undefined when the default check passes', () => {
    const spy = jest.spyOn(tls, 'checkServerIdentity').mockReturnValue(undefined);
    expect(
      ipv6AwareCheckServerIdentity('fc00:30::1', certWithSan('IP Address:FC00:30:0:0:0:0:0:1')),
    ).toBeUndefined();
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('should accept an IPv6 host that matches an expanded IP Address SAN', () => {
    jest
      .spyOn(tls, 'checkServerIdentity')
      .mockReturnValue(new Error('IP: fc00:30::1 is not in the cert'));
    expect(
      ipv6AwareCheckServerIdentity('fc00:30::1', certWithSan('IP Address:FC00:30:0:0:0:0:0:1')),
    ).toBeUndefined();
  });

  it('should accept an IPv6 host that matches an IPv6 literal DNS SAN', () => {
    jest.spyOn(tls, 'checkServerIdentity').mockReturnValue(new Error('no match'));
    expect(
      ipv6AwareCheckServerIdentity('fc00:30::1', certWithSan('DNS:fc00:30::1')),
    ).toBeUndefined();
  });

  it('should match against the correct SAN entry among several', () => {
    jest.spyOn(tls, 'checkServerIdentity').mockReturnValue(new Error('no match'));
    expect(
      ipv6AwareCheckServerIdentity(
        'fc00:30::1',
        certWithSan('DNS:example.com, IP Address:10.0.0.1, IP Address:FC00:30:0:0:0:0:0:1'),
      ),
    ).toBeUndefined();
  });

  it('should return the default error when no SAN matches', () => {
    const error = new Error('no match');
    jest.spyOn(tls, 'checkServerIdentity').mockReturnValue(error);
    expect(
      ipv6AwareCheckServerIdentity('fc00:30::1', certWithSan('IP Address:FC00:40:0:0:0:0:0:1')),
    ).toBe(error);
  });

  it('should return the default error for a non-IPv6 host', () => {
    const error = new Error('hostname mismatch');
    jest.spyOn(tls, 'checkServerIdentity').mockReturnValue(error);
    expect(ipv6AwareCheckServerIdentity('example.com', certWithSan('DNS:other.com'))).toBe(error);
  });

  it('should return the default error when the cert has no SANs', () => {
    const error = new Error('no san');
    jest.spyOn(tls, 'checkServerIdentity').mockReturnValue(error);
    expect(ipv6AwareCheckServerIdentity('fc00:30::1', {} as PeerCertificate)).toBe(error);
  });
});
