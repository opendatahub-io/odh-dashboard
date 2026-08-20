import { applyOpenShiftYaml } from './baseCommands';
import { AWS_BUCKETS } from '../s3Buckets';

/** Shell-escape a value by wrapping in single quotes (handles embedded quotes). */
const shQuote = (value: string): string => `'${value.replace(/'/g, "'\\''")}'`;

/** Pinned AWS CLI image so the cleanup pod cannot drift to a mutated :latest tag. */
const AWS_CLI_IMAGE =
  'amazon/aws-cli:2.27.50@sha256:48c3d4212e2f5b0e24bdc6af7708f9412ce65425a79575e0f78b8f8c0dcd70ab';

const K8S_DNS_LABEL = /^[a-z0-9]([-a-z0-9]*[a-z0-9])?$/;

const assertK8sDnsLabel = (kind: string, value: string): void => {
  if (!K8S_DNS_LABEL.test(value) || value.length > 63) {
    throw new Error(`Invalid ${kind} for oc command`);
  }
};

type AwsCliPodOptions = {
  namespace: string;
  podName: string;
  region: string;
  awsCliArgs: string[];
  failOnNonZeroExit?: boolean;
  timeout?: number;
};

/**
 * Run the AWS CLI in an ephemeral in-cluster pod.
 *
 * Credentials are mounted from a temporary Secret via `--env-from`, so the
 * `oc run` argv (and therefore Cypress `[EXEC]` logs) never contain the keys.
 * The Secret is deleted after the pod exits, including when `oc run` fails.
 */
export const runAwsCliInCluster = ({
  namespace,
  podName,
  region,
  awsCliArgs,
  failOnNonZeroExit = false,
  timeout = 120000,
}: AwsCliPodOptions): void => {
  assertK8sDnsLabel('namespace', namespace);
  assertK8sDnsLabel('pod name', podName);

  const secretName = `${podName}-creds`;
  assertK8sDnsLabel('secret name', secretName);

  const secretManifest = JSON.stringify({
    apiVersion: 'v1',
    kind: 'Secret',
    metadata: {
      name: secretName,
      namespace,
    },
    stringData: {
      AWS_ACCESS_KEY_ID: AWS_BUCKETS.AWS_ACCESS_KEY_ID,
      AWS_SECRET_ACCESS_KEY: AWS_BUCKETS.AWS_SECRET_ACCESS_KEY,
      AWS_DEFAULT_REGION: region,
    },
  });

  const deleteCredentials = () =>
    cy.exec(`oc delete secret ${shQuote(secretName)} -n ${shQuote(namespace)} --ignore-not-found`, {
      failOnNonZeroExit: false,
      log: false,
    });

  const quotedArgs = awsCliArgs.map(shQuote).join(' ');

  applyOpenShiftYaml(secretManifest).then(() => {
    // failOnNonZeroExit must be false so Cypress still runs Secret cleanup after a
    // non-zero oc run. Re-throw after deletion when the caller asked to fail.
    return cy
      .exec(
        `oc run ${shQuote(podName)} -n ${shQuote(namespace)} ` +
          `--image=${shQuote(AWS_CLI_IMAGE)} ` +
          `--restart=Never --rm --attach --tty=false ` +
          `--env-from=${shQuote(`secret/${secretName}`)} ` +
          `-- ${quotedArgs}`,
        { failOnNonZeroExit: false, log: false, timeout },
      )
      .then((result) =>
        deleteCredentials().then(() => {
          if (failOnNonZeroExit && result.exitCode !== 0) {
            throw new Error(`AWS CLI pod ${podName} exited with code ${result.exitCode}`);
          }
        }),
      );
  });
};

/**
 * Delete S3 objects whose keys match a given prefix pattern.
 *
 * Runs an ephemeral pod with the AWS CLI image to execute
 * `aws s3 rm --recursive`.  The pod is auto-removed via `--rm`.
 *
 * Best-effort — failures are logged but do not fail the test run so
 * that project cleanup can still proceed.
 *
 * Must be called **before** `deleteOpenShiftProject` because the pod
 * runs inside that namespace.
 *
 * @param namespace  Namespace to run the cleanup pod in
 * @param bucketKey  Which bucket config to use
 * @param prefix     S3 key prefix glob to delete (e.g. `*<uuid>*`)
 */
export const deleteS3TestFiles = (
  namespace: string,
  bucketKey: 'BUCKET_2' | 'BUCKET_3',
  prefix: string,
): void => {
  if (!/^[a-zA-Z0-9\-_*]+$/.test(prefix)) {
    throw new Error(
      `Invalid S3 prefix pattern: ${prefix}. Only alphanumeric, hyphens, asterisks, and underscores allowed.`,
    );
  }

  const bucketConfig = AWS_BUCKETS[bucketKey];
  const podName = `s3-cleanup-${Date.now()}`;

  runAwsCliInCluster({
    namespace,
    podName,
    region: bucketConfig.REGION,
    awsCliArgs: [
      's3',
      'rm',
      `s3://${bucketConfig.NAME}/`,
      '--recursive',
      '--endpoint-url',
      bucketConfig.ENDPOINT,
      '--exclude',
      '*',
      '--include',
      prefix,
    ],
  });
};
