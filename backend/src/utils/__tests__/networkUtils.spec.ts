import { X509Certificate } from 'crypto';
import tls, { PeerCertificate } from 'tls';
import { bracketHostIfIPv6, ipv6AwareCheckServerIdentity, isIPv6Url } from '../networkUtils';

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

describe('isIPv6Url', () => {
  it('should return true for a bracketed IPv6 URL', () => {
    expect(isIPv6Url('https://[fc00:30::1]/api/config')).toBe(true);
  });

  it('should return true for a bracketed IPv6 URL with a port', () => {
    expect(isIPv6Url('https://[fc00:30::1]:6443/apis')).toBe(true);
  });

  it('should return false for a DNS host', () => {
    expect(isIPv6Url('https://kubernetes.default.svc/api')).toBe(false);
  });

  it('should return false for an IPv4 host', () => {
    expect(isIPv6Url('https://10.0.0.1:443/api')).toBe(false);
  });

  it('should return false for an invalid URL', () => {
    expect(isIPv6Url('not a url')).toBe(false);
  });
});

describe('ipv6AwareCheckServerIdentity', () => {
  // Self-signed cert whose only SAN is `IP Address:FC00:30:0:0:0:0:0:1` (expanded form).
  // Generated with:
  //   openssl req -x509 -newkey rsa:2048 -nodes -days 36500 -subj "/CN=ipv6-test" \
  //     -addext "subjectAltName=IP:fc00:30:0:0:0:0:0:1"
  const CERT_WITH_IPV6_SAN = Buffer.from(
    `-----BEGIN CERTIFICATE-----
MIIDBzCCAe+gAwIBAgIUWjwNzebRfbkfLbp5Fhjqd41T/8UwDQYJKoZIhvcNAQEL
BQAwFDESMBAGA1UEAwwJaXB2Ni10ZXN0MCAXDTI2MTAyNzA4NTUxNVoYDzIxMjYx
MDAzMDg1NTE1WjAUMRIwEAYDVQQDDAlpcHY2LXRlc3QwggEiMA0GCSqGSIb3DQEB
AQUAA4IBDwAwggEKAoIBAQCksAXEIzkoYfCEIkG0E9J3FTKLjjJNv1WrP2Sh5EFA
/ciaNSoVUOSUkUrOhMBuVp7RUC99MwT4H4SLncqPt2AnCzftDKlpkobU4sa3WCIc
4q4thezgB/GaBMy7POrETO/BaEc82qPdlICi3/wjKvKjppo08kvC9U8atebWuXc9
Na1Gy60jPWKShzSBeWV/51a85JjwPm4cRnRkybMnvmJ7ngSJBwOUpg+QBtuLH2mV
QCAVa9eJ9cOPhfgbuo9nh8k1kTZfjfXpJmzbdEoTDEsks8ohesOj5kYrkeieBRim
ET/BcpTAyEzxhbu6kdlt9S6M0w7JLOYSjeQvHExEefaFAgMBAAGjTzBNMB0GA1Ud
DgQWBBRWBqqdpd8NqBsTkJ6LK9WH3lPOoTAPBgNVHRMBAf8EBTADAQH/MBsGA1Ud
EQQUMBKHEPwAADAAAAAAAAAAAAAAAAEwDQYJKoZIhvcNAQELBQADggEBAD3VIu7/
p7bAUkTbwzl7PLljXs4645108ZxJRmj32AfWbGMYa1MNyRFh+0JYVbflk+El4ev6
h1TajnXuRXBn2UJEGv4Ub5P+tmO4VhW53t0vESBF6Dk0NxlbVoRkFvMufrkUNJ0g
lUhH/Kjdjxw/nN5nTaMCwA2h9ZnTRE60q0mP86CNbZuR1LkPqOz8nAc+bF7xuP3Y
cC7HITaVN9p2imYJplcgNXPPzRJxiB/vCVQ3EOH+TJjD1poib+bVYF9zBhJbtU6T
+U4bGg0TVkPzHmVtueS0ZOdqX5nhtsXspaTw9B6Q9+SzK7yr1KhoF6dg5g38bBZT
GUmYbRybS9WwUxM=
-----END CERTIFICATE-----`,
  );

  // Self-signed cert whose only SAN is `DNS:fc00:30::1` (the IPv6 literal appears as a DNS name, NOT
  // an IP Address SAN) — the shape that must be rejected for an IP host (a DNS SAN must never
  // authorize an IP identity). Generated with `-addext "subjectAltName=DNS:fc00:30::1"`.
  const CERT_WITH_IPV6_DNS_SAN_ONLY = Buffer.from(
    `-----BEGIN CERTIFICATE-----
MIIDCTCCAfGgAwIBAgIUG8AKIgfcSfpv91JbYzB762y5ICAwDQYJKoZIhvcNAQEL
BQAwGDEWMBQGA1UEAwwNaXB2Ni1kbnMtdGVzdDAgFw0yNjEwMjgxMTExNDJaGA8y
MTI2MTAwNDExMTE0MlowGDEWMBQGA1UEAwwNaXB2Ni1kbnMtdGVzdDCCASIwDQYJ
KoZIhvcNAQEBBQADggEPADCCAQoCggEBALFdBy7myB3tIFbZBxBwe6sMYkWHvnJG
VxkhB5advVuy9DEdNf9VBfkPwRf3YMk8qyC+dlED76EdEdPFYolxfjMKIKLCX4s1
8uGhhZNNgMfW/DzzTfm2UpXIID+JTb5gU6vl08o3OhTAIPTbhGgM24477R1lUgD1
1cNHJLybwMvAMtvGPDpUvW4eqOl4A4wK5hOqmH9mY2ntF2rr5p7RJ3b5iGOBhwRC
iax+CuCZn761DS8kPqB48uBjbdZNd2FOnb14/w6PJqGUE+30gEuytacu4TwLNpQL
lKCwLdrGWnOKHOvB7rTz0aq1ZIpJxd/f/SKCOhvrfdFVmctTlj2iDk8CAwEAAaNJ
MEcwHQYDVR0OBBYEFFm/b8+dwJtWejUZnK+iUw6KuwPOMA8GA1UdEwEB/wQFMAMB
Af8wFQYDVR0RBA4wDIIKZmMwMDozMDo6MTANBgkqhkiG9w0BAQsFAAOCAQEASxKf
9pHJT3qxoawg5/POxnHD+B9KOPbs7CUEfE3DTm1zIzx19nDUeBn581Eu+KXzMxqY
0AJy0SDp78Aeh9U9A7RexTSNtonuveUBE29SMZBEutnq8EJpPz/a+pVeIDF921w7
kD004uD6JiwdqVmFzABn7wOqu5hlgxfXlirzRzGjLMzKAGdd7lRxUaxzzgs7ldLf
+LXKssro08w0M7DF2Viq4Q6rstI2yFz2oUTBg9pYvlvBPEamHiLgm/YxSvK4aJ0N
FBGQ5ML+k9MgI2zBO32YBmZZX8G/rqHLlsYXGkfRC3AfLsyIpuFdjYXvox8tOH7G
0MbhSftoLA+++gIKsA==
-----END CERTIFICATE-----`,
  );

  // Build a PeerCertificate-shaped object from a real cert so that BOTH the default
  // `tls.checkServerIdentity` (reads `.subjectaltname`) and the structured fallback (reads `.raw`)
  // operate on genuine certificate data.
  const realCert = (pem: Buffer): PeerCertificate => {
    const x509 = new X509Certificate(pem);
    return { subjectaltname: x509.subjectAltName, raw: x509.raw } as unknown as PeerCertificate;
  };

  const certMock = (raw?: Buffer): PeerCertificate => ({ raw } as unknown as PeerCertificate);

  afterEach(() => {
    jest.restoreAllMocks();
  });

  // These exercise the REAL Node identity checker (no `tls` mock) against real certificates, which is
  // the representative, end-to-end behavior. Note: on current Node the default `checkServerIdentity`
  // already canonicalizes `iPAddress` SANs, so the expanded-SAN cert is accepted without the fallback
  // being reached; the fallback is defensive hardening for runtimes/encodings where it is not.
  describe('with the real Node identity checker', () => {
    it('should accept an IPv6 host against a cert carrying it as an IP Address SAN', () => {
      expect(
        ipv6AwareCheckServerIdentity('fc00:30::1', realCert(CERT_WITH_IPV6_SAN)),
      ).toBeUndefined();
    });

    it('should reject an IPv6 host whose address is only a DNS SAN (no IP Address SAN)', () => {
      // Security: a DNS SAN must never authorize an IP identity.
      const result = ipv6AwareCheckServerIdentity(
        'fc00:30::1',
        realCert(CERT_WITH_IPV6_DNS_SAN_ONLY),
      );
      expect(result).toBeDefined();
      expect(result?.message).toEqual(expect.any(String));
    });

    it('should reject an IPv6 host that matches no SAN on the cert', () => {
      const result = ipv6AwareCheckServerIdentity('fc00:40::1', realCert(CERT_WITH_IPV6_SAN));
      expect(result).toBeDefined();
      expect(result?.message).toEqual(expect.any(String));
    });
  });

  it('should return undefined when the default check passes', () => {
    const spy = jest.spyOn(tls, 'checkServerIdentity').mockReturnValue(undefined);
    expect(
      ipv6AwareCheckServerIdentity('fc00:30::1', certMock(CERT_WITH_IPV6_SAN)),
    ).toBeUndefined();
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('should accept a compressed IPv6 host that matches an expanded IP Address SAN', () => {
    jest
      .spyOn(tls, 'checkServerIdentity')
      .mockReturnValue(new Error('IP: fc00:30::1 is not in the cert'));
    expect(
      ipv6AwareCheckServerIdentity('fc00:30::1', certMock(CERT_WITH_IPV6_SAN)),
    ).toBeUndefined();
  });

  it('should accept the fully-expanded form of the same host', () => {
    jest.spyOn(tls, 'checkServerIdentity').mockReturnValue(new Error('mismatch'));
    expect(
      ipv6AwareCheckServerIdentity('fc00:30:0:0:0:0:0:1', certMock(CERT_WITH_IPV6_SAN)),
    ).toBeUndefined();
  });

  it('should return the default error when the IPv6 host does not match any IP SAN', () => {
    const error = new Error('mismatch');
    jest.spyOn(tls, 'checkServerIdentity').mockReturnValue(error);
    expect(ipv6AwareCheckServerIdentity('fc00:40::1', certMock(CERT_WITH_IPV6_SAN))).toBe(error);
  });

  it('should return the default error for a non-IPv6 host (no structured re-check)', () => {
    const error = new Error('hostname mismatch');
    const spy = jest.spyOn(tls, 'checkServerIdentity').mockReturnValue(error);
    expect(ipv6AwareCheckServerIdentity('example.com', certMock(CERT_WITH_IPV6_SAN))).toBe(error);
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('should return the default error when the raw certificate is unavailable', () => {
    const error = new Error('mismatch');
    jest.spyOn(tls, 'checkServerIdentity').mockReturnValue(error);
    expect(ipv6AwareCheckServerIdentity('fc00:30::1', certMock(undefined))).toBe(error);
  });

  it('should return the default error when the raw certificate cannot be parsed', () => {
    const error = new Error('mismatch');
    jest.spyOn(tls, 'checkServerIdentity').mockReturnValue(error);
    expect(
      ipv6AwareCheckServerIdentity('fc00:30::1', certMock(Buffer.from('not a certificate'))),
    ).toBe(error);
  });
});
