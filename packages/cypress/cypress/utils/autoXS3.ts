/**
 * Resolve the S3 endpoint used by AutoX pipeline resources.
 *
 * Disconnected clusters provide an in-cluster MinIO endpoint through
 * DSPA_S3_ENDPOINT so pipeline pods and the AutoX BFF avoid the external route.
 * Connected clusters retain the endpoint configured for the selected bucket.
 */
export const resolveAutoXS3Endpoint = (bucketEndpoint: string): string => {
  const configuredEndpoint = Cypress.env('DSPA_S3_ENDPOINT');
  if (typeof configuredEndpoint === 'string' && configuredEndpoint.trim()) {
    return configuredEndpoint.trim();
  }
  return bucketEndpoint;
};

/** Shell-escape a value by wrapping it in single quotes. */
const shellQuote = (value: string): string => `'${value.replace(/'/g, "'\\''")}'`;

/**
 * Verify the S3 endpoint persisted in the default AutoX data connection Secret.
 *
 * @param namespace Namespace containing the data connection Secret
 * @param expectedEndpoint Endpoint expected in AWS_S3_ENDPOINT
 */
export const assertAutoXDataConnectionEndpoint = (
  namespace: string,
  expectedEndpoint: string,
): Cypress.Chainable<Cypress.Exec> =>
  cy
    .exec(
      `oc get secret ${shellQuote('aws-connection-ods-ci-ds-pipelines')} ` +
        `-n ${shellQuote(namespace)} -o jsonpath='{.data.AWS_S3_ENDPOINT}'`,
      { failOnNonZeroExit: true, log: false },
    )
    .then((result: Cypress.Exec) => {
      const actualEndpoint = Buffer.from(result.stdout.trim(), 'base64').toString('utf8');
      expect(actualEndpoint, 'AutoX data connection S3 endpoint').to.equal(expectedEndpoint);
    });
