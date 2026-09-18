// AutoRAG intentionally does not provision a hard-coded PGVector image because disconnected or
// mirrored clusters may not be able to pull it. Future work should discover a cluster-provided
// PostgreSQL/PGVector image from a deployed component's resolved related-image configuration.
export const getVectorDatabaseConnection = (): {
  host: string;
  port: string;
  db: string;
  user: string;
  password: string;
} => ({
  host: 'autorag-vector-db.invalid',
  port: '5432',
  db: 'autorag_test_db',
  user: 'autorag_test_user',
  password: 'autorag_test_password',
});

// ---------------------------------------------------------------------------
// Cleanup helpers (resilient — each call uses failOnNonZeroExit: false)
// ---------------------------------------------------------------------------

/**
 * Clean up a generated project-scoped secret.
 */
export const cleanupAutoragSecret = (namespace: string, secretName: string): void => {
  cy.log(`Cleaning up AutoRAG secret ${secretName}`);
  cy.exec(`oc delete secret ${secretName} -n ${namespace} --ignore-not-found --wait=true`, {
    failOnNonZeroExit: false,
  });
};

/**
 * Remove owned connections before recreating them after a test retry.
 *
 * AutoRAG connection names are intentionally stable so the selectors can find them. Since
 * retryableBefore reruns setup before suite cleanup, clear stale secrets from the test project
 * first to keep connection creation idempotent.
 */
export const resetAutoragConnections = (
  namespace: string,
  maasSecretName: string,
  vectorDbSecretName: string,
): void => {
  cleanupAutoragSecret(namespace, maasSecretName);
  cleanupAutoragSecret(namespace, vectorDbSecretName);
};

/**
 * Clean up only resources generated in the unique AutoRAG project.
 */
export const cleanupAutoragInfrastructure = (
  namespace: string,
  maasSecretName: string,
  vectorDbSecretName: string,
  ownership: { maasSecretCreated: boolean; vectorDbSecretCreated: boolean },
): void => {
  if (ownership.maasSecretCreated) {
    cleanupAutoragSecret(namespace, maasSecretName);
  }
  if (ownership.vectorDbSecretCreated) {
    cleanupAutoragSecret(namespace, vectorDbSecretName);
  }
};
