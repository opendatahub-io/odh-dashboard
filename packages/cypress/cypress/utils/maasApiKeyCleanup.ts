/**
 * Pure helpers used by `cleanupApiKeys` in utils/oc_commands/maas.ts. Cypress is not
 * invoked here, which lets unit tests exercise this logic on its own.
 */

export type ApiKeyCleanupResult = {
  /** True once a DELETE completes and removes at least one row. */
  deleted: boolean;
  /** Outcome text in the same form `cleanupApiKeys` emits to the log. */
  message: string;
};

type OcResult = { exitCode: number; stderr: string };

/** Interpretation of `oc get <resource> -o name`: resource exists, NotFound, or errors such as Forbidden. */
export type OcGetOutcome =
  | { state: 'found' }
  | { state: 'missing' }
  | { state: 'error'; reason: string };

/**
 * Derives OcGetOutcome from an `oc get ... -o name` run. Missing is used only for NotFound.
 * Other errors record the parenthesized server label (e.g. "Forbidden") or the exit code,
 * and intentionally drop usernames that show up in oc stderr.
 */
export const classifyOcGet = ({ exitCode, stderr }: OcResult): OcGetOutcome => {
  if (exitCode === 0) {
    return { state: 'found' };
  }
  if (/\(NotFound\)/.test(stderr)) {
    return { state: 'missing' };
  }
  const reason = /Error from server \(([A-Za-z]+)\)/.exec(stderr)?.[1];
  return { state: 'error', reason: reason ?? `exit code ${exitCode}` };
};

/**
 * When set, describes why API key cleanup is skipped; otherwise both `postgres-creds` and
 * `deployment/postgres` are reachable in the namespace.
 */
export const getApiKeyCleanupSkipReason = (
  namespace: string,
  { secret, deployment }: { secret: OcGetOutcome; deployment: OcGetOutcome },
): string | undefined => {
  const checks = [
    { name: 'secret postgres-creds', outcome: secret },
    { name: 'deployment/postgres', outcome: deployment },
  ];
  const failed = checks.flatMap(({ name, outcome }) =>
    outcome.state === 'error' ? [`${name} (${outcome.reason})`] : [],
  );
  if (failed.length > 0) {
    return `API key cleanup skipped: could not check ${failed.join(
      ' or ',
    )} in ${namespace}; the key may stay in the database`;
  }
  const missing = checks.flatMap(({ name, outcome }) =>
    outcome.state === 'missing' ? [name] : [],
  );
  if (missing.length > 0) {
    return `API key cleanup skipped: no ${missing.join(
      ' and no ',
    )} in ${namespace}; the key stays in the database`;
  }
  return undefined;
};

/** SQL DELETE by key name; apostrophes in the name are escaped by doubling for safe literals. */
export const buildApiKeyDeleteStatement = (apiKeyName: string): string =>
  `DELETE FROM api_keys WHERE name = '${apiKeyName.replace(/'/g, "''")}';`;

/** Stderr marker and exit code when POSTGRES_USER or POSTGRES_DB cannot be read from the secret. */
export const PG_CREDENTIALS_UNREADABLE = 'MAAS_E2E_PG_CREDENTIALS_UNREADABLE';
export const PG_CREDENTIALS_UNREADABLE_EXIT = 97;

/** POSIX single-quoted shell argument; interior `'` is encoded as the `'\''` idiom. */
export const shellSingleQuote = (value: string): string => `'${value.replace(/'/g, `'\\''`)}'`;

/**
 * Builds one `&&`-joined shell script: resolve POSTGRES_USER and POSTGRES_DB from `postgres-creds`,
 * then `oc exec` into postgres with psql and the delete SQL. Values are interpolated at runtime so
 * `[EXEC]` traces and failure output never embed secrets. Requires a DNS-1123-valid `namespace`.
 */
export const buildApiKeyDeleteCommand = (namespace: string, apiKeyName: string): string => {
  const secretValue = (key: string) =>
    `$(oc get secret postgres-creds -n ${namespace} -o jsonpath='{.data.${key}}' | base64 -d)`;
  return [
    `PGUSER_VALUE=${secretValue('POSTGRES_USER')}`,
    `PGDB_VALUE=${secretValue('POSTGRES_DB')}`,
    // Command substitution inherits base64's exit code; guard empty/failed decodes before psql.
    // POSIX shell lacks pipefail, so the check must live in the script body.
    `{ [ -n "$PGUSER_VALUE" ] && [ -n "$PGDB_VALUE" ] || { echo ${PG_CREDENTIALS_UNREADABLE} >&2; exit ${PG_CREDENTIALS_UNREADABLE_EXIT}; }; }`,
    `oc exec -n ${namespace} deployment/postgres -- psql -U "$PGUSER_VALUE" -d "$PGDB_VALUE" -c ${shellSingleQuote(
      buildApiKeyDeleteStatement(apiKeyName),
    )}`,
  ].join(' && ');
};

/**
 * Shapes delete command stdout/stderr and exit code into ApiKeyCleanupResult.
 * A successful run exposes affected rows on stdout in the form `DELETE <n>`.
 */
export const getApiKeyCleanupResult = (
  apiKeyName: string,
  { exitCode, stdout, stderr }: { exitCode: number; stdout: string; stderr: string },
): ApiKeyCleanupResult => {
  if (exitCode === PG_CREDENTIALS_UNREADABLE_EXIT && stderr.includes(PG_CREDENTIALS_UNREADABLE)) {
    return {
      deleted: false,
      message:
        'API key cleanup skipped: could not read POSTGRES_USER / POSTGRES_DB from secret postgres-creds; the key may stay in the database',
    };
  }
  if (exitCode !== 0) {
    return {
      deleted: false,
      message: `API key cleanup failed for "${apiKeyName}": the delete command exited with code ${exitCode}`,
    };
  }
  const rows = Number(/DELETE (\d+)/.exec(stdout)?.[1] ?? 0);
  return rows > 0
    ? { deleted: true, message: `API key cleanup: deleted ${rows} row(s) for "${apiKeyName}"` }
    : { deleted: false, message: `API key cleanup: no API key named "${apiKeyName}" was found` };
};
