import { applyOpenShiftYaml } from './baseCommands';
import { AWS_BUCKETS } from '../s3Buckets';

/** Shell-escape a value by wrapping in single quotes (handles embedded quotes). */
const shQuote = (value: string): string => `'${value.replace(/'/g, "'\\''")}'`;

type AwsCliPodOptions = {
  namespace: string;
  podName: string;
  region: string;
  awsCliArgs: string;
  failOnNonZeroExit?: boolean;
  timeout?: number;
};

/**
 * Run the AWS CLI in an ephemeral in-cluster pod.
 *
 * Credentials are mounted from a temporary Secret via `--env-from`, so the
 * `oc run` argv (and therefore Cypress `[EXEC]` logs) never contain the keys.
 * The Secret is deleted after the pod exits.
 */
export const runAwsCliInCluster = ({
  namespace,
  podName,
  region,
  awsCliArgs,
  failOnNonZeroExit = false,
  timeout = 120000,
}: AwsCliPodOptions): void => {
  const secretName = `${podName}-creds`;
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

  applyOpenShiftYaml(secretManifest).then(() => {
    cy.exec(
      `oc run ${podName} -n ${namespace} ` +
        `--image=amazon/aws-cli:latest ` +
        `--restart=Never --rm --attach --tty=false ` +
        `--env-from=secret/${secretName} ` +
        `-- ${awsCliArgs}`,
      { failOnNonZeroExit, log: false, timeout },
    ).then(() => {
      cy.exec(`oc delete secret ${secretName} -n ${namespace} --ignore-not-found`, {
        failOnNonZeroExit: false,
        log: false,
      });
    });
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
    awsCliArgs:
      `s3 rm ${shQuote(`s3://${bucketConfig.NAME}/`)} --recursive ` +
      `--endpoint-url ${shQuote(bucketConfig.ENDPOINT)} ` +
      `--exclude '*' --include '${prefix}'`,
  });
};
