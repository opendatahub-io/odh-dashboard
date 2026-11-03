import fs from 'fs';

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

export const readCABundles = (paths: readonly string[] = CA_BUNDLE_PATHS): Buffer[] =>
  paths.reduce<Buffer[]>((bundles, path) => {
    try {
      bundles.push(fs.readFileSync(path));
    } catch {
      // Optional CA bundle is not present in this environment.
    }
    return bundles;
  }, []);

export const caBundles = readCABundles();

type UndiciTLSOptions = { connect: { ca: Buffer[] } };

export const getUndiciTLSOptions = (bundles: Buffer[] = caBundles): UndiciTLSOptions | undefined =>
  bundles.length > 0 ? { connect: { ca: bundles } } : undefined;
