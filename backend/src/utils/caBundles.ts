import fs from 'fs';
import tls from 'tls';

// tls-ca-bundle.pem is the default CA bundle used by the system in CentOS/RHEL
// ca.crt is the default CA bundle provided by the service account for kubernetes
// service-ca.crt is the CA bundle provided by the service account for kubernetes used by prometheus
// odh-ca-bundle.crt and odh-trusted-ca-bundle.crt are the CA bundles provided by the ODH platform
export const CA_BUNDLE_PATHS = [
  '/etc/pki/ca-trust/extracted/pem/tls-ca-bundle.pem',
  '/var/run/secrets/kubernetes.io/serviceaccount/ca.crt',
  '/var/run/secrets/kubernetes.io/serviceaccount/service-ca.crt',
  '/etc/pki/tls/certs/odh-ca-bundle.crt',
  '/etc/pki/tls/certs/odh-trusted-ca-bundle.crt',
];

const isFileNotFoundError = (error: unknown): boolean =>
  typeof error === 'object' && error !== null && 'code' in error && error.code === 'ENOENT';

export const readCABundles = (paths: readonly string[] = CA_BUNDLE_PATHS): Buffer[] =>
  paths.reduce<Buffer[]>((bundles, path) => {
    try {
      bundles.push(fs.readFileSync(path));
    } catch (error) {
      if (!isFileNotFoundError(error)) {
        const message = error instanceof Error ? error.message : String(error);
        console.warn(`Unable to read CA bundle ${path}: ${message}`);
      }
    }
    return bundles;
  }, []);

const caBundles = readCABundles();

const readDefaultCACertificates = (): Buffer[] => {
  if (Reflect.has(tls, 'getCACertificates')) {
    // eslint-disable-next-line n/no-unsupported-features/node-builtins -- Runtime-guarded for older Node releases.
    return tls.getCACertificates('default').map((certificate) => Buffer.from(certificate));
  }

  const extraCAPath = process.env.NODE_EXTRA_CA_CERTS;
  return [
    ...tls.rootCertificates.map((certificate) => Buffer.from(certificate)),
    ...(extraCAPath ? readCABundles([extraCAPath]) : []),
  ];
};

export const getTrustedCAs = (bundles: readonly Buffer[] = caBundles): Buffer[] | undefined =>
  bundles.length > 0 ? [...readDefaultCACertificates(), ...bundles] : undefined;

type UndiciTLSOptions = { connect: { ca: Buffer[] } };

const defaultTrustedCAs = getTrustedCAs(caBundles);

const defaultUndiciTLSOptions: UndiciTLSOptions | undefined = defaultTrustedCAs
  ? { connect: { ca: defaultTrustedCAs } }
  : undefined;

export const getUndiciTLSOptions = (): UndiciTLSOptions | undefined => defaultUndiciTLSOptions;
